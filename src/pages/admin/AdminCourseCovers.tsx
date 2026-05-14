import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, Upload, Trash2, ImageIcon } from "lucide-react";

type Course = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminCourseCovers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-course-covers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, thumbnail_url, sort_order, is_active")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Course> }) => {
      const { error } = await supabase.from("courses").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-course-covers"] });
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const uploadCover = async (course: Course, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Hata", description: "Sadece görsel dosyalar yüklenebilir.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Hata", description: "Dosya 5MB'dan büyük olamaz.", variant: "destructive" });
      return;
    }
    setUploadingId(course.id);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${course.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("course-covers").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("course-covers").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("courses").update({ thumbnail_url: pub.publicUrl }).eq("id", course.id);
      if (dbErr) throw dbErr;
      toast({ title: "Yüklendi", description: `${course.title} için kapak güncellendi.` });
      qc.invalidateQueries({ queryKey: ["admin-course-covers"] });
    } catch (e) {
      toast({ title: "Yükleme başarısız", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  const removeCover = async (course: Course) => {
    if (!course.thumbnail_url) return;
    await updateField.mutateAsync({ id: course.id, patch: { thumbnail_url: null } });
    toast({ title: "Kapak kaldırıldı" });
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!courses) return;
    const target = index + direction;
    if (target < 0 || target >= courses.length) return;
    const a = courses[index];
    const b = courses[target];
    await Promise.all([
      supabase.from("courses").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("courses").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    qc.invalidateQueries({ queryKey: ["admin-course-covers"] });
    qc.invalidateQueries({ queryKey: ["public-courses"] });
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Eğitim Kapakları</h1>
          <p className="text-muted-foreground text-sm">Kapak görsellerini yükleyin, kursları sıralayın. Değişiklikler eğitim listelerinde anında görünür.</p>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Sıra</TableHead>
                <TableHead className="w-32">Önizleme</TableHead>
                <TableHead>Eğitim</TableHead>
                <TableHead className="w-32">Sort Order</TableHead>
                <TableHead className="text-right w-72">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Yükleniyor...</TableCell></TableRow>
              ) : (courses ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Eğitim bulunamadı.</TableCell></TableRow>
              ) : (
                (courses ?? []).map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === (courses?.length ?? 0) - 1} onClick={() => move(i, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-16 w-24 rounded bg-muted overflow-hidden flex items-center justify-center">
                        {c.thumbnail_url ? (
                          <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={c.sort_order}
                        className="w-24"
                        onBlur={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v) && v !== c.sort_order) updateField.mutate({ id: c.id, patch: { sort_order: v } });
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploadingId === c.id}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) uploadCover(c, file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {uploadingId === c.id ? "Yükleniyor..." : "Yükle"}
                      </Button>
                      {c.thumbnail_url && (
                        <Button size="sm" variant="ghost" onClick={() => removeCover(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
