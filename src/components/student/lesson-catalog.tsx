import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, LayoutGrid, List, Play, PlayCircle } from "lucide-react";
import { aspectRatioStyle } from "@/lib/card-aspect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  duration?: string | null;
};

type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type Course = {
  id: string;
  primary_color?: string | null;
  accent_color?: string | null;
  card_aspect_video?: string | null;
  card_aspect_custom?: string | null;
};

type ViewMode = "grid" | "list";
type GroupMode = "module" | "all";

const VIEW_KEY = "andromeda:lesson-view";
const GROUP_KEY = "andromeda:lesson-group";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatDuration(l: Lesson): string | null {
  if (l.duration) return l.duration;
  if (l.duration_seconds) {
    const s = Math.floor(l.duration_seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }
  return null;
}

type ProgressRow = { lesson_id: string; percent: number; completed: boolean };

export function LessonCatalog({
  course,
  modules,
  activeLessonId,
  studentId,
  onSelect,
}: {
  course: Course;
  modules: (Module & { lessons: Lesson[] })[];
  activeLessonId?: string | null;
  studentId?: string | null;
  onSelect: (lessonId: string) => void;
}) {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("grid");
  const [group, setGroup] = useState<GroupMode>("module");

  useEffect(() => {
    setView(readJson<ViewMode>(VIEW_KEY, "grid"));
    setGroup(readJson<GroupMode>(GROUP_KEY, "module"));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  }, [view]);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(GROUP_KEY, JSON.stringify(group));
  }, [group]);

  const progressQueryKey = ["lesson-progress", course.id, studentId] as const;

  const { data: progressRows } = useQuery({
    enabled: !!studentId && !!course.id,
    queryKey: progressQueryKey,
    queryFn: async (): Promise<ProgressRow[]> => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, percent, completed")
        .eq("student_id", studentId!)
        .eq("course_id", course.id);
      if (error) throw error;
      return (data ?? []) as ProgressRow[];
    },
  });

  const progressMap = useMemo(() => {
    const map = new Map<string, { percent: number; completed: boolean }>();
    for (const r of progressRows ?? []) map.set(r.lesson_id, { percent: r.percent, completed: r.completed });
    return map;
  }, [progressRows]);

  const allLessons = useMemo(
    () => modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleId: m.id }))),
    [modules],
  );

  const toggleMutation = useMutation({
    mutationFn: async (vars: { lessonId: string; nextCompleted: boolean }) => {
      if (!studentId) throw new Error("Você precisa estar autenticado.");
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from("lesson_progress").upsert(
        {
          student_id: studentId,
          lesson_id: vars.lessonId,
          course_id: course.id,
          percent: vars.nextCompleted ? 100 : 0,
          completed: vars.nextCompleted,
          completed_at: vars.nextCompleted ? nowIso : null,
          updated_at: nowIso,
        },
        { onConflict: "student_id,lesson_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: progressQueryKey });
      qc.invalidateQueries({ queryKey: ["course-progress-summary", studentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleCompleted = (id: string) => {
    const current = progressMap.get(id);
    toggleMutation.mutate({ lessonId: id, nextCompleted: !current?.completed });
  };

  const select = (id: string) => {
    onSelect(id);
  };



  const renderCard = (l: Lesson & { moduleTitle?: string }, idx: number) => {
    const done = !!completed[l.id];
    const pct = done ? 100 : progress[l.id] ?? 0;
    const active = activeLessonId === l.id;
    return (
      <div
        key={l.id}
        className={`group relative rounded-xl overflow-hidden border bg-[#0f0f24] transition-all shadow-lg shadow-black/40 ${
          active ? "border-[#4f46e5] ring-2 ring-[#4f46e5]/40" : "border-[#1e1e5a] hover:border-[#4f46e5]"
        }`}
      >
        <button onClick={() => select(l.id)} className="block w-full text-left">
          <div
            className="relative"
            style={{
              ...aspectRatioStyle(course.card_aspect_video, course.card_aspect_custom),
              ...((l.thumbnail_url || l.cover_url)
                ? { backgroundImage: `url(${l.thumbnail_url || l.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: `linear-gradient(135deg, ${course.primary_color ?? "#4f46e5"}33, ${course.accent_color ?? "#1e1e5a"}aa)` }),
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/20 to-transparent" />
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-bold text-white/90 tracking-wider">
              {String(idx + 1).padStart(2, "0")}
            </div>
            {done && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[10px] font-bold text-white">
                <CheckCircle2 className="h-3 w-3" /> Concluída
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                <Play className="h-6 w-6 fill-white text-white ml-0.5" />
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {l.moduleTitle && (
              <p className="text-[10px] font-bold text-[#a5b4fc] uppercase tracking-widest">{l.moduleTitle}</p>
            )}
            <h4 className="text-sm md:text-base font-bold leading-tight line-clamp-2">{l.title}</h4>
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>{pct}% concluído</span>
              {formatDuration(l) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(l)}
                </span>
              )}
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4f46e5] to-[#a5b4fc] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCompleted(l.id);
          }}
          className="absolute bottom-3 right-3 text-white/60 hover:text-white"
          title={done ? "Marcar como não concluída" : "Marcar como concluída"}
        >
          {done ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5" />}
        </button>
      </div>
    );
  };

  const renderListItem = (l: Lesson & { moduleTitle?: string }) => {
    const done = !!completed[l.id];
    const pct = done ? 100 : progress[l.id] ?? 0;
    const active = activeLessonId === l.id;
    return (
      <div
        key={l.id}
        className={`group flex gap-4 rounded-xl border bg-[#0f0f24] p-3 transition-all ${
          active ? "border-[#4f46e5] ring-2 ring-[#4f46e5]/40" : "border-[#1e1e5a] hover:border-[#4f46e5]"
        }`}
      >
        <button
          onClick={() => select(l.id)}
          className="relative shrink-0 w-32 sm:w-44 aspect-video rounded-lg overflow-hidden"
          style={
            (l.thumbnail_url || l.cover_url)
              ? { backgroundImage: `url(${l.thumbnail_url || l.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : {
                  background: `linear-gradient(135deg, ${course.primary_color ?? "#4f46e5"}33, ${course.accent_color ?? "#1e1e5a"}aa)`,
                }
          }
        >
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-7 w-7 fill-white text-white ml-0.5" />
          </div>
        </button>
        <div className="flex-1 min-w-0 flex flex-col">
          {l.moduleTitle && (
            <p className="text-[10px] font-bold text-[#a5b4fc] uppercase tracking-widest">{l.moduleTitle}</p>
          )}
          <h4 className="text-sm md:text-base font-bold leading-tight line-clamp-1">{l.title}</h4>
          {l.description && (
            <p className="text-xs text-white/60 line-clamp-2 mt-1">{l.description}</p>
          )}
          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 text-[11px] text-white/60">
              {formatDuration(l) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(l)}
                </span>
              )}
              <span>{pct}%</span>
              {done && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCompleted(l.id)}
                className="text-white/60 hover:text-white"
                title={done ? "Marcar como não concluída" : "Marcar como concluída"}
              >
                {done ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5" />}
              </button>
              <Button size="sm" onClick={() => select(l.id)} className="bg-[#4f46e5] hover:bg-[#4338ca]">
                <PlayCircle className="h-4 w-4 mr-1" />
                {pct > 0 && pct < 100 ? "Continuar" : "Assistir"}
              </Button>
            </div>
          </div>
          <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4f46e5] to-[#a5b4fc] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const hasContent = modules.some((m) => m.lessons.length > 0);

  return (
    <div className="px-6 md:px-16 pt-12 space-y-6 max-w-[100vw]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="inline-flex rounded-lg border border-[#1e1e5a] bg-[#0f0f24] p-1 text-xs">
          <button
            onClick={() => setGroup("module")}
            className={`px-3 py-1.5 rounded-md transition ${group === "module" ? "bg-[#4f46e5] text-white" : "text-white/60 hover:text-white"}`}
          >
            Por módulo
          </button>
          <button
            onClick={() => setGroup("all")}
            className={`px-3 py-1.5 rounded-md transition ${group === "all" ? "bg-[#4f46e5] text-white" : "text-white/60 hover:text-white"}`}
          >
            Todas as aulas
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-[#1e1e5a] bg-[#0f0f24] p-1">
          <button
            onClick={() => setView("grid")}
            aria-label="Visual em grade"
            className={`p-2 rounded-md transition ${view === "grid" ? "bg-[#4f46e5] text-white" : "text-white/60 hover:text-white"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="Visual em lista"
            className={`p-2 rounded-md transition ${view === "list" ? "bg-[#4f46e5] text-white" : "text-white/60 hover:text-white"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!hasContent ? (
        <Card className="p-12 text-center bg-[#141432] border-[#1e1e5a] text-white/70">
          Este produto ainda não possui conteúdos publicados.
        </Card>
      ) : group === "all" ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {allLessons.map((l, i) => renderCard(l, i))}
          </div>
        ) : (
          <div className="space-y-3">{allLessons.map((l) => renderListItem(l))}</div>
        )
      ) : (
        <div className="space-y-12">
          {modules.map((m) => (
            <section key={m.id} className="space-y-5">
              <div className="flex items-center gap-4">
                <h2 className="font-cinema-display text-xl md:text-2xl font-bold tracking-tight">{m.title}</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-[#1e1e5a] to-transparent" />
                <span className="text-xs text-white/40 uppercase tracking-wider">
                  {m.lessons.length} {m.lessons.length === 1 ? "aula" : "aulas"}
                </span>
              </div>
              {m.lessons.length === 0 ? (
                <p className="text-sm text-white/40">Nenhuma aula neste módulo ainda.</p>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {m.lessons.map((l, i) => renderCard({ ...l, moduleTitle: m.title }, i))}
                </div>
              ) : (
                <div className="space-y-3">
                  {m.lessons.map((l) => renderListItem({ ...l, moduleTitle: m.title }))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
