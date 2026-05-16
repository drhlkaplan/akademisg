import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Video, Plus, Edit, Trash2, Users, ExternalLink, Key, Copy,
} from "lucide-react";

export default function LiveSessionsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    lesson_id: "",
    room_url: "",
    room_key: "",
    is_active: true,
  });

  // Fetch live sessions with lesson info
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin-live-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*, lessons(title, course_id, courses:course_id(title))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch lessons of type "live" that don't already have a session
  const { data: availableLessons } = useQuery({
    queryKey: ["available-live-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, course_id, courses:course_id(title)")
        .eq("type", "live")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch tracking data for participant counts
  const { data: trackingData } = useQuery({
    queryKey: ["live-session-tracking-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_session_tracking")
        .select("live_session_id, user_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((t) => {
        counts[t.live_session_id] = (counts[t.live_session_id] || 0) + 1;
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("live_sessions").insert({
        lesson_id: data.lesson_id,
        room_url: data.room_url,
        room_key: data.room_key || `bbb-${Date.now()}`,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-live-sessions"] });
      toast({ title: "Başarılı", description: "Canlı oturum oluşturuldu." });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "Oturum oluşturulamadı.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from("live_sessions").update({
        room_url: data.room_url,
        room_key: data.room_key,
        is_active: data.is_active,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-live-sessions"] });
      toast({ title: "Başarılı", description: "Oturum güncellendi." });
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncelleme başarısız.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("live_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-live-sessions"] });
      toast({ title: "Silindi", description: "Canlı oturum silindi." });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ lesson_id: "", room_url: "", room_key: `bbb-${Date.now()}`, is_active: true });
    setDialogOpen(true);
  };

  const handleOpenEdit = (session: any) => {
    setEditingId(session.id);
    setFormData({
      lesson_id: session.lesson_id,
      room_url: session.room_url,
      room_key: session.room_key,
      is_active: session.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.room_url.trim()) {
      toast({ title: "Hata", description: "Oda URL'si zorunludur.", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ ...formData, id: editingId });
    } else {
      if (!formData.lesson_id) {
        toast({ title: "Hata", description: "Ders seçimi zorunludur.", variant: "destructive" });
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Kopyalandı", description: "Anahtar panoya kopyalandı." });
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Canlı Oturumlar (BBB)</h1>
            <p className="text-sm text-muted-foreground">BigBlueButton canlı ders oturumlarını yönetin</p>
          </div>
          <Button variant="accent" onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Oturum
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ders</TableHead>
                  <TableHead>Eğitim</TableHead>
                  <TableHead className="hidden md:table-cell">Oda Anahtarı</TableHead>
                  <TableHead className="hidden md:table-cell">Katılımcı</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sessions && sessions.length > 0 ? (
                  sessions.map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium text-sm">{session.lessons?.title || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {session.lessons?.courses?.title || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{session.room_key}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(session.room_key)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{trackingData?.[session.id] || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {session.is_active ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Pasif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={session.room_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(session)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(session.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Video className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Henüz canlı oturum oluşturulmadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Oturumu Düzenle" : "Yeni Canlı Oturum"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!editingId && (
                <div className="space-y-2">
                  <Label>Ders (Canlı Türündeki)</Label>
                  <Select value={formData.lesson_id} onValueChange={(v) => setFormData({ ...formData, lesson_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Ders seçin" /></SelectTrigger>
                    <SelectContent>
                      {availableLessons?.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.title} — {l.courses?.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>BBB Oda URL'si</Label>
                <Input
                  placeholder="https://bbb.example.com/b/room-id"
                  value={formData.room_url}
                  onChange={(e) => setFormData({ ...formData, room_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Oda Erişim Anahtarı</Label>
                <Input
                  value={formData.room_key}
                  onChange={(e) => setFormData({ ...formData, room_key: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Öğrencilerin odaya katılmak için kullanacağı anahtar</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                <Label>Aktif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              <Button onClick={handleSubmit}>{editingId ? "Güncelle" : "Oluştur"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
