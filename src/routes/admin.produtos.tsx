import { createFileRoute, useServerFn } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { listAdminProducts, updateProduct, listOrders } from "@/lib/admin-products.functions";

export const Route = createFileRoute("/admin/produtos")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const fetchList = useServerFn(listAdminProducts);
  const fetchOrders = useServerFn(listOrders);
  const update = useServerFn(updateProduct);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchList(),
  });
  const ordersQ = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
  });

  const mut = useMutation({
    mutationFn: (input: any) => update({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-display text-2xl font-bold mb-2">Produtos à venda</h1>
      <p className="text-sm text-white/60 mb-8">
        Marque um curso como "à venda", defina preço e textos da página de vendas. O acesso é
        liberado automaticamente após o pagamento ser aprovado no Mercado Pago.
      </p>

      {isLoading && <Loader2 className="animate-spin" />}

      <div className="space-y-3">
        {data?.courses.map((c) => {
          const open = openId === c.id;
          return (
            <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-white/50">
                    /{c.slug} · {c.status}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    {c.price_cents
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: c.currency ?? "BRL",
                        }).format(c.price_cents / 100)
                      : "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={c.is_for_sale}
                      onCheckedChange={(v) =>
                        mut.mutate({ course_id: c.id, is_for_sale: v })
                      }
                    />
                    <span className="text-xs text-white/60">À venda</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenId(open ? null : c.id)}
                  >
                    {open ? "Fechar" : "Editar"}
                  </Button>
                </div>
              </div>

              {open && (
                <ProductEditor
                  course={c}
                  onSave={(patch) => mut.mutate({ course_id: c.id, ...patch })}
                  saving={mut.isPending}
                />
              )}
            </div>
          );
        })}
      </div>

      <h2 className="font-display text-xl font-bold mt-12 mb-4">Pedidos recentes</h2>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-left text-white/60">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Produto</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {ordersQ.data?.orders.map((o: any) => (
              <tr key={o.id} className="border-t border-white/5">
                <td className="p-3 text-white/60">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="p-3">{o.course?.title ?? "—"}</td>
                <td className="p-3 text-white/80">{o.buyer_email}</td>
                <td className="p-3">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: o.currency ?? "BRL",
                  }).format(o.amount_cents / 100)}
                </td>
                <td className="p-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs " +
                      (o.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : o.status === "pending"
                          ? "bg-amber-500/10 text-amber-300"
                          : "bg-red-500/10 text-red-300")
                    }
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
            {ordersQ.data?.orders.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white/50">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductEditor({
  course,
  onSave,
  saving,
}: {
  course: any;
  onSave: (patch: any) => void;
  saving: boolean;
}) {
  const [priceBRL, setPriceBRL] = useState(
    course.price_cents ? (course.price_cents / 100).toFixed(2) : "",
  );
  const [headline, setHeadline] = useState(course.sales_headline ?? "");
  const [subheadline, setSubheadline] = useState(course.sales_subheadline ?? "");
  const [description, setDescription] = useState(course.sales_description ?? "");
  const [heroUrl, setHeroUrl] = useState(course.sales_hero_url ?? "");
  const [bullets, setBullets] = useState<string>(
    (course.sales_bullets ?? []).join("\n"),
  );
  const [days, setDays] = useState<string>(
    course.access_duration_days ? String(course.access_duration_days) : "",
  );

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <Label className="text-xs">Preço (BRL)</Label>
        <Input
          inputMode="decimal"
          value={priceBRL}
          onChange={(e) => setPriceBRL(e.target.value)}
          placeholder="297.00"
        />
      </div>
      <div>
        <Label className="text-xs">Duração do acesso (dias) — vazio = vitalício</Label>
        <Input
          inputMode="numeric"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="365"
        />
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs">Título da página de venda</Label>
        <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs">Subtítulo</Label>
        <Input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs">Imagem de capa (URL)</Label>
        <Input value={heroUrl} onChange={(e) => setHeroUrl(e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs">Descrição</Label>
        <Textarea
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="md:col-span-2">
        <Label className="text-xs">Benefícios (um por linha)</Label>
        <Textarea
          rows={5}
          value={bullets}
          onChange={(e) => setBullets(e.target.value)}
          placeholder={"Aulas práticas\nCertificado\nComunidade exclusiva"}
        />
      </div>
      <div className="md:col-span-2">
        <Button
          disabled={saving}
          onClick={() =>
            onSave({
              price_cents: priceBRL
                ? Math.round(parseFloat(priceBRL.replace(",", ".")) * 100)
                : null,
              sales_headline: headline || null,
              sales_subheadline: subheadline || null,
              sales_description: description || null,
              sales_hero_url: heroUrl || null,
              sales_bullets: bullets
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              access_duration_days: days ? parseInt(days, 10) : null,
            })
          }
        >
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
