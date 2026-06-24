import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/checkout/falhou")({
  component: FailedPage,
});

function FailedPage() {
  return (
    <main className="min-h-screen bg-[#06060f] text-foreground grid place-items-center px-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Não foi possível concluir</h1>
        <p className="mt-2 text-white/70">
          Seu pagamento não foi aprovado. Você pode tentar novamente ou usar outra forma de
          pagamento.
        </p>
        <Link
          to="/produtos"
          className="mt-8 inline-block rounded-full bg-primary px-5 py-2.5 text-sm text-white hover:opacity-90"
        >
          Tentar novamente
        </Link>
      </div>
    </main>
  );
}
