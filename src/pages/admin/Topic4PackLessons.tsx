import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { FileUploadField } from "@/components/admin/FileUploadField";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowLeft, FileText, Play, FileQuestion, Video, ArrowUp, ArrowDown, Upload, Loader2 } from "lucide-react";
import { formatLessonDuration, MINUTES_PER_LESSON } from "@/lib/lessonDuration";
import { uploadAndCreateScormPackage } from "@/lib/scormUpload";

type ContentType = "scorm" | "html" | "pdf" | "pptx" | "video";

interface LessonForm {
  title: string;
  content_type: ContentType;
  content_url: string;
  scorm_package_id: string;
  duration_lessons: number;
  sort_order: number;
}

const emptyForm: LessonForm = {
  title: "",
  content_type: "html",
  content_url: "",
  scorm_package_id: "",
  duration_lessons: 1,
  sort_order: 0,
};

const contentTypeMeta: Record<ContentType, { label: string; icon: any; accept: string }> = {
  scorm: { label: "SCORM Paketi", icon: Play, accept: ".zip" },
  html: { label: "HTML İçerik", icon: FileText, accept: ".html,.htm" },
  pdf: { label: "PDF Belge", icon: FileQuestion, accept: ".pdf" },
  pptx: { label: "PowerPoint", icon: FileText, accept: ".pptx,.ppt" },
  video: { label: "Video", icon: Video, accept: "video/*" },
};

export default function Topic4PackLessons() {
  const { packId } = useParams<{ packId: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [hostCourseId, setHostCourseId] = useState<string>("");
  const [scormUploading, setScormUploading] = useState(false);
  const [scormProgress, setScormProgress] = useState(0);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: pack } = useQuery({
    queryKey: ["topic4-pack", packId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topic4_sector_packs")
        .select("*, sectors(name)")
        .eq("id", packId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!packId,
  });

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["topic4-pack-lessons", packId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topic4_pack_lessons")
        .select("*")
        .eq("topic4_pack_id", packId!)
        .is("deleted_at", null)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!packId,
  });

  const { data: scormPackages = [] } = useQuery({
    queryKey: ["scorm-packages-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scorm_packages")
        .select("id, package_url, course_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-for-scorm-host"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .is("deleted_at", null)
        .order("title")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const handleZipScormUpload = async (file: File) => {
    if (!hostCourseId) {
      toast({ title: "Önce ev sahibi kurs seçin", variant: "destructive" });
      return;
    }
    setScormUploading(true);
    setScormProgress(0);
    try {
      const result = await uploadAndCreateScormPackage(file, hostCourseId, (p) => setScormProgress(p));
      setForm((f) => ({ ...f, scorm_package_id: result.packageId, content_url: result.packageUrl }));
      qc.invalidateQueries({ queryKey: ["scorm-packages-all"] });
      toast({ title: "SCORM paketi oluşturuldu", description: "Kaydedince derse bağlanacak." });
    } catch (e: any) {
      toast({ title: "SCORM dönüştürme hatası", description: e.message, variant: "destructive" });
    } finally {
      setScormUploading(false);
      setScormProgress(0);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: LessonForm & { id?: string }) => {
      const payload = {
        topic4_pack_id: packId!,
        title: data.title,
        content_type: data.content_type,
        lesson_type: data.content_type === "scorm" ? "scorm" : "content",
        content_url: data.content_url || null,
        scorm_package_id: data.content_type === "scorm" ? data.scorm_package_id || null : null,
        duration_lessons: data.duration_lessons,
        sort_order: data.sort_order,
      };
      if (data.id) {
        const { error } = await supabase.from("topic4_pack_lessons").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("topic4_pack_lessons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topic4-pack-lessons", packId] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Ders güncellendi" : "Ders eklendi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("topic4_pack_lessons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topic4-pack-lessons", packId] }),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("topic4_pack_lessons")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topic4-pack-lessons", packId] });
      toast({ title: "Ders silindi" });
    },
  });

  const reorderLesson = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = lessons.findIndex((l: any) => l.id === id);
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= lessons.length) return;
      const a = lessons[idx] as any;
      const b = lessons[targetIdx] as any;
      await supabase.from("topic4_pack_lessons").update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("topic4_pack_lessons").update({ sort_order: a.sort_order }).eq("id", b.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topic4-pack-lessons", packId] }),
  });

  const openEdit = (lesson: any) => {
    setEditingId(lesson.id);
    setForm({
      title: lesson.title,
      content_type: lesson.content_type,
      content_url: lesson.content_url || "",
      scorm_package_id: lesson.scorm_package_id || "",
      duration_lessons: lesson.duration_lessons || 1,
      sort_order: lesson.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l: any) => l.sort_order || 0)) + 10 : 10;
    setForm({ ...emptyForm, sort_order: nextOrder });
    setDialogOpen(true);
  };

  const totalLessons = lessons.reduce((sum: number, l: any) => sum + (l.duration_lessons || 0), 0);
  const totalMinutes = totalLessons * MINUTES_PER_LESSON;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/topic4-packs"><ArrowLeft className="h-4 w-4 mr-1" />Paketler</Link>
          </Button>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{pack?.name || "Paket"}</h1>
            <p className="text-muted-foreground">
              {(pack as any)?.sectors?.name || "—"} • Toplam {formatLessonDuration(totalMinutes)}
            </p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Yeni Ders</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Ders</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Süre</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : lessons.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Henüz ders eklenmemiş.</TableCell></TableRow>
                ) : lessons.map((l: any, i: number) => {
                  const meta = contentTypeMeta[l.content_type as ContentType] || contentTypeMeta.html;
                  const Icon = meta.icon;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{l.title}</div>
                            {l.content_url && (
                              <div className="text-xs text-muted-foreground truncate max-w-md">{l.content_url.split("/").pop()}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{meta.label}</Badge></TableCell>
                      <TableCell>{l.duration_lessons} ders ({l.duration_lessons * MINUTES_PER_LESSON} dk)</TableCell>
                      <TableCell>
                        <Switch checked={l.is_active} onCheckedChange={v => toggleActive.mutate({ id: l.id, is_active: v })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => reorderLesson.mutate({ id: l.id, direction: "up" })}><ArrowUp className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" disabled={i === lessons.length - 1} onClick={() => reorderLesson.mutate({ id: l.id, direction: "down" })}><ArrowDown className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Bu ders silinsin mi?")) deleteLesson.mutate(l.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Dersi Düzenle" : "Yeni Ders"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <Label>Ders Başlığı</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Örn: Sahaya Özgü Riskler ve KKD Kullanımı" />
              </div>
              <div>
                <Label>İçerik Tipi</Label>
                <Select value={form.content_type} onValueChange={(v: ContentType) => setForm({ ...form, content_type: v, content_url: "", scorm_package_id: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(contentTypeMeta) as ContentType[]).map(k => (
                      <SelectItem key={k} value={k}>{contentTypeMeta[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.content_type === "scorm" ? (
                <>
                  <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
                    <div>
                      <Label>Otomatik SCORM Yükleme (.zip)</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Zip dosyası seçtiğinizde otomatik olarak açılır, R2'ye çıkarılır ve SCORM paketi olarak bu derse bağlanır.
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs">Ev Sahibi Kurs (RLS için zorunlu)</Label>
                      <Select value={hostCourseId || "none"} onValueChange={v => setHostCourseId(v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Bir kurs seçin" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Seçin —</SelectItem>
                          {courses.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleZipScormUpload(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={scormUploading || !hostCourseId}
                      onClick={() => zipInputRef.current?.click()}
                    >
                      {scormUploading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yükleniyor... %{scormProgress}</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-2" />Zip seç ve SCORM'a çevir</>
                      )}
                    </Button>
                    {scormUploading && <Progress value={scormProgress} className="h-2" />}
                    {form.scorm_package_id && !scormUploading && (
                      <p className="text-xs text-success">✓ SCORM paketi hazır: {form.scorm_package_id.slice(0, 8)}…</p>
                    )}
                  </div>

                  <div>
                    <Label>Mevcut SCORM Paketi (opsiyonel)</Label>
                    <Select value={form.scorm_package_id || "none"} onValueChange={v => setForm({ ...form, scorm_package_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Paket seçin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Yok —</SelectItem>
                        {scormPackages.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.package_url.split("/").slice(-2).join("/")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <FileUploadField
                  label="İçerik Dosyası"
                  value={form.content_url}
                  onChange={url => setForm({ ...form, content_url: url })}
                  bucket="topic4-content"
                  folder={`pack-${packId}/${form.content_type}`}
                  accept={contentTypeMeta[form.content_type].accept}
                  placeholder="https://..."
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Süre (ders × 45 dk)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.duration_lessons}
                    onChange={e => setForm({ ...form, duration_lessons: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.duration_lessons * MINUTES_PER_LESSON} dakika</p>
                </div>
                <div>
                  <Label>Sıra</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
                disabled={saveMutation.isPending || !form.title}
              >
                {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
