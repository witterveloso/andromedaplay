import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  logo_url: string | null;
  status: "draft" | "published" | "archived";
  course_type: "video" | "community";
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  theme_mode: string;
  custom_css: string | null;
};

const defaults: Omit<Course, "id"> = {
  title: "",
  slug: "",
  description: "",
  cover_url: "",
  logo_url: "",
  status: "draft",
  course_type: "video",
  primary_color: "#6366f1",
  accent_color: "#8b5cf6",
  background_color: "#0a0a0a",
  text_color: "#fafafa",
  font_family: "Inter",
  theme_mode: "dark",
  custom_css: "",
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CourseForm({
  initial,
  onSaved,
  section,
}: {
  initial?: Course;
  onSaved?: (id: string) => void;
  section?: "info" | "visual" | "advanced";
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Omit<Course, "id">>(
    initial ? { ...initial } : { ...defaults }
  );

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const baseSlug = form.slug || slugify(form.title);
      const payload = {
        ...form,
        slug: baseSlug,
        description: form.description || null,
        cover_url: form.cover_url || null,
        logo_url: form.logo_url || null,
        custom_css: form.custom_css || null,
      };
      if (initial) {
        const { data, error } = await supabase
          .from("courses").update(payload).eq("id", initial.id).select().single();
        if (error) throw error;
        return data;
      } else {
        // Garante que o registro do produtor existe em experts (id = auth.uid())
        const { data: existingExpert } = await supabase
          .from("experts")
          .select("id")
          .eq("id", user!.id)
          .maybeSingle();
        if (!existingExpert) {
          const displayName =
            (user!.user_metadata?.full_name as string | undefined) ||
            (user!.user_metadata?.name as string | undefined) ||
            user!.email ||
            "Produtor";
          const { error: expErr } = await supabase
            .from("experts")
            .insert({
              id: user!.id,
              display_name: displayName,
              email: user!.email ?? "",
              status: "active",
              created_by: user!.id,
            });
          if (expErr) throw expErr;
        }
        // tenta inserir; em caso de slug duplicado, gera variações até funcionar
        let attempt = 0;
        let lastError: unknown = null;
        while (attempt < 6) {
          const slugTry = attempt === 0
            ? baseSlug
            : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
          const { data, error } = await supabase
            .from("courses")
            .insert({ ...payload, slug: slugTry, created_by: user!.id, expert_id: user!.id })
            .select().single();
          if (!error) return data;
          // 23505 = unique_violation
          const code = (error as { code?: string }).code;
          const msg = error.message || "";
          if (code === "23505" && msg.includes("slug")) {
            attempt++;
            lastError = error;
            continue;
          }
          throw error;
        }
        throw lastError as Error;
      }
    },
    onSuccess: (data) => {
      toast.success(initial ? "Curso atualizado" : "Curso criado");
      qc.invalidateQueries({ queryKey: ["courses"] });
      onSaved?.(data.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      className="space-y-6"
    >
      <Tabs value={section ?? undefined} defaultValue={section ?? "info"}>
        {!section && (
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="info" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                required value={form.title}
                onChange={(e) => {
                  const t = e.target.value;
                  update("title", t);
                  if (!initial && !form.slug) update("slug", slugify(t));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL)</Label>
              <Input
                required value={form.slug}
                onChange={(e) => update("slug", slugify(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={4} value={form.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUploadCrop
                label="Capa"
                value={form.cover_url ?? ""}
                onChange={(v) => update("cover_url", v)}
                folder="covers"
                aspect={16 / 9}
                recommended={{ width: 1280, height: 720 }}
                hint="Aparece no card do curso na listagem dos alunos."
              />
              <ImageUploadCrop
                label="Logo"
                value={form.logo_url ?? ""}
                onChange={(v) => update("logo_url", v)}
                folder="logos"
                aspect={1}
                recommended={{ width: 512, height: 512 }}
                previewClassName="aspect-square w-32"
                rounded
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v as Course["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de produto</Label>
                <Select
                  value={form.course_type}
                  onValueChange={(v) => update("course_type", v as Course["course_type"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Hospedagem de vídeo</SelectItem>
                    <SelectItem value="community">Comunidade interativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="visual" className="mt-4">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-1">Identidade visual do curso</h3>
              <p className="text-sm text-muted-foreground">
                Define cores e tipografia que aparecerão na área do aluno deste curso.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorField label="Primária" value={form.primary_color} onChange={(v) => update("primary_color", v)} />
              <ColorField label="Destaque" value={form.accent_color} onChange={(v) => update("accent_color", v)} />
              <ColorField label="Fundo" value={form.background_color} onChange={(v) => update("background_color", v)} />
              <ColorField label="Texto" value={form.text_color} onChange={(v) => update("text_color", v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fonte</Label>
                <Select value={form.font_family} onValueChange={(v) => update("font_family", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Inter", "Roboto", "Poppins", "Manrope", "DM Sans", "Plus Jakarta Sans"].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tema</Label>
                <Select value={form.theme_mode} onValueChange={(v) => update("theme_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Pré-visualização</Label>
              <div
                className="rounded-lg p-6 border"
                style={{
                  background: form.background_color,
                  color: form.text_color,
                  fontFamily: form.font_family,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div
                      className="h-8 w-8 rounded"
                      style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})` }}
                    />
                  )}
                  <strong>{form.title || "Nome do curso"}</strong>
                </div>
                <p className="opacity-80 text-sm mb-4">Esta é uma prévia da identidade visual.</p>
                <button
                  type="button"
                  className="px-4 py-2 rounded font-medium text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})`,
                    color: "#fff",
                  }}
                >
                  Começar agora
                </button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>CSS customizado</Label>
              <Textarea
                rows={8} placeholder=".student-area { ... }"
                value={form.custom_css ?? ""}
                onChange={(e) => update("custom_css", e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Aplicado apenas à área do aluno deste curso.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : initial ? "Salvar alterações" : "Criar curso"}
        </Button>
      </div>
    </form>
  );
}

function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

function ImageField({
  label, value, onChange, folder, aspect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  folder: string;
  aspect: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 10MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("course-assets")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("course-assets").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value && (
        <div className={`${aspect} w-full overflow-hidden rounded border bg-muted`}>
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex gap-2">
        <Input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {value && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange("")}>
            Remover
          </Button>
        )}
      </div>
      <Input
        type="url"
        placeholder="ou cole uma URL: https://…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs"
      />
      {uploading && <p className="text-xs text-muted-foreground">Enviando…</p>}
    </div>
  );
}
