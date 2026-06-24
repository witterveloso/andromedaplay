import { createFileRoute, Link, useServerFn } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { getOrderStatus } from "@/lib/products.functions";

export const Route = createFileRoute("/checkout/sucesso")({
  validateSearch: (s) => z.object({ order: z.string().uuid().optional() }).parse(s),
  component: SuccessPage,
});

function SuccessPage() {
  const { order } = Route.useSearch();
  const fetchOrder = useServerFn(getOrderStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["order", order],
    queryFn: () => fetchOrder({ data: { order_id: order! } }),
    enabled: !!order,
    refetchInterval: (q) => (q.state.data?.order?.status === "approved" ? false : 4000),
  });

  return (
    <main className="min-h-screen bg-[#06060f] text-foreground grid place-items-center px-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Compra confirmada</h1>
        <p className="mt-2 text-white/70">
          Obrigado! {data?.order?.course?.title ? `Seu acesso a "${data.order.course.title}" ` : "Seu acesso "}
          {data?.order?.status === "approved"
            ? "está liberado."
            : "está sendo processado e será liberado em instantes."}
        </p>

        {isLoading && (
          <div className="mt-4 flex items-center justify-center text-white/60 text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando pagamento…
          </div>
        )}

        <p className="mt-6 text-xs text-white/55">
          Enviamos um e-mail para <strong>{data?.order?.buyer_email ?? "você"}</strong> com as
          instruções para acessar sua conta.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <Link
            to="/login"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Entrar na plataforma
          </Link>
          <Link to="/produtos" className="text-xs uppercase tracking-widest text-white/55 hover:text-white">
            Ver outros produtos
          </Link>
        </div>
      </div>
    </main>
  );
}
