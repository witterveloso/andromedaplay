import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pause, Play, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { setExpertStatus, deleteExpert } from "@/lib/admin-experts.functions";

export const Route = createFileRoute("/admin/experts/")({
  component: ExpertsList,
});

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  blocked: { label: "Bloqueado", variant: "destructive" },
};

function ExpertsList() {
  const qc = useQueryClient();
  const setStatusFn = useServerFn(setExpertStatus);
  const delFn = useServerFn(deleteExpert);

  const { data, isLoading } = useQuery({
    queryKey: ["experts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("experts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: "active" | "paused" | "blocked"; reason?: string }) =>
      setStatusFn({ data: vars }),
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["experts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Produtor excluído"); qc.invalidateQueries({ queryKey: ["experts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Produtores</h1>
          <p className="text-muted-foreground mt-1">Cadastre e gerencie quem cria cursos na plataforma</p>
        </div>
        <Button asChild>
          <Link to="/admin/experts/new"><Plus className="mr-2 h-4 w-4" /> Novo produtor</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : !data?.length ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum produtor cadastrado.</p>
          <Button asChild className="mt-4"><Link to="/admin/experts/new">Cadastrar primeiro produtor</Link></Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((e) => {
            const meta = statusMeta[e.status] ?? statusMeta.active;
            return (
              <Card key={e.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <Link
                  to="/admin/experts/$id"
                  params={{ id: e.id }}
                  className="flex-1 min-w-0 hover:opacity-80 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{e.display_name}</span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{e.email}</p>
                  {e.paused_reason && <p className="text-xs text-amber-500 mt-1">Motivo: {e.paused_reason}</p>}
                </Link>
                <div className="flex gap-2">
                  {e.status !== "active" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: e.id, status: "active" })}>
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Ativar
                    </Button>
                  )}
                  {e.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const reason = prompt("Motivo da pausa (ex: falta de pagamento)") ?? undefined;
                      setStatus.mutate({ id: e.id, status: "paused", reason });
                    }}>
                      <Pause className="mr-1.5 h-3.5 w-3.5" /> Pausar
                    </Button>
                  )}
                  {e.status !== "blocked" && (
                    <Button size="sm" variant="outline" onClick={() => {
                      if (confirm(`Bloquear ${e.display_name}?`)) setStatus.mutate({ id: e.id, status: "blocked" });
                    }}>
                      <Ban className="mr-1.5 h-3.5 w-3.5" /> Bloquear
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => {
                    if (confirm(`Excluir definitivamente ${e.display_name}? Todos os cursos dele serão removidos.`))
                      del.mutate(e.id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
