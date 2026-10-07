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
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_CERT_TOPICS, DEFAULT_LEGAL_TEXT, type CertTopicGroup } from "@/lib/certificateTopics";
import { buildCertificatePdf } from "@/lib/certificatePdf";

const emptyForm = () => ({
  name: "",
  description: "",
  header_text: "TEMEL EĞİTİM BELGESİ",
  body_text: "",
  footer_text: "",
  logo_url: "",
  background_color: "#ffffff",
  accent_color: "#c8561a",
  is_default: false,
  company_name: "İSGAKADEMİ",
  company_contact: "www.gratisakademi.com",
  legal_text: DEFAULT_LEGAL_TEXT,
  delivery_method: "Uzaktan Eğitim",
  trainer1_name: "",
  trainer1_title: "İş Güvenliği Uzmanı",
  trainer2_name: "",
  trainer2_title: "İşyeri Hekimi",
  employer_title: "İşveren",
  use_firm_logo: true,
  topics: JSON.parse(JSON.stringify(DEFAULT_CERT_TOPICS)) as CertTopicGroup[],
});

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

  const [form, setForm] = useState(emptyForm());
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const previewPdf = async (tpl: any) => {
    const doc = await buildCertificatePdf({
      certificate: {
        certificate_number: "ISG-2026-ORNEK1", holder_name: "Ahmet Yılmaz", holder_tc: "12345678901",
        course_title: "Az Tehlikeli Temel İSG Eğitimi", duration_hours: 8, issue_date: new Date().toISOString(),
      },
      holder: { first_name: "Ahmet", last_name: "Yılmaz", tc_identity: "12345678901", job_title: "Satış Danışmanı" },
      enrollment: { started_at: new Date(Date.now() - 5 * 864e5).toISOString(), completed_at: new Date().toISOString() },
      firm: { name: "Örnek Firma A.Ş.", logo_url: null },
      template: tpl,
    });
    setPdfUrl(URL.createObjectURL(doc.output("blob")));
  };

  const toggleTopic = (gi: number, ii: number) =>
    setForm((f) => ({
      ...f,
      topics: f.topics.map((g, a) => a !== gi ? g : { ...g, items: g.items.map((it, b) => b !== ii ? it : { ...it, checked: !it.checked }) }),
    }));

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
      const payload: any = {
        name: data.name, description: data.description || null,
        header_text: data.header_text, body_text: data.body_text, footer_text: data.footer_text,
        logo_url: data.logo_url || null, background_color: data.background_color,
        accent_color: data.accent_color, is_default: data.is_default,
        company_name: data.company_name || null, company_contact: data.company_contact || null,
        legal_text: data.legal_text || null, delivery_method: data.delivery_method || null,
        trainer1_name: data.trainer1_name || null, trainer1_title: data.trainer1_title || null,
        trainer2_name: data.trainer2_name || null, trainer2_title: data.trainer2_title || null,
        employer_title: data.employer_title || null, use_firm_logo: data.use_firm_logo,
        topics: data.topics,
      };
      let savedId = data.id;
      if (data.id) {
        const { error } = await supabase.from("certificate_templates").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("certificate_templates").insert(payload).select("id").single();
        if (error) throw error;
        savedId = ins.id;
      }
      if (data.is_default && savedId) {
        await supabase.from("certificate_templates").update({ is_default: false }).neq("id", savedId);
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
      const t: any = template;
      const base = emptyForm();
      setForm({
        ...base,
        name: t.name,
        description: t.description || "",
        header_text: t.header_text || base.header_text,
        body_text: t.body_text || "",
        footer_text: t.footer_text || "",
        logo_url: t.logo_url || "",
        background_color: t.background_color || base.background_color,
        accent_color: t.accent_color || base.accent_color,
        is_default: t.is_default || false,
        company_name: t.company_name || "",
        company_contact: t.company_contact || "",
        legal_text: t.legal_text || DEFAULT_LEGAL_TEXT,
        delivery_method: t.delivery_method || "Uzaktan Eğitim",
        trainer1_name: t.trainer1_name || "",
        trainer1_title: t.trainer1_title || base.trainer1_title,
        trainer2_name: t.trainer2_name || "",
        trainer2_title: t.trainer2_title || base.trainer2_title,
        employer_title: t.employer_title || "İşveren",
        use_firm_logo: t.use_firm_logo !== false,
        topics: Array.isArray(t.topics) && t.topics.length ? t.topics : base.topics,
      });
    } else {
      setIsEditing(false);
      setSelectedTemplate(null);
      setForm(emptyForm());
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
                          <Button variant="ghost" size="icon" onClick={() => previewPdf(tmpl)}>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Şablon Düzenle" : "Yeni Şablon"}</DialogTitle>
              <DialogDescription>
                Çalışan adı, TC, görev unvanı, eğitim tarihleri, süre, firma adı ve firma logosu sertifika verilirken otomatik eklenir.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Şablon Adı</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Açıklama</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <p className="font-semibold text-sm">Ön Sayfa</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Belge Başlığı</Label><Input value={form.header_text} onChange={e => setForm(f => ({ ...f, header_text: e.target.value }))} /></div>
                  <div><Label>Eğitim Şekli</Label><Input value={form.delivery_method} onChange={e => setForm(f => ({ ...f, delivery_method: e.target.value }))} placeholder="Uzaktan Eğitim / Yüz Yüze" /></div>
                  <div><Label>Eğitimi Veren Şirket</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
                  <div><Label>Şirket İletişim (alt bilgi)</Label><Input value={form.company_contact} onChange={e => setForm(f => ({ ...f, company_contact: e.target.value }))} placeholder="Tel: ... www..." /></div>
                </div>
                <div>
                  <Label>Yönetmelik / Açıklama Metni</Label>
                  <Textarea rows={4} value={form.legal_text} onChange={e => setForm(f => ({ ...f, legal_text: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Kullanılabilir: {"{company_name}"} {"{delivery_method}"} {"{firm_name}"} {"{holder_name}"} {"{course_title}"}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <p className="font-semibold text-sm">1. Eğitmen</p>
                    <div><Label>1. Eğitmen Adı</Label><Input value={form.trainer1_name} onChange={e => setForm(f => ({ ...f, trainer1_name: e.target.value }))} /></div>
                    <div><Label>1. Eğitmen Unvanı</Label><Input value={form.trainer1_title} onChange={e => setForm(f => ({ ...f, trainer1_title: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-3">
                    <p className="font-semibold text-sm">2. Eğitmen</p>
                    <div><Label>2. Eğitmen Adı</Label><Input value={form.trainer2_name} onChange={e => setForm(f => ({ ...f, trainer2_name: e.target.value }))} /></div>
                    <div><Label>2. Eğitmen Unvanı</Label><Input value={form.trainer2_title} onChange={e => setForm(f => ({ ...f, trainer2_title: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-3">
                    <p className="font-semibold text-sm">İşveren</p>
                    <div><Label>İşveren İmza Başlığı</Label><Input value={form.employer_title} onChange={e => setForm(f => ({ ...f, employer_title: e.target.value }))} /></div>
                  </div>
                </div>
                <div><Label>Varsayılan Logo URL</Label><Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.use_firm_logo} onCheckedChange={v => setForm(f => ({ ...f, use_firm_logo: v }))} />
                  <Label>Çalışanın firmasının logosunu kullan (yoksa varsayılan logo)</Label>
                </div>
                <div>
                  <Label>Çerçeve Rengi</Label>
                  <div className="flex gap-2 items-center max-w-xs">
                    <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer" />
                    <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <p className="font-semibold text-sm">Arka Sayfa – Eğitim Konuları (işaretli olanlar [X] ile basılır)</p>
                {form.topics.map((g, gi) => (
                  <div key={g.group}>
                    <p className="text-sm font-medium mb-1">{g.group}</p>
                    <div className="grid md:grid-cols-2 gap-1">
                      {g.items.map((it, ii) => (
                        <label key={it.label} className="flex items-start gap-2 text-sm cursor-pointer">
                          <Checkbox checked={it.checked} onCheckedChange={() => toggleTopic(gi, ii)} className="mt-0.5" />
                          <span>{it.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
                <Label>Varsayılan şablon olarak ayarla</Label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => previewPdf(form)}><FileText className="h-4 w-4 mr-1" />PDF Önizleme</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              <Button variant="accent" onClick={() => saveMutation.mutate({ ...form, id: selectedTemplate?.id })} disabled={!form.name.trim()}>
                {isEditing ? "Güncelle" : "Oluştur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!pdfUrl} onOpenChange={(o) => { if (!o) { if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null); } }}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Sertifika Önizleme</DialogTitle>
              <DialogDescription>Örnek çalışan bilgileriyle 2 sayfalık sertifika</DialogDescription>
            </DialogHeader>
            {pdfUrl && <iframe src={pdfUrl} className="w-full h-[70vh] rounded border" title="Sertifika" />}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}