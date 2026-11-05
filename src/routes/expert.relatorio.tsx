import { createFileRoute } from "@tanstack/react-router";
import { LessonAccessReport } from "@/components/reports/lesson-access-report";

export const Route = createFileRoute("/expert/relatorio")({
  head: () => ({ meta: [{ title: "Relatório de acessos — Andromeda Play" }, { name: "description", content: "Acessos dos alunos às aulas." }] }),
  component: LessonAccessReport,
});
