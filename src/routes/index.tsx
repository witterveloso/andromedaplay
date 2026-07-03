import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Film,
  BookOpenText,
  Briefcase,
  Sparkles,
  Compass,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Andromeda Play — Universo do conhecimento e da evolução" },
      {
        name: "description",
        content:
          "Aprenda, evolua e acesse experiências educacionais em um único ambiente — Andromeda Play.",
      },
      { property: "og:title", content: "Andromeda Play" },
      {
        property: "og:description",
        content:
          "Aprenda, evolua e acesse experiências educacionais em um único ambiente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

type Category = { label: string; icon: LucideIcon };

const CATEGORIES: Category[] = [
  { label: "Audiovisual", icon: Film },
  { label: "Formação Católica", icon: BookOpenText },
  { label: "Negócios", icon: Briefcase },
  { label: "Desenvolvimento Humano", icon: Sparkles },
  { label: "Liderança", icon: Compass },
  { label: "Carreira", icon: TrendingUp },
];

function HomePage() {
  const { session, loading, isAdmin, isExpert, isStudent } = useAuth();
  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;
  if (!loading && session && dest) return <Navigate to={dest} />;

  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-[#05060f] text-white">
      {/* Cosmic background layers */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(108,77,255,0.35), transparent 60%), radial-gradient(ellipse 70% 50% at 80% 100%, rgba(0,184,255,0.22), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 90%, rgba(108,77,255,0.18), transparent 60%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 star-field" />
      <div aria-hidden className="pointer-events-none absolute inset-0 star-field-2" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-5 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between py-5 sm:py-6">
          <Link
            to="/"
            className="font-display text-sm font-bold uppercase tracking-[0.28em] text-white sm:text-base"
          >
            Andromeda<span className="text-[#8b6bff]"> Play</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/produtos"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/80 backdrop-blur transition hover:border-white/30 hover:bg-white/10 hover:text-white sm:px-4 sm:py-2 sm:text-xs"
            >
              Produtos
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#00B8FF] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_24px_-6px_rgba(108,77,255,0.7)] transition hover:brightness-110 sm:px-5 sm:py-2 sm:text-xs"
            >
              Entrar
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col items-center justify-center py-10 text-center sm:py-16">
          <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Bem-vindo ao universo do{" "}
            <span className="bg-gradient-to-r from-[#6C4DFF] to-[#00B8FF] bg-clip-text text-transparent">
              conhecimento
            </span>{" "}
            e da{" "}
            <span className="bg-gradient-to-r from-[#00B8FF] to-[#6C4DFF] bg-clip-text text-transparent">
              evolução
            </span>
            .
          </h1>
          <p className="mt-5 max-w-2xl text-sm text-white/70 sm:mt-6 sm:text-base md:text-lg">
            Aprenda, evolua e acesse experiências educacionais em um único ambiente.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6C4DFF] to-[#00B8FF] px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_0_40px_-8px_rgba(108,77,255,0.8)] transition hover:brightness-110 sm:mt-10 sm:px-8 sm:py-4 sm:text-base"
          >
            Entrar <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
        </section>

        {/* Constellation of categories */}
        <section className="relative pb-16 pt-4 sm:pb-24">
          <h2 className="sr-only">Áreas de conhecimento</h2>
          <div className="relative mx-auto flex max-w-5xl items-center justify-center">
            {/* Central glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 hidden h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full md:block"
              style={{
                background:
                  "radial-gradient(circle, rgba(108,77,255,0.55) 0%, rgba(0,184,255,0.25) 40%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 hidden h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full md:block"
              style={{
                background:
                  "radial-gradient(circle, #ffffff 0%, #8b6bff 40%, transparent 70%)",
                boxShadow: "0 0 60px 10px rgba(108,77,255,0.6)",
              }}
            />

            <div className="relative grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-6">
              {CATEGORIES.map(({ label, icon: Icon }, i) => (
                <div
                  key={label}
                  className={`group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition hover:border-[#8b6bff]/60 hover:bg-white/[0.06] sm:flex-col sm:items-center sm:gap-3 sm:p-6 sm:text-center ${
                    i === 1 || i === 4 ? "md:translate-y-6" : ""
                  }`}
                  style={{
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 30px -12px rgba(108,77,255,0.35)",
                  }}
                >
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#6C4DFF]/30 to-[#00B8FF]/20 ring-1 ring-white/10 transition group-hover:ring-[#8b6bff]/60 sm:h-14 sm:w-14"
                    style={{ boxShadow: "0 0 24px -8px rgba(108,77,255,0.7)" }}
                  >
                    <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                  </div>
                  <span className="font-display text-sm font-bold uppercase tracking-[0.15em] text-white/90 sm:text-base">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Star fields via CSS (no external assets) */}
      <style>{`
        .star-field, .star-field-2 {
          background-repeat: repeat;
          opacity: 0.6;
        }
        .star-field {
          background-image:
            radial-gradient(1px 1px at 20px 30px, #ffffff, transparent),
            radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1.5px 1.5px at 90px 40px, #ffffff, transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 160px 120px, #ffffff, transparent),
            radial-gradient(1px 1px at 200px 50px, rgba(255,255,255,0.6), transparent);
          background-size: 220px 160px;
        }
        .star-field-2 {
          background-image:
            radial-gradient(1px 1px at 50px 100px, rgba(139,107,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 150px 200px, rgba(0,184,255,0.8), transparent),
            radial-gradient(1px 1px at 250px 60px, #ffffff, transparent),
            radial-gradient(1px 1px at 320px 180px, rgba(255,255,255,0.7), transparent);
          background-size: 400px 300px;
          opacity: 0.4;
        }
      `}</style>
    </main>
  );
}
