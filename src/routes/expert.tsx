import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Sparkles, AlertTriangle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expert")({
  component: ExpertLayout,
});

function ExpertLayout() {
  const { loading, session, isExpert, isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (!isExpert && !isAdmin) navigate({ to: "/login" });
  }, [loading, session, isExpert, isAdmin, navigate]);

  const { data: expert } = useQuery({
    enabled: !!session?.user,
    queryKey: ["expert-me", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("experts").select("*").eq("id", session!.user.id).maybeSingle();
      return data;
    },
  });

  if (loading || !session || (!isExpert && !isAdmin)) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Verificando acesso…</div>;
  }

  const blocked = expert && expert.status !== "active";

  const nav = [
    { to: "/expert/courses", label: "Meus cursos", icon: BookOpen },
    { to: "/expert/preview", label: "Ver como aluno", icon: Eye },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r bg-sidebar">
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold">Painel Produtor</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 space-y-2">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {blocked && (
          <div className="bg-destructive/10 border-b border-destructive/30 px-6 py-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>
              Sua conta está <strong>{expert?.status === "paused" ? "pausada" : "bloqueada"}</strong>.
              {expert?.paused_reason && ` Motivo: ${expert.paused_reason}.`} Entre em contato com o administrador.
            </span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
