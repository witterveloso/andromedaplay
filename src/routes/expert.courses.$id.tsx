import { createFileRoute, useNavigate, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CourseForm } from "@/components/admin/course-form";
import { ContentsVideo } from "@/components/admin/contents-video";
import { ContentsCommunity } from "@/components/admin/contents-community";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/expert/courses/$id")({
  component: EditCourse,
});

function EditCourse() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const isStudentsTab = location.pathname.endsWith("/students");

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!course) return <div className="p-8 text-muted-foreground">Curso não encontrado.</div>;

  // If we're on the /students subroute, render the child outlet
  if (isStudentsTab) return <Outlet />;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/expert/courses"><ChevronLeft className="mr-1 h-4 w-4" /> Voltar</Link>
      </Button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-muted-foreground mt-1">
            {course.course_type === "community" ? "Comunidade interativa" : "Hospedagem de vídeo"}
          </p>
        </div>
        <Badge variant={course.status === "published" ? "default" : "secondary"}>
          {course.status === "published" ? "Publicado" : course.status === "draft" ? "Rascunho" : "Arquivado"}
        </Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="contents">Conteúdos</TabsTrigger>
          <TabsTrigger value="students" asChild>
            <Link to="/expert/courses/$id/students" params={{ id }}>Alunos</Link>
          </TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CourseForm initial={course as any} section="info" onSaved={() => navigate({ to: "/expert/courses" })} />
        </TabsContent>
        <TabsContent value="contents" className="mt-6">
          {course.course_type === "community"
            ? <ContentsCommunity courseId={course.id} />
            : <ContentsVideo courseId={course.id} />}
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <CourseForm initial={course as any} section="visual" />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <CourseForm initial={course as any} section="advanced" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
