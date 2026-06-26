import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { createCheckoutSession, getProduct } from "@/lib/products.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/produtos/$slug")({
  component: ProductPage,
});

function formatPrice(cents: number | null | undefined, currency = "BRL") {
  if (!cents) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function ProductPage() {
  const { slug } = Route.useParams();
  const fetchProduct = useServerFn(getProduct);
  const createPref = useServerFn(createCheckoutSession);
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct({ data: { slug } }),
  });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    const meta = (user as any)?.user_metadata;
    if (meta?.full_name && !name) setName(meta.full_name);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!data?.product) throw new Error("Produto indisponível");
      const res = await createPref({
        data: {
          course_id: data.product.id,
          buyer_email: email,
          buyer_name: name || undefined,
          origin: window.location.origin,
        },
      });
      return res;
    },
    onSuccess: (res) => {
      window.location.href = res.checkout_url;
    },
  });

  if (isLoading)
    return (
      <main className="min-h-screen bg-[#06060f] text-white grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </main>
    );
  if (error || !data)
    return (
      <main className="min-h-screen bg-[#06060f] text-white grid place-items-center p-10">
        <div className="text-center">
          <p className="text-white/70 mb-4">Produto não encontrado.</p>
          <Link to="/produtos" className="text-primary underline">
            Ver todos os produtos
          </Link>
        </div>
      </main>
    );

  const p = data.product;
  const bullets = Array.isArray(p.sales_bullets) ? (p.sales_bullets as string[]) : [];

  return (
    <main className="min-h-screen bg-[#06060f] text-foreground">
      <div
        className="fixed inset-0 pointer-events-none -z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 35% at 0% 0%, rgba(108,77,255,0.22), transparent 60%), radial-gradient(ellipse 50% 35% at 100% 100%, rgba(0,184,255,0.14), transparent 60%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-sm tracking-[0.3em] text-white/70 hover:text-white">
          ANDROMEDA
        </Link>
        <Link to="/produtos" className="text-xs uppercase tracking-widest text-white/60 hover:text-white">
          ← Catálogo
        </Link>
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 py-12 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/60">
            <Sparkles className="h-3 w-3" /> Andromeda Play
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            {p.sales_headline ?? p.title}
          </h1>
          {p.sales_subheadline && (
            <p className="mt-4 text-lg text-white/70">{p.sales_subheadline}</p>
          )}

          {(p.sales_hero_url || p.cover_url) && (
            <div
              className="mt-8 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-cover bg-center"
              style={{ backgroundImage: `url(${p.sales_hero_url ?? p.cover_url})` }}
            />
          )}

          {p.sales_video_url && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 aspect-video">
              <iframe
                src={p.sales_video_url}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title="Apresentação"
              />
            </div>
          )}

          {p.sales_description && (
            <div className="prose prose-invert mt-8 max-w-none whitespace-pre-wrap text-white/80">
              {p.sales_description}
            </div>
          )}

          {bullets.length > 0 && (
            <ul className="mt-8 grid gap-3">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-white/85">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="self-start">
          <div className="sticky top-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.24em] text-white/50">Investimento</div>
            <div className="mt-2 font-display text-4xl font-bold">
              {formatPrice(p.price_cents, p.currency ?? "BRL")}
            </div>
            {p.access_duration_days ? (
              <p className="mt-1 text-xs text-white/55">
                Acesso por {p.access_duration_days} dias
              </p>
            ) : (
              <p className="mt-1 text-xs text-white/55">Acesso vitalício</p>
            )}

            <form
              className="mt-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                buyMutation.mutate();
              }}
            >
              <div>
                <Label htmlFor="buyer-name" className="text-xs text-white/70">
                  Nome
                </Label>
                <Input
                  id="buyer-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 bg-white/[0.04]"
                />
              </div>
              <div>
                <Label htmlFor="buyer-email" className="text-xs text-white/70">
                  E-mail
                </Label>
                <Input
                  id="buyer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="mt-1 bg-white/[0.04]"
                />
                <p className="mt-1 text-[11px] text-white/50">
                  É neste e-mail que você acessará seu curso após o pagamento.
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={buyMutation.isPending || !email}
              >
                {buyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando…
                  </>
                ) : (
                  <>Comprar agora</>
                )}
              </Button>

              {buyMutation.error && (
                <p className="text-xs text-red-300">
                  {(buyMutation.error as Error).message}
                </p>
              )}

              <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-white/55">
                <ShieldCheck className="h-3 w-3" /> Pagamento seguro via Stripe
              </div>
            </form>
          </div>
        </aside>
      </section>
    </main>
  );
}
