import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BookOpen, Users, FileCheck, Archive } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [courses, students, published, drafts] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);
      return {
        courses: courses.count ?? 0,
        students: students.count ?? 0,
        published: published.count ?? 0,
        drafts: drafts.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Cursos totais", value: stats?.courses ?? 0, icon: BookOpen, color: "text-primary" },
    { label: "Publicados", value: stats?.published ?? 0, icon: FileCheck, color: "text-emerald-400" },
    { label: "Rascunhos", value: stats?.drafts ?? 0, icon: Archive, color: "text-amber-400" },
    { label: "Alunos", value: stats?.students ?? 0, icon: Users, color: "text-sky-400" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <div className="mt-2 text-3xl font-semibold">{c.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">Bem-vindo ao painel</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Use o menu lateral para gerenciar os cursos. A área do aluno será construída em breve.
        </p>
      </Card>
    </div>
  );
}
