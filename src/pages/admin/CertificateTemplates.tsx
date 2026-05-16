import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge-custom";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Eye, Star, Palette, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CertificateTemplate {
  id: string;
  name: string;
  description: string | null;
  header_text: string | null;
  body_text: string | null;
  footer_text: string | null;
  logo_url: string | null;
  background_color: string | null;
  accent_color: string | null;
  is_default: boolean | null;
  created_at: string | null;
}

export default function CertificateTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    header_text: "İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİM SERTİFİKASI",
    body_text: "Bu belge, {holder_name} adlı kişinin {course_title} eğitimini başarıyla tamamladığını belgeler.",
    footer_text: "Bu sertifika {issue_date} tarihinde düzenlenmiştir ve {expiry_date} tarihine kadar geçerlidir.",
    logo_url: "",
    background_color: "#1a2744",
    accent_color: "#f97316",
    is_default: false,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CertificateTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("certificate_templates").update({
          name: data.name, description: data.description || null,
          header_text: data.header_text, body_text: data.body_text, footer_text: data.footer_text,
          logo_url: data.logo_url || null, background_color: data.background_color,
          accent_color: data.accent_color, is_default: data.is_default,
        }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("certificate_templates").insert({
          name: data.name, description: data.description || null,
          header_text: data.header_text, body_text: data.body_text, footer_text: data.footer_text,
          logo_url: data.logo_url || null, background_color: data.background_color,
          accent_color: data.accent_color, is_default: data.is_default,
        });
        if (error) throw error;
      }
      // If setting as default, unset others
      if (data.is_default && data.id) {
        await supabase.from("certificate_templates").update({ is_default: false }).neq("id", data.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast({ title: "Başarılı", description: isEditing ? "Şablon güncellendi." : "Şablon oluşturuldu." });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem başarısız.", variant: "destructive" });
    },
  });

  const handleOpen = (template?: CertificateTemplate) => {
    if (template) {
      setIsEditing(true);
      setSelectedTemplate(template);
      setForm({
        name: template.name,
        description: template.description || "",
        header_text: template.header_text || "",
        body_text: template.body_text || "",
        footer_text: template.footer_text || "",
        logo_url: template.logo_url || "",
        background_color: template.background_color || "#1a2744",
        accent_color: template.accent_color || "#f97316",
        is_default: template.is_default || false,
      });
    } else {
      setIsEditing(false);
      setSelectedTemplate(null);
      setForm({
        name: "", description: "",
        header_text: "İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİM SERTİFİKASI",
        body_text: "Bu belge, {holder_name} adlı kişinin {course_title} eğitimini başarıyla tamamladığını belgeler.",
        footer_text: "Bu sertifika {issue_date} tarihinde düzenlenmiştir ve {expiry_date} tarihine kadar geçerlidir.",
        logo_url: "", background_color: "#1a2744", accent_color: "#f97316", is_default: false,
      });
    }
    setDialogOpen(true);
  };

  const previewHtml = (template: CertificateTemplate | typeof form) => {
    const bg = template.background_color || "#1a2744";
    const accent = template.accent_color || "#f97316";
    const header = (template.header_text || "").replace(/{[^}]+}/g, "...");
    const body = (template.body_text || "")
      .replace("{holder_name}", "Ahmet Yılmaz")
      .replace("{course_title}", "Temel İSG Eğitimi")
      .replace("{danger_class}", "Az Tehlikeli")
      .replace("{duration_hours}", "16");
    const footer = (template.footer_text || "")
      .replace("{issue_date}", "08.03.2026")
      .replace("{expiry_date}", "08.03.2027")
      .replace("{certificate_number}", "ISG-2026-ABC123");

    return (
      <div className="border rounded-lg overflow-hidden shadow-lg" style={{ maxWidth: 600 }}>
        <div style={{ backgroundColor: bg, padding: "24px 32px", textAlign: "center" }}>
          <h2 style={{ color: accent, fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
            {header}
          </h2>
        </div>
        <div style={{ padding: "32px", textAlign: "center", backgroundColor: "#fff" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: accent, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 24 }}>★</span>
          </div>
          <p style={{ fontSize: 14, color: "#333", lineHeight: 1.6 }}>{body}</p>
        </div>
        <div style={{ backgroundColor: "#f8f8f8", padding: "16px 32px", textAlign: "center", borderTop: `2px solid ${accent}` }}>
          <p style={{ fontSize: 11, color: "#666", margin: 0 }}>{footer}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sertifika Şablonları</h1>
            <p className="text-muted-foreground">Sertifika görünümlerini özelleştirin ve şablonlar oluşturun</p>
          </div>
          <Button variant="accent" onClick={() => handleOpen()}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Şablon
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Şablonlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : templates && templates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Şablon Adı</TableHead>
                    <TableHead className="hidden md:table-cell">Açıklama</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(tmpl => (
                    <TableRow key={tmpl.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded" style={{ backgroundColor: tmpl.background_color || "#1a2744" }} />
                          {tmpl.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                        {tmpl.description || "-"}
                      </TableCell>
                      <TableCell>
                        {tmpl.is_default ? (
                          <Badge variant="success"><Star className="h-3 w-3 mr-1" />Varsayılan</Badge>
                        ) : (
                          <Badge variant="secondary">Özel</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedTemplate(tmpl); setPreviewOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpen(tmpl)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Henüz şablon oluşturulmamış</div>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Şablon Düzenle" : "Yeni Şablon"}</DialogTitle>
              <DialogDescription>Sertifika şablonunu yapılandırın. Değişken kullanabilirsiniz: {"{holder_name}"}, {"{course_title}"}, {"{issue_date}"}, {"{expiry_date}"}, {"{certificate_number}"}, {"{danger_class}"}, {"{duration_hours}"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Şablon Adı</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Başlık Metni</Label>
                <Input value={form.header_text} onChange={e => setForm(f => ({ ...f, header_text: e.target.value }))} />
              </div>
              <div>
                <Label>İçerik Metni</Label>
                <Textarea rows={3} value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} />
              </div>
              <div>
                <Label>Alt Bilgi Metni</Label>
                <Textarea rows={2} value={form.footer_text} onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Arka Plan Rengi</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer" />
                    <Input value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Vurgu Rengi</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer" />
                    <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Logo URL</Label>
                  <Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
                <Label>Varsayılan şablon olarak ayarla</Label>
              </div>

              {/* Live Preview */}
              <div>
                <Label className="mb-2 block">Önizleme</Label>
                {previewHtml(form)}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              <Button variant="accent" onClick={() => saveMutation.mutate({ ...form, id: selectedTemplate?.id })} disabled={!form.name.trim()}>
                {isEditing ? "Güncelle" : "Oluştur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Şablon Önizleme - {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>Sertifika şablonunun örnek görünümü</DialogDescription>
            </DialogHeader>
            {selectedTemplate && previewHtml(selectedTemplate)}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}