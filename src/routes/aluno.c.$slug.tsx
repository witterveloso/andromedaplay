import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, PlayCircle, Eye, MessageSquare, Hash, Pin } from "lucide-react";
import { toYouTubeEmbed } from "@/lib/youtube";
import { StudentPostCard } from "@/components/community/student-post-card";


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

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <h1 className="text-2xl font-semibold mb-4">{course.title}</h1>
          {activeChannel ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {activeChannel.icon_url ? (
                  <img src={activeChannel.icon_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center"><Hash className="h-5 w-5" /></div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">{activeChannel.name}</h2>
                  {activeChannel.description && <p className="text-sm opacity-80">{activeChannel.description}</p>}
                </div>
              </div>
              {(channelPosts?.length ?? 0) === 0 ? (
                <Card className="p-8 text-center opacity-80">Nenhuma publicação ainda neste canal.</Card>
              ) : (
                channelPosts!.map((p: any) => <StudentPostCard key={p.id} post={p} />)
              )}

            </div>
          ) : activeLesson?.youtube_url ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                src={toYouTubeEmbed(activeLesson.youtube_url) ?? activeLesson.youtube_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={activeLesson.title}
              />
            </div>
          ) : (
            <Card className="p-12 text-center opacity-80">
              <p>Selecione uma aula ou canal ao lado para começar.</p>
            </Card>
          )}
          {!activeChannel && activeLesson && (
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
            <>
            {modules?.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="font-semibold mb-2">{m.title}</div>
              <ul className="space-y-1">
                {m.lessons.map((l: any) => (
                  <li key={l.id}>
                    <button
                      onClick={() => { setActiveChannelId(null); setActiveLessonId(l.id); }}
                      className={`w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                        !activeChannel && activeLesson?.id === l.id ? "bg-primary/20" : "hover:bg-muted"
                      }`}
                    >
                      <PlayCircle className="h-3.5 w-3.5 opacity-70" />
                      {l.title}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            ))}
            {(channels?.length ?? 0) > 0 && (
              <Card className="p-4">
                <div className="font-semibold mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comunidade</div>
                <ul className="space-y-1">
                  {channels!.map((c: any) => (
                    <li key={c.id}>
                      <button
                        onClick={() => { setActiveLessonId(null); setActiveChannelId(c.id); }}
                        className={`w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                          activeChannel?.id === c.id ? "bg-primary/20" : "hover:bg-muted"
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
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
