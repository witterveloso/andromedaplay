import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase puts a recovery token in the URL hash; the client picks it up automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
      }
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada com sucesso");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--color-cosmic-navy)" }}
    >
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="space-y-4 text-center">
          <Link to="/" className="inline-block">
            <div className="flex justify-center">
              <AndromedaLogo className="scale-125" />
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-soft-white">Redefinir senha</h1>
        </div>

        <Card
          className="border-white/10 p-8 shadow-2xl backdrop-blur-xl"
          style={{ background: "rgba(11, 11, 15, 0.65)" }}
        >
          {!ready ? (
            <p className="text-sm text-stellar-silver">Carregando…</p>
          ) : !hasSession ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-stellar-silver">
                Este link expirou ou é inválido. Solicite uma nova redefinição.
              </p>
              <Button asChild className="w-full" style={{ background: "var(--gradient-cosmic)" }}>
                <Link to="/login">Voltar para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-soft-white">Nova senha</Label>
                <div className="relative">
                  <Input
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/10 bg-white/5 text-soft-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stellar-silver hover:text-soft-white"
                    aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-soft-white">Confirmar nova senha</Label>
                <Input
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="border-white/10 bg-white/5 text-soft-white"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full border-0 font-semibold text-soft-white"
                style={{ background: "var(--gradient-cosmic)", boxShadow: "var(--shadow-glow)" }}
              >
                {submitting ? "Salvando…" : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
