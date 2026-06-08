import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/expert/")({
  component: () => <Navigate to="/expert/courses" />,
});
