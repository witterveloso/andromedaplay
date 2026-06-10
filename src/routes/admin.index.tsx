import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BookOpen, Users, FileCheck, Archive, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [courses, students, published, drafts, experts] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("experts").select("id", { count: "exact", head: true }),
      ]);
      return {
        courses: courses.count ?? 0,
        students: students.count ?? 0,
        published: published.count ?? 0,
        drafts: drafts.count ?? 0,
        experts: experts.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Produtores", value: stats?.experts ?? 0, icon: Users, color: "text-primary", to: "/admin/experts" as const },
    { label: "Cursos totais", value: stats?.courses ?? 0, icon: BookOpen, color: "text-sky-400", to: "/admin/experts" as const },
    { label: "Publicados", value: stats?.published ?? 0, icon: FileCheck, color: "text-emerald-400", to: "/admin/experts" as const },
    { label: "Rascunhos", value: stats?.drafts ?? 0, icon: Archive, color: "text-amber-400", to: "/admin/experts" as const },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="block">
            <Card className="p-5 hover:bg-muted/40 transition cursor-pointer h-full">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div className="mt-2 text-3xl font-semibold">{c.value}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <LifeBuoy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold">Suporte técnico</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Você tem acesso às informações cadastrais de produtores, cursos e alunos para oferecer suporte
              quando necessário. O conteúdo dos cursos (vídeos, aulas, comunidade) é gerenciado exclusivamente
              pelos produtores. Clique nos cards acima ou em qualquer produtor para ver detalhes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
