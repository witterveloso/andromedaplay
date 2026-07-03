import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const EXTERNAL_URL = "https://comunica-pascom-pro.lovable.app";

export const Route = createFileRoute("/produtos/comunica-pascom")({
  head: () => ({
    meta: [
      { title: "Comunica PASCOM — Andromeda Play" },
      { name: "description", content: "Redirecionando para Comunica PASCOM…" },
      { httpEquiv: "refresh", content: `0; url=${EXTERNAL_URL}` },
    ],
  }),
  component: RedirectPage,
});

function RedirectPage() {
  useEffect(() => {
    window.location.href = EXTERNAL_URL;
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06060f] px-6 text-center text-white">
      <div className="max-w-md">
        <h1 className="font-display text-2xl font-semibold">Abrindo Comunica PASCOM…</h1>
        <p className="mt-3 text-white/70">
          Se a página não abrir automaticamente, toque no botão abaixo.
        </p>
        <a
          href={EXTERNAL_URL}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#04060F] hover:brightness-110"
        >
          Ir para Comunica PASCOM
        </a>
      </div>
    </main>
  );
}
