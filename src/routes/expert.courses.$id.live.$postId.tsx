import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouTubeLivePlayer } from "@/components/community/youtube-live-player";
import { LiveChat } from "@/components/community/live-chat";
import {
  ChevronLeft, Copy, ExternalLink, Radio, StopCircle, Pin, PinOff, Check,
  Trash2, HelpCircle, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/expert/courses/$id/live/$postId")({
  component: LiveStudio,
});

type LiveMessage = {
  id: string;
  post_id: string;
  user_id: string;
  body: string | null;
  emoji: string | null;
  is_pinned: boolean;
  is_answered: boolean;
  is_question: boolean;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function LiveStudio() {
  const { id, postId } = Route.useParams();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const courseQ = useQuery({
    queryKey: ["studio-course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses").select("id, title, expert_id, course_type").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const postQ = useQuery({
    queryKey: ["studio-post", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts").select("*").eq("id", postId).maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });

  // Guard: only course expert or admin
  useEffect(() => {
    if (loading || courseQ.isLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (courseQ.data && !isAdmin && courseQ.data.expert_id !== user.id) {
      toast.error("Você não tem acesso a este estúdio.");
      navigate({ to: "/expert/courses" });
    }
  }, [loading, user, isAdmin, courseQ.isLoading, courseQ.data, navigate]);

  const post = postQ.data;
  const course = courseQ.data;
  const isLiveActive = !!post?.is_live_active;
  const liveUrl = post?.youtube_url ?? "";

  const status: "live" | "ended" | "scheduled" = isLiveActive
    ? "live"
    : post?.live_ended_at
      ? "ended"
      : "scheduled";

  const studentUrl = typeof window !== "undefined" ? `${window.location.origin}/aluno` : "/aluno";

  const copyLiveUrl = async () => {
    if (!liveUrl) return toast.error("URL da live não definida");
    await navigator.clipboard.writeText(liveUrl);
    toast.success("URL da live copiada");
  };
  const copyStudentLink = async () => {
    await navigator.clipboard.writeText(studentUrl);
    toast.success("Link da sala do aluno copiado");
  };

  const endLive = async () => {
    if (!post) return;
    if (!confirm("Encerrar destaque da live? O player do aluno deixa de mostrar AO VIVO.")) return;
    const { error } = await supabase.from("community_posts")
      .update({ is_live_active: false, live_ended_at: new Date().toISOString() })
      .eq("id", post.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Live encerrada");
    postQ.refetch();
  };

  if (loading || courseQ.isLoading || postQ.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando estúdio…</div>;
  }
  if (!course || !post) {
    return <div className="p-8 text-sm text-muted-foreground">Live não encontrada.</div>;
  }
  if (post.post_type !== "live") {
    return <div className="p-8 text-sm text-muted-foreground">Essa publicação não é uma live.</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur px-4 md:px-6 py-3 flex items-center gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-zinc-300 hover:text-white hover:bg-white/5">
          <Link to="/expert/courses/$id" params={{ id }}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="h-4 w-4 text-pink-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 leading-none">
              Estúdio da Live · {course.title}
            </div>
            <div className="text-sm font-semibold truncate">
              {post.title ?? "Live sem título"}
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {status === "live" && (
            <Badge className="bg-pink-500 hover:bg-pink-500 text-white gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> AO VIVO
            </Badge>
          )}
          {status === "scheduled" && <Badge variant="outline" className="border-white/20 text-zinc-300">Agendada</Badge>}
          {status === "ended" && <Badge variant="outline" className="border-white/20 text-zinc-400">Encerrada</Badge>}
        </div>
      </header>

      {/* Body */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-4 p-4 md:p-6">
        {/* Left: player + actions */}
        <div className="space-y-4 min-w-0">
          {liveUrl ? (
            <YouTubeLivePlayer url={liveUrl} title={post.title ?? "Live"} />
          ) : (
            <div className="aspect-video w-full rounded-xl border border-white/10 bg-black/50 flex items-center justify-center text-sm text-zinc-500">
              URL da live não definida. Edite a publicação para configurar.
            </div>
          )}

          <Card className="bg-white/5 border-white/10 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wider text-zinc-400">Ações rápidas</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={copyLiveUrl}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar URL da live
              </Button>
              <Button size="sm" variant="secondary" onClick={copyStudentLink}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar link do aluno
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <a href={studentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir visão do aluno
                </a>
              </Button>
              {isLiveActive && (
                <Button size="sm" variant="destructive" onClick={endLive}>
                  <StopCircle className="h-3.5 w-3.5 mr-1.5" /> Encerrar destaque
                </Button>
              )}
            </div>
            {liveUrl && (
              <p className="text-[11px] text-zinc-500 break-all">URL: {liveUrl}</p>
            )}
          </Card>
        </div>

        {/* Right: chat + questions */}
        <div className="min-w-0">
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="w-full justify-start rounded-none bg-white/5 border-b border-white/10 h-10">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="questions">Perguntas</TabsTrigger>
                <TabsTrigger value="unanswered">Não respondidas</TabsTrigger>
                <TabsTrigger value="pinned">Fixadas</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="m-0">
                <LiveChat postId={post.id} courseId={post.course_id} />
              </TabsContent>

              <TabsContent value="questions" className="m-0">
                <ModerationList postId={post.id} filter="questions" />
              </TabsContent>
              <TabsContent value="unanswered" className="m-0">
                <ModerationList postId={post.id} filter="unanswered" />
              </TabsContent>
              <TabsContent value="pinned" className="m-0">
                <ModerationList postId={post.id} filter="pinned" />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Moderation list — read-only filtered view of live_chat_messages           */
/* with the same realtime sync as <LiveChat />, plus mod actions.            */
/* -------------------------------------------------------------------------- */

function ModerationList({
  postId,
  filter,
}: {
  postId: string;
  filter: "questions" | "unanswered" | "pinned";
}) {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("live_chat_messages").select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "questions") q = q.eq("is_question", true);
      if (filter === "unanswered") q = q.eq("is_question", true).eq("is_answered", false);
      if (filter === "pinned") q = q.eq("is_pinned", true);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) { toast.error(error.message); setLoading(false); return; }
      setMessages((data ?? []) as LiveMessage[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [postId, filter]);

  // Realtime sync
  useEffect(() => {
    const ch = supabase
      .channel(`studio-mod:${postId}:${filter}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "live_chat_messages", filter: `post_id=eq.${postId}` },
        (payload) => {
          setMessages((prev) => {
            if (payload.eventType === "DELETE") {
              const id = (payload.old as Partial<LiveMessage>).id;
              return prev.filter((m) => m.id !== id);
            }
            const m = payload.new as LiveMessage;
            const matches =
              (filter === "questions" && m.is_question) ||
              (filter === "unanswered" && m.is_question && !m.is_answered) ||
              (filter === "pinned" && m.is_pinned);
            if (!matches) return prev.filter((x) => x.id !== m.id);
            const next = prev.some((x) => x.id === m.id)
              ? prev.map((x) => (x.id === m.id ? m : x))
              : [m, ...prev];
            return next;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, filter]);

  const userIds = useMemo(
    () => Array.from(new Set(messages.map((m) => m.user_id))).sort(),
    [messages],
  );
  const profilesQ = useQuery({
    enabled: userIds.length > 0,
    queryKey: ["studio-mod-profiles", userIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("id, full_name, avatar_url").in("id", userIds);
      return (data ?? []) as ProfileRow[];
    },
  });
  const profileMap = useMemo(
    () => new Map((profilesQ.data ?? []).map((p) => [p.id, p])),
    [profilesQ.data],
  );

  const togglePin = async (m: LiveMessage) => {
    const { error } = await supabase.from("live_chat_messages")
      .update({ is_pinned: !m.is_pinned }).eq("id", m.id);
    if (error) toast.error(error.message);
  };
  const toggleAnswered = async (m: LiveMessage) => {
    const { error } = await supabase.from("live_chat_messages")
      .update({ is_answered: !m.is_answered }).eq("id", m.id);
    if (error) toast.error(error.message);
  };
  const deleteMessage = async (m: LiveMessage) => {
    if (!confirm("Apagar mensagem?")) return;
    const { error } = await supabase.from("live_chat_messages").delete().eq("id", m.id);
    if (error) toast.error(error.message);
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
      </div>
    );
  }
  if (messages.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-zinc-500">
        {filter === "questions" && "Nenhuma pergunta ainda."}
        {filter === "unanswered" && "Nenhuma pergunta pendente."}
        {filter === "pinned" && "Nenhuma mensagem fixada."}
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
      {messages.map((m) => {
        const p = profileMap.get(m.user_id);
        return (
          <div key={m.id} className="px-4 py-3 group hover:bg-white/5 flex items-start gap-2">
            <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {p?.avatar_url
                ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                : <span className="text-[10px] font-medium">{initials(p?.full_name)}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap text-xs">
                <span className="font-medium">{p?.full_name ?? "Usuário"}</span>
                {m.is_question && (
                  <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold inline-flex items-center gap-0.5">
                    <HelpCircle className="h-3 w-3" /> Pergunta
                  </span>
                )}
                {m.is_pinned && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold inline-flex items-center gap-0.5">
                    <Pin className="h-3 w-3" /> Fixada
                  </span>
                )}
                {m.is_answered && <span className="text-[10px] text-emerald-400">✓ respondida</span>}
                <span className="text-[10px] text-zinc-500 ml-auto">{timeLabel(m.created_at)}</span>
              </div>
              <div className={`mt-0.5 text-sm break-words ${m.is_answered ? "opacity-60" : ""}`}>
                {m.emoji ? <span className="text-xl align-middle">{m.emoji}</span> : m.body}
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => togglePin(m)}
                title={m.is_pinned ? "Desafixar" : "Fixar"}
                className="h-7 w-7 rounded hover:bg-white/10 flex items-center justify-center"
              >
                {m.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => toggleAnswered(m)}
                title={m.is_answered ? "Marcar como pendente" : "Marcar como respondida"}
                className="h-7 w-7 rounded hover:bg-white/10 flex items-center justify-center"
              >
                <Check className={`h-3.5 w-3.5 ${m.is_answered ? "text-emerald-400" : ""}`} />
              </button>
              <button
                onClick={() => deleteMessage(m)}
                title="Apagar"
                className="h-7 w-7 rounded hover:bg-destructive/20 hover:text-destructive flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
