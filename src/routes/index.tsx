import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRef, useEffect } from "react";
import homeDesktopAsset from "@/assets/andromeda-home-desktop-v2.png.asset.json";
import homeMobileAsset from "@/assets/andromeda-home-mobile-v2.png.asset.json";

const homeDesktop = homeDesktopAsset.url;
const homeMobile = homeMobileAsset.url;

// Image dimensions
const DESKTOP_IMG_W = 1672;
const DESKTOP_IMG_H = 941;
const MOBILE_IMG_W = 941;
const MOBILE_IMG_H = 1672;

// Button coordinates in original image pixels
const DESKTOP_ENTRAR = { x: 132, y: 651, w: 207, h: 61 };
const DESKTOP_PRODUTOS = { x: 383, y: 651, w: 228, h: 61 };
const MOBILE_ENTRAR = { x: 136, y: 686, w: 313, h: 87 };
const MOBILE_PRODUTOS = { x: 471, y: 686, w: 325, h: 87 };

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

  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function positionHotspots() {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      // Desktop image scaling with object-cover
      const dScale = Math.max(cw / DESKTOP_IMG_W, ch / DESKTOP_IMG_H);
      const dRW = DESKTOP_IMG_W * dScale;
      const dRH = DESKTOP_IMG_H * dScale;
      const dOX = (cw - dRW) / 2;
      const dOY = (ch - dRH) / 2;

      const dEntrar = container.querySelector<HTMLElement>('[data-hotspot="desktop-entrar"]');
      const dProdutos = container.querySelector<HTMLElement>('[data-hotspot="desktop-produtos"]');
      if (dEntrar) {
        dEntrar.style.left = `${((DESKTOP_ENTRAR.x * dScale) + dOX) / cw * 100}%`;
        dEntrar.style.top = `${((DESKTOP_ENTRAR.y * dScale) + dOY) / ch * 100}%`;
        dEntrar.style.width = `${(DESKTOP_ENTRAR.w * dScale) / cw * 100}%`;
        dEntrar.style.height = `${(DESKTOP_ENTRAR.h * dScale) / ch * 100}%`;
      }
      if (dProdutos) {
        dProdutos.style.left = `${((DESKTOP_PRODUTOS.x * dScale) + dOX) / cw * 100}%`;
        dProdutos.style.top = `${((DESKTOP_PRODUTOS.y * dScale) + dOY) / ch * 100}%`;
        dProdutos.style.width = `${(DESKTOP_PRODUTOS.w * dScale) / cw * 100}%`;
        dProdutos.style.height = `${(DESKTOP_PRODUTOS.h * dScale) / ch * 100}%`;
      }

      // Mobile image scaling with object-cover
      const mScale = Math.max(cw / MOBILE_IMG_W, ch / MOBILE_IMG_H);
      const mRW = MOBILE_IMG_W * mScale;
      const mRH = MOBILE_IMG_H * mScale;
      const mOX = (cw - mRW) / 2;
      const mOY = (ch - mRH) / 2;

      const mEntrar = container.querySelector<HTMLElement>('[data-hotspot="mobile-entrar"]');
      const mProdutos = container.querySelector<HTMLElement>('[data-hotspot="mobile-produtos"]');
      if (mEntrar) {
        mEntrar.style.left = `${((MOBILE_ENTRAR.x * mScale) + mOX) / cw * 100}%`;
        mEntrar.style.top = `${((MOBILE_ENTRAR.y * mScale) + mOY) / ch * 100}%`;
        mEntrar.style.width = `${(MOBILE_ENTRAR.w * mScale) / cw * 100}%`;
        mEntrar.style.height = `${(MOBILE_ENTRAR.h * mScale) / ch * 100}%`;
      }
      if (mProdutos) {
        mProdutos.style.left = `${((MOBILE_PRODUTOS.x * mScale) + mOX) / cw * 100}%`;
        mProdutos.style.top = `${((MOBILE_PRODUTOS.y * mScale) + mOY) / ch * 100}%`;
        mProdutos.style.width = `${(MOBILE_PRODUTOS.w * mScale) / cw * 100}%`;
        mProdutos.style.height = `${(MOBILE_PRODUTOS.h * mScale) / ch * 100}%`;
      }
    }

    positionHotspots();
    window.addEventListener("resize", positionHotspots);
    // Also run after image loads to ensure container has correct size
    const img = containerRef.current?.querySelector("img");
    if (img) {
      if (img.complete) {
        positionHotspots();
      } else {
        img.addEventListener("load", positionHotspots);
      }
    }
    return () => {
      window.removeEventListener("resize", positionHotspots);
      img?.removeEventListener("load", positionHotspots);
    };
  }, []);

  return (
    <section ref={containerRef} className="relative w-full min-h-screen overflow-hidden bg-black">
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
        data-hotspot="desktop-entrar"
        aria-label="Entrar na Andromeda Play"
        className="hidden md:block absolute z-20"
      />
      {/* Hotspot Produtos - Desktop */}
      <Link
        to="/produtos"
        data-hotspot="desktop-produtos"
        aria-label="Ver produtos da Andromeda Play"
        className="hidden md:block absolute z-20"
      />

      {/* Hotspot Entrar - Mobile */}
      <Link
        to="/login"
        data-hotspot="mobile-entrar"
        aria-label="Entrar na Andromeda Play"
        className="block md:hidden absolute z-20"
      />
      {/* Hotspot Produtos - Mobile */}
      <Link
        to="/produtos"
        data-hotspot="mobile-produtos"
        aria-label="Ver produtos da Andromeda Play"
        className="block md:hidden absolute z-20"
      />
    </section>
  );
}
