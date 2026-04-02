import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, HelpCircle, GripVertical } from "lucide-react";

const categories = [
  { value: "genel", label: "Genel" },
  { value: "yonetmelik", label: "Yönetmelik" },
  { value: "egitim_turleri", label: "Eğitim Türleri" },
  { value: "belgeler", label: "Belgeler" },
  { value: "teknik", label: "Teknik" },
];

interface FaqForm {
  category: string;
  question: string;
  answer: string;
  sort_order: number;
}

const emptyFaq: FaqForm = { category: "genel", question: "", answer: "", sort_order: 0 };

export default function FaqManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FaqForm>(emptyFaq);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faq-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faq_items").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FaqForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("faq_items").update({ category: data.category, question: data.question, answer: data.answer, sort_order: data.sort_order }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faq_items").insert({ category: data.category, question: data.question, answer: data.answer, sort_order: data.sort_order });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faq-items"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyFaq);
      toast({ title: editingId ? "SSS güncellendi" : "SSS oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faq-items"] });
      toast({ title: "SSS silindi" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("faq_items").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faq-items"] }),
  });

  const openEdit = (faq: any) => {
    setEditingId(faq.id);
    setForm({ category: faq.category || "genel", question: faq.question, answer: faq.answer, sort_order: faq.sort_order || 0 });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SSS Yönetimi</h1>
            <p className="text-muted-foreground">Sık sorulan sorular ve yönetmelik bilgilendirme içerikleri</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(emptyFaq); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Yeni Soru</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "SSS Düzenle" : "Yeni SSS"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Soru</Label>
                  <Input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} />
                </div>
                <div>
                  <Label>Cevap</Label>
                  <Textarea rows={6} value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} />
                </div>
                <div>
                  <Label>Sıralama</Label>
                  <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })} disabled={saveMutation.isPending || !form.question || !form.answer}>
                  {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Yükleniyor...</CardContent></Card>
          ) : faqs.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">SSS bulunamadı</CardContent></Card>
          ) : faqs.map((faq: any) => (
            <Card key={faq.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <HelpCircle className="h-4 w-4 text-primary" />
                      <Badge variant="outline" className="text-xs">{categories.find(c => c.value === faq.category)?.label || faq.category}</Badge>
                      <span className="text-xs text-muted-foreground">#{faq.sort_order}</span>
                    </div>
                    <h3 className="font-medium text-foreground">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={faq.is_active} onCheckedChange={v => toggleActive.mutate({ id: faq.id, is_active: v })} />
                    <Button variant="ghost" size="sm" onClick={() => openEdit(faq)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(faq.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
