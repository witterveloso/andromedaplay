import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  BookOpen,
  FileCheck,
  Archive,
  MessagesSquare,
  PlayCircle,
  MessageSquareText,
  LifeBuoy,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
  to,
  accent = "from-primary/30 to-primary/0",
  iconClass = "text-primary",
}: {
  label: string;
  value: number;
  icon: typeof Users;
  to?: string;
  accent?: string;
  iconClass?: string;
}) {
  const inner = (
    <Card className="relative overflow-hidden p-5 h-full border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent hover:from-white/[0.06] transition">
      <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${accent} blur-2xl pointer-events-none`} />
      <div className="relative flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`h-8 w-8 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-3 text-3xl font-semibold tracking-tight">{value.toLocaleString("pt-BR")}</div>
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [
        experts,
        students,
        courses,
        published,
        drafts,
        communities,
        lessons,
        posts,
      ] = await Promise.all([
        supabase.from("experts").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("course_type", "community").eq("status", "published"),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase.from("community_posts").select("id", { count: "exact", head: true }),
      ]);
      return {
        experts: experts.count ?? 0,
        students: students.count ?? 0,
        courses: courses.count ?? 0,
        published: published.count ?? 0,
        drafts: drafts.count ?? 0,
        communities: communities.count ?? 0,
        lessons: lessons.count ?? 0,
        posts: posts.count ?? 0,
      };
    },
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Visão geral</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Dashboard Andromeda</h1>
        <p className="text-muted-foreground mt-1">Indicadores em tempo real do ecossistema.</p>
      </div>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard label="Produtores" value={stats?.experts ?? 0} icon={Users} to="/admin/experts" accent="from-violet-500/30 to-transparent" iconClass="text-violet-300" />
          <StatCard label="Alunos" value={stats?.students ?? 0} icon={GraduationCap} to="/admin/students" accent="from-sky-500/30 to-transparent" iconClass="text-sky-300" />
          <StatCard label="Produtos / Cursos" value={stats?.courses ?? 0} icon={BookOpen} to="/admin/courses" accent="from-amber-500/20 to-transparent" iconClass="text-amber-300" />
          <StatCard label="Cursos publicados" value={stats?.published ?? 0} icon={FileCheck} to="/admin/courses" accent="from-emerald-500/30 to-transparent" iconClass="text-emerald-300" />
          <StatCard label="Em rascunho" value={stats?.drafts ?? 0} icon={Archive} to="/admin/courses" accent="from-amber-500/25 to-transparent" iconClass="text-amber-300" />
          <StatCard label="Comunidades ativas" value={stats?.communities ?? 0} icon={MessagesSquare} to="/admin/communities" accent="from-fuchsia-500/25 to-transparent" iconClass="text-fuchsia-300" />
          <StatCard label="Aulas cadastradas" value={stats?.lessons ?? 0} icon={PlayCircle} to="/admin/content" accent="from-primary/30 to-transparent" iconClass="text-primary" />
          <StatCard label="Publicações" value={stats?.posts ?? 0} icon={MessageSquareText} to="/admin/content" accent="from-sky-500/25 to-transparent" iconClass="text-sky-300" />
        </div>
      </section>

      <Card className="relative overflow-hidden p-6 border-white/[0.06] bg-gradient-to-br from-primary/10 via-transparent to-transparent">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center text-primary shrink-0">
            <LifeBuoy className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">Centro de comando</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Como administrador geral você possui visão completa do ecossistema. Use o menu lateral
              para gerenciar produtores, alunos, acessos e oferecer suporte técnico — sem precisar
              acessar o banco de dados.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link to="/admin/support" className="text-xs rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5">
                Abrir suporte
              </Link>
              <Link to="/admin/access" className="text-xs rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5">
                Gerenciar acessos
              </Link>
              <Link to="/admin/settings" className="text-xs rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5">
                Configurações
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
