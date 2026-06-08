import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { createExpert } from "@/lib/admin-experts.functions";

export const Route = createFileRoute("/admin/experts/new")({
  component: NewExpert,
});

function NewExpert() {
  const nav = useNavigate();
  const fn = useServerFn(createExpert);
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });

  const m = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => { toast.success("Expert criado"); nav({ to: "/admin/experts" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight mb-1">Novo expert</h1>
      <p className="text-muted-foreground mb-6">O expert recebe login e senha para criar e gerenciar seus cursos</p>
      <Card className="p-6">
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha inicial</Label>
            <Input required type="text" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="text-xs text-muted-foreground">Compartilhe com o expert. Ele poderá trocar depois.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => nav({ to: "/admin/experts" })}>Cancelar</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending ? "Criando…" : "Cadastrar expert"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
