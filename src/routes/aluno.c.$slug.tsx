import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, PlayCircle, Eye, Lock, Link as LinkIcon, ExternalLink } from "lucide-react";
import { VideoPlayer, type VideoProgressData } from "@/lib/video-player";
import { CommunityHub } from "@/components/community/community-hub";
import { LessonMaterials } from "@/components/student/lesson-materials";
import { LessonCatalog } from "@/components/student/lesson-catalog";



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

  // --- Lesson progress persistence -------------------------------------
  const qc = useQueryClient();
  const lastPersistRef = useRef<{ lessonId: string; ts: number } | null>(null);

  const upsertProgress = useCallback(
    async (args: {
      lessonId: string;
      courseId: string;
      percent?: number;
      seconds?: number;
      duration?: number | null;
      completed?: boolean;
    }) => {
      if (!user?.id) return;
      const nowIso = new Date().toISOString();
      const payload: Record<string, any> = {
        student_id: user.id,
        lesson_id: args.lessonId,
        course_id: args.courseId,
        updated_at: nowIso,
      };
      if (typeof args.percent === "number") payload.percent = Math.max(0, Math.min(100, Math.round(args.percent)));
      if (typeof args.seconds === "number") payload.seconds_watched = args.seconds;
      if (args.duration && isFinite(args.duration)) payload.duration_seconds = args.duration;
      if (args.completed) {
        payload.completed = true;
        payload.completed_at = nowIso;
        payload.percent = 100;
      }
      const { error } = await supabase
        .from("lesson_progress")
        .upsert(payload, { onConflict: "student_id,lesson_id" });
      if (error) console.warn("lesson_progress upsert failed", error.message);
    },
    [user?.id],
  );

  // Mark a lesson as "started" when the user opens it (does not clobber existing percent).
  useEffect(() => {
    if (!user?.id || !course?.id || !activeLessonId) return;
    void supabase
      .from("lesson_progress")
      .upsert(
        {
          student_id: user.id,
          lesson_id: activeLessonId,
          course_id: course.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,lesson_id", ignoreDuplicates: true },
      )
      .then(({ error }) => {
        if (error && !/duplicate/i.test(error.message)) {
          console.warn("started upsert failed", error.message);
        }
      });
  }, [user?.id, course?.id, activeLessonId]);

  const handleProgress = useCallback(
    (d: VideoProgressData) => {
      if (!activeLessonId || !course?.id) return;
      // Throttle to at most one upsert per lesson per 5s.
      const now = Date.now();
      const last = lastPersistRef.current;
      if (last && last.lessonId === activeLessonId && now - last.ts < 5000) return;
      lastPersistRef.current = { lessonId: activeLessonId, ts: now };
      void upsertProgress({
        lessonId: activeLessonId,
        courseId: course.id,
        percent: d.percent,
        seconds: d.seconds,
        duration: d.duration,
      });
    },
    [activeLessonId, course?.id, upsertProgress],
  );

  const handleEnded = useCallback(() => {
    if (!activeLessonId || !course?.id) return;
    void upsertProgress({ lessonId: activeLessonId, courseId: course.id, completed: true }).then(() => {
      qc.invalidateQueries({ queryKey: ["lesson-progress", course.id, user?.id] });
      qc.invalidateQueries({ queryKey: ["course-progress-summary", user?.id] });
    });
  }, [activeLessonId, course?.id, qc, upsertProgress, user?.id]);

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
    <div className="andromeda-cinema min-h-screen" style={{ fontFamily: course.font_family || undefined }}>
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

      <header className="absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-[#0a0a1a] to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPreview ? (
              <Link to="/expert/preview" className="text-white/70 hover:text-white text-sm flex items-center">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar ao painel
              </Link>
            ) : (
              <Link to="/aluno" preload="render" className="text-white/70 hover:text-white text-sm flex items-center">
                <ChevronLeft className="h-4 w-4 mr-1" /> Meus cursos
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/60">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-white/80 hover:text-white hover:bg-white/5"><LogOut className="mr-1.5 h-3.5 w-3.5" /> Sair</Button>
          </div>
        </div>
      </header>

      {course.course_type === "community" ? (
        <CommunityHub course={course} channels={channels ?? []} isPreview={isPreview} />
      ) : (
        <>
          {/* Hero do curso */}
          {!activeLessonId && (
            <section className="relative w-full overflow-hidden" style={{ minHeight: "70vh" }}>
              <div className="absolute inset-0 animate-ken-burns" style={
                course.cover_url
                  ? { backgroundImage: `url(${course.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: `linear-gradient(135deg, ${course.primary_color ?? "#4f46e5"}, ${course.accent_color ?? "#1e1e5a"})` }
              } />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a] via-[#0a0a1a]/30 to-transparent" />
              <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-[#4f46e5]/20 rounded-full blur-[150px] animate-indigo-pulse" />
              <div className="relative max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-end pb-16 pt-32" style={{ minHeight: "70vh" }}>
                <span className="bg-[#4f46e5] text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-[0.2em] w-fit mb-4 shadow-[0_0_20px_rgba(79,70,229,0.5)]">Formação</span>
                <h1 className="font-cinema-display text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.95] max-w-3xl drop-shadow-2xl">
                  {(course.title ?? "").toUpperCase()}
                </h1>
                {course.description && <p className="mt-5 text-white/80 text-lg max-w-2xl leading-relaxed">{course.description}</p>}
                {modules?.[0]?.lessons?.[0] && (
                  <div className="flex gap-3 mt-7">
                    <button
                      onClick={() => setActiveLessonId(modules[0].lessons[0].id)}
                      className="px-8 py-4 bg-white text-[#0a0a1a] font-bold rounded-xl flex items-center gap-2 hover:bg-white/90 hover:scale-[1.03] active:scale-95 transition-all"
                    >
                      <PlayCircle className="h-5 w-5" /> Continuar
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Player ativo */}
          {activeLessonId && activeLesson && (
            <section className="px-4 md:px-12 pt-24 pb-8 max-w-4xl mx-auto">
              {activeLesson.video_provider === "external_link" && (activeLesson.video_url || activeLesson.youtube_url) ? (
                <div className="rounded-2xl border border-[#1e1e5a] bg-gradient-to-br from-[#141432] to-[#0f0f24] p-10 md:p-14 text-center shadow-2xl shadow-black/50">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4f46e5]/20 border border-[#4f46e5]/40 mb-5">
                    <LinkIcon className="h-6 w-6 text-[#a5b4fc]" />
                  </div>
                  <h3 className="font-cinema-display text-xl md:text-2xl font-bold tracking-tight mb-2">
                    Acesse o conteúdo desta aula
                  </h3>
                  <p className="text-white/60 text-sm mb-6 max-w-md mx-auto">
                    Esta aula leva você a um conteúdo externo. Clique no botão abaixo para abrir em uma nova aba.
                  </p>
                  <a
                    href={(activeLesson.video_url || activeLesson.youtube_url) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0a0a1a] font-bold rounded-xl hover:bg-white/90 hover:scale-[1.03] active:scale-95 transition-all"
                  >
                    <ExternalLink className="h-5 w-5" /> Acessar conteúdo
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-[#1e1e5a] shadow-2xl shadow-black/50">
                  {(activeLesson.video_url || activeLesson.youtube_url || activeLesson.video_embed || activeLesson.video_id) ? (
                    <VideoPlayer
                      title={activeLesson.title}
                      config={{
                        provider: (activeLesson.video_provider as any) ?? "youtube",
                        url: activeLesson.video_url,
                        externalId: activeLesson.video_id,
                        embed: activeLesson.video_embed,
                        legacyYoutubeUrl: activeLesson.youtube_url,
                      }}
                      onProgress={handleProgress}
                      onEnded={handleEnded}
                    />
                  ) : (
                    <div className="p-16 text-center bg-[#141432]">Aula sem vídeo configurado.</div>
                  )}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 text-[11px] text-white/40 bg-white/5 border border-white/5 rounded-lg px-3 py-2 w-fit">
                <Lock className="h-3 w-3" />
                <span>Conteúdo exclusivo para alunos. Compartilhamento não autorizado.</span>
              </div>
              <div className="mt-5">
                <h2 className="font-cinema-display text-2xl font-bold tracking-tight">{activeLesson.title}</h2>
                {activeLesson.description && <p className="text-white/70 mt-2 leading-relaxed">{activeLesson.description}</p>}
              </div>
              {activeLesson.extra_info && (
                <section className="mt-8 rounded-xl border border-[#1e1e5a] bg-[#0f0f24] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
                    Informações adicionais
                  </h3>
                  <div className="text-white/85 leading-relaxed whitespace-pre-wrap text-sm">
                    {activeLesson.extra_info}
                  </div>
                </section>
              )}
              <LessonMaterials lessonId={activeLesson.id} />

            </section>
          )}

          {/* Catálogo de aulas */}
          <div className="relative z-20 -mt-12 pb-24 max-w-[100vw] overflow-x-hidden">
            <LessonCatalog
              course={course as any}
              modules={(modules ?? []) as any}
              activeLessonId={activeLesson?.id ?? null}
              studentId={user?.id ?? null}
              onSelect={(id) => {
                setActiveChannelId(null);
                setActiveLessonId(id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>

        </>
      )}
    </div>
  );
}


