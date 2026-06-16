import { createFileRoute, useNavigate, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
import { Eye, EyeOff } from "lucide-react";
import { signupWithInvitation } from "@/lib/auth-access.functions";

type LoginSearch = { mode?: "signin" | "signup"; email?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    mode: search.mode === "signup" ? "signup" : "signin",
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: LoginPage,
});

function CinematicBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "var(--gradient-aurora)" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(6,6,15,0.35) 55%, rgba(6,6,15,0.95) 100%)",
        }}
      />
      <div
        className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full blur-[180px] opacity-50"
        style={{ background: "radial-gradient(circle, #6C4DFF 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full blur-[180px] opacity-40"
        style={{ background: "radial-gradient(circle, #00B8FF 0%, transparent 70%)" }}
      />
    </div>
  );
}

function LoginPage() {
  const { session, loading, isAdmin, isExpert, isStudent } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const signupFn = useServerFn(signupWithInvitation);
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;

  useEffect(() => {
    if (search.mode) setMode(search.mode);
    if (search.email) setEmail(search.email.trim().toLowerCase());
  }, [search.mode, search.email]);

  useEffect(() => {
    if (!loading && session && dest) navigate({ to: dest });
  }, [loading, session, dest, navigate]);

  if (!loading && session && dest) return <Navigate to={dest} />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Login realizado");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setSubmitting(true);
    try {
      await signupFn({ data: { email: normalizedEmail, password, full_name: name } });
      // Auto sign-in
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signErr) throw signErr;
      toast.success("Conta criada com sucesso");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao criar conta");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotSubmitting(true);
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSubmitting(false);
    toast.success("Se este e-mail estiver cadastrado, enviaremos as instruções de recuperação.");
    setForgotOpen(false);
    setForgotEmail("");
  }

  const isSignup = mode === "signup";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--color-cosmic-navy)" }}
    >
      <CinematicBackdrop />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="space-y-4 text-center">
          <Link to="/" className="inline-block">
            <div className="flex justify-center">
              <AndromedaLogo className="scale-125" />
            </div>
          </Link>
          <p className="text-sm text-stellar-silver md:text-base">
            {isSignup
              ? "Crie sua conta com o e-mail liberado pelo seu produtor"
              : "Seu universo de aprendizado, comunidade e conteúdo premium"}
          </p>
        </div>

        <Card
          className="border-white/10 p-8 shadow-2xl backdrop-blur-xl"
          style={{ background: "rgba(11, 11, 15, 0.65)", boxShadow: "0 30px 80px -20px rgba(108,77,255,0.35)" }}
        >
          <div className="mb-6 flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                !isSignup ? "text-soft-white" : "text-stellar-silver hover:text-soft-white"
              }`}
              style={!isSignup ? { background: "var(--gradient-cosmic)", boxShadow: "0 0 18px rgba(108,77,255,0.4)" } : {}}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                isSignup ? "text-soft-white" : "text-stellar-silver hover:text-soft-white"
              }`}
              style={isSignup ? { background: "var(--gradient-cosmic)", boxShadow: "0 0 18px rgba(108,77,255,0.4)" } : {}}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={isSignup ? handleSignUp : handleSignIn} className="space-y-5">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-soft-white">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="border-white/10 bg-white/5 text-soft-white placeholder:text-stellar-silver/50 focus:border-electric-blue focus:ring-electric-blue/20"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-soft-white">Email</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-soft-white">Senha</Label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                    className="text-xs text-stellar-silver hover:text-soft-white underline-offset-2 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  required
                  minLength={isSignup ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-white/10 bg-white/5 text-soft-white placeholder:text-stellar-silver/50 focus:border-electric-blue focus:ring-electric-blue/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stellar-silver hover:text-soft-white"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full border-0 font-semibold text-soft-white transition hover:scale-[1.02] hover:opacity-90"
              style={{ background: "var(--gradient-cosmic)", boxShadow: "var(--shadow-glow)" }}
            >
              {submitting ? (isSignup ? "Criando…" : "Entrando…") : isSignup ? "Criar conta" : "Entrar"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-stellar-silver/60">
          <Link to="/" className="hover:text-soft-white">← Voltar ao portal</Link>
        </p>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <Button type="submit" disabled={forgotSubmitting} className="w-full">
              {forgotSubmitting ? "Enviando…" : "Enviar link de recuperação"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
