import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, ExternalLink, FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { toast } from "sonner";

type Material = {
  id: string;
  name: string;
  url: string;
  material_type: string;
  storage_path: string | null;
  file_type: string | null;
};

const iconFor = (t: string) => {
  if (t === "pdf") return FileText;
  if (t === "image") return ImageIcon;
  if (t === "link") return ExternalLink;
  return FileIcon;
};

const labelFor = (t: string) => {
  if (t === "pdf") return "Baixar PDF";
  if (t === "image") return "Abrir imagem";
  if (t === "link") return "Abrir link";
  return "Baixar arquivo";
};

export function LessonMaterials({ lessonId }: { lessonId: string }) {
  const { data: materials } = useQuery({
    queryKey: ["student-materials", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_materials")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  async function openMaterial(m: Material) {
    if (!m.storage_path) {
      window.open(m.url, "_blank", "noopener");
      return;
    }
    const { data, error } = await supabase.storage
      .from("lesson-materials")
      .createSignedUrl(m.storage_path, 60 * 30);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível abrir o material.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (!materials || materials.length === 0) return null;

  return (
    <section className="mt-8 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">
        Materiais de apoio
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {materials.map((m) => {
          const Icon = iconFor(m.material_type);
          return (
            <button
              key={m.id}
              onClick={() => openMaterial(m)}
              className="flex items-center gap-3 rounded-xl border border-[#1e1e5a] bg-[#141432] hover:bg-[#1a1a3a] hover:border-[#4f46e5] transition px-4 py-3 text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-[#4f46e5]/15 flex items-center justify-center text-[#a5b4fc]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{m.name}</div>
                <div className="text-xs text-white/50">{labelFor(m.material_type)}</div>
              </div>
              {m.storage_path ? (
                <Download className="h-4 w-4 text-white/40" />
              ) : (
                <ExternalLink className="h-4 w-4 text-white/40" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
