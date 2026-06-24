import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/products.functions";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/produtos/")({
  head: () => ({
    meta: [
      { title: "Produtos — Andromeda Play" },
      {
        name: "description",
        content:
          "Conheça os cursos e mentorias da Andromeda Play. Conhecimento premium, acesso imediato.",
      },
      { property: "og:title", content: "Produtos — Andromeda Play" },
      {
        property: "og:description",
        content:
          "Conheça os cursos e mentorias da Andromeda Play. Conhecimento premium, acesso imediato.",
      },
    ],
  }),
  component: ProductsPage,
});

function formatPrice(cents: number | null | undefined, currency = "BRL") {
  if (!cents) return "Em breve";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function ProductsPage() {
  const fetchProducts = useServerFn(listProducts);
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", "public"],
    queryFn: () => fetchProducts(),
  });

  return (
    <main className="min-h-screen bg-[#06060f] text-foreground">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none -z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(108,77,255,0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,184,255,0.12), transparent 60%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-sm tracking-[0.3em] text-white/70 hover:text-white">
          ANDROMEDA
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-full border border-white/10 px-4 py-1.5 text-xs uppercase tracking-widest text-white/80 hover:bg-white/5"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/60">
            <Sparkles className="h-3 w-3" /> Catálogo
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Produtos da Andromeda Play
          </h1>
          <p className="mt-4 text-white/65 md:text-lg">
            Cursos, mentorias e experiências educacionais selecionadas. Acesso liberado
            automaticamente após a confirmação do pagamento.
          </p>
        </div>

        {isLoading && <div className="text-white/60">Carregando produtos…</div>}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-red-300">
            Não foi possível carregar os produtos agora.
          </div>
        )}

        {data && data.products.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center text-white/60">
            Em breve novos produtos por aqui.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.products.map((p: any) => (
            <Link
              key={p.id}
              to="/produtos/$slug"
              params={{ slug: p.slug }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div
                className="aspect-video w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${p.sales_hero_url ?? p.cover_url ?? ""})`,
                  backgroundColor: "#10102a",
                }}
              />
              <div className="p-5">
                <h3 className="font-display text-lg font-semibold leading-tight">{p.title}</h3>
                {p.sales_subheadline && (
                  <p className="mt-1 line-clamp-2 text-sm text-white/60">{p.sales_subheadline}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-base font-semibold text-white">
                    {formatPrice(p.price_cents, p.currency ?? "BRL")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-primary/90 transition group-hover:gap-2">
                    Ver detalhes <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
