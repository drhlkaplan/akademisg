import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Calendar, Clock, Users, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Planlandı", variant: "secondary" },
  in_progress: { label: "Devam Ediyor", variant: "default" },
  completed: { label: "Tamamlandı", variant: "outline" },
  cancelled: { label: "İptal", variant: "destructive" },
};

interface SessionForm {
  lesson_id: string;
  course_id: string;
  firm_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  notes: string;
}

const emptyForm: SessionForm = {
  lesson_id: "", course_id: "", firm_id: "",
  session_date: "", start_time: "09:00", end_time: "17:00",
  location: "", capacity: 30, notes: "",
};

export default function FaceToFaceSessionsManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SessionForm>(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["f2f-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("face_to_face_sessions")
        .select("*, firms(name), lessons(title), courses(title)")
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").eq("is_active", true).is("deleted_at", null).order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: firms = [] } = useQuery({
    queryKey: ["firms-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("firms").select("id, name").eq("is_active", true).is("deleted_at", null).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons-for-course", form.course_id],
    queryFn: async () => {
      if (!form.course_id) return [];
      const { data, error } = await supabase.from("lessons").select("id, title, topic_group, delivery_method").eq("course_id", form.course_id).eq("is_active", true).is("deleted_at", null).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!form.course_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: SessionForm) => {
      const { error } = await supabase.from("face_to_face_sessions").insert({
        lesson_id: data.lesson_id || null,
        course_id: data.course_id || null,
        firm_id: data.firm_id || null,
        session_date: data.session_date,
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location,
        capacity: data.capacity,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["f2f-sessions"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: "Yüz yüze oturum oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("face_to_face_sessions").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["f2f-sessions"] });
      toast({ title: "Durum güncellendi" });
    },
  });

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Yüz Yüze Oturumlar</h1>
            <p className="text-muted-foreground">Yüz yüze eğitim oturumlarını planlayın ve yoklama alın</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Yeni Oturum</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Yeni Yüz Yüze Oturum</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <Label>Kurs</Label>
                  <Select value={form.course_id} onValueChange={v => setForm({ ...form, course_id: v, lesson_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Kurs seçin" /></SelectTrigger>
                    <SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.course_id && lessons.length > 0 && (
                  <div>
                    <Label>Ders (Opsiyonel)</Label>
                    <Select value={form.lesson_id} onValueChange={v => setForm({ ...form, lesson_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Ders seçin" /></SelectTrigger>
                      <SelectContent>{lessons.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Firma (Opsiyonel)</Label>
                  <Select value={form.firm_id} onValueChange={v => setForm({ ...form, firm_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Firma seçin" /></SelectTrigger>
                    <SelectContent>{firms.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Tarih</Label>
                    <Input type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Başlangıç</Label>
                    <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bitiş</Label>
                    <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Mekan</Label>
                  <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Örn: Ankara Eğitim Salonu" />
                </div>
                <div>
                  <Label>Kapasite</Label>
                  <Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 30 })} />
                </div>
                <div>
                  <Label>Notlar</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.session_date || !form.location}>
                  {createMutation.isPending ? "Oluşturuluyor..." : "Oturum Oluştur"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Kurs / Ders</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Mekan</TableHead>
                  <TableHead>Saat</TableHead>
                  <TableHead>Kapasite</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Oturum bulunamadı</TableCell></TableRow>
                ) : sessions.map((s: any) => {
                  const st = statusLabels[s.status] || statusLabels.scheduled;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {s.session_date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{(s as any).courses?.title || "—"}</div>
                        <div className="text-xs text-muted-foreground">{(s as any).lessons?.title || ""}</div>
                      </TableCell>
                      <TableCell>{(s as any).firms?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {s.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {s.capacity}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {s.status === "scheduled" && (
                            <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: "in_progress" })}>Başlat</Button>
                          )}
                          {s.status === "in_progress" && (
                            <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: "completed" })}>
                              <ClipboardCheck className="h-4 w-4 mr-1" />Tamamla
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
