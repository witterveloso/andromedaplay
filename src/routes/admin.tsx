import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ShoppingBag,
  MessagesSquare,
  FileStack,
  KeyRound,
  MailCheck,
  LifeBuoy,
  Settings,
  LogOut,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AndromedaLogo } from "@/components/brand/AndromedaLogo";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/experts", label: "Produtores", icon: Users },
  { to: "/admin/students", label: "Alunos", icon: GraduationCap },
  { to: "/admin/courses", label: "Produtos / Cursos", icon: BookOpen },
  { to: "/admin/produtos", label: "Vendas (Stripe)", icon: ShoppingBag },
  { to: "/admin/communities", label: "Comunidades", icon: MessagesSquare },
  { to: "/admin/content", label: "Conteúdos", icon: FileStack },
  { to: "/admin/access", label: "Acessos", icon: KeyRound },
  { to: "/admin/invitations", label: "Convites", icon: MailCheck },
  { to: "/admin/maintenance", label: "Manutenção", icon: Wrench },
  { to: "/admin/support", label: "Suporte", icon: LifeBuoy },
  { to: "/admin/settings", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const { loading, session, isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/login" });
  }, [loading, session, isAdmin, navigate]);

  if (loading || !session || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Verificando acesso…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none -z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 0% 0%, rgba(108,77,255,0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,184,255,0.08), transparent 60%)",
        }}
      />

      <aside className="relative z-10 flex w-64 flex-col border-r border-white/[0.06] bg-[#0b0b16]/80 backdrop-blur-xl">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <AndromedaLogo showWordmark={false} className="scale-90 origin-left" />
            <div className="leading-tight">
              <div className="font-display text-sm font-bold tracking-[0.22em] text-foreground">
                ANDROMEDA
              </div>
              <div className="text-[10px] uppercase tracking-[0.32em] text-primary/80">
                Admin geral
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {nav.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  active
                    ? "bg-gradient-to-r from-primary/20 to-primary/5 text-foreground ring-1 ring-primary/30 shadow-[0_4px_20px_-8px_rgba(108,77,255,0.4)]"
                    : "text-sidebar-foreground/70 hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
                )}
                <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "opacity-70")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3 space-y-2">
          <div className="px-3 py-1.5 text-[11px] text-sidebar-foreground/50 truncate">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-foreground"
            onClick={() => signOut().then(() => navigate({ to: "/login" }))}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="relative z-10 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
