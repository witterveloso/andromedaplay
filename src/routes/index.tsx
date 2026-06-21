import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import andromedaMark from "@/assets/andromeda-mark.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Andromeda Play — Conhecimento e Evolução" },
      { name: "description", content: "Plataforma educacional premium. Entre no universo Andromeda Play." },
      { property: "og:title", content: "Andromeda Play" },
      { property: "og:description", content: "Plataforma educacional premium." },
      { property: "og:image", content: andromedaMark.url },
    ],
  }),
  component: HomePage,
});

const holograms = [
  { label: "Audiovisual", x: "8%", y: "30%", delay: "0s" },
  { label: "Desenvolvimento Humano", x: "78%", y: "26%", delay: "1.5s" },
  { label: "Formação Católica", x: "12%", y: "70%", delay: "3s" },
];

function HomePage() {
  const { session, isAdmin, isExpert, isStudent, loading } = useAuth();
  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;
  if (!loading && session && dest) return <Navigate to={dest} />;

  return (
    <div
      className="relative min-h-[100svh] w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, #1a1750 0%, #0a0820 45%, #04030f 100%)",
        color: "#E8ECFF",
      }}
    >
      {/* Nebula glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[160px]"
          style={{ background: "radial-gradient(circle, #4A2FCF 0%, transparent 65%)" }}
        />
        <div
          className="absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full opacity-40 blur-[140px]"
          style={{ background: "radial-gradient(circle, #6C4DFF 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-32 h-[560px] w-[560px] rounded-full opacity-35 blur-[140px]"
          style={{ background: "radial-gradient(circle, #00B8FF 0%, transparent 70%)" }}
        />
        {/* Stars */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.9), transparent 50%)," +
              "radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.7), transparent 50%)," +
              "radial-gradient(1.5px 1.5px at 80% 60%, rgba(255,255,255,0.8), transparent 50%)," +
              "radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.6), transparent 50%)," +
              "radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.5), transparent 50%)," +
              "radial-gradient(1px 1px at 90% 85%, rgba(255,255,255,0.7), transparent 50%)," +
              "radial-gradient(1.5px 1.5px at 15% 65%, rgba(255,255,255,0.8), transparent 50%)," +
              "radial-gradient(1px 1px at 60% 90%, rgba(255,255,255,0.5), transparent 50%)",
            backgroundSize: "100% 100%",
          }}
        />
        {/* Floating particles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/70"
            style={{
              width: `${1 + (i % 3) * 0.5}px`,
              height: `${1 + (i % 3) * 0.5}px`,
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              opacity: 0.5,
              animation: `andromedaFloat ${10 + (i % 6)}s ease-in-out ${i * 0.4}s infinite`,
              boxShadow: "0 0 6px rgba(180,200,255,0.7)",
            }}
          />
        ))}
      </div>

      {/* Lateral holograms — desktop only, low opacity */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        {holograms.map((h) => (
          <div
            key={h.label}
            className="absolute rounded-2xl border border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.2em] backdrop-blur-md"
            style={{
              left: h.x,
              top: h.y,
              background:
                "linear-gradient(135deg, rgba(108,77,255,0.10), rgba(0,184,255,0.06))",
              color: "rgba(220,228,255,0.55)",
              boxShadow: "0 0 30px rgba(108,77,255,0.15), inset 0 0 20px rgba(0,184,255,0.08)",
              animation: `holoBreathe 6s ease-in-out ${h.delay} infinite`,
            }}
          >
            <span
              className="mr-2 inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#00B8FF", boxShadow: "0 0 8px #00B8FF" }}
            />
            {h.label}
          </div>
        ))}
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center justify-center px-6 py-10 text-center">
        {/* Holographic logo */}
        <div className="relative flex items-center justify-center">
          {/* Halo */}
          <div
            aria-hidden
            className="absolute inset-0 m-auto h-[280px] w-[280px] rounded-full sm:h-[360px] sm:w-[360px]"
            style={{
              background:
                "radial-gradient(circle, rgba(108,77,255,0.45) 0%, rgba(0,184,255,0.18) 35%, transparent 70%)",
              filter: "blur(20px)",
              animation: "haloPulse 5s ease-in-out infinite",
            }}
          />
          {/* Orbital ring */}
          <div
            aria-hidden
            className="absolute h-[260px] w-[260px] rounded-full border border-white/10 sm:h-[340px] sm:w-[340px]"
            style={{
              transform: "rotateX(70deg)",
              boxShadow: "0 0 40px rgba(0,184,255,0.25)",
              animation: "orbitSpin 24s linear infinite",
            }}
          />
          <img
            src={andromedaMark.url}
            alt="Andromeda Play"
            className="relative h-44 w-44 select-none object-contain sm:h-56 sm:w-56"
            style={{
              filter:
                "drop-shadow(0 0 30px rgba(108,77,255,0.55)) drop-shadow(0 0 60px rgba(0,184,255,0.35))",
              animation: "logoFloat 6s ease-in-out infinite",
            }}
            draggable={false}
          />
        </div>

        {/* Wordmark */}
        <div className="mt-6 flex flex-col items-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.55em] text-white/50 sm:text-xs">
            Andromeda Play
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-8 text-balance text-2xl font-light leading-[1.15] tracking-tight text-white/95 sm:text-3xl md:text-4xl">
          BEM-VINDO AO UNIVERSO DO
          <br />
          <span
            className="bg-clip-text font-semibold text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(120deg, #8FB8FF 0%, #6C4DFF 50%, #C5A2FF 100%)",
            }}
          >
            Conhecimento
          </span>{" "}
          <span className="text-white/80">e</span>{" "}
          <span
            className="bg-clip-text font-semibold text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(120deg, #C5A2FF 0%, #6C4DFF 50%, #00B8FF 100%)",
            }}
          >
            Evolução
          </span>
        </h1>

        <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
          Educação premium em audiovisual, desenvolvimento humano e formação católica.
        </p>

        {/* Buttons */}
        <div className="mt-9 flex w-full max-w-sm flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-8 text-sm font-semibold text-white transition-all hover:scale-[1.02] sm:min-w-[170px]"
            style={{
              background:
                "linear-gradient(120deg, #4A2FCF 0%, #6C4DFF 50%, #00B8FF 100%)",
              boxShadow:
                "0 10px 40px -10px rgba(108,77,255,0.7), 0 0 0 1px rgba(255,255,255,0.08) inset",
            }}
          >
            Entrar
          </Link>
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-8 text-sm font-semibold text-white/90 backdrop-blur-xl transition-all hover:scale-[1.02] hover:bg-white/[0.08] sm:min-w-[170px]"
            style={{ boxShadow: "inset 0 0 20px rgba(255,255,255,0.04)" }}
          >
            Criar conta
          </Link>
        </div>

        <p className="mt-8 text-[11px] tracking-wide text-white/40">
          Acesso liberado mediante convite do seu produtor.
        </p>
      </main>

      <footer className="absolute bottom-0 left-0 z-10 w-full pb-4 text-center text-[10px] tracking-[0.3em] text-white/30 uppercase">
        © {new Date().getFullYear()} Andromeda Play
      </footer>

      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes haloPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes orbitSpin {
          from { transform: rotateX(70deg) rotate(0deg); }
          to { transform: rotateX(70deg) rotate(360deg); }
        }
        @keyframes holoBreathe {
          0%, 100% { opacity: 0.55; transform: translateY(0); }
          50% { opacity: 0.85; transform: translateY(-4px); }
        }
        @keyframes andromedaFloat {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          50% { transform: translate(8px, -14px); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
