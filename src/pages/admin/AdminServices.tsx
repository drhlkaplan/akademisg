import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Service = {
  id: string;
  sort_order: number;
  icon_name: string;
  title: string;
  description: string | null;
  danger_class: string | null;
  features: string[];
  link_url: string | null;
  is_active: boolean;
};

const empty: Partial<Service> = {
  sort_order: 100,
  icon_name: "Shield",
  title: "",
  description: "",
  danger_class: "",
  features: [],
  link_url: "/courses",
  is_active: true,
};

const ICON_OPTIONS = ["Shield", "HardHat", "Flame", "AlertTriangle", "HeartPulse", "Building2", "Factory", "Monitor", "BookOpen", "Award"];

export default function AdminServices() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [open, setOpen] = useState(false);
  const [featuresText, setFeaturesText] = useState("");

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_services")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        features: Array.isArray(s.features) ? (s.features as string[]) : [],
      })) as Service[];
    },
  });

  const save = useMutation({
    mutationFn: async (s: Partial<Service>) => {
      if (!s.title) throw new Error("Başlık zorunlu");
      const features = featuresText.split("\n").map((f) => f.trim()).filter(Boolean);
      const payload = {
        sort_order: s.sort_order ?? 100,
        icon_name: s.icon_name ?? "Shield",
        title: s.title!,
        description: s.description || null,
        danger_class: s.danger_class || null,
        features,
        link_url: s.link_url || "/courses",
        is_active: s.is_active ?? true,
      };
      if (s.id) {
        const { error } = await supabase.from("site_services").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Kaydedildi" });
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["site-services"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("site_services")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Silindi" });
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["site-services"] });
    },
  });

  const openCreate = () => { setEditing({ ...empty }); setFeaturesText(""); setOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setFeaturesText((s.features ?? []).join("\n")); setOpen(true); };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Hizmetler</h1>
            <p className="text-muted-foreground text-sm">/services sayfasında listelenen hizmetleri yönetin.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Yeni Hizmet</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing?.id ? "Hizmeti Düzenle" : "Yeni Hizmet"}</DialogTitle>
              </DialogHeader>
              {editing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Başlık *</Label>
                      <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Sıra</Label>
                      <Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>İkon</Label>
                      <select className="w-full h-10 px-3 rounded-md border bg-background" value={editing.icon_name ?? "Shield"} onChange={(e) => setEditing({ ...editing, icon_name: e.target.value })}>
                        {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Tehlike Etiketi</Label>
                      <Input value={editing.danger_class ?? ""} onChange={(e) => setEditing({ ...editing, danger_class: e.target.value })} />
                    </div>
                    <div className="flex items-end gap-2 pb-2">
                      <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                      <Label>Aktif</Label>
                    </div>
                  </div>
                  <div>
                    <Label>Bağlantı URL</Label>
                    <Input value={editing.link_url ?? ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} placeholder="/courses" />
                  </div>
                  <div>
                    <Label>Açıklama</Label>
                    <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
                  </div>
                  <div>
                    <Label>Özellikler (her satıra bir madde)</Label>
                    <Textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={5} placeholder="Madde 1&#10;Madde 2" />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
                  {save.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Sıra</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead>Tehlike</TableHead>
                <TableHead>İkon</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Yükleniyor...</TableCell></TableRow>
              ) : (services ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Henüz hizmet yok.</TableCell></TableRow>
              ) : (
                (services ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.sort_order}</TableCell>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>{s.danger_class ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{s.icon_name}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Aktif" : "Pasif"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hizmeti sil?</AlertDialogTitle>
                            <AlertDialogDescription>"{s.title}" silinecek.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(s.id)}>Sil</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
