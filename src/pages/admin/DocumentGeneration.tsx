import { useState } from "react";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "@/lib/pdfFonts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Plus, Loader2, Download, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateTR } from "@/lib/reportExport";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type DocumentType = "yuz_yuze_katilim_tutanagi" | "ise_baslama_kaydi" | "faaliyet_raporu" | "temel_egitim_belgesi";

const DOC_LABELS: Record<string, string> = {
  yuz_yuze_katilim_tutanagi: "Yüz Yüze Katılım Tutanağı",
  ise_baslama_kaydi: "İşe Başlama Eğitim Kartı",
  faaliyet_raporu: "Eğitim Faaliyet Raporu",
  temel_egitim_belgesi: "Eğitim Belgesi",
};

export default function DocumentGeneration() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>("yuz_yuze_katilim_tutanagi");
  const [selectedFirm, setSelectedFirm] = useState("");
  const queryClient = useQueryClient();

  const { data: firms } = useQuery({
    queryKey: ["doc-gen-firms"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name").eq("is_active", true).is("deleted_at", null).order("name");
      return data || [];
    },
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ["generated-documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_documents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["doc-gen-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, first_name, last_name, firm_id").is("deleted_at", null);
      return data || [];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["doc-gen-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("face_to_face_sessions")
        .select("id, session_date, location, course_id, firm_id, trainer_id, start_time, end_time")
        .eq("status", "completed");
      return data || [];
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["doc-gen-attendance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("face_to_face_attendance")
        .select("session_id, user_id, status, check_in_time, check_out_time, trainer_verified");
      return data || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["doc-gen-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").is("deleted_at", null);
      return data || [];
    },
  });

  const generateDocument = useMutation({
    mutationFn: async () => {
      if (!selectedFirm) throw new Error("Firma seçiniz");

      const firm = firms?.find(f => f.id === selectedFirm);
      const firmName = firm?.name || "Firma";

      if (selectedType === "yuz_yuze_katilim_tutanagi") {
        const firmSessions = sessions?.filter(s => s.firm_id === selectedFirm) || [];
        if (firmSessions.length === 0) throw new Error("Bu firmaya ait tamamlanmış oturum bulunamadı");

        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
        doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
        doc.setFont("Roboto");
        doc.setFontSize(16);
        doc.setTextColor(26, 39, 68);
        doc.setFont("Roboto", "bold");
        doc.text(`${firmName} - Yüz Yüze Katılım Tutanağı`, 14, 18);
        doc.setFontSize(9);
        doc.setFont("Roboto", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}`, 14, 25);

        const rows = firmSessions.flatMap(session => {
          const course = courses?.find(c => c.id === session.course_id);
          const sessionAtt = attendance?.filter(a => a.session_id === session.id) || [];
          return sessionAtt.map(att => {
            const profile = profiles?.find(p => p.user_id === att.user_id);
            return [
              session.session_date,
              `${session.start_time?.slice(0, 5)}-${session.end_time?.slice(0, 5)}`,
              course?.title || "-",
              session.location,
              profile ? `${profile.first_name} ${profile.last_name}` : "-",
              att.status === "attended" ? "Katıldı" : att.status === "absent" ? "Katılmadı" : att.status === "late" ? "Geç" : "Kısmi",
              att.trainer_verified ? "Evet" : "Hayır",
            ];
          });
        });

        autoTable(doc, {
          startY: 30,
          head: [["Tarih", "Saat", "Eğitim", "Konum", "Katılımcı", "Durum", "Onay"]],
          body: rows,
          theme: "grid",
          headStyles: { fillColor: [26, 39, 68], textColor: [255, 255, 255], fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
        });

        const fileName = `${firmName.replace(/\s/g, "_")}_Katilim_Tutanagi.pdf`;
        doc.save(fileName);
      } else if (selectedType === "faaliyet_raporu") {
        const firmProfiles = profiles?.filter(p => p.firm_id === selectedFirm) || [];
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
        doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
        doc.setFont("Roboto");
        doc.setFontSize(16);
        doc.setTextColor(26, 39, 68);
        doc.setFont("Roboto", "bold");
        doc.text(`${firmName} - Eğitim Faaliyet Raporu`, 14, 18);
        doc.setFontSize(9);
        doc.setFont("Roboto", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 14, 25);
        doc.text(`Toplam Çalışan: ${firmProfiles.length}`, 14, 32);

        const firmSessionCount = sessions?.filter(s => s.firm_id === selectedFirm).length || 0;
        const firmAttCount = attendance?.filter(a => {
          const s = sessions?.find(s => s.id === a.session_id);
          return s?.firm_id === selectedFirm && a.status === "attended";
        }).length || 0;

        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`Tamamlanan Oturum Sayısı: ${firmSessionCount}`, 14, 42);
        doc.text(`Toplam Katılım: ${firmAttCount}`, 14, 50);
        doc.text(`İmza: ____________________`, 14, 70);
        doc.text(`Tarih: ____________________`, 14, 80);

        doc.save(`${firmName.replace(/\s/g, "_")}_Faaliyet_Raporu.pdf`);
      }

      // Save record
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("generated_documents").insert({
        document_type: selectedType,
        firm_id: selectedFirm,
        user_id: user!.id,
        document_data: { generated_at: new Date().toISOString(), firm_name: firmName },
      });
    },
    onSuccess: () => {
      toast({ title: "Belge Oluşturuldu", description: "PDF başarıyla indirildi." });
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      setGenerateOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Belge Üretimi</h1>
            <p className="text-muted-foreground">Yasal belge ve tutanakları oluşturun</p>
          </div>
          <Button onClick={() => setGenerateOpen(true)}><Plus className="mr-2 h-4 w-4" />Yeni Belge Oluştur</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(DOC_LABELS).map(([key, label]) => (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedType(key as DocumentType); setGenerateOpen(true); }}>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">Oluştur →</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Son Oluşturulan Belgeler</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : documents && documents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Belge Türü</TableHead>
                    <TableHead className="hidden md:table-cell">Firma</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => {
                    const firm = firms?.find(f => f.id === doc.firm_id);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell><Badge variant="outline" className="text-xs">{DOC_LABELS[doc.document_type] || doc.document_type}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{firm?.name || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTR(doc.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Henüz belge oluşturulmadı</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Belge Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Belge Türü</label>
              <Select value={selectedType} onValueChange={v => setSelectedType(v as DocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Firma</label>
              <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                <SelectTrigger><SelectValue placeholder="Firma seçiniz" /></SelectTrigger>
                <SelectContent>
                  {firms?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>İptal</Button>
            <Button onClick={() => generateDocument.mutate()} disabled={generateDocument.isPending || !selectedFirm}>
              {generateDocument.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Oluştur ve İndir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
