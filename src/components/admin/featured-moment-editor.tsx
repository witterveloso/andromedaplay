import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

type FeaturedKind = "post" | "video" | "lesson" | "notice";

const KINDS: { value: FeaturedKind; label: string }[] = [
  { value: "post", label: "Postagem" },
  { value: "video", label: "Vídeo" },
  { value: "lesson", label: "Aula" },
  { value: "notice", label: "Aviso importante" },
];

export function FeaturedMomentEditor({ courseId }: { courseId: string }) {
  const qc = useQueryClient();

  const courseQ = useQuery({
    queryKey: ["course-featured", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, featured_enabled, featured_kind, featured_title, featured_description, featured_image_url, featured_cta_label, featured_cta_url"
        )
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [enabled, setEnabled] = useState(false);
  const [kind, setKind] = useState<FeaturedKind>("post");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  useEffect(() => {
    const c: any = courseQ.data;
    if (!c) return;
    setEnabled(!!c.featured_enabled);
    setKind((c.featured_kind as FeaturedKind) ?? "post");
    setTitle(c.featured_title ?? "");
    setDescription(c.featured_description ?? "");
    setImageUrl(c.featured_image_url ?? "");
    setCtaLabel(c.featured_cta_label ?? "");
    setCtaUrl(c.featured_cta_url ?? "");
  }, [courseQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("courses")
        .update({
          featured_enabled: enabled,
          featured_kind: kind,
          featured_title: title.trim() || null,
          featured_description: description.trim() || null,
          featured_image_url: imageUrl || null,
          featured_cta_label: ctaLabel.trim() || null,
          featured_cta_url: ctaUrl.trim() || null,
        })
        .eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Momento em Destaque atualizado");
      qc.invalidateQueries({ queryKey: ["course-featured", courseId] });
      qc.invalidateQueries({ queryKey: ["course-slug"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-5 sm:p-6 border-white/[0.06] bg-gradient-to-br from-primary/[0.06] to-transparent">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Momento em Destaque</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exibido no topo da comunidade para direcionar a atenção dos alunos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="featured-enabled" className="text-xs text-muted-foreground">
            {enabled ? "Ativo" : "Inativo"}
          </Label>
          <Switch id="featured-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as FeaturedKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título cinematográfico"
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descrição curta</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Resumo em 1 ou 2 linhas"
            rows={2}
            maxLength={240}
          />
        </div>

        <div className="sm:col-span-2">
          <ImageUploadCrop
            label="Imagem / banner"
            value={imageUrl}
            onChange={setImageUrl}
            folder="community-featured"
            aspect={16 / 7}
            recommended={{ width: 1600, height: 700 }}
            previewClassName="aspect-[16/7] w-full"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Rótulo do botão</Label>
          <Input
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="Acessar"
            maxLength={40}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Link de destino</Label>
          <Input
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https://… ou /caminho-interno"
            maxLength={400}
          />
        </div>
      </div>

      <div className="flex justify-end pt-5">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar destaque"}
        </Button>
      </div>
    </Card>
  );
}
