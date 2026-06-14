import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
import { ArrowRight, UserPlus } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Andromeda Play — Portal de acesso" },
      { name: "description", content: "Entre no ecossistema premium da Andromeda Play." },
      { property: "og:title", content: "Andromeda Play" },
      { property: "og:description", content: "Portal de acesso ao ecossistema Andromeda Play." },
    ],
  }),
  component: HomePage,
});

function CinematicBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base cosmic gradient */}
      <div className="absolute inset-0" style={{ background: "var(--gradient-aurora)" }} />
      {/* Deep vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(6,6,15,0.35) 55%, rgba(6,6,15,0.95) 100%)",
        }}
      />
      {/* Twin nebula glows */}
      <div
        className="absolute -top-40 -left-40 h-[640px] w-[640px] rounded-full blur-[180px] opacity-50"
        style={{ background: "radial-gradient(circle, #6C4DFF 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 h-[640px] w-[640px] rounded-full blur-[180px] opacity-40"
        style={{ background: "radial-gradient(circle, #00B8FF 0%, transparent 70%)" }}
      />
      {/* Star field */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 75% 65%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #BFC6D6, transparent), radial-gradient(1px 1px at 85% 15%, #00B8FF, transparent), radial-gradient(1px 1px at 10% 70%, #6C4DFF, transparent), radial-gradient(1.5px 1.5px at 60% 40%, #fff, transparent), radial-gradient(1px 1px at 30% 55%, #fff, transparent), radial-gradient(1px 1px at 92% 88%, #fff, transparent)",
          backgroundSize: "700px 700px",
        }}
      />
      {/* Subtle scanline grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />
    </div>
  );
}

function HomePage() {
  const { session, isAdmin, isExpert, isStudent } = useAuth();
  const inAppDest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : "/login";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
      style={{ background: "var(--color-cosmic-navy)", color: "var(--color-soft-white)" }}
    >
      <CinematicBackdrop />

      <main className="relative z-10 w-full max-w-2xl text-center">
        <div className="mb-10 flex justify-center">
          <div className="scale-125">
            <AndromedaLogo />
          </div>
        </div>

        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[10px] uppercase tracking-[0.32em] text-stellar-silver backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#00B8FF", boxShadow: "0 0 10px #00B8FF" }} />
          Portal de acesso
        </div>

        <h1 className="font-display font-bold leading-[1.02] tracking-tight text-[clamp(2.25rem,5.2vw,4.5rem)] max-w-3xl mx-auto">
          <span className="block text-soft-white">BEM-VINDO AO UNIVERSO DO</span>
          <span
            className="block bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-cosmic)" }}
          >
            CONHECIMENTO E DA EVOLUÇÃO.
          </span>
        </h1>

        <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-stellar-silver md:text-lg">
          Aprenda, evolua e acesse experiências educacionais em um único ambiente.
        </p>


        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={session ? inAppDest : "/login"}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-md px-8 py-3.5 text-sm font-semibold text-soft-white transition-all hover:scale-[1.02] sm:w-auto"
            style={{ background: "var(--gradient-cosmic)", boxShadow: "var(--shadow-glow)" }}
          >
            {session ? "Acessar plataforma" : "Entrar"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {!session && (
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-8 py-3.5 text-sm font-semibold text-soft-white backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.08] sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Criar conta
            </Link>
          )}
        </div>

        <p className="mt-14 text-[10px] uppercase tracking-[0.35em] text-stellar-silver/60">
          Andromeda Play · © {new Date().getFullYear()}
        </p>
      </main>
    </div>
  );
}
