import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Pencil, Factory, Search } from "lucide-react";

const hazardClassLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  az_tehlikeli: { label: "Az Tehlikeli", variant: "secondary" },
  tehlikeli: { label: "Tehlikeli", variant: "default" },
  cok_tehlikeli: { label: "Çok Tehlikeli", variant: "destructive" },
};

interface SectorForm {
  name: string;
  code: string;
  default_hazard_class: string;
  description: string;
}

const emptySector: SectorForm = { name: "", code: "", default_hazard_class: "az_tehlikeli", description: "" };

export default function SectorsManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SectorForm>(emptySector);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sectors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SectorForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("sectors").update({
          name: data.name, code: data.code, 
          default_hazard_class: data.default_hazard_class as any,
          description: data.description,
        }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sectors").insert({
          name: data.name, code: data.code,
          default_hazard_class: data.default_hazard_class as any,
          description: data.description,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sectors"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptySector);
      toast({ title: editingId ? "Sektör güncellendi" : "Sektör oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("sectors").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sectors"] }),
  });

  const filtered = sectors.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (sector: any) => {
    setEditingId(sector.id);
    setForm({ name: sector.name, code: sector.code || "", default_hazard_class: sector.default_hazard_class || "az_tehlikeli", description: sector.description || "" });
    setDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sektör Yönetimi</h1>
            <p className="text-muted-foreground">Sektör tanımları ve tehlike sınıfı eşlemeleri</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(emptySector); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Yeni Sektör</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Sektör Düzenle" : "Yeni Sektör"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Sektör Adı</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Örn: İnşaat" />
                </div>
                <div>
                  <Label>Kod</Label>
                  <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Örn: insaat" />
                </div>
                <div>
                  <Label>Varsayılan Tehlike Sınıfı</Label>
                  <Select value={form.default_hazard_class} onValueChange={v => setForm({ ...form, default_hazard_class: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="az_tehlikeli">Az Tehlikeli</SelectItem>
                      <SelectItem value="tehlikeli">Tehlikeli</SelectItem>
                      <SelectItem value="cok_tehlikeli">Çok Tehlikeli</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
          <Input className="pl-9" placeholder="Sektör ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sektör</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Tehlike Sınıfı</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Sektör bulunamadı</TableCell></TableRow>
                ) : filtered.map((s: any) => {
                  const hc = hazardClassLabels[s.default_hazard_class] || hazardClassLabels.az_tehlikeli;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Factory className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{s.name}</div>
                            {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.code}</code></TableCell>
                      <TableCell><Badge variant={hc.variant}>{hc.label}</Badge></TableCell>
                      <TableCell>
                        <Switch checked={s.is_active} onCheckedChange={v => toggleActive.mutate({ id: s.id, is_active: v })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
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
