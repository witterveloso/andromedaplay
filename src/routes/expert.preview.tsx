import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Eye } from "lucide-react";

export const Route = createFileRoute("/expert/preview")({
  component: Preview,
});

function Preview() {
  const { user } = useAuth();

  const { data: courses, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["expert-preview-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug, description, status, cover_url, primary_color, accent_color")
        .eq("expert_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Eye className="h-7 w-7 text-primary" /> Ver como aluno
        </h1>
        <p className="text-muted-foreground mt-1">
          Abra qualquer curso para conferir como ele aparece para os alunos — incluindo cores, fonte e
          experiência de navegação.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !courses?.length ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Você ainda não tem cursos para visualizar.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="overflow-hidden flex flex-col">
              <div
                className="h-28 w-full"
                style={{
                  background: c.cover_url
                    ? `url(${c.cover_url}) center/cover`
                    : `linear-gradient(135deg, ${c.primary_color}, ${c.accent_color})`,
                }}
              />
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{c.title}</h3>
                  <Badge variant={c.status === "published" ? "default" : "secondary"}>
                    {c.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                  {c.description || "Sem descrição"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/aluno/c/${c.slug}?preview=1`, "_blank")}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Abrir como aluno
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}