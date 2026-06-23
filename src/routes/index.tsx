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
      {/* Ambient blurred backdrop — extends artwork to fill black bars */}
      <div
        aria-hidden
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage: `url(${homeDesktop.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(28px)",
          transform: "scale(1.12)",
          opacity: 0.65,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 md:hidden"
        style={{
          backgroundImage: `url(${homeMobile.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(28px)",
          transform: "scale(1.12)",
          opacity: 0.65,
        }}
      />
      {/* Soft overlay to harmonize the edges */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* DESKTOP frame — image sized to fit viewport while preserving aspect ratio */}
      <div className="absolute inset-0 hidden md:grid place-items-center z-10">
        <div
          className="relative"
          style={{
            aspectRatio: DESKTOP_AR,
            width: `min(100vw, 100svh * (1672/941))`,
            height: `min(100svh, 100vw * (941/1672))`,
            backgroundImage: `url(${homeDesktop.url})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
          }}
          aria-label="Andromeda Play"
        >
          {/* Entrar — top right pill */}
          <Link
            to="/login"
            aria-label="Entrar"
            className={hotspotBase}
            style={{ top: "3.5%", right: "2%", width: "10%", height: "7.5%", zIndex: 20 }}
          />
          {/* Entrar — hero CTA */}
          <Link
            to="/login"
            aria-label="Entrar"
            className={hotspotBase}
            style={{ top: "65%", left: "3.5%", width: "19%", height: "12%", zIndex: 20 }}
          />
        </div>
      </div>

      {/* MOBILE frame */}
      <div className="absolute inset-0 grid place-items-center md:hidden z-10">
        <div
          className="relative"
          style={{
            aspectRatio: MOBILE_AR,
            width: `min(100vw, 100svh * (941/1672))`,
            height: `min(100svh, 100vw * (1672/941))`,
            backgroundImage: `url(${homeMobile.url})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
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

      <h1 className="sr-only">
        Bem-vindo ao universo do conhecimento e da evolução
      </h1>
    </main>
  );
}
