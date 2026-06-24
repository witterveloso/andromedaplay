import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/checkout/pendente")({
  component: PendingPage,
});

function PendingPage() {
  return (
    <main className="min-h-screen bg-[#06060f] text-foreground grid place-items-center px-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-amber-300" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Pagamento pendente</h1>
        <p className="mt-2 text-white/70">
          Estamos aguardando a confirmação do seu pagamento (boleto ou PIX podem levar alguns
          minutos). Assim que aprovado, você receberá um e-mail e o acesso será liberado
          automaticamente.
        </p>
        <Link
          to="/produtos"
          className="mt-8 inline-block rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/80 hover:bg-white/5"
        >
          Voltar aos produtos
        </Link>
      </div>
    </main>
  );
}
