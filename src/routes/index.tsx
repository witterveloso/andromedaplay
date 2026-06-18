import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
import { ArrowRight, UserPlus } from "lucide-react";
import heroAsset from "@/assets/andromeda-hero.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Andromeda Play — Portal de acesso" },
      { name: "description", content: "Entre no ecossistema premium da Andromeda Play." },
      { property: "og:title", content: "Andromeda Play" },
      { property: "og:description", content: "Portal de acesso ao ecossistema Andromeda Play." },
      { property: "og:image", content: heroAsset.url },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { session, isAdmin, isExpert, isStudent } = useAuth();
  const inAppDest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : "/login";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "#05050d", color: "var(--color-soft-white)" }}
    >
      {/* Hero background image — full screen */}
      <div
        aria-hidden
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${heroAsset.url})` }}
      />

      {/* Readability overlay */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-8 flex justify-center">
          <AndromedaLogo size={56} />
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-1.5 text-[10px] uppercase tracking-[0.32em] text-stellar-silver backdrop-blur-md">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#00B8FF", boxShadow: "0 0 10px #00B8FF" }}
          />
          Portal de acesso
        </div>

        <h1
          className="mx-auto max-w-4xl text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.02em]"
          style={{
            fontFamily: "Sora, system-ui, sans-serif",
            textShadow: "0 4px 32px rgba(0,0,0,0.6)",
          }}
        >
          <span className="block text-soft-white/95">Bem-vindo ao universo do</span>
          <span
            className="block bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-cosmic)" }}
          >
            conhecimento e da evolução.
          </span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-stellar-silver md:text-[17px]"
          style={{
            fontFamily: "Manrope, system-ui, sans-serif",
            textShadow: "0 2px 16px rgba(0,0,0,0.6)",
          }}
        >
          Aprenda, evolua e acesse experiências educacionais em um único ambiente.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row sm:max-w-none">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/20 bg-black/30 px-8 py-3.5 text-sm font-semibold text-soft-white backdrop-blur-md transition hover:border-white/40 hover:bg-black/45 sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Criar conta
            </Link>
          )}
        </div>

        <p className="mt-12 text-[10px] uppercase tracking-[0.35em] text-stellar-silver/70">
          Andromeda Play · © {new Date().getFullYear()}
        </p>
      </main>
    </div>
  );
}
