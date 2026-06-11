import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Send, Pin, PinOff, Check, Trash2, ArrowDown, Loader2,
  HelpCircle, Users, Bell, BellOff,
} from "lucide-react";
import { toast } from "sonner";

const LIVE_EMOJIS = ["❤️", "🔥", "👏", "😂", "🙏", "🎉"];
const PAGE_SIZE = 50;

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

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Tiny WebAudio beep so we don't bundle an asset
function playBeep() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.start();
    o.stop(ctx.currentTime + 0.26);
    setTimeout(() => ctx.close(), 400);
  } catch { /* noop */ }
}

export function LiveChat({ postId, courseId }: { postId: string; courseId?: string }) {
  const { user, isAdmin } = useAuth();
  const [text, setText] = useState("");
  const [asQuestion, setAsQuestion] = useState(false);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [unread, setUnread] = useState(0);
  const [viewerCount, setViewerCount] = useState(1);
  const [floats, setFloats] = useState<{ id: number; emoji: string }[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const floatIdRef = useRef(0);

  // Moderator detection
  const courseQ = useQuery({
    enabled: !!courseId && !!user,
    queryKey: ["course-expert", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("expert_id").eq("id", courseId!).maybeSingle();
      return data?.expert_id ?? null;
    },
  });
  const isModerator = isAdmin || (!!user && courseQ.data === user.id);

  // Restore sound preference (moderators only)
  useEffect(() => {
    if (!isModerator) return;
    const v = localStorage.getItem(`live-chat-sound:${postId}`);
    if (v === "1") setSoundOn(true);
  }, [isModerator, postId]);
  useEffect(() => {
    if (!isModerator) return;
    localStorage.setItem(`live-chat-sound:${postId}`, soundOn ? "1" : "0");
  }, [soundOn, isModerator, postId]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoadingInitial(true);
    setMessages([]);
    setHasMore(true);
    (async () => {
      const { data, error } = await supabase
        .from("live_chat_messages")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (cancelled) return;
      if (error) { toast.error(error.message); setLoadingInitial(false); return; }
      const ordered = (data as LiveMessage[]).slice().reverse();
      setMessages(ordered);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
      setLoadingInitial(false);
      requestAnimationFrame(() => scrollToBottom("auto"));
    })();
    return () => { cancelled = true; };
  }, [postId]);

  // Realtime — messages
  useEffect(() => {
    const ch = supabase
      .channel(`live-chat:${postId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `post_id=eq.${postId}` },
        (payload) => {
          const m = payload.new as LiveMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.emoji) {
            const id = ++floatIdRef.current;
            setFloats((p) => [...p, { id, emoji: m.emoji! }]);
            setTimeout(() => setFloats((p) => p.filter((f) => f.id !== id)), 1800);
          }
          // Sound: only for moderator, only for incoming (not own) text messages
          if (soundOn && isModerator && m.user_id !== user?.id && (m.body || m.is_question)) {
            playBeep();
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_chat_messages", filter: `post_id=eq.${postId}` },
        (payload) => {
          const m = payload.new as LiveMessage;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "live_chat_messages", filter: `post_id=eq.${postId}` },
        (payload) => {
          const old = payload.old as Partial<LiveMessage>;
          if (old.id) setMessages((prev) => prev.filter((x) => x.id !== old.id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, soundOn, isModerator, user?.id]);

  // Realtime — presence (viewer count)
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`live-presence:${postId}`, {
      config: { presence: { key: user.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setViewerCount(Math.max(1, Object.keys(state).length));
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ at: Date.now() });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [postId, user]);

  // Profiles
  const userIds = useMemo(
    () => Array.from(new Set(messages.map((m) => m.user_id))).sort(),
    [messages],
  );
  const profilesQ = useQuery({
    enabled: userIds.length > 0,
    queryKey: ["live-chat-profiles", userIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      return (data ?? []) as ProfileRow[];
    },
  });
  const profileMap = useMemo(
    () => new Map((profilesQ.data ?? []).map((p) => [p.id, p])),
    [profilesQ.data],
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setUnread(0);
  }, []);

  useEffect(() => {
    if (loadingInitial) return;
    if (autoScroll) requestAnimationFrame(() => scrollToBottom("smooth"));
    else setUnread((u) => u + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(nearBottom);
    if (nearBottom) setUnread(0);
  };

  const loadOlder = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0].created_at;
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const { data, error } = await supabase
      .from("live_chat_messages").select("*")
      .eq("post_id", postId).lt("created_at", oldest)
      .order("created_at", { ascending: false }).limit(PAGE_SIZE);
    setLoadingMore(false);
    if (error) { toast.error(error.message); return; }
    const older = (data as LiveMessage[]).slice().reverse();
    setMessages((prev) => [...older, ...prev]);
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  };

  const send = useMutation({
    mutationFn: async (payload: { body?: string; emoji?: string; is_question?: boolean }) => {
      if (!user) throw new Error("Faça login para participar");
      const { error } = await supabase.from("live_chat_messages").insert({
        post_id: postId,
        user_id: user.id,
        body: payload.body ?? null,
        emoji: payload.emoji ?? null,
        is_question: payload.is_question ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      setAsQuestion(false);
      setAutoScroll(true);
      requestAnimationFrame(() => scrollToBottom("smooth"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
    const { error } = await supabase.from("live_chat_messages").delete().eq("id", m.id);
    if (error) toast.error(error.message);
  };

  const pinned = messages.filter((m) => m.is_pinned);

  return (
    <div className="border-t bg-gradient-to-b from-pink-500/5 to-transparent">
      <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium border-b">
        <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
        Chat ao vivo
        <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
          <Users className="h-3 w-3" /> {viewerCount} assistindo
        </span>
        <span className="text-muted-foreground">· {messages.length} msgs</span>
        {isModerator && (
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            title={soundOn ? "Desativar som" : "Ativar som"}
            className="ml-1 h-6 w-6 rounded hover:bg-accent flex items-center justify-center"
          >
            {soundOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5 opacity-60" />}
          </button>
        )}
      </div>

      {pinned.length > 0 && (
        <div className="px-4 py-2 border-b bg-amber-500/10 space-y-1.5">
          {pinned.map((m) => {
            const p = profileMap.get(m.user_id);
            return (
              <div key={`pin-${m.id}`} className="flex items-start gap-2 text-sm">
                <Pin className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-xs mr-2">{p?.full_name ?? "Usuário"}</span>
                  <span className="text-foreground/90 break-words">{m.emoji ?? m.body}</span>
                </div>
                {isModerator && (
                  <button onClick={() => togglePin(m)} className="text-xs text-muted-foreground hover:text-foreground">
                    <PinOff className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="relative overflow-hidden">
        <div ref={listRef} onScroll={onScroll} className="max-h-72 overflow-y-auto px-4 py-3 space-y-2">
          {hasMore && messages.length > 0 && (
            <div className="flex justify-center pb-2">
              <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingMore} className="h-7 text-xs">
                {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "Carregar anteriores"}
              </Button>
            </div>
          )}
          {loadingInitial ? (
            <p className="text-xs text-muted-foreground text-center py-4">Carregando…</p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Seja o primeiro a interagir.</p>
          ) : (
            messages.map((m) => {
              const p = profileMap.get(m.user_id);
              const isOwn = user?.id === m.user_id;
              return (
                <div
                  key={m.id}
                  className={`group flex items-start gap-2 text-sm rounded-md px-1 -mx-1 ${
                    m.is_answered ? "opacity-60" : ""
                  } ${m.is_question ? "bg-blue-500/10 border-l-2 border-blue-500 pl-2" : ""}`}
                >
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-medium">{initials(p?.full_name)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-xs">{p?.full_name ?? "Usuário"}</span>
                      {m.is_question && (
                        <span className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold inline-flex items-center gap-0.5">
                          <HelpCircle className="h-3 w-3" /> Pergunta
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{timeLabel(m.created_at)}</span>
                      {m.is_answered && <span className="text-[10px] text-emerald-500">✓ respondida</span>}
                    </div>
                    {m.emoji ? (
                      <span className="text-xl align-middle">{m.emoji}</span>
                    ) : (
                      <span className="text-foreground/90 break-words">{m.body}</span>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                    {isModerator && (
                      <>
                        <button
                          onClick={() => togglePin(m)}
                          title={m.is_pinned ? "Desafixar" : "Fixar"}
                          className="h-6 w-6 rounded hover:bg-accent flex items-center justify-center"
                        >
                          {m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => toggleAnswered(m)}
                          title={m.is_answered ? "Marcar como pendente" : "Marcar como respondida"}
                          className="h-6 w-6 rounded hover:bg-accent flex items-center justify-center"
                        >
                          <Check className={`h-3 w-3 ${m.is_answered ? "text-emerald-500" : ""}`} />
                        </button>
                      </>
                    )}
                    {(isModerator || isOwn) && (
                      <button
                        onClick={() => deleteMessage(m)}
                        title="Apagar"
                        className="h-6 w-6 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating emoji reactions */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full">
          {floats.map((f) => (
            <span
              key={f.id}
              style={{ left: `${20 + (f.id * 17) % 60}%` }}
              className="absolute bottom-2 text-2xl animate-float-up"
            >
              {f.emoji}
            </span>
          ))}
        </div>

        {!autoScroll && (
          <button
            onClick={() => { setAutoScroll(true); scrollToBottom("smooth"); }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs shadow-lg hover:opacity-90"
          >
            <ArrowDown className="h-3 w-3" />
            {unread > 0 ? `${unread} nova${unread > 1 ? "s" : ""} mensage${unread > 1 ? "ns" : "m"}` : "Ir para o final"}
          </button>
        )}
      </div>

      <div className="px-4 py-2 border-t space-y-2">
        <div className="flex flex-wrap gap-1">
          {LIVE_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => send.mutate({ emoji: e })}
              disabled={send.isPending || !user}
              className="h-8 w-8 rounded-md hover:bg-accent text-lg transition-transform hover:scale-125 active:scale-95"
            >
              {e}
            </button>
          ))}
        </div>
        <form
          onSubmit={(ev) => { ev.preventDefault(); const t = text.trim(); if (t) send.mutate({ body: t, is_question: asQuestion }); }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setAsQuestion((v) => !v)}
            disabled={!user}
            title="Marcar como pergunta"
            className={`h-9 w-9 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
              asQuestion ? "bg-blue-500 text-white border-blue-500" : "hover:bg-accent"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? (asQuestion ? "Faça sua pergunta..." : "Envie uma mensagem...") : "Faça login para participar"}
            className="h-9"
            maxLength={300}
            disabled={!user}
          />
          <Button type="submit" size="icon" className="h-9 w-9" disabled={!text.trim() || send.isPending || !user}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
