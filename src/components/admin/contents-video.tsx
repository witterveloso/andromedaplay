import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight, FileText, Link as LinkIcon,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { useAuth } from "@/hooks/use-auth";
import { VIDEO_PROVIDERS, type VideoProvider } from "@/lib/video-player";

type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  cover_url: string | null;
};

type Lesson = {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string | null;
  extra_info: string | null;
  youtube_url: string | null;
  video_provider: VideoProvider | null;
  video_url: string | null;
  video_id: string | null;
  video_embed: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: "published" | "draft" | "locked";
  is_free: boolean;
  release_after_days: number;
  position: number;
};

type MaterialType = "pdf" | "link" | "image" | "file";

type Material = {
  id: string;
  lesson_id: string;
  name: string;
  url: string;
  file_type: string | null;
  material_type: MaterialType | string;
  storage_path: string | null;
  position: number;
};


const statusBadge: Record<Lesson["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "Publicada", variant: "default" },
  draft: { label: "Rascunho", variant: "secondary" },
  locked: { label: "Bloqueada", variant: "outline" },
};

export function ContentsVideo({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; module?: Module }>({ open: false });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; moduleId?: string; lesson?: Lesson }>({ open: false });

  const modulesQ = useQuery({
    queryKey: ["modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules").select("*").eq("course_id", courseId).order("position");
      if (error) throw error;
      return data as Module[];
    },
  });

  const lessonsQ = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons").select("*").eq("course_id", courseId).order("position");
      if (error) throw error;
      return data as Lesson[];
    },
  });

  const reorder = useMutation({
    mutationFn: async ({ table, id, position }: { table: "modules" | "lessons"; id: string; position: number }) => {
      const { error } = await supabase.from(table).update({ position }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [v.table, courseId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Módulo excluído");
      qc.invalidateQueries({ queryKey: ["modules", courseId] });
      qc.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aula excluída");
      qc.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modules = modulesQ.data ?? [];
  const lessons = lessonsQ.data ?? [];

  function move(items: { id: string; position: number }[], idx: number, dir: -1 | 1, table: "modules" | "lessons") {
    const target = items[idx + dir];
    if (!target) return;
    const current = items[idx];
    reorder.mutate({ table, id: current.id, position: target.position });
    reorder.mutate({ table, id: target.id, position: current.position });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Módulos e aulas</h2>
          <p className="text-sm text-muted-foreground">Organize o conteúdo do curso por módulos.</p>
        </div>
        <Button onClick={() => setModuleDialog({ open: true })}>
          <Plus className="mr-2 h-4 w-4" /> Novo módulo
        </Button>
      </div>

      {modulesQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : modules.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Nenhum módulo criado. Crie o primeiro para começar a adicionar aulas.
        </Card>
      ) : (
        <div className="space-y-3">
          {modules.map((m, i) => {
            const moduleLessons = lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.position - b.position);
            const expanded = openModule === m.id;
            return (
              <Card key={m.id} className="overflow-hidden">
                <div className="flex items-center gap-2 p-4 border-b">
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setOpenModule(expanded ? null : m.id)}
                  >
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  {m.cover_url ? (
                    <img src={m.cover_url} alt="" className="h-10 w-16 rounded object-cover border" />
                  ) : (
                    <div className="h-10 w-16 rounded border bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.title}</div>
                    {m.description && <div className="text-xs text-muted-foreground truncate">{m.description}</div>}
                  </div>
                  <Badge variant="outline">{moduleLessons.length} aulas</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0}
                      onClick={() => move(modules, i, -1, "modules")}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === modules.length - 1}
                      onClick={() => move(modules, i, 1, "modules")}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setModuleDialog({ open: true, module: m })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { if (confirm(`Excluir módulo "${m.title}" e suas aulas?`)) delModule.mutate(m.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="p-4 space-y-2 bg-muted/20">
                    {moduleLessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma aula.</p>
                    ) : (
                      moduleLessons.map((l, li) => (
                        <div key={l.id} className="flex items-center gap-2 rounded-md border bg-background p-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{l.title}</span>
                              <Badge variant={statusBadge[l.status].variant}>{statusBadge[l.status].label}</Badge>
                              {l.is_free && <Badge variant="outline">Gratuita</Badge>}
                              {l.release_after_days > 0 && (
                                <Badge variant="outline">Libera em {l.release_after_days}d</Badge>
                              )}
                            </div>
                            {(l.video_url || l.youtube_url) && (
                              <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                <LinkIcon className="h-3 w-3" /> {l.video_url || l.youtube_url}
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={li === 0}
                            onClick={() => move(moduleLessons, li, -1, "lessons")}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={li === moduleLessons.length - 1}
                            onClick={() => move(moduleLessons, li, 1, "lessons")}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setLessonDialog({ open: true, moduleId: m.id, lesson: l })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { if (confirm(`Excluir aula "${l.title}"?`)) delLesson.mutate(l.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                    <Button
                      variant="outline" size="sm" className="w-full"
                      onClick={() => setLessonDialog({ open: true, moduleId: m.id })}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Nova aula
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ModuleDialog
        courseId={courseId}
        nextPosition={modules.length}
        state={moduleDialog}
        onClose={() => setModuleDialog({ open: false })}
      />
      <LessonDialog
        courseId={courseId}
        nextPosition={lessons.filter((l) => l.module_id === lessonDialog.moduleId).length}
        state={lessonDialog}
        onClose={() => setLessonDialog({ open: false })}
      />
    </div>
  );
}

function ModuleDialog({
  courseId, nextPosition, state, onClose,
}: {
  courseId: string;
  nextPosition: number;
  state: { open: boolean; module?: Module };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editing = state.module;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [coverUrl, setCoverUrl] = useState(editing?.cover_url ?? "");

  // reset when opening
  useResetOnOpen(state.open, () => {
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setCoverUrl(editing?.cover_url ?? "");
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("modules")
          .update({ title, description: description || null, cover_url: coverUrl || null })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("modules").insert({
          course_id: courseId, title, description: description || null, position: nextPosition, cover_url: coverUrl || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Módulo atualizado" : "Módulo criado");
      qc.invalidateQueries({ queryKey: ["modules", courseId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <ImageUploadCrop
            label="Capa do módulo"
            value={coverUrl}
            onChange={setCoverUrl}
            folder="modules"
            aspect={16 / 9}
            recommended={{ width: 800, height: 450 }}
            hint="Aparece no cabeçalho do módulo na área do aluno."
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LessonDialog({
  courseId, nextPosition, state, onClose,
}: {
  courseId: string;
  nextPosition: number;
  state: { open: boolean; moduleId?: string; lesson?: Lesson };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editing = state.lesson;
  const moduleId = state.moduleId ?? editing?.module_id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [videoProvider, setVideoProvider] = useState<VideoProvider>("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [videoEmbed, setVideoEmbed] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [status, setStatus] = useState<Lesson["status"]>("draft");
  const [isFree, setIsFree] = useState(false);
  const [releaseAfter, setReleaseAfter] = useState("0");

  const materialsQ = useQuery({
    queryKey: ["lesson_materials", editing?.id],
    enabled: !!editing?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_materials").select("*").eq("lesson_id", editing!.id).order("position");
      if (error) throw error;
      return data as Material[];
    },
  });

  useResetOnOpen(state.open, () => {
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setExtraInfo(editing?.extra_info ?? "");
    setVideoProvider((editing?.video_provider as VideoProvider) ?? "youtube");
    setVideoUrl(editing?.video_url ?? editing?.youtube_url ?? "");
    setVideoId(editing?.video_id ?? "");
    setVideoEmbed(editing?.video_embed ?? "");
    setThumbnailUrl(editing?.thumbnail_url ?? "");
    setDurationMin(editing?.duration_seconds ? String(Math.round(editing.duration_seconds / 60)) : "");
    setStatus(editing?.status ?? "draft");
    setIsFree(editing?.is_free ?? false);
    setReleaseAfter(String(editing?.release_after_days ?? 0));
  });

  const save = useMutation({
    mutationFn: async () => {
      const trimmedUrl = videoUrl.trim();
      const payload = {
        title,
        description: description || null,
        extra_info: extraInfo || null,
        video_provider: videoProvider,
        video_url: trimmedUrl || null,
        video_id: videoId.trim() || null,
        video_embed: videoEmbed.trim() || null,
        youtube_url: videoProvider === "youtube" ? (trimmedUrl || null) : null,
        thumbnail_url: thumbnailUrl || null,
        duration_seconds: durationMin ? Math.round(Number(durationMin) * 60) : null,
        status,
        is_free: isFree,
        release_after_days: Number(releaseAfter) || 0,
      };
      if (editing) {
        const { error } = await supabase.from("lessons").update(payload).eq("id", editing.id);
        if (error) throw error;
        return editing.id;
      } else {
        const { data, error } = await supabase.from("lessons").insert({
          ...payload, course_id: courseId, module_id: moduleId!, position: nextPosition,
        }).select().single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Aula atualizada" : "Aula criada");
      qc.invalidateQueries({ queryKey: ["lessons", courseId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [matName, setMatName] = useState("");
  const [matType, setMatType] = useState<MaterialType>("link");
  const [matUrl, setMatUrl] = useState("");
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matUploading, setMatUploading] = useState(false);

  const addMaterial = useMutation({
    mutationFn: async () => {
      if (!editing?.id) throw new Error("Salve a aula primeiro.");
      let finalUrl = matUrl.trim();
      let storagePath: string | null = null;
      let fileType: string | null = null;

      if (matType !== "link") {
        if (!matFile) throw new Error("Selecione um arquivo.");
        setMatUploading(true);
        const safeName = matFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        storagePath = `${courseId}/${editing.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("lesson-materials")
          .upload(storagePath, matFile, { upsert: false, contentType: matFile.type || undefined });
        if (upErr) { setMatUploading(false); throw upErr; }
        fileType = matFile.type || null;
        // Store path as url placeholder; signed URL is generated on demand at view time.
        finalUrl = storagePath;
        setMatUploading(false);
      }

      const { error } = await supabase.from("lesson_materials").insert({
        lesson_id: editing.id,
        name: matName || (matFile?.name ?? "Material"),
        url: finalUrl,
        material_type: matType,
        storage_path: storagePath,
        file_type: fileType,
        position: materialsQ.data?.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMatName(""); setMatUrl(""); setMatFile(null); setMatType("link");
      qc.invalidateQueries({ queryKey: ["lesson_materials", editing!.id] });
    },
    onError: (e: Error) => { setMatUploading(false); toast.error(e.message); },
  });

  const delMaterial = useMutation({
    mutationFn: async (m: Material) => {
      if (m.storage_path) {
        await supabase.storage.from("lesson-materials").remove([m.storage_path]);
      }
      const { error } = await supabase.from("lesson_materials").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson_materials", editing!.id] }),
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Editar aula" : "Nova aula"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="rounded-md border p-3 space-y-3 bg-muted/20">
            <div className="space-y-1.5">
              <Label>URL do vídeo</Label>
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=…"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cole o link do YouTube (watch, live, embed ou youtu.be). O player será gerado automaticamente.
              </p>
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between h-auto py-2 px-3 text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" /> Opções avançadas
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Tipo de vídeo</Label>
                  <Select value={videoProvider} onValueChange={(v) => setVideoProvider(v as VideoProvider)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VIDEO_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {VIDEO_PROVIDERS.find((p) => p.value === videoProvider)?.hint}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>ID do vídeo externo (opcional)</Label>
                  <Input
                    placeholder={
                      videoProvider === "bunny" ? "library_id/video_id" :
                      videoProvider === "vimeo" ? "123456789" :
                      videoProvider === "mux" ? "PLAYBACK_ID" :
                      "ID do vídeo"
                    }
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Código embed (opcional, sobrepõe a URL)</Label>
                  <Textarea
                    rows={3}
                    placeholder='<iframe src="…" allow="…" allowfullscreen></iframe>'
                    value={videoEmbed}
                    onChange={(e) => setVideoEmbed(e.target.value)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploadCrop
              label="Thumbnail da aula"
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
              folder="lessons"
              aspect={16 / 9}
              recommended={{ width: 640, height: 360 }}
              hint="Aparece nos cards de aulas."
            />
            <div className="space-y-1.5">
              <Label>Duração (minutos)</Label>
              <Input type="number" min={0} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Lesson["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Publicada</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="locked">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Liberar após (dias)</Label>
              <Input type="number" min={0} value={releaseAfter}
                onChange={(e) => setReleaseAfter(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Aula gratuita</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={isFree} onCheckedChange={setIsFree} />
                <span className="text-sm text-muted-foreground">{isFree ? "Sim" : "Não"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Informações adicionais</Label>
            <Textarea
              rows={5}
              placeholder="Orientações, resumo, tarefas, avisos, links complementares…"
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Exibido para o aluno abaixo do player, em uma seção "Informações adicionais".</p>
          </div>

          {editing && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" /> Materiais extras
              </div>
              {(materialsQ.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum material adicionado ainda.</p>
              )}
              {(materialsQ.data ?? []).map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm border rounded px-2 py-1.5">
                  <Badge variant="outline" className="uppercase text-[10px]">{m.material_type}</Badge>
                  <span className="flex-1 truncate">{m.name}</span>
                  {!m.storage_path && (
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-xs underline text-muted-foreground">
                      abrir
                    </a>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => delMaterial.mutate(m)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-2">
                <Select value={matType} onValueChange={(v) => { setMatType(v as MaterialType); setMatFile(null); setMatUrl(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="link">Link externo</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="file">Arquivo</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Título do material" value={matName} onChange={(e) => setMatName(e.target.value)} />
              </div>
              {matType === "link" ? (
                <Input placeholder="https://…" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} />
              ) : (
                <Input
                  type="file"
                  accept={matType === "pdf" ? "application/pdf" : matType === "image" ? "image/*" : undefined}
                  onChange={(e) => setMatFile(e.target.files?.[0] ?? null)}
                />
              )}
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm"
                  disabled={
                    addMaterial.isPending || matUploading ||
                    (matType === "link" ? (!matName || !matUrl) : !matFile)
                  }
                  onClick={() => addMaterial.mutate()}>
                  {matUploading || addMaterial.isPending ? "Enviando…" : "Adicionar material"}
                </Button>
              </div>
            </div>
          )}


          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useResetOnOpen(open: boolean, reset: () => void) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useStateEffect(open, reset);
}


function useStateEffect(open: boolean, fn: () => void) {
  const prev = useRef(false);
  useEffect(() => {
    if (open && !prev.current) fn();
    prev.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
