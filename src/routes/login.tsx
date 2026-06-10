import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function StarField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "var(--gradient-aurora)" }} />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 75% 65%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #BFC6D6, transparent), radial-gradient(1px 1px at 85% 15%, #00B8FF, transparent), radial-gradient(1px 1px at 10% 70%, #6C4DFF, transparent), radial-gradient(1.5px 1.5px at 60% 40%, #fff, transparent)",
          backgroundSize: "600px 600px",
        }}
      />
    </div>
  );
}

function LoginPage() {
  const { session, loading, isAdmin, isExpert, isStudent } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;

  useEffect(() => {
    if (!loading && session && dest) navigate({ to: dest });
  }, [loading, session, dest, navigate]);

  if (!loading && session && dest) return <Navigate to={dest} />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Login realizado");
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Falha no login com Google");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12" style={{ background: "var(--color-cosmic-navy)" }}>
      <StarField />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AndromedaLogo className="scale-125" />
          </div>
          <p className="text-sm text-stellar-silver md:text-base">
            Seu universo de aprendizado, comunidade e conteúdo premium
          </p>
        </div>

        <Card
          className="border-white/10 p-8 shadow-2xl backdrop-blur-md"
          style={{ background: "rgba(11, 11, 15, 0.65)" }}
        >
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-soft-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="border-white/10 bg-white/5 text-soft-white placeholder:text-stellar-silver/50 focus:border-electric-blue focus:ring-electric-blue/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-soft-white">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-white/10 bg-white/5 text-soft-white placeholder:text-stellar-silver/50 focus:border-electric-blue focus:ring-electric-blue/20"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full border-0 font-semibold text-soft-white transition hover:scale-[1.02] hover:opacity-90"
              style={{
                background: "var(--gradient-cosmic)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 text-stellar-silver/70" style={{ background: "rgba(11, 11, 15, 0.65)" }}>
                ou
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            className="w-full border-white/10 bg-white/5 text-soft-white transition hover:bg-white/10 hover:text-soft-white"
            onClick={handleGoogle}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar com Google
          </Button>
        </Card>
      </div>
    </div>
  );
}
