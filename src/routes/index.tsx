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

function HomePage() {
  const { session, loading, isAdmin, isExpert, isStudent } = useAuth();
  const dest = isAdmin ? "/admin" : isExpert ? "/expert" : isStudent ? "/aluno" : null;
  if (!loading && session && dest) return <Navigate to={dest} />;

  return (
    <main className="relative h-[100svh] w-screen overflow-hidden bg-black">
      {/* Desktop artwork */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage: `url(${homeDesktop.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-label="Andromeda Play"
      />
      {/* Mobile artwork */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          backgroundImage: `url(${homeMobile.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-label="Andromeda Play"
      />

      <h1 className="sr-only">
        Bem-vindo ao universo do conhecimento e da evolução
      </h1>

      {/* DESKTOP overlays */}
      <div className="absolute inset-0 hidden md:block">
        {/* Entrar — top right pill */}
        <Link
          to="/login"
          aria-label="Entrar"
          className="absolute rounded-xl focus:outline-none focus:ring-2 focus:ring-white/40"
          style={{ top: "3.5%", right: "2%", width: "10%", height: "7.5%" }}
        />
        {/* Entrar — hero button */}
        <Link
          to="/login"
          aria-label="Entrar"
          className="absolute rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/40"
          style={{ top: "65%", left: "3.5%", width: "19%", height: "12%" }}
        />
      </div>

      {/* MOBILE overlays */}
      <div className="absolute inset-0 md:hidden">
        {/* Entrar — top right pill */}
        <Link
          to="/login"
          aria-label="Entrar"
          className="absolute rounded-xl focus:outline-none focus:ring-2 focus:ring-white/40"
          style={{ top: "2%", right: "5%", width: "30%", height: "5.5%" }}
        />
        {/* Entrar — hero button */}
        <Link
          to="/login"
          aria-label="Entrar"
          className="absolute rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/40"
          style={{ top: "49%", left: "20%", width: "60%", height: "7.5%" }}
        />
      </div>
    </main>
  );
}
