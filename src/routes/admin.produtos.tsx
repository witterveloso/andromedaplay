import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createProduct,
  listAdminProducts,
  listOrders,
  updateProduct,
} from "@/lib/admin-products.functions";

export const Route = createFileRoute("/admin/produtos")({
  component: AdminProductsPage,
});

type ProductForm = {
  title: string;
  slug: string;
  description: string;
  sales_subheadline: string;
  sales_description: string;
  cover_url: string;
  logo_url: string;
  accent_color: string;
  cover_fit: "cover" | "contain";
  cover_position: "center" | "top" | "bottom" | "left" | "right";
  status: "draft" | "published" | "archived";
  is_for_sale: boolean;
  external_checkout_url: string;
  price_brl: string;
  access_duration_days: string;
};

function emptyForm(): ProductForm {
  return {
    title: "",
    slug: "",
    description: "",
    sales_subheadline: "",
    sales_description: "",
    cover_url: "",
    logo_url: "",
    accent_color: "#8b5cf6",
    cover_fit: "cover",
    cover_position: "center",
    status: "draft",
    is_for_sale: false,
    external_checkout_url: "",
    price_brl: "",
    access_duration_days: "",
  };
}

function fromCourse(c: any): ProductForm {
  return {
    title: c.title ?? "",
    slug: c.slug ?? "",
    description: c.description ?? "",
    sales_subheadline: c.sales_subheadline ?? "",
    sales_description: c.sales_description ?? "",
    cover_url: c.cover_url ?? "",
    logo_url: c.logo_url ?? "",
    accent_color: c.accent_color ?? "#8b5cf6",
    cover_fit: (c.cover_fit as any) ?? "cover",
    cover_position: (c.cover_position as any) ?? "center",
    status: (c.status as any) ?? "draft",
    is_for_sale: !!c.is_for_sale,
    external_checkout_url: c.external_checkout_url ?? "",
    price_brl: c.price_cents ? (c.price_cents / 100).toFixed(2) : "",
    access_duration_days: c.access_duration_days ? String(c.access_duration_days) : "",
  };
}

function toPayload(f: ProductForm) {
  return {
    title: f.title,
    slug: f.slug,
    description: f.description || null,
    sales_subheadline: f.sales_subheadline || null,
    sales_description: f.sales_description || null,
    cover_url: f.cover_url || null,
    logo_url: f.logo_url || null,
    accent_color: f.accent_color || null,
    cover_fit: f.cover_fit,
    cover_position: f.cover_position,
    status: f.status,
    is_for_sale: f.is_for_sale,
    external_checkout_url: f.external_checkout_url || null,
    price_cents: f.price_brl
      ? Math.round(parseFloat(f.price_brl.replace(",", ".")) * 100)
      : null,
    access_duration_days: f.access_duration_days ? parseInt(f.access_duration_days, 10) : null,
  };
}

function AdminProductsPage() {
  const fetchList = useServerFn(listAdminProducts);
  const fetchOrders = useServerFn(listOrders);
  const update = useServerFn(updateProduct);
  const create = useServerFn(createProduct);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchList(),
  });
  const ordersQ = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
  });

  const [editing, setEditing] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(
    null,
  );

  const editingCourse = useMemo(() => {
    if (!editing || editing.mode !== "edit") return null;
    return data?.courses.find((c: any) => c.id === editing.id) ?? null;
  }, [editing, data]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Produtos</h1>
          <p className="mt-1 text-sm text-white/60">
            Crie e edite cards do catálogo. Alterações aparecem imediatamente em /produtos.
          </p>
        </div>
        <Button onClick={() => setEditing({ mode: "create" })}>
          <Plus className="mr-2 h-4 w-4" /> Novo produto
        </Button>
      </div>

      {isLoading && <Loader2 className="animate-spin" />}

      <div className="space-y-3">
        {data?.courses.map((c: any) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{c.title}</div>
                <div className="text-xs text-white/50">
                  /{c.slug} · {c.status}
                  {c.is_for_sale ? " · à venda" : ""}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-white/70">
                  {c.price_cents
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: c.currency ?? "BRL",
                      }).format(c.price_cents / 100)
                    : c.external_checkout_url
                      ? "Externo"
                      : "—"}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing({ mode: "edit", id: c.id })}
                >
                  Editar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ProductEditor
          key={editing.mode === "edit" ? editing.id : "new"}
          initial={editing.mode === "edit" && editingCourse ? fromCourse(editingCourse) : emptyForm()}
          isNew={editing.mode === "create"}
          onCancel={() => setEditing(null)}
          onSubmit={async (form) => {
            try {
              if (editing.mode === "create") {
                await create({ data: toPayload(form) as any });
                toast.success("Produto criado");
              } else {
                await update({ data: { course_id: editing.id, ...toPayload(form) } as any });
                toast.success("Produto atualizado");
              }
              qc.invalidateQueries({ queryKey: ["admin-products"] });
              setEditing(null);
            } catch (e: any) {
              toast.error(e.message ?? "Erro ao salvar");
            }
          }}
        />
      )}

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
  initial,
  isNew,
  onCancel,
  onSubmit,
}: {
  initial: ProductForm;
  isNew: boolean;
  onCancel: () => void;
  onSubmit: (f: ProductForm) => void | Promise<void>;
}) {
  const [f, setF] = useState<ProductForm>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#0a0a14] md:my-6 md:h-[calc(100vh-3rem)] md:rounded-2xl md:border md:border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="font-display text-lg font-semibold">
            {isNew ? "Novo produto" : `Editar: ${initial.title}`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!f.title || !f.slug) {
                  toast.error("Título e slug são obrigatórios");
                  return;
                }
                setSaving(true);
                try {
                  await onSubmit(f);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Form */}
          <div className="overflow-y-auto p-6">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input value={f.title} onChange={(e) => set("title", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Slug (URL)</Label>
                  <Input
                    value={f.slug}
                    onChange={(e) =>
                      set(
                        "slug",
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]+/g, "-")
                          .replace(/^-+|-+$/g, ""),
                      )
                    }
                    placeholder="prosperus"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Subtítulo (aparece no card do catálogo)</Label>
                <Textarea
                  rows={2}
                  value={f.sales_subheadline}
                  onChange={(e) => set("sales_subheadline", e.target.value)}
                  placeholder="Uma frase curta e forte que resume o produto."
                />
              </div>

              <div>
                <Label className="text-xs">Descrição longa</Label>
                <Textarea
                  rows={5}
                  value={f.sales_description}
                  onChange={(e) => set("sales_description", e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={f.status} onValueChange={(v) => set("status", v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <Switch
                    checked={f.is_for_sale}
                    onCheckedChange={(v) => set("is_for_sale", v)}
                  />
                  <span className="text-sm text-white/80">Aparecer no catálogo /produtos</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Preço (BRL) — vazio se checkout externo</Label>
                  <Input
                    inputMode="decimal"
                    value={f.price_brl}
                    onChange={(e) => set("price_brl", e.target.value)}
                    placeholder="297.00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duração acesso (dias) — vazio = vitalício</Label>
                  <Input
                    inputMode="numeric"
                    value={f.access_duration_days}
                    onChange={(e) => set("access_duration_days", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">URL de checkout externo (Stripe / Hotmart / etc.)</Label>
                <Input
                  value={f.external_checkout_url}
                  onChange={(e) => set("external_checkout_url", e.target.value)}
                  placeholder="https://buy.stripe.com/..."
                />
                <p className="mt-1 text-[11px] text-white/50">
                  Se preenchido, o card leva direto para essa URL em vez do checkout interno.
                </p>
              </div>

              <div>
                <Label className="text-xs">Cor de destaque (hex)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    value={f.accent_color}
                    onChange={(e) => set("accent_color", e.target.value)}
                    placeholder="#8b5cf6"
                    className="max-w-[160px]"
                  />
                  <div
                    className="h-9 w-9 rounded-md border border-white/10"
                    style={{ backgroundColor: f.accent_color || "transparent" }}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-xs">Imagem / thumbnail do card</Label>
                <ImageUploadCrop
                  label="Thumbnail"
                  value={f.cover_url}
                  onChange={(url) => set("cover_url", url)}
                  aspect={16 / 9}
                  recommended={{ width: 1600, height: 900 }}
                  folder={`products/${f.slug || "novo"}/cover`}
                  previewClassName="h-40 w-full"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Enquadramento da capa</Label>
                  <Select value={f.cover_fit} onValueChange={(v) => set("cover_fit", v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Preencher (corta se necessário)</SelectItem>
                      <SelectItem value="contain">Inteira (sem cortar)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-white/50">
                    Use "Inteira" para logos com texto que não podem ser cortados.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Posição da imagem (quando cortar)</Label>
                  <Select
                    value={f.cover_position}
                    onValueChange={(v) => set("cover_position", v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="top">Topo</SelectItem>
                      <SelectItem value="bottom">Base</SelectItem>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="overflow-y-auto border-t border-white/10 bg-[#06060f] p-6 md:border-l md:border-t-0">
            <div className="mb-3 text-[11px] uppercase tracking-widest text-white/50">
              Prévia do card
            </div>
            <CardPreview form={f} />
            <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-xs text-white/60">
              <div className="mb-1 font-medium text-white/80">Como o catálogo vai renderizar</div>
              A prévia acima usa exatamente o mesmo layout de /produtos. Cor de destaque, subtítulo
              e thumbnail atualizam em tempo real.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardPreview({ form }: { form: ProductForm }) {
  const bg = form.accent_color && form.status === "published" ? undefined : undefined;
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur md:flex-row"
      style={bg}
    >
      <div
        className="h-40 w-full shrink-0 rounded-t-2xl bg-contain bg-center bg-no-repeat md:h-auto md:w-56 md:rounded-l-2xl md:rounded-tr-none"
        style={{
          backgroundImage: form.cover_url ? `url(${form.cover_url})` : undefined,
          backgroundColor: "#ffffff",
        }}
      />
      <div className="flex flex-1 flex-col justify-between gap-4 p-5 md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-tight md:text-xl">
            {form.title || "Título do produto"}
          </h3>
          {form.sales_subheadline && (
            <p className="mt-2 line-clamp-2 text-sm text-white/60">{form.sales_subheadline}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: form.accent_color || "#8b5cf6" }}
            />
            <span className="text-[11px] uppercase tracking-widest text-white/40">
              {form.status}
              {form.is_for_sale ? " · à venda" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-center">
          <span className="text-base font-semibold text-white">
            {form.price_brl
              ? new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(parseFloat(form.price_brl.replace(",", ".") || "0"))
              : form.external_checkout_url
                ? ""
                : "Em breve"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-widest text-white/90">
            Saiba mais
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
