import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Pin, MessageSquare, ImageIcon, Video, Mic, Radio,
} from "lucide-react";
import { toast } from "sonner";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { FeaturedMomentEditor } from "@/components/admin/featured-moment-editor";
import { LiveChat } from "@/components/community/live-chat";

type PostType = "text" | "image" | "video" | "audio" | "live";

type Channel = {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  position: number;
};

type Post = {
  id: string;
  course_id: string;
  channel_id: string;
  author_id: string | null;
  title: string | null;
  body: string | null;
  image_url: string | null;
  youtube_url: string | null;
  audio_url: string | null;
  cover_url: string | null;
  post_type: PostType;
  is_live_active: boolean;
  live_started_at: string | null;
  live_ended_at: string | null;
  live_chat_enabled: boolean;
  allow_comments: boolean;
  is_pinned: boolean;
  status: "published" | "draft" | "hidden";
  position: number;
};

const postStatusBadge: Record<Post["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "Publicada", variant: "default" },
  draft: { label: "Rascunho", variant: "secondary" },
  hidden: { label: "Oculta", variant: "outline" },
};

const POST_TYPES: { value: PostType; label: string; icon: typeof ImageIcon; gradient: string }[] = [
  { value: "image", label: "Imagem", icon: ImageIcon, gradient: "from-fuchsia-500 to-violet-600" },
  { value: "video", label: "Vídeo", icon: Video, gradient: "from-red-500 to-rose-600" },
  { value: "audio", label: "Áudio", icon: Mic, gradient: "from-emerald-500 to-teal-600" },
  { value: "live", label: "Live", icon: Radio, gradient: "from-pink-500 to-red-500" },
];


export function ContentsCommunity({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [channelDialog, setChannelDialog] = useState<{ open: boolean; channel?: Channel }>({ open: false });
  const [postDialog, setPostDialog] = useState<{ open: boolean; channelId?: string; post?: Post }>({ open: false });

  const channelsQ = useQuery({
    queryKey: ["channels", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_channels").select("*").eq("course_id", courseId).order("position");
      if (error) throw error;
      return data as Channel[];
    },
  });

  useEffect(() => {
    if (!selectedChannel && channelsQ.data?.[0]) setSelectedChannel(channelsQ.data[0].id);
  }, [channelsQ.data, selectedChannel]);

  const postsQ = useQuery({
    queryKey: ["posts", selectedChannel],
    enabled: !!selectedChannel,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts").select("*")
        .eq("channel_id", selectedChannel!)
        .order("is_pinned", { ascending: false })
        .order("position");
      if (error) throw error;
      return data as Post[];
    },
  });

  const reorder = useMutation({
    mutationFn: async ({ table, id, position }: { table: "community_channels" | "community_posts"; id: string; position: number }) => {
      const { error } = await supabase.from(table).update({ position }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      if (v.table === "community_channels") qc.invalidateQueries({ queryKey: ["channels", courseId] });
      else qc.invalidateQueries({ queryKey: ["posts", selectedChannel] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delChannel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Canal excluído");
      qc.invalidateQueries({ queryKey: ["channels", courseId] });
      setSelectedChannel(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delPost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publicação excluída");
      qc.invalidateQueries({ queryKey: ["posts", selectedChannel] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  // Ensure a default channel exists so the producer doesn't have to manage channels.
  const ensureDefault = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("community_channels")
        .insert({ course_id: courseId, name: "Publicações", position: 0 })
        .select()
        .single();
      if (error) throw error;
      return data as Channel;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["channels", courseId] });
      setSelectedChannel(c.id);
    },
  });

  useEffect(() => {
    if (channelsQ.isSuccess && (channelsQ.data?.length ?? 0) === 0 && !ensureDefault.isPending) {
      ensureDefault.mutate();
    }
  }, [channelsQ.isSuccess, channelsQ.data, ensureDefault]);

  const channels = channelsQ.data ?? [];
  const posts = postsQ.data ?? [];

  function move<T extends { id: string; position: number }>(
    items: T[], idx: number, dir: -1 | 1, table: "community_channels" | "community_posts",
  ) {
    const target = items[idx + dir];
    if (!target) return;
    const current = items[idx];
    reorder.mutate({ table, id: current.id, position: target.position });
    reorder.mutate({ table, id: target.id, position: current.position });
  }

  return (
    <div className="space-y-4">
      <FeaturedMomentEditor courseId={courseId} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Publicações</h2>
          <p className="text-sm text-muted-foreground">Compartilhe conteúdos, vídeos e lives com seus alunos.</p>
        </div>
        <Button
          onClick={() => setPostDialog({ open: true, channelId: selectedChannel ?? undefined })}
          disabled={!selectedChannel}
        >
          <Plus className="mr-2 h-4 w-4" /> Publicar
        </Button>
      </div>

      <div className="space-y-3">
        {!selectedChannel ? (
          <Card className="p-10 text-center text-muted-foreground">Preparando seu mural…</Card>
        ) : posts.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            Nenhuma publicação ainda. Clique em <strong>Publicar</strong> para começar.
          </Card>
        ) : (
          posts.map((p, i) => (
            <PostCard
              key={p.id}
              post={p}
              isFirst={i === 0}
              isLast={i === posts.length - 1}
              onMoveUp={() => move(posts, i, -1, "community_posts")}
              onMoveDown={() => move(posts, i, 1, "community_posts")}
              onEdit={() => setPostDialog({ open: true, channelId: p.channel_id, post: p })}
              onDelete={() => { if (confirm("Excluir publicação?")) delPost.mutate(p.id); }}
            />
          ))
        )}
      </div>

      <ChannelDialog
        courseId={courseId}
        nextPosition={channels.length}
        state={channelDialog}
        onClose={() => setChannelDialog({ open: false })}
      />
      <PostDialog
        courseId={courseId}
        nextPosition={posts.length}
        state={postDialog}
        onClose={() => setPostDialog({ open: false })}
      />
    </div>
  );
}


function useResetOnOpen(open: boolean, fn: () => void) {
  const prev = useRef(false);
  useEffect(() => {
    if (open && !prev.current) fn();
    prev.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

function ChannelDialog({
  courseId, nextPosition, state, onClose,
}: {
  courseId: string;
  nextPosition: number;
  state: { open: boolean; channel?: Channel };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editing = state.channel;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [iconUrl, setIconUrl] = useState("");

  useResetOnOpen(state.open, () => {
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setIcon(editing?.icon ?? "");
    setIconUrl(editing?.icon_url ?? "");
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, description: description || null, icon: icon || null, icon_url: iconUrl || null };
      if (editing) {
        const { error } = await supabase.from("community_channels").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_channels").insert({
          ...payload, course_id: courseId, position: nextPosition,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Canal atualizado" : "Canal criado");
      qc.invalidateQueries({ queryKey: ["channels", courseId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar canal" : "Novo canal"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <ImageUploadCrop
            label="Ícone do canal"
            value={iconUrl}
            onChange={setIconUrl}
            folder="channels"
            aspect={1}
            recommended={{ width: 256, height: 256 }}
            previewClassName="aspect-square w-20"
            rounded
            hint="Se preferir, use um emoji no campo abaixo."
          />
          <div className="space-y-1.5">
            <Label>Emoji (alternativa ao ícone)</Label>
            <Input maxLength={4} placeholder="💬" value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PostDialog({
  courseId, nextPosition, state, onClose,
}: {
  courseId: string;
  nextPosition: number;
  state: { open: boolean; channelId?: string; post?: Post };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const editing = state.post;
  const channelId = state.channelId ?? editing?.channel_id;

  const [postType, setPostType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveChatEnabled, setLiveChatEnabled] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [status, setStatus] = useState<Post["status"]>("draft");
  const [position, setPosition] = useState("0");

  useResetOnOpen(state.open, () => {
    setPostType(editing?.post_type ?? "text");
    setTitle(editing?.title ?? "");
    setBody(editing?.body ?? "");
    setImageUrl(editing?.image_url ?? "");
    setYoutubeUrl(editing?.youtube_url ?? "");
    setAudioUrl(editing?.audio_url ?? "");
    setCoverUrl(editing?.cover_url ?? "");
    setIsLiveActive(editing?.is_live_active ?? false);
    setLiveChatEnabled(editing?.live_chat_enabled ?? true);
    setAllowComments(editing?.allow_comments ?? true);
    setIsPinned(editing?.is_pinned ?? false);
    setStatus(editing?.status ?? "published");
    setPosition(String(editing?.position ?? nextPosition));
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        post_type: postType,
        title: title || null,
        body: body || null,
        image_url: imageUrl || null,
        youtube_url: youtubeUrl || null,
        audio_url: audioUrl || null,
        cover_url: coverUrl || null,
        is_live_active: postType === "live" ? isLiveActive : false,
        live_started_at: postType === "live" && isLiveActive && !editing?.is_live_active
          ? new Date().toISOString() : editing?.live_started_at ?? null,
        live_ended_at: postType === "live" && !isLiveActive && editing?.is_live_active
          ? new Date().toISOString() : null,
        live_chat_enabled: liveChatEnabled,
        allow_comments: allowComments,
        is_pinned: isPinned,
        status,
        position: Number(position) || 0,
      };
      if (editing) {
        const { error } = await supabase.from("community_posts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_posts").insert({
          ...payload, course_id: courseId, channel_id: channelId!, author_id: user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Publicação atualizada" : "Publicação criada");
      qc.invalidateQueries({ queryKey: ["posts", channelId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Editar publicação" : "Nova publicação"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Adicione o título" />
          </div>
          <div className="space-y-1.5">
            <Label>Texto</Label>
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Comece um novo tópico ou compartilhe algo na comunidade" />
          </div>

          <div className="space-y-2">
            <Label>Tipo de conteúdo</Label>
            <div className="flex flex-wrap gap-2">
              {POST_TYPES.map((t) => {
                const Icon = t.icon;
                const active = postType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setPostType(active ? "text" : t.value)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                      active ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                    }`}
                  >
                    <span className={`h-6 w-6 rounded-md bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {postType === "image" && (
            <div className="space-y-1.5">
              <Label>Imagem (URL)</Label>
              <Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          {postType === "video" && (
            <div className="space-y-1.5">
              <Label>Vídeo do YouTube</Label>
              <Input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
          )}
          {postType === "audio" && (
            <div className="space-y-1.5">
              <Label>Áudio (URL)</Label>
              <Input type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          {postType === "live" && (
            <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Radio className="h-4 w-4 text-pink-500" />
                Configuração da live (YouTube)
              </div>
              <div className="space-y-1.5">
                <Label>URL da transmissão ao vivo no YouTube</Label>
                <Input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/live/..." />
                <p className="text-xs text-muted-foreground">Cole a URL completa da live. Aceita /live/, /watch?v= e youtu.be.</p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">Está ao vivo agora</Label>
                  <p className="text-xs text-muted-foreground">Ativa o player e o chat ao vivo na plataforma.</p>
                </div>
                <Switch checked={isLiveActive} onCheckedChange={setIsLiveActive} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">Chat ao vivo</Label>
                  <p className="text-xs text-muted-foreground">Permite mensagens e emojis dos alunos durante a transmissão.</p>
                </div>
                <Switch checked={liveChatEnabled} onCheckedChange={setLiveChatEnabled} />
              </div>
            </div>
          )}

          <ImageUploadCrop
            label="Capa do assunto (opcional)"
            value={coverUrl}
            onChange={setCoverUrl}
            folder="post-covers"
            aspect={16 / 9}
            recommended={{ width: 1280, height: 720 }}
            previewClassName="aspect-video w-full"
            hint="Imagem de capa exibida no card do assunto. Recomendado 1280×720 (16:9)."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Post["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Publicada</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="hidden">Oculta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ordem</Label>
              <Input type="number" value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Permitir comentários</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                <span className="text-sm text-muted-foreground">{allowComments ? "Sim" : "Não"}</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Pin className="h-3.5 w-3.5" /> Fixar publicação no topo</Label>
            <div className="flex items-center gap-2 h-9">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
              <span className="text-sm text-muted-foreground">{isPinned ? "Fixada no topo" : "Não fixada"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Publicando…" : "Publicar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


const REACTIONS = [
  { key: "heart", emoji: "❤️" },
  { key: "clap", emoji: "👏" },
  { key: "thumbs", emoji: "👍" },
  { key: "pray", emoji: "🙌" },
  { key: "party", emoji: "🎉" },
] as const;

type ReactionRow = { id: string; post_id: string; user_id: string; reaction: string };
type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};
type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function PostCard({
  post, isFirst, isLast, onMoveUp, onMoveDown, onEdit, onDelete,
}: {
  post: Post;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const authorQ = useQuery({
    queryKey: ["profile", post.author_id],
    enabled: !!post.author_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("id, full_name, avatar_url").eq("id", post.author_id!).maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });

  const reactionsQ = useQuery({
    queryKey: ["reactions", post.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_reactions").select("*").eq("post_id", post.id);
      if (error) throw error;
      return data as ReactionRow[];
    },
  });

  const commentsQ = useQuery({
    queryKey: ["comments", post.id],
    enabled: post.allow_comments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_comments").select("*").eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CommentRow[];
    },
  });

  const commenterIds = Array.from(new Set((commentsQ.data ?? []).map((c) => c.author_id)));
  const commenterProfilesQ = useQuery({
    queryKey: ["profiles", commenterIds.sort().join(",")],
    enabled: commenterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("id, full_name, avatar_url").in("id", commenterIds);
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const toggleReaction = useMutation({
    mutationFn: async (reactionKey: string) => {
      if (!user) throw new Error("Faça login");
      const existing = (reactionsQ.data ?? []).find(
        (r) => r.user_id === user.id && r.reaction === reactionKey,
      );
      if (existing) {
        const { error } = await supabase.from("community_reactions").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_reactions").insert({
          post_id: post.id, user_id: user.id, reaction: reactionKey,
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

  const delComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", post.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const reactions = reactionsQ.data ?? [];
  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const r of reactions) {
    counts[r.reaction] = (counts[r.reaction] ?? 0) + 1;
    if (user && r.user_id === user.id) mine.add(r.reaction);
  }

  const author = authorQ.data;
  const commenterMap = new Map((commenterProfilesQ.data ?? []).map((p) => [p.id, p]));
  const comments = commentsQ.data ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-medium">{initials(author?.full_name)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{author?.full_name ?? "Autor"}</span>
            {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
            <Badge variant={postStatusBadge[post.status].variant}>{postStatusBadge[post.status].label}</Badge>
            {post.post_type === "live" && (
              <Badge className={`gap-1 ${post.is_live_active ? "bg-pink-500 hover:bg-pink-500 text-white" : ""}`} variant={post.is_live_active ? "default" : "outline"}>
                <span className={`h-1.5 w-1.5 rounded-full ${post.is_live_active ? "bg-white animate-pulse" : "bg-muted-foreground"}`} />
                {post.is_live_active ? "AO VIVO" : "Live"}
              </Badge>
            )}
            {post.post_type === "image" && post.image_url && <Badge variant="outline"><ImageIcon className="h-3 w-3 mr-1" />Imagem</Badge>}
            {post.post_type === "video" && post.youtube_url && <Badge variant="outline"><Video className="h-3 w-3 mr-1" />Vídeo</Badge>}
            {post.post_type === "audio" && post.audio_url && <Badge variant="outline"><Mic className="h-3 w-3 mr-1" />Áudio</Badge>}
            {!post.allow_comments && (
              <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-1" />Comentários off</Badge>
            )}
          </div>
          {post.title && <h3 className="font-semibold text-base">{post.title}</h3>}
          {post.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.body}</p>}
          {post.cover_url && (
            <img src={post.cover_url} alt="" className="rounded-lg w-full aspect-video object-cover" />
          )}
          {post.post_type === "live" && post.youtube_url && (
            <p className="text-xs text-muted-foreground break-all">URL da live: {post.youtube_url}</p>
          )}

        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst} onClick={onMoveUp}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLast} onClick={onMoveDown}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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
              <span className="tabular-nums text-xs text-muted-foreground">{counts[r.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {post.allow_comments && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((c) => {
                const cp = commenterMap.get(c.author_id);
                const isMine = user?.id === c.author_id;
                return (
                  <div key={c.id} className="flex items-start gap-2 group">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {cp?.avatar_url ? (
                        <img src={cp.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-medium">{initials(cp?.full_name)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 rounded-lg bg-background px-3 py-1.5 text-sm">
                      <div className="text-xs text-muted-foreground mb-0.5">{cp?.full_name ?? "Usuário"}</div>
                      <div className="whitespace-pre-wrap break-words">{c.body}</div>
                    </div>
                    {isMine && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => { if (confirm("Excluir comentário?")) delComment.mutate(c.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); addComment.mutate(); }}
            className="flex items-center gap-2"
          >
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-[10px] font-medium">{initials(user?.email)}</span>
            </div>
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

      {post.post_type === "live" && post.is_live_active && post.live_chat_enabled && (
        <LiveChat postId={post.id} courseId={post.course_id} />
      )}
    </Card>
  );
}


