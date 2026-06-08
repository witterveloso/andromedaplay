import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createStudent, removeStudent } from "@/lib/expert-students.functions";

export const Route = createFileRoute("/expert/courses/$id/students")({
  component: Students,
});

function Students() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const createFn = useServerFn(createStudent);
  const removeFn = useServerFn(removeStudent);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["enrollments", id],
    queryFn: async () => {
      const { data: enrolls, error } = await supabase
        .from("enrollments")
        .select("student_id, created_at, status")
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
    mutationFn: () => createFn({ data: { course_id: id, ...form } }),
    onSuccess: () => {
      toast.success("Aluno cadastrado");
      setForm({ full_name: "", email: "", password: "" });
      qc.invalidateQueries({ queryKey: ["enrollments", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (student_id: string) => removeFn({ data: { course_id: id, student_id } }),
    onSuccess: () => { toast.success("Aluno removido"); qc.invalidateQueries({ queryKey: ["enrollments", id] }); },
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
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
          <Button type="submit" disabled={add.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> {add.isPending ? "Adicionando…" : "Cadastrar"}
          </Button>
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
            {rows.map((r) => (
              <div key={r.student_id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{r.profile?.full_name ?? "(sem nome)"}</div>
                  <div className="text-xs text-muted-foreground">Matriculado em {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  if (confirm("Remover este aluno do curso?")) remove.mutate(r.student_id);
                }}>
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
