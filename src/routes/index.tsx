import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
import homeDesktop from "@/assets/andromeda-home-desktop.png.asset.json";
import homeMobile from "@/assets/andromeda-home-mobile.png.asset.json";

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
      { property: "og:image", content: homeDesktop.url },
    ],
  }),
  component: HomePage,
});

const hotspotBase =
  "absolute block bg-transparent border-0 outline-none appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

function HomePage() {
  const { session, loading, isAdmin, isExpert, isStudent } = useAuth();
  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;
  if (!loading && session && dest) return <Navigate to={dest} />;

  return (
    <main className="relative h-[100svh] w-screen overflow-hidden bg-black">
      {/* DESKTOP — imagem estica para 100vw x 100svh */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage: `url(${homeDesktop.url})`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
        aria-label="Andromeda Play"
      >
        <Link
          to="/login"
          aria-label="Entrar"
          className={hotspotBase}
          style={{ top: "3.5%", right: "2%", width: "10%", height: "7.5%", zIndex: 20 }}
        />
        <Link
          to="/login"
          aria-label="Entrar"
          className={hotspotBase}
          style={{ top: "65%", left: "3.5%", width: "19%", height: "12%", zIndex: 20 }}
        />
      </div>

      {/* MOBILE — imagem estica para 100vw x 100svh */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          backgroundImage: `url(${homeMobile.url})`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
        aria-label="Andromeda Play"
      >
        <Link
          to="/login"
          aria-label="Entrar"
          className={hotspotBase}
          style={{ top: "1.4%", right: "5%", width: "21%", height: "5%", zIndex: 25 }}
        />
        <Link
          to="/login"
          aria-label="Entrar"
          className={hotspotBase}
          style={{ top: "42%", left: "13%", width: "74%", height: "8%", zIndex: 25 }}
        />
      </div>

      <Link
        to="/produtos"
        aria-label="Produtos"
        className="absolute left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/15 bg-black/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.32em] text-white/85 backdrop-blur-md transition hover:border-white/35 hover:bg-black/60 hover:text-white max-md:bottom-5 max-md:top-auto md:top-6 md:text-xs"
      >
        Produtos
      </Link>

      <h1 className="sr-only">
        Bem-vindo ao universo do conhecimento e da evolução
      </h1>
    </main>
  );
}
