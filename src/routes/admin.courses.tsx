import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, ExternalLink, Eye, Users } from "lucide-react";

export const Route = createFileRoute("/admin/courses")({
  component: CoursesPage,
});

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "Publicado", variant: "default" },
  draft: { label: "Rascunho", variant: "secondary" },
  archived: { label: "Oculto", variant: "outline" },
};

function CoursesPage() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-all-courses"],
    queryFn: async () => {
      const { data: courses, error } = await supabase
        .from("courses")
        .select("id, title, slug, status, course_type, expert_id, created_at, cover_url")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const expertIds = Array.from(
        new Set((courses ?? []).map((c) => c.expert_id).filter((v): v is string => !!v)),
      );

      const [expertsRes, enrollRes, lessonsRes, postsRes] = await Promise.all([
        expertIds.length
          ? supabase.from("experts").select("id, display_name, email").in("id", expertIds)
          : Promise.resolve({ data: [] as any[] }),
        courseIds.length
          ? supabase.from("enrollments").select("course_id, status").in("course_id", courseIds).eq("status", "active")
          : Promise.resolve({ data: [] as any[] }),
        courseIds.length
          ? supabase.from("lessons").select("course_id").in("course_id", courseIds)
          : Promise.resolve({ data: [] as any[] }),
        courseIds.length
          ? supabase.from("community_posts").select("course_id").in("course_id", courseIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const expertsById = Object.fromEntries((expertsRes.data ?? []).map((e: any) => [e.id, e]));
      const enrollCount: Record<string, number> = {};
      for (const e of enrollRes.data ?? []) enrollCount[(e as any).course_id] = (enrollCount[(e as any).course_id] ?? 0) + 1;
      const lessonCount: Record<string, number> = {};
      for (const l of lessonsRes.data ?? []) lessonCount[(l as any).course_id] = (lessonCount[(l as any).course_id] ?? 0) + 1;
      const postCount: Record<string, number> = {};
      for (const p of postsRes.data ?? []) postCount[(p as any).course_id] = (postCount[(p as any).course_id] ?? 0) + 1;

      return (courses ?? []).map((c) => ({
        ...c,
        expert: expertsById[c.expert_id] ?? null,
        students: enrollCount[c.id] ?? 0,
        content_count:
          c.course_type === "community" ? postCount[c.id] ?? 0 : lessonCount[c.id] ?? 0,
      }));
    },
  });

  const filtered = (data ?? []).filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (c.title ?? "").toLowerCase().includes(q) ||
      (c.expert?.display_name ?? "").toLowerCase().includes(q) ||
      (c.expert?.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Catálogo</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Produtos / Cursos</h1>
        <p className="text-muted-foreground mt-1">Todos os produtos publicados na plataforma.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por curso ou produtor…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground border-white/[0.06]">
          Nenhum produto encontrado.
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const meta = statusMeta[c.status ?? "draft"] ?? statusMeta.draft;
            return (
              <Card key={c.id} className="overflow-hidden border-white/[0.06] hover:bg-white/[0.02] transition">
                <div className="flex items-center gap-4 p-4">
                  <div className="h-14 w-24 rounded-md overflow-hidden bg-muted shrink-0">
                    {c.cover_url ? (
                      <img src={c.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{c.title}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {c.course_type === "community" ? "Comunidade" : "Vídeo"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      Produtor:{" "}
                      {c.expert ? (
                        <Link
                          to="/admin/experts/$id"
                          params={{ id: c.expert.id }}
                          className="underline hover:text-foreground"
                        >
                          {c.expert.display_name}
                        </Link>
                      ) : (
                        "—"
                      )}{" "}
                      · /{c.slug}
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {c.students} alunos
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {c.content_count}{" "}
                      {c.course_type === "community" ? "posts" : "aulas"}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {c.course_type === "community" || c.status === "published" ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/aluno/c/$slug" params={{ slug: c.slug }} target="_blank">
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> Visualizar
                        </Link>
                      </Button>
                    ) : null}
                    {c.expert && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/admin/experts/$id" params={{ id: c.expert.id }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
