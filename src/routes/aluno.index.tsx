import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, ArrowRight } from "lucide-react";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm text-muted-foreground tracking-wide">Carregando…</span>
        </div>
      </div>
    );
  }

  if (!isLoading && courses && courses.length === 1) {
    return <Navigate to="/aluno/c/$slug" params={{ slug: courses[0].slug }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(108,77,255,0.08), transparent)",
        }}
      />

      {/* Header premium */}
      <header className="relative border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AndromedaLogo className="scale-[0.85]" />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-12 sm:py-16">
        {/* Title section */}
        <div className="mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary/80" />
            Meus cursos
          </h1>
          <p className="text-muted-foreground mt-2 text-base sm:text-lg max-w-xl">
            Continue sua jornada de aprendizado. Acesse seus produtos e comunidades.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/10] w-full rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : !courses?.length ? (
          <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-12 sm:p-16 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 ring-1 ring-primary/20">
              <GraduationCap className="h-7 w-7 text-primary/60" />
            </div>
            <p className="text-lg font-medium">Você ainda não tem cursos disponíveis</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Entre em contato com o produtor que cadastrou você para liberar o acesso.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            {courses.map((c: any) => {
              const bgStyle = c.cover_url
                ? { backgroundImage: `url(${c.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: `linear-gradient(135deg, ${c.primary_color ?? "#6C4DFF"}, ${c.accent_color ?? "#00B8FF"})` };

              return (
                <Link
                  key={c.id}
                  to="/aluno/c/$slug"
                  params={{ slug: c.slug }}
                  className="group relative block"
                >
                  {/* Card */}
                  <div
                    className="relative overflow-hidden rounded-2xl border border-white/[0.06] shadow-lg shadow-black/20 transition-all duration-500 ease-out group-hover:shadow-[0_0_60px_-10px_rgba(108,77,255,0.25)] group-hover:border-primary/20 group-hover:scale-[1.015]"
                    style={{ aspectRatio: "16/10" }}
                  >
                    {/* Background image / gradient */}
                    <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105" style={bgStyle} />

                    {/* Dark overlay - stronger at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Subtle top edge highlight on hover */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-7">
                      <div className="space-y-3">
                        <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight drop-shadow-lg tracking-tight">
                          {c.title}
                        </h3>
                        {c.description && (
                          <p className="text-sm text-white/70 line-clamp-2 leading-relaxed max-w-md">
                            {c.description}
                          </p>
                        )}
                        <div className="pt-2 flex items-center">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-300 group-hover:bg-primary/80 group-hover:border-primary/30 group-hover:pl-5">
                            <span>Entrar</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Corner glow */}
                    <div
                      className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"
                      style={{ background: "rgba(108,77,255,0.2)" }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
