import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

const ROLES: Record<string, { label: string; title: string }> = {
  isg_uzmani: { label: "İş Güvenliği Uzmanı", title: "İş Güvenliği Uzmanı" },
  isyeri_hekimi: { label: "İşyeri Hekimi", title: "İşyeri Hekimi" },
  isveren_vekili: { label: "İşveren Vekili", title: "İşveren Vekili" },
};

const empty = { id: "", role: "isg_uzmani", full_name: "", title: "İş Güvenliği Uzmanı", certificate_no: "", phone: "", email: "", is_active: true };

export default function TrainersManagement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });

  const { data = [] } = useQuery({
    queryKey: ["certificate-trainers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificate_trainers").select("*").is("deleted_at", null).order("role").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["certificate-trainers"] }); qc.invalidateQueries({ queryKey: ["certificate-trainers-active"] }); };

  const save = useMutation({
    mutationFn: async () => {
      const { id, ...p } = form;
      const payload = { ...p, title: p.title || null, certificate_no: p.certificate_no || null, phone: p.phone || null, email: p.email || null };
      const { error } = id
        ? await supabase.from("certificate_trainers").update(payload).eq("id", id)
        : await supabase.from("certificate_trainers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setOpen(false); toast({ title: "Kaydedildi" }); },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certificate_trainers").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast({ title: "Silindi" }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eğiticiler</h1>
          <p className="text-muted-foreground">İş güvenliği uzmanı, işyeri hekimi ve işveren vekili bilgileri — sertifika şablonlarında seçilebilir</p>
        </div>
        <Button variant="accent" onClick={() => { setForm({ ...empty }); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Yeni Eğitici</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Ad Soyad</TableHead><TableHead>Görev</TableHead><TableHead>Unvan</TableHead><TableHead>Belge No</TableHead><TableHead>İletişim</TableHead><TableHead>Durum</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {data.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Henüz eğitici eklenmedi</TableCell></TableRow>}
            {data.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.full_name}</TableCell>
                <TableCell>{ROLES[t.role]?.label}</TableCell>
                <TableCell>{t.title || "-"}</TableCell>
                <TableCell>{t.certificate_no || "-"}</TableCell>
                <TableCell className="text-sm">{[t.phone, t.email].filter(Boolean).join(" · ") || "-"}</TableCell>
                <TableCell>{t.is_active ? "Aktif" : "Pasif"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => { setForm({ ...empty, ...Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v ?? ""])), is_active: t.is_active } as any); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => confirm("Silinsin mi?") && remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Eğitici Düzenle" : "Yeni Eğitici"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Görev</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v, title: ROLES[v].title }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ROLES).map(([k, r]) => <SelectItem key={k} value={k}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ad Soyad *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div><Label>Sertifikada görünecek unvan</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Örn. A Sınıfı İş Güvenliği Uzmanı" /></div>
            <div><Label>Belge / Sertifika No</Label><Input value={form.certificate_no} onChange={e => setForm(f => ({ ...f, certificate_no: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>E-posta</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Aktif</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button variant="accent" disabled={!form.full_name.trim() || save.isPending} onClick={() => save.mutate()}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
