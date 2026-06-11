import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Crop, Upload, X } from "lucide-react";

export type ImageUploadCropProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Aspect ratio (width/height). 1 = square, 16/9 = wide cover, etc. */
  aspect: number;
  /** Recommended pixel size shown as a hint to the user. */
  recommended: { width: number; height: number };
  /** Storage folder (path prefix) inside the bucket. */
  folder: string;
  /** Storage bucket. Defaults to course-assets (public). */
  bucket?: string;
  /** Tailwind classes that control the preview size. */
  previewClassName?: string;
  /** Round the preview (use for logos/avatars/icons). */
  rounded?: boolean;
  hint?: string;
};

const MAX_FILE_MB = 10;

export function ImageUploadCrop({
  label, value, onChange, aspect, recommended, folder, bucket = "course-assets", previewClassName, rounded, hint,
}: ImageUploadCropProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onSelectFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Imagem muito grande (máx ${MAX_FILE_MB}MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_a: Area, areaPx: Area) => {
    setCroppedArea(areaPx);
  }, []);

  const close = () => {
    setSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
  };

  const confirm = async () => {
    if (!src || !croppedArea) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(src, croppedArea, recommended);
      const path = `${folder}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("course-assets")
        .upload(path, blob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("course-assets").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada");
      close();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const previewBox = previewClassName ?? "aspect-video w-full";
  const roundedCls = rounded ? "rounded-full" : "rounded-md";

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-[11px] text-muted-foreground">
          Recomendado: {recommended.width}×{recommended.height}px
        </span>
      </div>

      <div className={`${previewBox} relative overflow-hidden border bg-muted ${roundedCls}`}>
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sem imagem
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 rounded-full bg-background/80 p-1 hover:bg-background"
            aria-label="Remover imagem"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <label className="flex-1">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelectFile(f);
              e.target.value = "";
            }}
          />
          <span className="flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent">
            <Upload className="h-4 w-4" /> Enviar imagem
          </span>
        </label>
      </div>


      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}

      <Dialog open={!!src} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Recortar imagem · {label}</DialogTitle>
          </DialogHeader>
          <div className="relative h-[360px] w-full bg-black rounded-md overflow-hidden">
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape={rounded ? "round" : "rect"}
                showGrid={!rounded}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Zoom</Label>
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.01}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Arraste para reposicionar. A imagem será salva em {recommended.width}×{recommended.height}px.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
            <Button type="button" onClick={confirm} disabled={uploading}>
              {uploading ? "Enviando…" : "Salvar imagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function getCroppedBlob(
  src: string,
  area: Area,
  output: { width: number; height: number },
): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(
    img,
    area.x, area.y, area.width, area.height,
    0, 0, output.width, output.height,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), "image/jpeg", 0.9),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}