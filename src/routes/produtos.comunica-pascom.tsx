import { createFileRoute } from "@tanstack/react-router";

const EXTERNAL_URL = "https://comunica-pascom-pro.lovable.app";

export const Route = createFileRoute("/produtos/comunica-pascom")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      window.location.replace(EXTERNAL_URL);
    } else {
      throw new Response(null, { status: 302, headers: { Location: EXTERNAL_URL } });
    }
  },
  component: () => null,
});
