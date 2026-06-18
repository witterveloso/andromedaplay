import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
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

/**
 * Full-screen hero. The reference artwork is the experience itself:
 * it already contains the logo, headline, subtitle and CTAs painted in.
 * We render it as a 100vh cover background and overlay invisible click
 * targets on top of the painted "Entrar" / "Criar conta" buttons so they
 * become functional without disturbing the composition.
 *
 * Painted button positions (relative to the artwork, 1536 x 1024):
 *   Entrar       → ~ x: 520..758  y: 504..587
 *   Criar conta  → ~ x: 770..1004 y: 504..587
 */
function HomePage() {
  const { session, isAdmin, isExpert, isStudent } = useAuth();
  const inAppDest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : "/login";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "#05050d", color: "var(--color-soft-white)" }}
    >
      {/* Hero artwork — full screen, never cropped at the center */}
      <div
        aria-hidden
        className="absolute inset-0 bg-center bg-no-repeat bg-cover"
        style={{ backgroundImage: `url(${heroAsset.url})` }}
      />

      {/* Subtle readability overlay (per spec) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Functional layer — invisible click targets aligned with the painted CTAs.
          On narrow viewports the artwork's CTAs may not align, so we also render
          a visible fallback row anchored to the bottom. */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1536px] flex-col">
        {/* Visually-hidden semantic content for SEO / a11y */}
        <h1 className="sr-only">Bem-vindo ao universo do conhecimento e da evolução.</h1>
        <p className="sr-only">
          Aprenda, evolua e acesse experiências educacionais em um único ambiente.
        </p>

        {/* Click hotspots over the painted CTAs — only on wide screens where
            the artwork is shown in full composition. */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <Link
            to={session ? inAppDest : "/login"}
            aria-label={session ? "Acessar plataforma" : "Entrar"}
            className="pointer-events-auto absolute rounded-md focus:outline-none focus:ring-2 focus:ring-white/70"
            style={{
              left: "33.85%",
              top: "49.2%",
              width: "15.5%",
              height: "8.1%",
            }}
          />
          {!session && (
            <Link
              to="/login"
              search={{ mode: "signup" }}
              aria-label="Criar conta"
              className="pointer-events-auto absolute rounded-md focus:outline-none focus:ring-2 focus:ring-white/70"
              style={{
                left: "50.15%",
                top: "49.2%",
                width: "15.3%",
                height: "8.1%",
              }}
            />
          )}
        </div>

        {/* Mobile / tablet CTAs — anchored bottom, never on top of the globe */}
        <div className="mt-auto flex w-full flex-col items-center gap-3 px-6 pb-10 lg:hidden">
          <Link
            to={session ? inAppDest : "/login"}
            className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-md px-8 py-3.5 text-sm font-semibold text-soft-white"
            style={{ background: "var(--gradient-cosmic)", boxShadow: "var(--shadow-glow)" }}
          >
            {session ? "Acessar plataforma" : "Entrar"}
          </Link>
          {!session && (
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-md border border-white/25 bg-black/40 px-8 py-3.5 text-sm font-semibold text-soft-white backdrop-blur-md"
            >
              Criar conta
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
