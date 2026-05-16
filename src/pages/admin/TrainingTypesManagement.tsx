import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Clock, FileCheck, Users } from "lucide-react";

const typeIcons: Record<string, typeof BookOpen> = {
  ise_baslama: Users,
  temel: BookOpen,
  tekrar: Clock,
  bilgi_yenileme: Clock,
  ilave: BookOpen,
  ozel_grup: Users,
  destek_elemani: Users,
  calisan_temsilcisi: Users,
};

export default function TrainingTypesManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["training-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_types").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("training_types").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-types"] });
      toast({ title: "Durum güncellendi" });
    },
  });

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eğitim Türleri</h1>
          <p className="text-muted-foreground">Yönetmeliğe uygun eğitim türleri ve kuralları</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Eğitim Türü</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Min. Süre</TableHead>
                  <TableHead>Sınav</TableHead>
                  <TableHead>Yüz Yüze</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : types.map((t: any) => {
                  const Icon = typeIcons[t.code] || BookOpen;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-muted-foreground max-w-md truncate">{t.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.code}</code></TableCell>
                      <TableCell>{t.min_duration_hours ? `${t.min_duration_hours} saat` : "—"}</TableCell>
                      <TableCell>{t.requires_exam ? <Badge variant="default">Zorunlu</Badge> : <Badge variant="secondary">Opsiyonel</Badge>}</TableCell>
                      <TableCell>{t.requires_face_to_face ? <Badge variant="destructive">Zorunlu</Badge> : <Badge variant="secondary">Opsiyonel</Badge>}</TableCell>
                      <TableCell>
                        <Switch checked={t.is_active} onCheckedChange={v => toggleActive.mutate({ id: t.id, is_active: v })} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
