import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FeaturedMoment } from "@/components/community/featured-moment";
import { StudentPostCard } from "@/components/community/student-post-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { aspectRatioStyle, cardWidthClass } from "@/lib/card-aspect";
import {
  Home, Hash, Layers, Radio, FileText, Star, Clock, ChevronRight,
  PlayCircle, MessageSquare, Paperclip, Sparkles, Menu, X,
} from "lucide-react";

type View =
  | { kind: "home" }
  | { kind: "topic"; id: string }
  | { kind: "lives" }
  | { kind: "materiais" }
  | { kind: "favoritos" }
  | { kind: "historico" }
  | { kind: "todos" };

const HISTORY_KEY = "andromeda:hub-history";

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}
function pushHistory(id: string) {
  const cur = loadHistory().filter((x) => x !== id);
  cur.unshift(id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(cur.slice(0, 50)));
}

function postBadge(p: any): { label: string; tone: string } | null {
  if (p.post_type === "live" && p.is_live_active) return { label: "AO VIVO", tone: "bg-red-600 text-white" };
  if (p.post_type === "live") return { label: "REPLAY", tone: "bg-white/15 text-white" };
  if (p.post_type === "material" || p.audio_url) return { label: "MATERIAL", tone: "bg-amber-500/90 text-black" };
  if (p.post_type === "notice") return { label: "AVISO", tone: "bg-indigo-500 text-white" };
  const created = p.created_at ? new Date(p.created_at).getTime() : 0;
  if (Date.now() - created < 1000 * 60 * 60 * 72) return { label: "NOVO", tone: "bg-emerald-500 text-black" };
  return null;
}

function postIcon(p: any) {
  if (p.post_type === "live") return Radio;
  if (p.audio_url || p.post_type === "material") return Paperclip;
  if (p.post_type === "notice") return Sparkles;
  if (p.youtube_url) return PlayCircle;
  return MessageSquare;
}

function PostCard({
  post, primary, onOpen, fill, aspect, aspectCustom,
}: {
  post: any;
  primary: string;
  onOpen: (p: any) => void;
  fill?: boolean;
  aspect?: string | null;
  aspectCustom?: string | null;
}) {
  const badge = postBadge(post);
  const Icon = postIcon(post);
  const thumb = post.cover_url || post.image_url;
  const created = post.created_at ? new Date(post.created_at) : null;
  const dateLabel = created
    ? created.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "";
  const widthClass = fill ? "w-full" : `shrink-0 ${cardWidthClass(aspect)}`;
  const ratio = aspectRatioStyle(aspect, aspectCustom);

  return (
    <button
      onClick={() => onOpen(post)}
      className={`group relative ${widthClass} rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#141432] to-[#0a0a18] text-left transition-all duration-500 hover:scale-[1.04] hover:border-white/30 hover:z-10 hover:shadow-[0_24px_60px_-20px_var(--hub-glow)]`}
      style={{ ["--hub-glow" as any]: `${primary}88`, ...ratio }}

    >
      {thumb ? (
        <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-110" loading="lazy" />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `radial-gradient(120% 80% at 30% 20%, ${primary}66, transparent 60%), linear-gradient(135deg, #1a1740, #0a0a18)` }}
        >
          <Icon className="h-16 w-16 opacity-30" />
        </div>
      )}
      {/* Cinematic gradient floor */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      {/* Top subtle sheen */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent opacity-70" />
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(70% 50% at 50% 100%, ${primary}55, transparent 70%)` }}
      />
      {/* Hover border highlight */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ring-1 ring-inset"
        style={{ boxShadow: `inset 0 0 0 1px ${primary}66` }}
      />

      {badge && (
        <span className={`absolute top-3 left-3 ${badge.tone} text-[10px] font-bold tracking-[0.16em] px-2.5 py-1 rounded-md shadow-lg backdrop-blur`}>
          {badge.label}
        </span>
      )}
      {post.is_pinned && (
        <span className="absolute top-3 right-3 bg-black/70 backdrop-blur text-[9px] uppercase tracking-wider text-white/80 px-2 py-1 rounded-md">
          fixado
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/70">
          <Icon className="h-2.5 w-2.5" />
          <span>{post.post_type === "live" ? "Encontro" : post.post_type === "notice" ? "Aviso" : "Publicação"}</span>
          {dateLabel && <span className="opacity-50">· {dateLabel}</span>}
        </div>
        <div className="text-sm font-bold leading-tight line-clamp-3 drop-shadow-lg">
          {post.title || post.body?.slice(0, 70) || "Sem título"}
        </div>
      </div>

    </button>
  );
}


function Rail({
  title, description, posts, primary, onOpen, onSeeAll, aspect, aspectCustom,
}: {
  title: string;
  description?: string;
  posts: any[];
  primary: string;
  onOpen: (p: any) => void;
  onSeeAll?: () => void;
  aspect?: string | null;
  aspectCustom?: string | null;
}) {
  if (!posts.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-xs sm:text-sm text-white/55 mt-0.5 line-clamp-1">{description}</p>}
        </div>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-[11px] uppercase tracking-[0.2em] text-white/70 hover:text-white flex items-center gap-1 shrink-0 transition">
            Ver tudo <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-10">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-6 lg:px-10 pb-4 pt-1 snap-x snap-mandatory scrollbar-thin">
          {posts.map((p) => (
            <div key={p.id} className="snap-start">
              <PostCard post={p} primary={primary} onOpen={onOpen} aspect={aspect} aspectCustom={aspectCustom} />
            </div>
          ))}
        </div>
      </div>
    </section>

  );
}


export function CommunityHub({
  course,
  channels,
  isPreview,
}: {
  course: any;
  channels: any[];
  isPreview: boolean;
}) {
  const { user } = useAuth();
  const [view, setView] = useState<View>({ kind: "home" });
  const [openPost, setOpenPost] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(() => loadHistory());

  const primary = course.primary_color || "#6c4dff";
  const accent = course.accent_color || "#00b8ff";

  const { data: posts } = useQuery({
    enabled: !!course?.id,
    queryKey: ["hub-posts", course.id, isPreview],
    queryFn: async () => {
      let q = supabase
        .from("community_posts")
        .select("*")
        .eq("course_id", course.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (!isPreview) q = q.eq("status", "published");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myReactions } = useQuery({
    enabled: !!user && !!course?.id,
    queryKey: ["hub-my-reactions", course.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_reactions")
        .select("post_id")
        .eq("user_id", user!.id);
      return new Set((data ?? []).map((r: any) => r.post_id));
    },
  });

  const all = posts ?? [];
  const byChannel = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const p of all) {
      if (!m.has(p.channel_id)) m.set(p.channel_id, []);
      m.get(p.channel_id)!.push(p);
    }
    return m;
  }, [all]);

  const lives = all.filter((p) => p.post_type === "live");
  const liveNow = lives.filter((p) => p.is_live_active);
  const materials = all.filter((p) => p.post_type === "material" || p.audio_url);
  const favorites = all.filter((p) => myReactions?.has(p.id));
  const recent = history.map((id) => all.find((p) => p.id === id)).filter(Boolean) as any[];
  const newest = [...all].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 12);

  const handleOpen = (p: any) => {
    setOpenPost(p);
    pushHistory(p.id);
    setHistory(loadHistory());
  };

  const menu = [
    { key: "home", label: "Início", icon: Home, onClick: () => setView({ kind: "home" }) },
    { key: "topics", label: "Tópicos", icon: Layers, onClick: () => { setView({ kind: "home" }); setTimeout(() => document.getElementById("hub-topics")?.scrollIntoView({ behavior: "smooth" }), 50); } },
    { key: "todos", label: "Conteúdos", icon: Hash, onClick: () => setView({ kind: "todos" }) },
    { key: "lives", label: "Lives", icon: Radio, onClick: () => setView({ kind: "lives" }), badge: liveNow.length || undefined },
    { key: "materiais", label: "Materiais", icon: FileText, onClick: () => setView({ kind: "materiais" }) },
    { key: "favoritos", label: "Favoritos", icon: Star, onClick: () => setView({ kind: "favoritos" }) },
    { key: "historico", label: "Histórico", icon: Clock, onClick: () => setView({ kind: "historico" }) },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Backdrop ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{
          background: `radial-gradient(50% 40% at 15% 10%, ${primary}22, transparent 60%), radial-gradient(40% 35% at 90% 80%, ${accent}1f, transparent 60%)`,
        }}
      />

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-20 left-3 z-40 h-10 w-10 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center"
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 left-0 z-50 h-screen lg:h-[calc(100vh-4rem)] w-[260px] shrink-0 transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="m-3 lg:m-4 h-[calc(100%-1.5rem)] lg:h-[calc(100%-2rem)] rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 flex flex-col"
          style={{ boxShadow: `0 30px 80px -30px ${primary}55, inset 0 1px 0 rgba(255,255,255,0.05)` }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 min-w-0">
              {course.cover_url ? (
                <img src={course.cover_url} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/20" />
              ) : (
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
                  {course.title?.[0] ?? "A"}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Comunidade</div>
                <div className="font-semibold truncate text-sm">{course.title}</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto">
            {menu.map((m) => {
              const active =
                (m.key === "home" && view.kind === "home") ||
                (m.key === "todos" && view.kind === "todos") ||
                (m.key === "lives" && view.kind === "lives") ||
                (m.key === "materiais" && view.kind === "materiais") ||
                (m.key === "favoritos" && view.kind === "favoritos") ||
                (m.key === "historico" && view.kind === "historico");
              return (
                <button
                  key={m.key}
                  onClick={() => { m.onClick(); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition relative ${
                    active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <m.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{m.label}</span>
                  {m.badge ? (
                    <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">{m.badge}</span>
                  ) : null}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full"
                      style={{ background: `linear-gradient(180deg, ${primary}, ${accent})`, boxShadow: `0 0 14px ${primary}` }} />
                  )}
                </button>
              );
            })}
          </nav>

          {channels?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 px-1">Tópicos</div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {channels.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => { setView({ kind: "topic", id: c.id }); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition ${
                      view.kind === "topic" && view.id === c.id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }`}
                  >
                    <Hash className="h-3 w-3 opacity-60" />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />}

      {/* Main */}
      <div className="lg:pl-[260px]">
        {view.kind === "home" && (
          <>
            {/* Hero cinematográfico */}
            <section className="relative w-full overflow-hidden" style={{ minHeight: "56vh" }}>
              <div className="absolute inset-0 animate-ken-burns" style={
                course.cover_url
                  ? { backgroundImage: `url(${course.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: `linear-gradient(135deg, ${primary}, ${accent})` }
              } />
              {/* Cinematic layered overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06060f] via-[#06060f]/80 to-[#06060f]/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06060f]/95 via-[#06060f]/40 to-transparent" />
              <div className="absolute inset-0" style={{
                background: "radial-gradient(ellipse at 70% 50%, transparent 0%, rgba(6,6,15,0.5) 70%, rgba(6,6,15,0.95) 100%)"
              }} />
              {/* Animated glows */}
              <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] rounded-full blur-[180px] animate-indigo-pulse"
                style={{ background: `${primary}44` }} />
              <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[160px] opacity-50"
                style={{ background: `${accent}33` }} />
              {/* Subtle vignette grain */}
              <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
                }}
              />

              <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12 flex flex-col justify-end pb-12 pt-20 lg:pt-24" style={{ minHeight: "56vh" }}>
                <span className="text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.28em] w-fit mb-4 backdrop-blur"
                  style={{ background: `${primary}cc`, boxShadow: `0 0 28px ${primary}99` }}>
                  Comunidade
                </span>
                <h1 className="font-cinema-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[0.95] drop-shadow-2xl max-w-4xl">
                  {(course.title ?? "").toUpperCase()}
                </h1>
                {course.description && (
                  <p className="mt-4 text-white/85 text-base md:text-lg max-w-2xl leading-relaxed drop-shadow-lg line-clamp-2">{course.description}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-6">

                  <button
                    onClick={() => {
                      const next = recent[0] ?? newest[0];
                      if (next) handleOpen(next);
                    }}
                    className="px-6 py-3 bg-white text-[#06060f] font-bold rounded-lg flex items-center gap-2 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl text-sm"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {recent.length ? "Continuar jornada" : "Explorar conteúdos"}
                  </button>
                  {liveNow.length > 0 && (
                    <button
                      onClick={() => handleOpen(liveNow[0])}
                      className="px-5 py-3 rounded-lg font-semibold flex items-center gap-2 border border-red-500/50 bg-red-500/20 hover:bg-red-500/30 transition backdrop-blur text-sm"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]" />
                      Ao vivo agora
                    </button>
                  )}

                </div>
              </div>
            </section>


            <FeaturedMoment data={course as any} />

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-8 space-y-10">
              {liveNow.length > 0 && (
                <Rail title="Acontecendo agora" description="Encontros ao vivo abertos para participação"
                  posts={liveNow} primary={primary} onOpen={handleOpen} onSeeAll={() => setView({ kind: "lives" })} />
              )}

              {recent.length > 0 && (
                <Rail title="Continue de onde parou" posts={recent.slice(0, 10)} primary={primary} onOpen={handleOpen} />
              )}

              {newest.length > 0 && (
                <Rail title="Novidades" description="Publicações mais recentes da comunidade"
                  posts={newest} primary={primary} onOpen={handleOpen} onSeeAll={() => setView({ kind: "todos" })} />
              )}

              <div id="hub-topics" className="space-y-12 pt-2">
                {channels.map((c: any) => {
                  const list = byChannel.get(c.id) ?? [];
                  if (!list.length) return null;
                  return (
                    <Rail
                      key={c.id}
                      title={c.name}
                      description={c.description ?? undefined}
                      posts={list}
                      primary={primary}
                      onOpen={handleOpen}
                      onSeeAll={() => setView({ kind: "topic", id: c.id })}
                    />
                  );
                })}
              </div>

              {materials.length > 0 && (
                <Rail title="Materiais de apoio" posts={materials} primary={primary} onOpen={handleOpen}
                  onSeeAll={() => setView({ kind: "materiais" })} />
              )}

              {all.length === 0 && (
                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-16 text-center text-white/60">
                  Esta comunidade ainda não tem publicações.
                </div>
              )}
            </main>
          </>
        )}

        {view.kind !== "home" && (
          <FilteredView
            view={view}
            all={all}
            channels={channels}
            byChannel={byChannel}
            lives={lives}
            materials={materials}
            favorites={favorites}
            recent={recent}
            primary={primary}
            onOpen={handleOpen}
            onBack={() => setView({ kind: "home" })}
          />
        )}
      </div>

      <Dialog open={!!openPost} onOpenChange={(o) => !o && setOpenPost(null)}>
        <DialogContent className="max-w-3xl p-0 border-white/10 bg-[#0a0a14] overflow-hidden max-h-[90vh] overflow-y-auto">
          {openPost && <StudentPostCard post={openPost} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilteredView({
  view, all, channels, byChannel, lives, materials, favorites, recent, primary, onOpen, onBack,
}: {
  view: View;
  all: any[];
  channels: any[];
  byChannel: Map<string, any[]>;
  lives: any[];
  materials: any[];
  favorites: any[];
  recent: any[];
  primary: string;
  onOpen: (p: any) => void;
  onBack: () => void;
}) {
  let title = "";
  let description = "";
  let list: any[] = [];

  if (view.kind === "topic") {
    const c = channels.find((x) => x.id === view.id);
    title = c?.name ?? "Tópico";
    description = c?.description ?? "";
    list = byChannel.get(view.id) ?? [];
  } else if (view.kind === "lives") {
    title = "Lives"; description = "Encontros ao vivo e replays"; list = lives;
  } else if (view.kind === "materiais") {
    title = "Materiais"; description = "Documentos, áudios e materiais de apoio"; list = materials;
  } else if (view.kind === "favoritos") {
    title = "Favoritos"; description = "Publicações que você reagiu"; list = favorites;
  } else if (view.kind === "historico") {
    title = "Histórico"; description = "Conteúdos que você visitou"; list = recent;
  } else if (view.kind === "todos") {
    title = "Todos os conteúdos"; description = "Catálogo completo da comunidade"; list = all;
  }

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-32 pb-20 space-y-10">
      <header className="space-y-2">
        <button onClick={onBack} className="text-xs uppercase tracking-[0.22em] text-white/50 hover:text-white">← Voltar ao hub</button>
        <h1 className="font-cinema-display text-3xl md:text-5xl font-extrabold tracking-tighter">{title}</h1>
        {description && <p className="text-white/60">{description}</p>}
      </header>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-16 text-center text-white/60">
          Nada por aqui ainda.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {list.map((p) => (
            <PostCard key={p.id} post={p} primary={primary} onOpen={onOpen} fill />
          ))}
        </div>
      )}
    </main>
  );
}
