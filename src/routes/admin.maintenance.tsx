import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  cleanupDuplicateEnrollments,
  detectDuplicates,
  cleanupOrphans,
  listAuditLogs,
} from "@/lib/admin-platform.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, History, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/maintenance")({
  component: MaintenancePage,
});

function MaintenancePage() {
  const qc = useQueryClient();
  const detectFn = useServerFn(detectDuplicates);
  const cleanupEnrollFn = useServerFn(cleanupDuplicateEnrollments);
  const cleanupOrphansFn = useServerFn(cleanupOrphans);
  const logsFn = useServerFn(listAuditLogs);

  const [detect, setDetect] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const logsQ = useQuery({ queryKey: ["admin-audit-logs"], queryFn: () => logsFn({ data: {} }) });

  const runDetect = async () => {
    setScanning(true);
    try {
      const res = await detectFn({ data: undefined as any });
      setDetect(res);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao varrer duplicidades");
    } finally {
      setScanning(false);
    }
  };

  const dedupeMut = useMutation({
    mutationFn: () => cleanupEnrollFn({ data: undefined as any }),
    onSuccess: (r: any) => {
      toast.success(`Removidos ${r.removed} acesso(s) duplicado(s)`);
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      runDetect();
    },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  const orphanMut = useMutation({
    mutationFn: () => cleanupOrphansFn({ data: undefined as any }),
    onSuccess: (r: any) => {
      toast.success(`Removidos ${r.removed} registro(s) órfão(s)`);
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Plataforma</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1 flex items-center gap-2">
          <Wrench className="h-7 w-7 text-primary" /> Ferramentas de manutenção
        </h1>
        <p className="text-muted-foreground mt-1">
          Detecte e corrija duplicidades, limpe registros órfãos e audite ações administrativas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 border-white/[0.06] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Detectar duplicidades
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Varre cursos, alunos e acessos duplicados.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={runDetect} disabled={scanning}>
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Varrer agora</span>
            </Button>
          </div>
          {detect && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-white/[0.03] p-3">
                <div className="text-2xl font-semibold">{detect.duplicate_courses?.length ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">cursos</div>
              </div>
              <div className="rounded-md bg-white/[0.03] p-3">
                <div className="text-2xl font-semibold">{detect.duplicate_users?.length ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">alunos</div>
              </div>
              <div className="rounded-md bg-white/[0.03] p-3">
                <div className="text-2xl font-semibold">{detect.duplicate_enrollments ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">acessos</div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 border-white/[0.06] space-y-3">
          <h2 className="font-semibold">Limpar acessos duplicados</h2>
          <p className="text-xs text-muted-foreground">
            Mantém o acesso mais recente para cada par aluno+curso e remove os repetidos.
          </p>
          <Button
            size="sm"
            onClick={() => {
              if (confirm("Remover todos os acessos duplicados? Esta ação é irreversível.")) dedupeMut.mutate();
            }}
            disabled={dedupeMut.isPending}
          >
            {dedupeMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Executar limpeza
          </Button>
        </Card>

        <Card className="p-5 border-white/[0.06] space-y-3 md:col-span-2">
          <h2 className="font-semibold">Remover registros órfãos</h2>
          <p className="text-xs text-muted-foreground">
            Apaga módulos e aulas que ficaram sem curso ou módulo válido.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (confirm("Remover registros órfãos da plataforma?")) orphanMut.mutate();
            }}
            disabled={orphanMut.isPending}
          >
            {orphanMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Limpar órfãos
          </Button>
        </Card>
      </div>

      {detect && (detect.duplicate_courses?.length > 0 || detect.duplicate_users?.length > 0) && (
        <Card className="p-5 border-white/[0.06] space-y-4">
          <h2 className="font-semibold">Detalhes da varredura</h2>
          {detect.duplicate_courses?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70 mb-2">Cursos duplicados</div>
              <div className="space-y-2 text-sm">
                {detect.duplicate_courses.map((group: any[], i: number) => (
                  <div key={i} className="rounded-md bg-white/[0.03] p-3">
                    <div className="font-medium">{group[0].title}</div>
                    <div className="text-xs text-muted-foreground">{group.length} versões — {group.map((g) => g.slug).join(", ")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {detect.duplicate_users?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70 mb-2">Alunos duplicados (mesmo e-mail)</div>
              <div className="space-y-2 text-sm">
                {detect.duplicate_users.map((group: any[], i: number) => (
                  <div key={i} className="rounded-md bg-white/[0.03] p-3">
                    <div className="font-medium">{group[0].email}</div>
                    <div className="text-xs text-muted-foreground">{group.length} contas</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-5 border-white/[0.06]">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <History className="h-4 w-4" /> Logs administrativos
        </h2>
        {logsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (logsQ.data?.logs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
        ) : (
          <div className="divide-y divide-white/[0.06] -m-5 mt-0">
            {(logsQ.data?.logs ?? []).map((l: any) => (
              <div key={l.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                <Badge variant="outline" className="font-mono text-[10px]">{l.action}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {l.target_label || l.target_id || "—"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {l.actor_email ?? l.actor_id ?? "sistema"}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
