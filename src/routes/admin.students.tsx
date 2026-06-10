import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStudents, deleteStudent } from "@/lib/admin-platform.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Mail, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/students")({
  component: StudentsPage,
});

function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "?").trim();
  return src.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function StudentsPage() {
  const [query, setQuery] = useState("");
  const fn = useServerFn(listStudents);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: () => fn({ data: {} }),
  });

  const students = (data?.students ?? []).filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (s.email ?? "").toLowerCase().includes(q) || (s.full_name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Comunidade</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Alunos</h1>
        <p className="text-muted-foreground mt-1">Diretório completo de alunos da plataforma.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando alunos…</p>
      ) : students.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground border-white/[0.06]">
          Nenhum aluno encontrado.
        </Card>
      ) : (
        <Card className="overflow-hidden border-white/[0.06]">
          <div className="divide-y divide-white/[0.06]">
            {students.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition">
                <Avatar className="h-10 w-10 ring-1 ring-primary/20">
                  {s.avatar_url && <AvatarImage src={s.avatar_url} alt={s.full_name ?? ""} />}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {initials(s.full_name, s.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.full_name ?? "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 shrink-0" /> {s.email || "—"}
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {s.active_enrollments} acesso{s.active_enrollments === 1 ? "" : "s"}
                  </div>
                  {s.created_at && (
                    <div>cadastrado em {new Date(s.created_at).toLocaleDateString("pt-BR")}</div>
                  )}
                </div>
                <Badge variant={s.active_enrollments > 0 ? "default" : "secondary"}>
                  {s.active_enrollments > 0 ? "Ativo" : "Sem acesso"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
