import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PlayCircle, MessageSquareText, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/content")({
  component: ContentPage,
});

function ContentPage() {
  const { data: recentLessons } = useQuery({
    queryKey: ["admin-recent-lessons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, status, created_at, course:courses(id, title, slug)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: recentPosts } = useQuery({
    queryKey: ["admin-recent-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, title, created_at, course:courses(id, title, slug)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Auditoria</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Conteúdos</h1>
        <p className="text-muted-foreground mt-1">Últimas aulas e publicações criadas em todos os cursos.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 border-white/[0.06]">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><PlayCircle className="h-4 w-4 text-primary" /> Aulas recentes</h2>
          <div className="divide-y divide-white/[0.06]">
            {(recentLessons ?? []).map((l: any) => (
              <div key={l.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{l.course?.title ?? "—"}</div>
                </div>
                <span className="text-[10px] uppercase text-muted-foreground shrink-0">{l.status}</span>
              </div>
            ))}
            {!recentLessons?.length && <p className="text-sm text-muted-foreground py-4">Nenhuma aula.</p>}
          </div>
        </Card>

        <Card className="p-5 border-white/[0.06]">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><MessageSquareText className="h-4 w-4 text-sky-300" /> Publicações recentes</h2>
          <div className="divide-y divide-white/[0.06]">
            {(recentPosts ?? []).map((p: any) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.title || "Sem título"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.course?.title ?? "—"}</div>
                </div>
                {p.course?.slug && (
                  <Link to="/aluno/c/$slug" params={{ slug: p.course.slug }} target="_blank" className="shrink-0">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                )}
              </div>
            ))}
            {!recentPosts?.length && <p className="text-sm text-muted-foreground py-4">Nenhuma publicação.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
