import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  cancelCourseInvitation,
  listAdminInvitations,
  reactivateCourseInvitation,
  updateCourseInvitationEmail,
} from "@/lib/auth-access.functions";
import { CalendarClock, MailCheck, RefreshCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/invitations")({
  component: AdminInvitationsPage,
});

const statusLabels: Record<string, string> = {
  all: "Todos",
  pending: "Pendentes",
  used: "Usados",
  expired: "Expirados",
  cancelled: "Cancelados",
};

function signupLink(email: string) {
  return `${window.location.origin}/login?mode=signup&email=${encodeURIComponent(email)}`;
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

function AdminInvitationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminInvitations);
  const cancelFn = useServerFn(cancelCourseInvitation);
  const reactivateFn = useServerFn(reactivateCourseInvitation);
  const updateEmailFn = useServerFn(updateCourseInvitationEmail);

  const [status, setStatus] = useState("pending");
  const [courseId, setCourseId] = useState("all");
  const [expertId, setExpertId] = useState("all");
  const [email, setEmail] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["admin-invitations-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title, expert_id").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: experts } = useQuery({
    queryKey: ["admin-invitations-experts", courses?.map((c) => c.expert_id).join("|")],
    enabled: Boolean(courses?.length),
    queryFn: async () => {
      const ids = Array.from(new Set((courses ?? []).map((c) => c.expert_id).filter(Boolean)));
      if (!ids.length) return [];
      const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids as string[]);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filters = useMemo(() => ({ status, course_id: courseId, expert_id: expertId, email: email.trim() }), [status, courseId, expertId, email]);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-invitations", filters],
    queryFn: () => listFn({ data: filters }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-invitations"] });

  const cancel = useMutation({
    mutationFn: (invitation_id: string) => cancelFn({ data: { invitation_id } }),
    onSuccess: () => { toast.success("Convite cancelado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivate = useMutation({
    mutationFn: (invitation_id: string) => reactivateFn({ data: { invitation_id, expires_at: null } }),
    onSuccess: (res: any) => { toast.success(res?.message ?? "Convite liberado novamente"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editEmail = useMutation({
    mutationFn: (vars: { invitation_id: string; email: string }) => updateEmailFn({ data: vars }),
    onSuccess: (res: any) => { toast.success(res?.message ?? "E-mail atualizado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const invitations = data?.invitations ?? [];

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Admin geral</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1 flex items-center gap-2">
          <MailCheck className="h-7 w-7 text-primary" /> Convites
        </h1>
        <p className="text-muted-foreground mt-1">Acompanhe e corrija e-mails liberados antes da criação de conta.</p>
      </div>

      <Card className="p-5 border-white/[0.06]">
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Curso</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(courses ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Produtor</Label>
            <Select value={expertId} onValueChange={setExpertId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(experts ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name ?? e.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buscar@email.com" className="pl-9" />
            </div>
          </div>
          <Button variant="outline" onClick={() => invalidate()} disabled={isFetching}>
            <RefreshCcw className="mr-1.5 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden border-white/[0.06]">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-semibold">Convites encontrados</h2>
          <Badge variant="secondary">{invitations.length}</Badge>
        </div>
        {isFetching ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando convites…</div>
        ) : invitations.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nenhum convite encontrado para os filtros atuais.</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {invitations.map((inv: any) => {
              const link = signupLink(inv.email);
              return (
                <div key={inv.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{inv.full_name || "Sem nome"}</span>
                      <Badge variant={inv.computed_status === "pending" ? "default" : inv.computed_status === "used" ? "secondary" : "destructive"}>
                        {statusLabels[inv.computed_status] ?? inv.computed_status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground break-all">{inv.email}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      <span>Curso: {inv.course?.title ?? "—"}</span>
                      <span>Produtor: {inv.course?.expert_name ?? "—"}</span>
                      <span>Turma: {inv.cohort || "—"}</span>
                      <span>Liberado em {formatDate(inv.created_at)}</span>
                      <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Prazo: {formatDate(inv.expires_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link de cadastro copiado"); }}>
                      Copiar link
                    </Button>
                    {inv.computed_status !== "used" && (
                      <Button variant="outline" size="sm" onClick={() => {
                        const next = window.prompt("Editar e-mail liberado:", inv.email)?.trim();
                        if (next) editEmail.mutate({ invitation_id: inv.id, email: next });
                      }}>
                        Editar e-mail
                      </Button>
                    )}
                    {(inv.computed_status === "expired" || inv.computed_status === "cancelled") && (
                      <Button variant="outline" size="sm" onClick={() => reactivate.mutate(inv.id)}>Liberar novamente</Button>
                    )}
                    {inv.computed_status !== "used" && inv.computed_status !== "cancelled" && (
                      <Button variant="outline" size="sm" onClick={() => { if (confirm("Cancelar este convite?")) cancel.mutate(inv.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}