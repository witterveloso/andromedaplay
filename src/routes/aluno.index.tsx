import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut } from "lucide-react";

export const Route = createFileRoute("/aluno/")({
  component: StudentHome,
});

function StudentHome() {
  const { user, loading, session, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const { data: courses, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, courses:courses!enrollments_course_id_fkey(*)")
        .eq("student_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((r: any) => r.courses).filter(Boolean);
    },
  });

  if (loading || !session) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  if (!isLoading && courses && courses.length === 1) {
    return <Navigate to="/aluno/c/$slug" params={{ slug: courses[0].slug }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">Meus cursos</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1.5 h-3.5 w-3.5" /> Sair</Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !courses?.length ? (
          <Card className="p-12 text-center">
            <p className="font-medium">Você ainda não tem cursos disponíveis</p>
            <p className="text-sm text-muted-foreground mt-1">
              Entre em contato com o expert que cadastrou você para liberar o acesso.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c: any) => (
              <Link key={c.id} to="/aluno/c/$slug" params={{ slug: c.slug }}>
                <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition">
                  <div className="h-32" style={{
                    background: c.cover_url
                      ? `url(${c.cover_url}) center/cover`
                      : `linear-gradient(135deg, ${c.primary_color}, ${c.accent_color})`,
                  }} />
                  <div className="p-4">
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description || "—"}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
