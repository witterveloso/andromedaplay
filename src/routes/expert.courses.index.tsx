import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/expert/courses/")({
  component: List,
});

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "Publicado", variant: "default" },
  draft: { label: "Rascunho", variant: "secondary" },
  archived: { label: "Arquivado", variant: "outline" },
};

function List() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["expert-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses").select("*")
        .eq("expert_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Curso excluído"); qc.invalidateQueries({ queryKey: ["expert-courses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Meus cursos</h1>
          <p className="text-muted-foreground mt-1">Crie cursos e cadastre seus alunos</p>
        </div>
        <Button asChild>
          <Link to="/expert/courses/new"><Plus className="mr-2 h-4 w-4" /> Novo curso</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !courses?.length ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Você ainda não criou nenhum curso.</p>
          <Button asChild className="mt-4"><Link to="/expert/courses/new">Criar primeiro curso</Link></Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="overflow-hidden flex flex-col">
              <div className="h-32 w-full" style={{
                background: c.cover_url
                  ? `url(${c.cover_url}) center/cover`
                  : `linear-gradient(135deg, ${c.primary_color}, ${c.accent_color})`,
              }} />
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{c.title}</h3>
                  <Badge variant={statusLabel[c.status].variant}>{statusLabel[c.status].label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{c.description || "Sem descrição"}</p>
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to="/expert/courses/$id" params={{ id: c.id }}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/expert/courses/$id/students" params={{ id: c.id }}>
                      <Users className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (confirm(`Excluir "${c.title}"?`)) del.mutate(c.id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
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
