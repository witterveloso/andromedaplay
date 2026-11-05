import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Activity } from "lucide-react";

type Row = {
  id: string;
  started_at: string;
  page_seconds: number;
  video_seconds: number;
  seen_by_owner: boolean;
  course_id: string;
  course_title: string;
  lesson_title: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
};

export function formatDuration(total: number) {
  const s = Math.max(0, Math.round(total || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  if (m > 0) return `${m}min ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function useUnseenAccessCount(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ["unseen-lesson-accesses"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("count_unseen_lesson_accesses");
      return (data as number) ?? 0;
    },
  });
}

export function LessonAccessReport() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<string>("all");
  const [student, setStudent] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lesson-access-report", from, to],
    queryFn: async () => {
      const toDate = to ? new Date(`${to}T00:00:00`) : null;
      if (toDate) toDate.setDate(toDate.getDate() + 1);
      const { data, error } = await (supabase as any).rpc("get_lesson_access_report", {
        _course_id: null,
        _from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
        _to: toDate ? toDate.toISOString() : null,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  // Opening the report marks new accesses as seen (after showing the "Novo" badges once).
  useEffect(() => {
    if (isLoading) return;
    void (supabase as any).rpc("mark_lesson_accesses_seen").then(() =>
      qc.invalidateQueries({ queryKey: ["unseen-lesson-accesses"] }),
    );
  }, [isLoading, qc]);

  const courses = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.course_id, r.course_title));
    return [...m.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = student.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (courseId === "all" || r.course_id === courseId) &&
        (!q || (r.student_name ?? "").toLowerCase().includes(q) || (r.student_email ?? "").toLowerCase().includes(q)),
    );
  }, [rows, courseId, student]);

  const totals = useMemo(() => ({
    accesses: filtered.length,
    students: new Set(filtered.map((r) => r.student_id)).size,
    page: filtered.reduce((a, r) => a + r.page_seconds, 0),
    video: filtered.reduce((a, r) => a + r.video_seconds, 0),
  }), [filtered]);

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(16);
    doc.text("Relatório de acessos às aulas — Andromeda Play", 40, 44);
    doc.setFontSize(9);
    const period = `${from ? from.split("-").reverse().join("/") : "início"} até ${to ? to.split("-").reverse().join("/") : "hoje"}`;
    const courseLabel = courseId === "all" ? "Todos os cursos" : courses.find((c) => c[0] === courseId)?.[1] ?? "";
    doc.text(`Período: ${period}   •   ${courseLabel}   •   Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, 62);
    doc.text(
      `Acessos: ${totals.accesses}   •   Alunos: ${totals.students}   •   Tempo na aula: ${formatDuration(totals.page)}   •   Tempo assistindo: ${formatDuration(totals.video)}`,
      40, 76,
    );
    const cols = [
      { h: "Data", x: 40, w: 95 },
      { h: "Aluno", x: 135, w: 170 },
      { h: "Curso", x: 305, w: 150 },
      { h: "Aula", x: 455, w: 200 },
      { h: "Na aula", x: 655, w: 70 },
      { h: "Assistindo", x: 725, w: 80 },
    ];
    let y = 100;
    const header = () => {
      doc.setFont("helvetica", "bold");
      cols.forEach((c) => doc.text(c.h, c.x, y));
      doc.setFont("helvetica", "normal");
      doc.line(40, y + 4, W - 40, y + 4);
      y += 18;
    };
    header();
    const clip = (t: string, w: number) => (doc.splitTextToSize(t, w - 6)[0] as string) ?? "";
    filtered.forEach((r) => {
      if (y > H - 40) { doc.addPage(); y = 44; header(); }
      const vals = [
        fmtDate(r.started_at),
        r.student_name || r.student_email || "—",
        r.course_title,
        r.lesson_title,
        formatDuration(r.page_seconds),
        formatDuration(r.video_seconds),
      ];
      cols.forEach((c, i) => doc.text(clip(vals[i], c.w), c.x, y));
      y += 15;
    });
    doc.save(`relatorio-acessos-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> Relatório de acessos</h1>
          <p className="text-sm text-muted-foreground">Cada vez que um aluno abre uma aula: dia, aula e tempo de permanência.</p>
        </div>
        <Button onClick={downloadPdf} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" /> Baixar PDF</Button>
      </div>

      <Card className="p-4 grid gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Curso</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {courses.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Aluno</Label>
          <Input placeholder="Nome ou e-mail" value={student} onChange={(e) => setStudent(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          ["Acessos", String(totals.accesses)],
          ["Alunos", String(totals.students)],
          ["Tempo na aula", formatDuration(totals.page)],
          ["Tempo assistindo", formatDuration(totals.video)],
        ].map(([l, v]) => (
          <Card key={l} className="p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="text-xl font-semibold mt-1">{v}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr>
              <th className="p-3">Data</th><th className="p-3">Aluno</th><th className="p-3">Curso</th>
              <th className="p-3">Aula</th><th className="p-3">Na aula</th><th className="p-3">Assistindo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>}
            {!isLoading && !filtered.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum acesso encontrado.</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3 whitespace-nowrap">{fmtDate(r.started_at)} {!r.seen_by_owner && <Badge className="ml-1">Novo</Badge>}</td>
                <td className="p-3"><div>{r.student_name || "—"}</div><div className="text-xs text-muted-foreground">{r.student_email}</div></td>
                <td className="p-3">{r.course_title}</td>
                <td className="p-3">{r.lesson_title}</td>
                <td className="p-3 whitespace-nowrap">{formatDuration(r.page_seconds)}</td>
                <td className="p-3 whitespace-nowrap">{formatDuration(r.video_seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
