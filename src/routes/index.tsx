import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
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
  const { session, isAdmin, isExpert, isStudent, loading } = useAuth();
  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;

  // If already signed in, route directly to the right area.
  if (!loading && session && dest) return <Navigate to={dest} />;

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "#06060d", color: "var(--color-soft-white)" }}
    >
      {/* Ambient premium backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -left-40 h-[640px] w-[640px] rounded-full opacity-40 blur-[180px]"
          style={{ background: "radial-gradient(circle, #6C4DFF 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-52 -right-40 h-[640px] w-[640px] rounded-full opacity-30 blur-[180px]"
          style={{ background: "radial-gradient(circle, #00B8FF 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 md:px-10 lg:px-12">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <AndromedaLogo />
        </header>

        {/* Hero */}
        <section className="grid flex-1 grid-cols-1 items-center gap-10 py-10 lg:grid-cols-2 lg:gap-16 lg:py-16">
          {/* Copy + actions */}
          <div className="order-2 flex flex-col items-start gap-6 lg:order-1">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-stellar-silver backdrop-blur-md"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "#00B8FF", boxShadow: "0 0 10px #00B8FF" }}
              />
              Plataforma educacional premium
            </span>

            <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-soft-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              Bem-vindo ao universo do{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, #E879F9 0%, #6C4DFF 50%, #00B8FF 100%)",
                }}
              >
                conhecimento
              </span>{" "}
              e da evolução.
            </h1>

            <p className="max-w-xl text-pretty text-base leading-relaxed text-stellar-silver sm:text-lg">
              Aprenda, evolua e acesse experiências educacionais sofisticadas
              em um único ambiente.
            </p>

            <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-md px-8 text-sm font-semibold text-soft-white transition hover:opacity-95 sm:flex-none sm:min-w-[160px]"
                style={{
                  background: "var(--gradient-cosmic)",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                Entrar
              </Link>
              <Link
                to="/login"
                search={{ mode: "signup" }}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-md border border-white/15 bg-white/[0.04] px-8 text-sm font-semibold text-soft-white backdrop-blur-md transition hover:bg-white/[0.08] sm:flex-none sm:min-w-[160px]"
              >
                Criar conta
              </Link>
            </div>

            <p className="text-xs text-stellar-silver/60">
              Acesso liberado mediante convite do seu produtor.
            </p>
          </div>

          {/* Artwork — contained, never cropped */}
          <div className="order-1 flex items-center justify-center lg:order-2">
            <div className="relative w-full max-w-[560px]">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full opacity-60 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(108,77,255,0.45), transparent 60%)",
                }}
              />
              <img
                src={heroAsset.url}
                alt="Universo Andromeda Play"
                className="h-auto w-full select-none object-contain"
                draggable={false}
                loading="eager"
              />
            </div>
          </div>
        </section>

        <footer className="pb-2 pt-4 text-center text-xs text-stellar-silver/50">
          © {new Date().getFullYear()} Andromeda Play
        </footer>
      </main>
    </div>
  );
}
