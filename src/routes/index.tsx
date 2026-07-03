import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import homeDesktopAsset from "@/assets/andromeda-home-desktop-v2.png.asset.json";
import homeMobileAsset from "@/assets/andromeda-home-mobile-v2.png.asset.json";

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
    <section className="relative w-full min-h-screen overflow-hidden bg-black">
      <picture>
        <source media="(max-width: 768px)" srcSet={homeMobile} />
        <img
          src={homeDesktop}
          alt="Andromeda Play - Bem-vindo ao universo do conhecimento e da evolução"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </picture>

      {/* Hotspot Entrar - Desktop */}
      <Link
        to="/login"
        aria-label="Entrar na Andromeda Play"
        className="hidden md:block absolute left-[8.5%] top-[66%] w-[14.5%] h-[8%] z-20"
      />
      {/* Hotspot Produtos - Desktop */}
      <Link
        to="/produtos"
        aria-label="Ver produtos da Andromeda Play"
        className="hidden md:block absolute left-[24.5%] top-[66%] w-[14.5%] h-[8%] z-20"
      />

      {/* Hotspot Entrar - Mobile */}
      <Link
        to="/login"
        aria-label="Entrar na Andromeda Play"
        className="block md:hidden absolute left-[6%] top-[38%] w-[38%] h-[5%] z-20"
      />
      {/* Hotspot Produtos - Mobile */}
      <Link
        to="/produtos"
        aria-label="Ver produtos da Andromeda Play"
        className="block md:hidden absolute left-[46%] top-[38%] w-[48%] h-[5%] z-20"
      />
    </section>
  );
}
