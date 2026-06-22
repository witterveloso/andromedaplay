import { createFileRoute, useNavigate, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { signupWithInvitation } from "@/lib/auth-access.functions";
import loginDesktop from "@/assets/andromeda-login-desktop.png.asset.json";
import homeMobile from "@/assets/andromeda-home-mobile.png.asset.json";

type LoginSearch = { mode?: "signin" | "signup"; email?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    mode: search.mode === "signup" ? "signup" : "signin",
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Andromeda Play" },
      { name: "description", content: "Acesse sua conta na Andromeda Play." },
      { property: "og:image", content: loginDesktop.url },
    ],
  }),
  component: LoginPage,
});

const hotspotBase =
  "absolute block bg-transparent border-0 outline-none appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-60";

// Transparent inputs that visually belong to the artwork.
// Font sizes are container-query based so they scale with the frame.
const inputBase =
  "absolute w-full h-full bg-transparent border-0 outline-none ring-0 text-white placeholder:text-white/40 focus:outline-none focus:ring-0 caret-white";

function LoginPage() {
  const { session, loading, isAdmin, isExpert, isStudent } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const signupFn = useServerFn(signupWithInvitation);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;

  useEffect(() => {
    if (search.mode === "signup") setSignupOpen(true);
    if (search.email) setEmail(search.email.trim().toLowerCase());
  }, [search.mode, search.email]);

  useEffect(() => {
    if (!loading && session && dest) navigate({ to: dest });
  }, [loading, session, dest, navigate]);

  if (!loading && session && dest) return <Navigate to={dest} />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) return;
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
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signErr) throw signErr;
      toast.success("Conta criada com sucesso");
      setSignupOpen(false);
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
    toast.success("Se este e-mail estiver cadastrado, enviaremos as instruções.");
    setForgotOpen(false);
    setForgotEmail("");
  }

  // Font scales with the frame width via container queries.
  const inputFont = { fontSize: "clamp(12px, 1.15cqw, 16px)", paddingLeft: "12%", paddingRight: "12%" } as const;

  return (
    <main className="relative h-[100svh] w-screen overflow-hidden bg-black">
      {/* DESKTOP frame — image sized to viewport preserving aspect ratio */}
      <div className="absolute inset-0 hidden md:grid place-items-center">
        <div
          className="relative"
          style={{
            aspectRatio: "1672 / 941",
            width: `min(100vw, 100svh * (1672/941))`,
            height: `min(100svh, 100vw * (941/1672))`,
            backgroundImage: `url(${loginDesktop.url})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            containerType: "inline-size",
          }}
          aria-label="Andromeda Play — Entrar"
        >
          <form onSubmit={handleSignIn} className="absolute inset-0" autoComplete="on">
            {/* Criar conta — top right pill */}
            <button
              type="button"
              onClick={() => setSignupOpen(true)}
              aria-label="Criar conta"
              className={hotspotBase}
              style={{ top: "3.5%", right: "2%", width: "13%", height: "7.5%" }}
            />

            {/* Email field */}
            <div
              className="absolute"
              style={{ top: "42.5%", left: "14.4%", width: "27.5%", height: "8%" }}
            >
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
                className={inputBase}
                style={inputFont}
              />
            </div>

            {/* Password field */}
            <div
              className="absolute"
              style={{ top: "55.3%", left: "14.4%", width: "27.5%", height: "8%" }}
            >
              <input
                type={showPwd ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Senha"
                className={inputBase}
                style={inputFont}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                className="absolute top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-transparent border-0 p-0"
                style={{ right: "8%" }}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Esqueci minha senha */}
            <button
              type="button"
              onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
              aria-label="Esqueci minha senha"
              className={hotspotBase}
              style={{ top: "65.9%", left: "30.5%", width: "11.4%", height: "3.5%" }}
            />

            {/* Entrar — main */}
            <button
              type="submit"
              disabled={submitting}
              aria-label="Entrar"
              className={hotspotBase}
              style={{ top: "70.7%", left: "14.4%", width: "27.5%", height: "8.5%" }}
            />

            {/* Criar conta — secondary */}
            <button
              type="button"
              onClick={() => setSignupOpen(true)}
              aria-label="Criar conta"
              className={hotspotBase}
              style={{ top: "84%", left: "14.4%", width: "27.5%", height: "7.5%" }}
            />
          </form>
        </div>
      </div>

      {/* MOBILE frame with artwork backdrop + visible card */}
      <div className="absolute inset-0 grid place-items-center md:hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${homeMobile.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-sm px-6">
          <div className="space-y-4 rounded-2xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl">
            <h2 className="text-center text-2xl font-semibold text-white">Entrar</h2>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-email" className="text-white/90">E-mail</Label>
                <Input
                  id="m-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-pwd" className="text-white/90">Senha</Label>
                <div className="relative">
                  <Input
                    id="m-pwd"
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="border-white/15 bg-white/5 pr-10 text-white placeholder:text-white/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                  className="ml-auto block text-xs text-white/70 underline-offset-2 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full border-0 font-semibold text-white"
                style={{ background: "var(--gradient-cosmic, linear-gradient(90deg,#3B6BFF,#8A5BFF))" }}
              >
                {submitting ? "Entrando…" : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSignupOpen(true)}
                className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                Criar conta
              </Button>
            </form>
            <p className="text-center text-xs text-white/60">
              <Link to="/" className="hover:text-white">← Voltar</Link>
            </p>
          </div>
        </div>
      </div>

      <h1 className="sr-only">Entrar na Andromeda Play</h1>

      {/* Signup dialog */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar conta</DialogTitle>
            <DialogDescription>
              Use o e-mail liberado pelo seu produtor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Nome</Label>
              <Input id="s-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">E-mail</Label>
              <Input id="s-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-pwd">Senha</Label>
              <Input id="s-pwd" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Criando…" : "Criar conta"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Forgot password dialog */}
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
    </main>
  );
}
