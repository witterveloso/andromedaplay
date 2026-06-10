import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { grantAccess, revokeAccess, setAccessStatus } from "@/lib/admin-platform.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Plus, Trash2, Pause, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/access")({
  component: AccessPage,
});

function AccessPage() {
  const qc = useQueryClient();
  const grantFn = useServerFn(grantAccess);
  const revokeFn = useServerFn(revokeAccess);
  const setStatusFn = useServerFn(setAccessStatus);

  const [email, setEmail] = useState("");
  const [courseId, setCourseId] = useState<string>("");

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data ?? [];
    },
  });

  const { data: recent, refetch } = useQuery({
    queryKey: ["admin-recent-enrollments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, status, created_at, student_id, course:courses(id, title, slug)")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const grant = useMutation({
    mutationFn: () => grantFn({ data: { student_email: email.trim(), course_id: courseId } }),
    onSuccess: () => {
      toast.success("Acesso concedido");
      setEmail("");
      refetch();
      qc.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { enrollment_id: id } }),
    onSuccess: () => { toast.success("Acesso removido"); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (vars: { id: string; status: "active" | "revoked" }) =>
      setStatusFn({ data: { enrollment_id: vars.id, status: vars.status } }),
    onSuccess: () => { toast.success("Status atualizado"); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Suporte</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Acessos</h1>
        <p className="text-muted-foreground mt-1">Conceda, revogue ou ajuste o status de acessos manualmente.</p>
      </div>

      <Card className="p-5 border-white/[0.06]">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <KeyRound className="h-4 w-4 text-primary" /> Conceder acesso manual
        </h2>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label>E-mail do aluno</Label>
            <Input type="email" placeholder="aluno@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Curso / Produto</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {(courses ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!email || !courseId || grant.isPending} onClick={() => grant.mutate()}>
            <Plus className="h-4 w-4 mr-1.5" /> Liberar
          </Button>
        </div>
      </Card>

      <Card className="p-5 border-white/[0.06]">
        <h2 className="font-semibold mb-3">Acessos recentes</h2>
        {(recent?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum acesso registrado.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {recent!.map((e: any) => (
              <div key={e.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.course?.title ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    aluno: {e.student_id} · {new Date(e.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <Badge variant={e.status === "active" ? "default" : "secondary"}>
                  {e.status === "active" ? "Ativo" : "Revogado"}
                </Badge>
                <Button size="sm" variant="ghost"
                  onClick={() => toggle.mutate({ id: e.id, status: e.status === "active" ? "revoked" : "active" })}>
                  {e.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => { if (confirm("Remover este acesso?")) revoke.mutate(e.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
