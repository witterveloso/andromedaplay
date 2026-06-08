import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Pause, Play, Ban, Trash2, BookOpen, Users, LifeBuoy, Mail } from "lucide-react";
import { toast } from "sonner";
import { setExpertStatus, deleteExpert } from "@/lib/admin-experts.functions";

export const Route = createFileRoute("/admin/experts/$id")({
  component: ExpertDetail,
});

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Ativo", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  blocked: { label: "Bloqueado", variant: "destructive" },
};

function ExpertDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setStatusFn = useServerFn(setExpertStatus);
  const delFn = useServerFn(deleteExpert);

  const { data: expert, isLoading } = useQuery({
    queryKey: ["expert", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("experts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    enabled: !!expert,
    queryKey: ["expert-courses-admin", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug, status, course_type, created_at")
        .eq("expert_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: studentsCount } = useQuery({
    enabled: !!courses?.length,
    queryKey: ["expert-students-count", id],
    queryFn: async () => {
      const ids = (courses ?? []).map((c) => c.id);
      if (!ids.length) return 0;
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .in("course_id", ids);
      return count ?? 0;
    },
  });

  const setStatus = useMutation({
    mutationFn: (vars: { status: "active" | "paused" | "blocked"; reason?: string }) =>
      setStatusFn({ data: { id, ...vars } }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["expert", id] });
      qc.invalidateQueries({ queryKey: ["experts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Expert excluído");
      qc.invalidateQueries({ queryKey: ["experts"] });
      navigate({ to: "/admin/experts" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!expert) return <div className="p-8 text-muted-foreground">Expert não encontrado.</div>;

  const meta = statusMeta[expert.status] ?? statusMeta.active;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/admin/experts"><ChevronLeft className="mr-1 h-4 w-4" /> Voltar</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{expert.display_name}</h1>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Mail className="h-4 w-4" /> {expert.email}
          </p>
          {expert.paused_reason && (
            <p className="text-xs text-amber-500 mt-2">Motivo: {expert.paused_reason}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {expert.status !== "active" && (
            <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ status: "active" })}>
              <Play className="mr-1.5 h-3.5 w-3.5" /> Ativar
            </Button>
          )}
          {expert.status === "active" && (
            <Button size="sm" variant="outline" onClick={() => {
              const reason = prompt("Motivo da pausa (ex: falta de pagamento)") ?? undefined;
              setStatus.mutate({ status: "paused", reason });
            }}>
              <Pause className="mr-1.5 h-3.5 w-3.5" /> Pausar
            </Button>
          )}
          {expert.status !== "blocked" && (
            <Button size="sm" variant="outline" onClick={() => {
              if (confirm(`Bloquear ${expert.display_name}?`)) setStatus.mutate({ status: "blocked" });
            }}>
              <Ban className="mr-1.5 h-3.5 w-3.5" /> Bloquear
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => {
            if (confirm(`Excluir definitivamente ${expert.display_name}? Todos os cursos dele serão removidos.`))
              del.mutate();
          }}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cursos</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-3xl font-semibold">{courses?.length ?? 0}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Alunos matriculados</span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-3xl font-semibold">{studentsCount ?? 0}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cadastro</span>
            <LifeBuoy className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-sm">
            {expert.created_at ? new Date(expert.created_at).toLocaleDateString("pt-BR") : "—"}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-1">Cursos do expert</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Visualização somente para suporte técnico. O conteúdo dos cursos é gerenciado exclusivamente pelo expert.
        </p>
        {!courses?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum curso criado ainda.</p>
        ) : (
          <ul className="divide-y">
            {courses.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.course_type === "community" ? "Comunidade" : "Vídeo"} · /{c.slug}
                  </div>
                </div>
                <Badge variant={c.status === "published" ? "default" : "secondary"}>
                  {c.status === "published" ? "Publicado" : c.status === "draft" ? "Rascunho" : "Arquivado"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 bg-muted/30">
        <div className="flex items-start gap-3">
          <LifeBuoy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Suporte técnico</p>
            <p className="text-muted-foreground mt-1">
              Como administrador, você vê apenas as informações cadastrais e o status dos cursos.
              Não há acesso ao conteúdo (vídeos, aulas, comunidade) — esse permanece sob responsabilidade do expert.
              Use as ações acima para ativar, pausar, bloquear ou excluir o cadastro quando necessário.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}