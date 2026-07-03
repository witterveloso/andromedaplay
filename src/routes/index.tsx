import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import homeDesktopAsset from "@/assets/andromeda-home-desktop.png.asset.json";
import homeMobileAsset from "@/assets/andromeda-home-mobile.png.asset.json";
const homeDesktop = homeDesktopAsset.url;
const homeMobile = homeMobileAsset.url;

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

function HomePage() {
  const { session, loading, isAdmin, isExpert, isStudent } = useAuth();
  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;
  if (!loading && session && dest) return <Navigate to={dest} />;

  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-black text-white">
      {/* Desktop artwork */}
      <div className="relative hidden min-h-[100svh] w-full md:block">
        <img
          src={homeDesktop}
          alt="Andromeda Play"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* Logo hotspot (top-left) */}
        <Link
          to="/"
          aria-label="Andromeda Play"
          className="absolute z-30"
          style={{ top: "3%", left: "2%", width: "18%", height: "8%" }}
        />
        {/* Entrar hotspot (top-right) */}
        <Link
          to="/login"
          aria-label="Entrar"
          className="absolute z-30"
          style={{ top: "3.5%", right: "2%", width: "10%", height: "7.5%" }}
        />
        {/* Produtos pill */}
        <Link
          to="/produtos"
          className="absolute z-40 rounded-full border border-white/20 bg-black/30 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm transition hover:bg-black/50"
          style={{ top: "4%", left: "50%", transform: "translateX(-50%)" }}
        >
          Produtos
        </Link>
      </div>

      {/* Mobile artwork */}
      <div className="relative min-h-[100svh] w-full md:hidden">
        <img
          src={homeMobile}
          alt="Andromeda Play"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <Link
          to="/"
          aria-label="Andromeda Play"
          className="absolute z-30"
          style={{ top: "1%", left: "4%", width: "45%", height: "4%" }}
        />
        {/* Small Entrar top-right */}
        <Link
          to="/login"
          aria-label="Entrar"
          className="absolute z-30"
          style={{ top: "1.4%", right: "5%", width: "21%", height: "5%" }}
        />
        {/* Big Entrar in body */}
        <Link
          to="/login"
          aria-label="Entrar"
          className="absolute z-30"
          style={{ top: "42%", left: "10%", width: "80%", height: "8%" }}
        />
        {/* Produtos pill mobile */}
        <Link
          to="/produtos"
          className="absolute z-40 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm"
          style={{ top: "1.8%", right: "28%" }}
        >
          Produtos
        </Link>
      </div>
    </main>
  );
}
