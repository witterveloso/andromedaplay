import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, PlayCircle, Eye, MessageSquare, Hash, Pin } from "lucide-react";
import { VideoPlayer } from "@/lib/video-player";
import { StudentPostCard } from "@/components/community/student-post-card";
import { FeaturedMoment } from "@/components/community/featured-moment";


export const Route = createFileRoute("/aluno/c/$slug")({
  component: StudentCourse,
  validateSearch: (s: Record<string, unknown>) => ({ preview: s.preview === "1" || s.preview === 1 || s.preview === true ? 1 : undefined }),
});

function StudentCourse() {
  const { slug } = Route.useParams();
  const search = useSearch({ from: "/aluno/c/$slug" }) as { preview?: number };
  const isPreview = search.preview === 1;
  const { user, signOut, loading, session } = useAuth();
  const navigate = useNavigate();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);


  const { data: course } = useQuery({
    queryKey: ["course-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: modules } = useQuery({
    enabled: !!course,
    queryKey: ["course-content", course?.id, isPreview],
    queryFn: async () => {
      const modQ = supabase.from("modules").select("*").eq("course_id", course!.id).order("position");
      const { data: mods, error: e1 } = await modQ;

      if (e1) throw e1;
      let lessonsQ = supabase.from("lessons").select("*").in("module_id", (mods ?? []).map((m) => m.id)).order("position");
      if (!isPreview) lessonsQ = lessonsQ.eq("status", "published");
      const { data: lessons, error: e2 } = await lessonsQ;
      if (e2) throw e2;
      return (mods ?? []).map((m) => ({ ...m, lessons: (lessons ?? []).filter((l) => l.module_id === m.id) }));
    },
  });

  const { data: channels } = useQuery({
    enabled: !!course,
    queryKey: ["course-channels", course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_channels")
        .select("*")
        .eq("course_id", course!.id)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: channelPosts } = useQuery({
    enabled: !!activeChannelId,
    queryKey: ["channel-posts", activeChannelId, isPreview],
    queryFn: async () => {
      let q = supabase
        .from("community_posts")
        .select("*")
        .eq("channel_id", activeChannelId!)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (!isPreview) q = q.eq("status", "published");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Auto-select first channel so community posts show as a feed by default
  useEffect(() => {
    if (course?.course_type === "community" && !activeChannelId && !activeLessonId && channels && channels.length > 0) {
      setActiveChannelId(channels[0].id);
    }
  }, [course?.course_type, channels, activeChannelId, activeLessonId]);

  if (!course) {
    return <div className="p-8 text-muted-foreground">Curso não disponível.</div>;
  }

  const activeLesson = modules?.flatMap((m) => m.lessons).find((l) => l.id === activeLessonId)
    ?? modules?.[0]?.lessons?.[0];
  const activeChannel = channels?.find((c) => c.id === activeChannelId);
  const hasContent = (modules?.length ?? 0) > 0 || (channels?.length ?? 0) > 0;
  const pinnedPosts = (channelPosts ?? []).filter((p: any) => p.is_pinned);
  const regularPosts = (channelPosts ?? []).filter((p: any) => !p.is_pinned);


  return (
    <div className="min-h-screen" style={{ background: course.background_color, color: course.text_color, fontFamily: course.font_family }}>
      {isPreview && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-6 py-2 text-amber-200 text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span>
            Você está visualizando este curso no modo <strong>preview</strong>
            {course.status !== "published" && <> — status atual: <strong>{course.status === "draft" ? "rascunho" : course.status}</strong> (alunos ainda não veem este conteúdo)</>}
            .
          </span>
          <Link to="/expert/preview" className="ml-auto underline">Voltar ao painel</Link>
        </div>
      )}

      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPreview ? (
              <Link to="/expert/preview" className="opacity-70 hover:opacity-100 text-sm flex items-center">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar ao painel
              </Link>
            ) : (
              <Link to="/aluno" className="opacity-70 hover:opacity-100 text-sm flex items-center">
                <ChevronLeft className="h-4 w-4 mr-1" /> Meus cursos
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-70">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1.5 h-3.5 w-3.5" /> Sair</Button>
          </div>
        </div>
      </header>

      {course.course_type === "community" ? (
        <>
          {/* Banner cinematográfico premium */}
          <section
            className="relative w-full overflow-hidden"
            style={{
              background: course.cover_url
                ? `url(${course.cover_url}) center/cover`
                : `linear-gradient(135deg, ${course.primary_color}, ${course.accent_color})`,
              minHeight: "28vh",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
            <div className="relative max-w-6xl mx-auto px-6 flex flex-col items-center justify-center text-center" style={{ minHeight: "28vh" }}>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight drop-shadow-lg">{course.title}</h1>
            </div>
          </section>

          <FeaturedMoment data={course as any} />



          {/* Feed central + sidebar */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-8">
            <div className="space-y-6 min-w-0">
              {activeChannel && (
                <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                  {activeChannel.icon_url ? (
                    <img src={activeChannel.icon_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <Hash className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold truncate">{activeChannel.name}</h2>
                    {activeChannel.description && (
                      <p className="text-xs opacity-70 truncate">{activeChannel.description}</p>
                    )}
                  </div>
                </div>
              )}

              {!activeChannel ? (
                <Card className="p-12 text-center opacity-80 border-white/5 bg-white/[0.03]">
                  Este produto ainda não possui conteúdos publicados.
                </Card>
              ) : (channelPosts?.length ?? 0) === 0 ? (
                <Card className="p-12 text-center opacity-80 border-white/5 bg-white/[0.03]">
                  Nenhuma publicação ainda neste canal.
                </Card>
              ) : (
                <div className="space-y-8">
                  {pinnedPosts.length > 0 && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-70">
                        <Pin className="h-3.5 w-3.5" />
                        Publicações fixadas
                      </div>
                      <div className="space-y-5">
                        {pinnedPosts.map((p: any) => <StudentPostCard key={p.id} post={p} />)}
                      </div>
                    </section>
                  )}
                  {regularPosts.length > 0 && (
                    <section className="space-y-4">
                      {pinnedPosts.length > 0 && (
                        <div className="text-xs uppercase tracking-wider opacity-70">Todas as publicações</div>
                      )}
                      <div className="space-y-5">
                        {regularPosts.map((p: any) => <StudentPostCard key={p.id} post={p} />)}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              <Card className="p-5 border-white/5 bg-white/[0.03]">
                <div className="text-xs uppercase tracking-wider opacity-60 mb-2">Sobre a comunidade</div>
                <div className="font-semibold mb-2">{course.title}</div>
                <div className="flex items-center justify-between text-sm opacity-80">
                  <span>Publicações</span>
                  <span className="tabular-nums font-medium">{channelPosts?.length ?? 0}</span>
                </div>
              </Card>

              {(channels?.length ?? 0) > 0 && (
                <Card className="p-5 border-white/5 bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-wider opacity-60 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" /> Canais
                  </div>
                  <ul className="space-y-1">
                    {channels!.map((c: any) => (
                      <li key={c.id}>
                        <button
                          onClick={() => { setActiveLessonId(null); setActiveChannelId(c.id); }}
                          className={`w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                            activeChannel?.id === c.id ? "bg-white/10" : "hover:bg-white/5"
                          }`}
                        >
                          {c.icon_url ? (
                            <img src={c.icon_url} alt="" className="h-5 w-5 rounded object-cover" />
                          ) : (
                            <Hash className="h-3.5 w-3.5 opacity-70" />
                          )}
                          <span className="truncate">{c.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {pinnedPosts.length > 0 && (
                <Card className="p-5 border-white/5 bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-wider opacity-60 mb-3 flex items-center gap-2">
                    <Pin className="h-3.5 w-3.5" /> Fixados
                  </div>
                  <ul className="space-y-2">
                    {pinnedPosts.slice(0, 5).map((p: any) => (
                      <li key={p.id} className="text-sm opacity-90 line-clamp-2 leading-snug">
                        {p.title || p.body?.slice(0, 80) || "Publicação fixada"}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </aside>
          </main>
        </>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
            <h1 className="text-2xl font-semibold mb-4">{course.title}</h1>
            {activeLesson && (activeLesson.video_url || activeLesson.youtube_url || activeLesson.video_embed || activeLesson.video_id) ? (
              <VideoPlayer
                title={activeLesson.title}
                config={{
                  provider: (activeLesson.video_provider as any) ?? "youtube",
                  url: activeLesson.video_url,
                  externalId: activeLesson.video_id,
                  embed: activeLesson.video_embed,
                  legacyYoutubeUrl: activeLesson.youtube_url,
                }}
              />
            ) : (
              <Card className="p-12 text-center opacity-80">
                <p>Selecione uma aula ao lado para começar.</p>
              </Card>
            )}
            {activeLesson && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold">{activeLesson.title}</h2>
                {activeLesson.description && <p className="text-sm opacity-80 mt-1">{activeLesson.description}</p>}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {!hasContent ? (
              <Card className="p-6 text-sm opacity-80">Este produto ainda não possui conteúdos publicados.</Card>
            ) : (
              modules?.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="font-semibold mb-2">{m.title}</div>
                  <ul className="space-y-1">
                    {m.lessons.map((l: any) => (
                      <li key={l.id}>
                        <button
                          onClick={() => { setActiveChannelId(null); setActiveLessonId(l.id); }}
                          className={`w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                            activeLesson?.id === l.id ? "bg-primary/20" : "hover:bg-muted"
                          }`}
                        >
                          <PlayCircle className="h-3.5 w-3.5 opacity-70" />
                          {l.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))
            )}
          </aside>
        </main>
      )}
    </div>
  );
}

