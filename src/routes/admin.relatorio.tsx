import { createFileRoute } from "@tanstack/react-router";
import { LessonAccessReport } from "@/components/reports/lesson-access-report";

export const Route = createFileRoute("/admin/relatorio")({
  head: () => ({ meta: [{ title: "Relatório de acessos — Admin Andromeda" }, { name: "description", content: "Acessos dos alunos às aulas." }] }),
  component: LessonAccessReport,
});
