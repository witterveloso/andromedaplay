import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Cropper, { type Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";
import { AvatarMenu } from "@/components/student/avatar-menu";
import { ArrowLeft, Camera, Crop as CropIcon, Loader2, Mail, BookOpen, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/aluno/perfil")({
  component: ProfilePage,
});

function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "?").trim();
  return src.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function ProfilePage() {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Crop dialog state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_a: Area, areaPx: Area) => {
    setCroppedArea(areaPx);
  }, []);

  function closeCrop() {
    setCropSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
  }

  function openReframeExisting() {
    if (!avatarUrl) return;
    setCropSrc(avatarUrl);
  }

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const { data: profile, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    enabled: !!user,
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user!.id)
        .eq("status", "active");
      return { coursesCount: count ?? 0 };
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function confirmCrop() {
    if (!cropSrc || !croppedArea || !user) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedArea, { width: 512, height: 512 });
      const path = `avatars/${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("course-assets")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("course-assets").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Foto enquadrada. Não esqueça de salvar.");
      closeCrop();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: fullName.trim() || null, avatar_url: avatarUrl }, { onConflict: "id" });
      if (error) throw error;
      toast.success("Perfil atualizado");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile-mini"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(108,77,255,0.10), transparent)" }}
      />

      {/* Header */}
      <header className="relative border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <AndromedaLogo className="scale-[0.85]" />
          </Link>
          <AvatarMenu />
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-10 sm:py-14">
        <Link
          to="/aluno"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        {/* Hero card */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-sm">
          {/* Decorative banner */}
          <div
            className="h-32 sm:h-44 w-full relative"
            style={{
              background:
                "radial-gradient(ellipse at 30% 50%, rgba(108,77,255,0.35), transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(0,184,255,0.25), transparent 60%), linear-gradient(135deg, #0b0b18, #11102a)",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px] opacity-50" />
          </div>

          <div className="px-6 sm:px-10 pb-8 -mt-16 sm:-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">
              {/* Avatar */}
              <div className="relative group self-start">
                <Avatar className="h-32 w-32 sm:h-36 sm:w-36 ring-4 ring-background shadow-[0_10px_50px_-10px_rgba(108,77,255,0.5)]">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary/40 to-primary/10 text-2xl font-bold">
                    {initials(fullName, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-1 right-1 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-2 ring-background hover:scale-105 transition-transform disabled:opacity-50"
                  aria-label="Alterar foto"
                  title="Alterar foto"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={openReframeExisting}
                    disabled={uploading}
                    className="absolute top-1 right-1 h-9 w-9 rounded-full bg-background/80 backdrop-blur text-foreground flex items-center justify-center shadow-lg ring-1 ring-white/15 hover:scale-105 transition-transform disabled:opacity-50"
                    aria-label="Reenquadrar foto"
                    title="Reenquadrar foto"
                  >
                    <CropIcon className="h-4 w-4" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                  {fullName || "Aluno Andromeda"}
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Mail className="h-3.5 w-3.5" /> {user?.email}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" /> Produtos acessados
                </div>
                <div className="text-3xl font-bold mt-2">{stats?.coursesCount ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Progresso
                </div>
                <div className="text-3xl font-bold mt-2">
                  {stats?.coursesCount ? "Ativo" : "—"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Edit form */}
        <section className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Informações pessoais</h2>
          <p className="text-sm text-muted-foreground mt-1">Atualize seu nome e foto de perfil.</p>

          <div className="grid gap-5 mt-6 max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                maxLength={100}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={user?.email ?? ""} disabled className="opacity-70" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving || isLoading}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
              <Button variant="ghost" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
                Sair
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Dialog open={!!cropSrc} onOpenChange={(o) => !o && closeCrop()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reenquadrar foto de perfil</DialogTitle>
          </DialogHeader>
          <div className="relative h-[360px] w-full bg-black rounded-md overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Zoom</Label>
            <Slider value={[zoom]} min={1} max={4} step={0.01} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <p className="text-xs text-muted-foreground">
            Arraste para reposicionar. A imagem será salva em 512×512px.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeCrop} disabled={uploading}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmCrop} disabled={uploading || !croppedArea}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar enquadramento
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
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, output.width, output.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      0.92,
    ),
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
