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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, AlertTriangle, Search, Clock, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { MINUTES_PER_LESSON, formatLessonDuration } from "@/lib/lessonDuration";

const hazardLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  az_tehlikeli: { label: "Az Tehlikeli", variant: "secondary" },
  tehlikeli: { label: "Tehlikeli", variant: "default" },
  cok_tehlikeli: { label: "Çok Tehlikeli", variant: "destructive" },
};

interface PackForm {
  sector_id: string;
  hazard_class: string;
  name: string;
  description: string;
  lesson_count: number;
  key_hazards: string;
}

const emptyPack: PackForm = { sector_id: "", hazard_class: "az_tehlikeli", name: "", description: "", lesson_count: 3, key_hazards: "" };

export default function Topic4PacksManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackForm>(emptyPack);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sectors = [] } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sectors").select("id, name, code").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ["topic4-packs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topic4_sector_packs").select("*, sectors(name, code)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PackForm & { id?: string }) => {
      const hazards = data.key_hazards.split("\n").filter(h => h.trim());
      const payload = {
        sector_id: data.sector_id || null,
        hazard_class: data.hazard_class as any,
        name: data.name,
        description: data.description,
        duration_minutes: data.lesson_count * MINUTES_PER_LESSON,
        lesson_count: data.lesson_count,
        key_hazards: hazards,
      };
      if (data.id) {
        const { error } = await supabase.from("topic4_sector_packs").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("topic4_sector_packs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topic4-packs"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyPack);
      toast({ title: editingId ? "Paket güncellendi" : "Paket oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("topic4_sector_packs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topic4-packs"] }),
  });

  const filtered = packs.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (pack: any) => {
    setEditingId(pack.id);
    const hazards = Array.isArray(pack.key_hazards) ? pack.key_hazards.join("\n") : "";
    setForm({
      sector_id: pack.sector_id || "",
      hazard_class: pack.hazard_class || "az_tehlikeli",
      name: pack.name,
      description: pack.description || "",
      lesson_count: pack.lesson_count || Math.max(1, Math.round((pack.duration_minutes || 120) / MINUTES_PER_LESSON)),
      key_hazards: hazards,
    });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">İşe ve İşyerine Özgü Konular</h1>
            <p className="text-muted-foreground">İşe ve İşyerine Özgü Riskler eğitim içerik paketleri</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(emptyPack); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Yeni Paket</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Paketi Düzenle" : "Yeni İşyeri Konusu Paketi"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <Label>Paket Adı</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Örn: İnşaat Sahası İşyerine Özgü Riskler" />
                </div>
                <div>
                  <Label>Sektör</Label>
                  <Select value={form.sector_id} onValueChange={v => setForm({ ...form, sector_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sektör seçin" /></SelectTrigger>
                    <SelectContent>
                      {sectors.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tehlike Sınıfı</Label>
                  <Select value={form.hazard_class} onValueChange={v => setForm({ ...form, hazard_class: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="az_tehlikeli">Az Tehlikeli</SelectItem>
                      <SelectItem value="tehlikeli">Tehlikeli</SelectItem>
                      <SelectItem value="cok_tehlikeli">Çok Tehlikeli</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ders Sayısı (her ders {MINUTES_PER_LESSON} dk)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.lesson_count}
                    onChange={e => setForm({ ...form, lesson_count: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Toplam: {form.lesson_count * MINUTES_PER_LESSON} dakika</p>
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Temel Riskler (her satıra bir risk)</Label>
                  <Textarea rows={6} value={form.key_hazards} onChange={e => setForm({ ...form, key_hazards: e.target.value })} placeholder="Yüksekte çalışma&#10;Elektrik çarpması&#10;Kimyasal maruz kalma" />
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })} disabled={saveMutation.isPending || !form.name}>
                  {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Paket ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket Adı</TableHead>
                  <TableHead>Sektör</TableHead>
                  <TableHead>Tehlike Sınıfı</TableHead>
                  <TableHead>Süre</TableHead>
                  <TableHead>Riskler</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Paket bulunamadı</TableCell></TableRow>
                ) : filtered.map((p: any) => {
                  const hc = hazardLabels[p.hazard_class] || hazardLabels.az_tehlikeli;
                  const hazards = Array.isArray(p.key_hazards) ? p.key_hazards : [];
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <div>
                            <div className="font-medium">{p.name}</div>
                            {p.description && <div className="text-xs text-muted-foreground max-w-xs truncate">{p.description}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{(p as any).sectors?.name || "—"}</TableCell>
                      <TableCell><Badge variant={hc.variant}>{hc.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLessonDuration(p.duration_minutes)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {hazards.slice(0, 3).map((h: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
                          ))}
                          {hazards.length > 3 && <Badge variant="outline" className="text-xs">+{hazards.length - 3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell><Switch checked={p.is_active} onCheckedChange={v => toggleActive.mutate({ id: p.id, is_active: v })} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild title="Ders İçerikleri">
                            <Link to={`/admin/topic4-packs/${p.id}/lessons`}><ListChecks className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Düzenle"><Pencil className="h-4 w-4" /></Button>
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
