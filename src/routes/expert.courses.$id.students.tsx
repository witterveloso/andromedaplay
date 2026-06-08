import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Plus, Trash2, Ban, Play, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { createStudent, removeStudent, updateEnrollment } from "@/lib/expert-students.functions";

export const Route = createFileRoute("/expert/courses/$id/students")({
  component: Students,
});

const ACCESS_PRESETS: { label: string; days: number | null }[] = [
  { label: "Sem prazo (vitalício)", days: null },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "180 dias", days: 180 },
  { label: "365 dias", days: 365 },
];

function daysFromNowISO(days: number | null): string | null {
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function formatExpiry(iso: string | null): { text: string; expired: boolean } {
  if (!iso) return { text: "Sem prazo", expired: false };
  const d = new Date(iso);
  const expired = d.getTime() < Date.now();
  return { text: d.toLocaleDateString("pt-BR"), expired };
}

function Students() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const createFn = useServerFn(createStudent);
  const removeFn = useServerFn(removeStudent);
  const updateFn = useServerFn(updateEnrollment);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", access_days: "null" });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["enrollments", id],
    queryFn: async () => {
      const { data: enrolls, error } = await supabase
        .from("enrollments")
        .select("student_id, created_at, status, expires_at")
        .eq("course_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (enrolls ?? []).map((e) => e.student_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return (enrolls ?? []).map((e) => ({ ...e, profile: byId.get(e.student_id) }));
    },
  });

  const add = useMutation({
    mutationFn: () => {
      const days = form.access_days === "null" ? null : Number(form.access_days);
      return createFn({
        data: {
          course_id: id,
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          expires_at: daysFromNowISO(days),
        },
      });
    },
    onSuccess: () => {
      toast.success("Aluno cadastrado");
      setForm({ full_name: "", email: "", password: "", access_days: "null" });
      qc.invalidateQueries({ queryKey: ["enrollments", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (student_id: string) => removeFn({ data: { course_id: id, student_id } }),
    onSuccess: () => { toast.success("Aluno removido"); qc.invalidateQueries({ queryKey: ["enrollments", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (vars: { student_id: string; status?: "active" | "blocked"; expires_at?: string | null }) =>
      updateFn({ data: { course_id: id, ...vars } }),
    onSuccess: () => { toast.success("Acesso atualizado"); qc.invalidateQueries({ queryKey: ["enrollments", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/expert/courses/$id" params={{ id }}><ChevronLeft className="mr-1 h-4 w-4" /> Voltar ao curso</Link>
      </Button>
      <h1 className="text-3xl font-semibold tracking-tight mb-6">Alunos do curso</h1>

      <Card className="p-6 mb-6">
        <h2 className="font-semibold mb-4">Cadastrar novo aluno</h2>
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha inicial</Label>
            <Input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo de acesso</Label>
            <Select value={form.access_days} onValueChange={(v) => setForm({ ...form, access_days: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCESS_PRESETS.map((p) => (
                  <SelectItem key={String(p.days)} value={p.days === null ? "null" : String(p.days)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={add.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> {add.isPending ? "Adicionando…" : "Cadastrar aluno"}
            </Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground mt-3">
          Se o email já existir na plataforma, o aluno é apenas matriculado neste curso (a senha é ignorada).
        </p>
      </Card>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : !rows?.length ? (
          <div className="p-10 text-center text-muted-foreground">Nenhum aluno matriculado.</div>
        ) : (
          <div className="divide-y">
            {rows.map((r: any) => {
              const expiry = formatExpiry(r.expires_at);
              const blocked = r.status === "blocked";
              const noAccess = blocked || expiry.expired;
              return (
                <div key={r.student_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{r.profile?.full_name ?? "(sem nome)"}</span>
                      {blocked ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : expiry.expired ? (
                        <Badge variant="destructive">Acesso expirado</Badge>
                      ) : (
                        <Badge variant="default">Ativo</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      <span>Matriculado em {new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Acesso até: <strong className={expiry.expired ? "text-destructive" : ""}>{expiry.text}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value="keep"
                      onValueChange={(v) => {
                        if (v === "keep") return;
                        const days = v === "null" ? null : Number(v);
                        update.mutate({ student_id: r.student_id, expires_at: daysFromNowISO(days) });
                      }}
                    >
                      <SelectTrigger className="h-9 w-[170px]">
                        <SelectValue placeholder="Alterar prazo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep" disabled>Alterar prazo…</SelectItem>
                        {ACCESS_PRESETS.map((p) => (
                          <SelectItem key={String(p.days)} value={p.days === null ? "null" : String(p.days)}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {noAccess && blocked ? (
                      <Button variant="outline" size="sm" onClick={() => update.mutate({ student_id: r.student_id, status: "active" })}>
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Desbloquear
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => {
                        if (confirm("Bloquear acesso deste aluno (ex.: falta de pagamento)?"))
                          update.mutate({ student_id: r.student_id, status: "blocked" });
                      }}>
                        <Ban className="mr-1.5 h-3.5 w-3.5" /> Bloquear
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => {
                      if (confirm("Remover este aluno do curso? Esta ação apaga a matrícula.")) remove.mutate(r.student_id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
