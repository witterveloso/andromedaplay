import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { Play, ChevronRight, Lock } from "lucide-react";
import { AvatarMenu } from "@/components/student/avatar-menu";

export const Route = createFileRoute("/aluno/")({
  component: StudentHome,
});

function StudentHome() {
  const { user, loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const { data: courses, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-courses", user?.id],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, created_at, courses:courses!enrollments_course_id_fkey(*)")
        .eq("student_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? [])
        .map((r: any) => r.courses ? { ...r.courses, _enrolled_at: r.created_at } : null)
        .filter(Boolean) as any[];
      const byId = new Map<string, any>();
      for (const c of rows) if (!byId.has(c.id)) byId.set(c.id, c);
      return Array.from(byId.values());
    },
  });

  const featured = useMemo(() => courses?.[0], [courses]);
  const continueWatching = useMemo(() => (courses ?? []).slice(0, 3), [courses]);

  const coverStyle = (c: any): React.CSSProperties => {
    if (!c?.cover_url) {
      return { background: `linear-gradient(135deg, ${c?.primary_color ?? "#4f46e5"}, ${c?.accent_color ?? "#1e1e5a"})` };
    }
    const fit = c.cover_fit === "contain" ? "contain" : "cover";
    return {
      backgroundImage: `url(${c.cover_url})`,
      backgroundSize: fit,
      backgroundPosition: c.cover_position || "center",
      backgroundRepeat: "no-repeat",
      backgroundColor: c.accent_color || "#0a0a14",
    };
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="h-8 w-8 rounded-full border-2 border-[#4f46e5]/30 border-t-[#4f46e5] animate-spin" />
      </div>
    );
  }


  return (
    <div className="andromeda-cinema min-h-screen w-full overflow-x-hidden">
      {/* Cinematic top nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-gradient-to-b from-[#0a0a1a] via-[#0a0a1a]/80 to-transparent px-6 md:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link to="/aluno" className="relative flex items-center">
            <div className="absolute -inset-2 bg-[#4f46e5] rounded-full blur-xl opacity-30 animate-indigo-pulse" />
            <span className="relative font-cinema-display font-extrabold text-xl tracking-tighter uppercase">
              Andromeda<span className="text-[#4f46e5]">.</span>
            </span>
          </Link>
        </div>
        <AvatarMenu />
      </nav>

      {/* Hero — featured course/community */}
      {featured ? (
        <section className="relative min-h-[88vh] flex items-end px-6 md:px-16 pb-20 pt-32">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div
              className="absolute inset-0 animate-ken-burns"
              style={
                featured.cover_url
                  ? { backgroundImage: `url(${featured.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: `linear-gradient(135deg, ${featured.primary_color ?? "#4f46e5"}, ${featured.accent_color ?? "#1e1e5a"})` }
              }
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a] via-[#0a0a1a]/40 to-transparent" />
            <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-[#4f46e5]/20 rounded-full blur-[150px] animate-indigo-pulse" />
          </div>

          <div className="relative z-10 max-w-3xl space-y-6">
            <h1 className="font-cinema-display text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.95]">
              {(featured.title ?? "").toUpperCase()}
            </h1>
            {featured.description && (
              <p className="text-white/80 text-lg max-w-xl font-medium leading-relaxed">
                {featured.description}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Link
                to="/aluno/c/$slug"
                params={{ slug: featured.slug }}
                className="px-8 py-4 bg-white text-[#0a0a1a] font-bold rounded-xl flex items-center gap-2 hover:bg-white/90 transition-all hover:scale-[1.03] active:scale-95"
              >
                <Play className="h-5 w-5 fill-current" />
                {featured.course_type === "community" ? "Entrar na comunidade" : "Continuar"}
              </Link>
              <Link
                to="/aluno/c/$slug"
                params={{ slug: featured.slug }}
                className="px-8 py-4 bg-[#141432]/80 backdrop-blur-md border border-[#1e1e5a] hover:border-[#4f46e5] hover:bg-[#1e1e5a]/60 text-white font-bold rounded-xl transition-all"
              >
                Mais informações
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="min-h-[60vh] flex items-center justify-center px-6 pt-32">
          {isLoading ? (
            <div className="h-8 w-8 rounded-full border-2 border-[#4f46e5]/30 border-t-[#4f46e5] animate-spin" />
          ) : (
            <div className="text-center max-w-lg">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#1e1e5a] flex items-center justify-center ring-1 ring-[#4f46e5]/30">
                <Lock className="h-7 w-7 text-[#4f46e5]" />
              </div>
              <p className="font-cinema-display text-2xl font-bold">Seu universo ainda está vazio</p>
              <p className="text-white/60 mt-2 leading-relaxed">
                Entre em contato com o produtor que cadastrou você para liberar o acesso.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Content rows */}
      {(courses?.length ?? 0) > 0 && (
        <div className="relative z-20 -mt-12 pb-24 space-y-16">
          {/* Continue assistindo */}
          <section className="px-6 md:px-16 space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="font-cinema-display text-xl md:text-2xl font-bold tracking-tight">
                Continue assistindo
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[#1e1e5a] to-transparent" />
            </div>
            <div className="flex gap-5 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2">
              {continueWatching.map((c) => (
                <Link
                  key={c.id}
                  to="/aluno/c/$slug"
                  params={{ slug: c.slug }}
                  className="group relative min-w-[320px] md:min-w-[360px] aspect-video bg-[#141432] rounded-xl overflow-hidden border border-[#1e1e5a] hover:border-[#4f46e5] transition-all cursor-pointer shadow-lg shadow-black/40"
                >
                  <div
                    className="absolute inset-0 opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                    style={
                      c.cover_url
                        ? { backgroundImage: `url(${c.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : { background: `linear-gradient(135deg, ${c.primary_color ?? "#4f46e5"}, ${c.accent_color ?? "#1e1e5a"})` }
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[10px] font-bold text-[#4f46e5] mb-1 uppercase tracking-widest">
                      {c.course_type === "community" ? "Comunidade" : "Formação"}
                    </p>
                    <h4 className="text-sm md:text-base font-bold leading-tight line-clamp-2">{c.title}</h4>
                    <div className="mt-3 w-full h-1 bg-[#1e1e5a] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4f46e5] rounded-full shadow-[0_0_8px_#4f46e5]" style={{ width: "12%" }} />
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                      <Play className="h-6 w-6 fill-white" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Sua jornada — vertical posters */}
          <section className="px-6 md:px-16 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-cinema-display text-xl md:text-2xl font-bold tracking-tight">Sua jornada</h2>
              <span className="text-xs text-[#4f46e5] font-bold uppercase tracking-wider">
                {courses?.length ?? 0} {courses?.length === 1 ? "produto" : "produtos"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {courses!.map((c) => (
                <Link
                  key={c.id}
                  to="/aluno/c/$slug"
                  params={{ slug: c.slug }}
                  className="group aspect-[2/3] relative bg-[#141432] rounded-xl overflow-hidden border border-[#1e1e5a] hover:scale-[1.05] hover:border-[#4f46e5] transition-all duration-500 cursor-pointer shadow-2xl shadow-black/40"
                >
                  <div
                    className="absolute inset-0"
                    style={
                      c.cover_url
                        ? { backgroundImage: `url(${c.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : { background: `linear-gradient(135deg, ${c.primary_color ?? "#4f46e5"}, ${c.accent_color ?? "#1e1e5a"})` }
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/30 to-transparent" />
                  <div className="absolute top-0 right-0 p-3">
                    <div className="bg-[#4f46e5]/15 backdrop-blur-md border border-[#4f46e5]/30 text-[#a5b4fc] text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      {c.course_type === "community" ? "Live" : "Curso"}
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                    <h4 className="font-cinema-display text-sm font-bold leading-tight mb-1 line-clamp-2">{c.title}</h4>
                    <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider flex items-center gap-1">
                      Acessar <ChevronRight className="h-3 w-3" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      <footer className="border-t border-white/5 px-6 md:px-16 py-6 text-xs text-white/40 flex items-center justify-between">
        <span>Tecnologia. Conhecimento. Evolução.</span>
        <span className="font-cinema-display font-bold tracking-tighter">ANDROMEDA<span className="text-[#4f46e5]">.</span></span>
      </footer>
    </div>
  );
}
