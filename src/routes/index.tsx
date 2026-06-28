import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
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

// Aspect ratios match the source artwork
const DESKTOP_AR = "1672 / 941";
const MOBILE_AR = "941 / 1672";

const hotspotBase =
  "absolute block bg-transparent border-0 outline-none appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

function HomePage() {
  const { session, loading, isAdmin, isExpert, isStudent } = useAuth();
  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;
  if (!loading && session && dest) return <Navigate to={dest} />;

  return (
    <main className="relative h-[100svh] w-screen overflow-hidden bg-black">
      {/* DESKTOP — artwork covers full viewport (overflows if needed) */}
      <div className="absolute inset-0 hidden md:grid place-items-center overflow-hidden z-10">
        <div
          className="relative"
          style={{
            aspectRatio: DESKTOP_AR,
            width: `max(100vw, 100svh * (1672/941))`,
            height: `max(100svh, 100vw * (941/1672))`,
            backgroundImage: `url(${homeDesktop.url})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
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
      </div>

      {/* MOBILE — artwork covers full viewport */}
      <div className="absolute inset-0 grid place-items-center md:hidden overflow-hidden z-10">
        <div
          className="relative"
          style={{
            aspectRatio: MOBILE_AR,
            width: `max(100vw, 100svh * (941/1672))`,
            height: `max(100svh, 100vw * (1672/941))`,
            backgroundImage: `url(${homeMobile.url})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
          }}
          aria-label="Andromeda Play"
        >
          <Link
            to="/login"
            aria-label="Entrar"
            className={hotspotBase}
            style={{ top: "2%", right: "5%", width: "30%", height: "5.5%", zIndex: 20 }}
          />
          <Link
            to="/login"
            aria-label="Entrar"
            className={hotspotBase}
            style={{ top: "49%", left: "20%", width: "60%", height: "7.5%", zIndex: 20 }}
          />
        </div>
      </div>

      {/* Floating "Produtos" link at the top — minimal, over the artwork */}
      <Link
        to="/produtos"
        aria-label="PRODUTOS"
        className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-white/15 bg-black/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.32em] text-white/85 backdrop-blur-md transition hover:border-white/35 hover:bg-black/60 hover:text-white md:top-6 md:text-xs"
      >
        PRODUTOS
      </Link>

      <h1 className="sr-only">
        Bem-vindo ao universo do conhecimento e da evolução
      </h1>
    </main>
  );
}
