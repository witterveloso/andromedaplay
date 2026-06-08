import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CourseForm } from "@/components/admin/course-form";

export const Route = createFileRoute("/expert/courses/new")({
  component: NewCourse,
});

function NewCourse() {
  const navigate = useNavigate();
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Novo curso</h1>
        <p className="text-muted-foreground mt-1">Crie um novo curso e configure sua identidade visual</p>
      </div>
      <CourseForm onSaved={(id) => navigate({ to: "/expert/courses/$id", params: { id } })} />
    </div>
  );
}
