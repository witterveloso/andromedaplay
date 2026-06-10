import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { toast } from "sonner";

export const Route = createFileRoute("/expert/profile")({
  component: ExpertProfile,
});

function ExpertProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const profileQ = useQuery({
    enabled: !!user,
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("id, full_name, avatar_url").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profileQ.data) {
      setFullName(profileQ.data.full_name ?? "");
      setAvatarUrl(profileQ.data.avatar_url ?? "");
    }
  }, [profileQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: fullName || null, avatar_url: avatarUrl || null }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight mb-1">Meu perfil</h1>
      <p className="text-muted-foreground mb-6">Sua foto e nome aparecem em todas as publicações que você criar.</p>
      <Card className="p-6 space-y-5">
        <ImageUploadCrop
          label="Foto de perfil"
          value={avatarUrl}
          onChange={setAvatarUrl}
          folder="avatars"
          aspect={1}
          recommended={{ width: 400, height: 400 }}
          previewClassName="aspect-square w-32"
          rounded
        />
        <div className="space-y-1.5">
          <Label>Nome de exibição</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" maxLength={120} />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
