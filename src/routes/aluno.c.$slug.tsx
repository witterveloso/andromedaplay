import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, PlayCircle, Eye } from "lucide-react";

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
    queryKey: ["course-content", course?.id],
    queryFn: async () => {
      const { data: mods, error: e1 } = await supabase
        .from("modules").select("*").eq("course_id", course!.id).order("position");
      if (e1) throw e1;
      const { data: lessons, error: e2 } = await supabase
        .from("lessons").select("*").in("module_id", (mods ?? []).map((m) => m.id)).order("position");
      if (e2) throw e2;
      return (mods ?? []).map((m) => ({ ...m, lessons: (lessons ?? []).filter((l) => l.module_id === m.id) }));
    },
  });

  if (!course) {
    return <div className="p-8 text-muted-foreground">Curso não disponível.</div>;
  }

  const activeLesson = modules?.flatMap((m) => m.lessons).find((l) => l.id === activeLessonId)
    ?? modules?.[0]?.lessons?.[0];

  return (
    <div className="min-h-screen" style={{ background: course.background_color, color: course.text_color, fontFamily: course.font_family }}>
      {isPreview && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-6 py-2 text-amber-200 text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span>Você está visualizando este curso no modo <strong>preview</strong> — é assim que o aluno vê.</span>
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
          {activeLesson?.youtube_url ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                src={activeLesson.youtube_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={activeLesson.title}
              />
            </div>
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
          {!modules?.length ? (
            <Card className="p-6 text-sm opacity-80">Nenhum conteúdo publicado.</Card>
          ) : modules.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="font-semibold mb-2">{m.title}</div>
              <ul className="space-y-1">
                {m.lessons.map((l: any) => (
                  <li key={l.id}>
                    <button
                      onClick={() => setActiveLessonId(l.id)}
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
          ))}
        </aside>
      </main>
    </div>
  );
}
