import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, session, isAdmin, isExpert, isStudent } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Carregando…</div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" />;
  if (isAdmin) return <Navigate to="/admin" />;
  if (isExpert) return <Navigate to="/expert" />;
  if (isStudent) return <Navigate to="/aluno" />;
  return <Navigate to="/login" />;
}
