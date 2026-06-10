import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, LogOut, GraduationCap } from "lucide-react";

function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "?").trim();
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AvatarMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile-mini", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-colors">
          <Avatar className="h-8 w-8 ring-1 ring-primary/30">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.full_name ?? ""} />}
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {initials(profile?.full_name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm text-foreground/80 max-w-[140px] truncate">
            {profile?.full_name ?? user?.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-background/95 backdrop-blur-xl border-white/[0.08]">
        <DropdownMenuLabel className="flex items-center gap-3 py-3">
          <Avatar className="h-10 w-10 ring-1 ring-primary/30">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
              {initials(profile?.full_name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{profile?.full_name ?? "Aluno"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/aluno"><GraduationCap className="mr-2 h-4 w-4" /> Meus cursos</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/aluno/perfil"><UserCircle className="mr-2 h-4 w-4" /> Meu perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        <DropdownMenuItem
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          className="cursor-pointer text-muted-foreground focus:text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
