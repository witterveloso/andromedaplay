import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lookupUser } from "@/lib/admin-platform.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Search, Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/support")({
  component: SupportPage,
});

function SupportPage() {
  const [email, setEmail] = useState("");
  const fn = useServerFn(lookupUser);
  const lookup = useMutation({
    mutationFn: () => fn({ data: { email: email.trim() } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const result = lookup.data;
  const user = result?.user;

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Atendimento</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Suporte técnico</h1>
        <p className="text-muted-foreground mt-1">Busque um usuário por e-mail para diagnosticar acessos.</p>
      </div>

      <Card className="p-5 border-white/[0.06]">
        <form
          onSubmit={(e) => { e.preventDefault(); if (email.trim()) lookup.mutate(); }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="email@usuario.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={!email.trim() || lookup.isPending}>
            {lookup.isPending ? "Buscando…" : "Buscar"}
          </Button>
        </form>
      </Card>

      {lookup.isSuccess && !user && (
        <Card className="p-6 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="h-4 w-4" /> Nenhum usuário encontrado com esse e-mail.
          </div>
        </Card>
      )}

      {user && result && (
        <div className="space-y-4">
          <Card className="p-5 border-white/[0.06]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{result.profile?.full_name ?? "Sem nome"}</h2>
                  {result.roles.map((r) => (
                    <Badge key={r} variant="outline" className="capitalize">{r}</Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Mail className="h-3.5 w-3.5" /> {user.email}
                </p>
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  <div>ID: <code className="text-foreground/80">{user.id}</code></div>
                  <div>Cadastro: {user.created_at ? new Date(user.created_at).toLocaleString("pt-BR") : "—"}</div>
                  <div>Último login: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.email_confirmed_at ? (
                  <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> E-mail confirmado</Badge>
                ) : (
                  <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" /> E-mail não confirmado</Badge>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5 border-white/[0.06]">
            <h3 className="font-semibold mb-3">Acessos do aluno</h3>
            {result.enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum acesso ativo.</p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {result.enrollments.map((e: any) => (
                  <div key={e.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{e.course?.title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        desde {new Date(e.created_at).toLocaleDateString("pt-BR")}
                        {e.expires_at && ` · expira ${new Date(e.expires_at).toLocaleDateString("pt-BR")}`}
                      </div>
                    </div>
                    <Badge variant={e.status === "active" ? "default" : "secondary"}>
                      {e.status === "active" ? "Ativo" : "Revogado"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {result.expert && (
            <Card className="p-5 border-white/[0.06]">
              <h3 className="font-semibold mb-1">Conta de produtor</h3>
              <p className="text-xs text-muted-foreground mb-3">Status: <Badge variant="outline">{result.expert.status}</Badge></p>
              {result.owned_courses.length > 0 ? (
                <ul className="divide-y divide-white/[0.06]">
                  {result.owned_courses.map((c: any) => (
                    <li key={c.id} className="py-2 text-sm flex justify-between gap-3">
                      <span className="truncate">{c.title}</span>
                      <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sem cursos.</p>
              )}
            </Card>
          )}
        </div>
      )}

      {!user && !lookup.isPending && !lookup.isSuccess && (
        <Card className="p-6 border-white/[0.06] bg-primary/5">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <LifeBuoy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p>Busque um aluno ou produtor pelo e-mail para ver dados cadastrais, acessos e possíveis problemas.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
