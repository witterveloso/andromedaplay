import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessagesSquare, Eye, Users, MessageSquareText } from "lucide-react";

export const Route = createFileRoute("/admin/communities")({
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-communities"],
    queryFn: async () => {
      const { data: courses, error } = await supabase
        .from("courses")
        .select("id, title, slug, status, expert_id, cover_url, created_at")
        .eq("course_type", "community")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (courses ?? []).map((c) => c.id);
      const expertIds = Array.from(
        new Set((courses ?? []).map((c) => c.expert_id).filter((v): v is string => !!v)),
      );

      const [expertsRes, postsRes, enrollRes] = await Promise.all([
        expertIds.length
          ? supabase.from("experts").select("id, display_name").in("id", expertIds)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("community_posts").select("course_id").in("course_id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase
              .from("enrollments")
              .select("course_id, status")
              .in("course_id", ids)
              .eq("status", "active")
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const expertsById = Object.fromEntries((expertsRes.data ?? []).map((e: any) => [e.id, e]));
      const posts: Record<string, number> = {};
      for (const p of postsRes.data ?? []) posts[(p as any).course_id] = (posts[(p as any).course_id] ?? 0) + 1;
      const members: Record<string, number> = {};
      for (const e of enrollRes.data ?? []) members[(e as any).course_id] = (members[(e as any).course_id] ?? 0) + 1;

      return (courses ?? []).map((c) => ({
        ...c,
        expert: c.expert_id ? expertsById[c.expert_id] : null,
        posts: posts[c.id] ?? 0,
        members: members[c.id] ?? 0,
      }));
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Engajamento</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Comunidades</h1>
        <p className="text-muted-foreground mt-1">Visão geral das comunidades ativas na plataforma.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <Card className="p-10 text-center text-muted-foreground border-white/[0.06]">
          Nenhuma comunidade publicada.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data!.map((c) => (
            <Card key={c.id} className="overflow-hidden border-white/[0.06] hover:bg-white/[0.02] transition flex flex-col">
              <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                {c.cover_url ? (
                  <img src={c.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <MessagesSquare className="h-6 w-6" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2" variant={c.status === "published" ? "default" : "secondary"}>
                  {c.status === "published" ? "Publicada" : "Rascunho"}
                </Badge>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold truncate">{c.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  por {c.expert?.display_name ?? "—"}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.members}</span>
                  <span className="flex items-center gap-1"><MessageSquareText className="h-3 w-3" /> {c.posts}</span>
                </div>
                <div className="mt-4">
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <Link to="/aluno/c/$slug" params={{ slug: c.slug }} target="_blank">
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Visualizar
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
