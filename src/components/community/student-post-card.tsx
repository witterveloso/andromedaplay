import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { YouTubeLivePlayer } from "@/components/community/youtube-live-player";
import { LiveChat } from "@/components/community/live-chat";
import { Star, NotebookPen } from "lucide-react";
import { toast } from "sonner";


const REACTIONS = [
  { key: "heart", emoji: "❤️" },
  { key: "clap", emoji: "👏" },
  { key: "thumbs", emoji: "👍" },
  { key: "pray", emoji: "🙌" },
  { key: "party", emoji: "🎉" },
] as const;

type Profile = { id: string; full_name: string | null; avatar_url: string | null };

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function StudentPostCard({ post }: { post: any }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const authorQ = useQuery({
    enabled: !!post.author_id,
    queryKey: ["profile", post.author_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("id, full_name, avatar_url").eq("id", post.author_id).maybeSingle();
      return data as Profile | null;
    },
  });

  const reactionsQ = useQuery({
    queryKey: ["reactions", post.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_reactions").select("*").eq("post_id", post.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const commentsQ = useQuery({
    enabled: post.allow_comments,
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_comments").select("*").eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const commenterIds = Array.from(new Set((commentsQ.data ?? []).map((c: any) => c.author_id)));
  const commentersQ = useQuery({
    enabled: commenterIds.length > 0,
    queryKey: ["profiles", commenterIds.sort().join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("id, full_name, avatar_url").in("id", commenterIds);
      return (data ?? []) as Profile[];
    },
  });

  const toggleReaction = useMutation({
    mutationFn: async (key: string) => {
      if (!user) throw new Error("Faça login");
      const existing = (reactionsQ.data ?? []).find((r: any) => r.user_id === user.id && r.reaction === key);
      if (existing) {
        const { error } = await supabase.from("community_reactions").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_reactions").insert({
          post_id: post.id, user_id: user.id, reaction: key,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reactions", post.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [commentBody, setCommentBody] = useState("");
  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Faça login");
      const body = commentBody.trim();
      if (!body) return;
      const { error } = await supabase.from("community_comments").insert({
        post_id: post.id, author_id: user.id, body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentBody("");
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const r of (reactionsQ.data ?? []) as any[]) {
    counts[r.reaction] = (counts[r.reaction] ?? 0) + 1;
    if (user && r.user_id === user.id) mine.add(r.reaction);
  }
  const author = authorQ.data;
  const commenterMap = new Map((commentersQ.data ?? []).map((p) => [p.id, p]));

  const created = post.created_at ? new Date(post.created_at) : null;
  const dateLabel = created
    ? created.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  const timeLabel = created
    ? created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Card className="overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-sm shadow-lg shadow-black/20">
      <div className="p-5 sm:p-6 flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-white/10">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold">{initials(author?.full_name)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{author?.full_name ?? "Produtor"}</div>
              {created && (
                <div className="text-xs opacity-60 mt-0.5">
                  {dateLabel} · {timeLabel}
                </div>
              )}
            </div>
            {post.is_pinned && (
              <span className="text-[10px] uppercase tracking-wider opacity-70 shrink-0">Fixado</span>
            )}
          </div>
          {post.title && <h3 className="font-semibold text-lg leading-snug">{post.title}</h3>}
          {post.body && <p className="text-[15px] leading-relaxed opacity-90 whitespace-pre-wrap">{post.body}</p>}
          {post.cover_url && (
            <img src={post.cover_url} alt="" className="rounded-xl w-full aspect-video object-cover" />
          )}
          {post.image_url && <img src={post.image_url} alt="" className="rounded-xl w-full" />}
          {post.youtube_url && (
            <YouTubeLivePlayer url={post.youtube_url} title={post.title ?? ""} />
          )}
          {post.audio_url && <audio controls src={post.audio_url} className="w-full" />}
        </div>
      </div>


      <div className="px-4 pb-3 flex items-center justify-end gap-2 flex-wrap border-t pt-3">
        {REACTIONS.map((r) => {
          const active = mine.has(r.key);
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => toggleReaction.mutate(r.key)}
              disabled={toggleReaction.isPending}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                active ? "bg-primary/15 border-primary/40" : "bg-muted/30 hover:bg-muted/60 border-transparent"
              }`}
            >
              <span>{r.emoji}</span>
              <span className="tabular-nums text-xs opacity-70">{counts[r.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {post.post_type === "live" && post.is_live_active && post.live_chat_enabled ? (
        <LiveChat postId={post.id} courseId={post.course_id} />
      ) : post.allow_comments && (
        <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
          {(commentsQ.data ?? []).map((c: any) => {
            const cp = commenterMap.get(c.author_id);
            return (
              <div key={c.id} className="flex items-start gap-2">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {cp?.avatar_url ? (
                    <img src={cp.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-medium">{initials(cp?.full_name)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 rounded-lg bg-background/60 px-3 py-1.5 text-sm">
                  <div className="text-xs opacity-70 mb-0.5">{cp?.full_name ?? "Usuário"}</div>
                  <div className="whitespace-pre-wrap break-words">{c.body}</div>
                </div>
              </div>
            );
          })}
          <form
            onSubmit={(e) => { e.preventDefault(); addComment.mutate(); }}
            className="flex items-center gap-2"
          >
            <Input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={`Deixe um comentário${author?.full_name ? ` para ${author.full_name.split(" ")[0]}` : ""}...`}
              className="h-9"
            />
            <Button type="submit" size="sm" disabled={!commentBody.trim() || addComment.isPending}>
              Enviar
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
