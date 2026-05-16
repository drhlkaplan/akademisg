import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Download, FileText, Loader2, AlertTriangle } from "lucide-react";
import { exportToPDF, exportToExcel, formatDateTR } from "@/lib/reportExport";
import { useState, useMemo } from "react";

export default function RecurrenceReport() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: rules, isLoading } = useQuery({
    queryKey: ["recurrence-report"],
    queryFn: async () => {
      const { data } = await supabase
        .from("recurrence_rules")
        .select("*, courses(title)")
        .order("next_due_at", { ascending: true });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["recurrence-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, first_name, last_name, firm_id").is("deleted_at", null);
      return data || [];
    },
  });

  const { data: firms } = useQuery({
    queryKey: ["recurrence-firms"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name").eq("is_active", true).is("deleted_at", null);
      return data || [];
    },
  });

  const now = new Date();

  const reportRows = useMemo(() => {
    if (!rules || !profiles) return [];
    return rules
      .filter(r => statusFilter === "all" || (statusFilter === "overdue" && new Date(r.next_due_at) < now && r.status === "active") || (statusFilter === "upcoming" && new Date(r.next_due_at) >= now && r.status === "active") || (statusFilter === "completed" && r.status === "completed"))
      .map(rule => {
        const profile = profiles.find(p => p.user_id === rule.user_id);
        const firm = firms?.find(f => f.id === profile?.firm_id);
        const dueDate = new Date(rule.next_due_at);
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysLeft < 0 && rule.status === "active";
        const isUrgent = daysLeft >= 0 && daysLeft <= 30 && rule.status === "active";

        return {
          name: profile ? `${profile.first_name} ${profile.last_name}` : "Bilinmeyen",
          firmName: firm?.name || "-",
          courseTitle: (rule.courses as any)?.title || "-",
          hazardClass: rule.hazard_class,
          trainingType: rule.training_type,
          recurrenceMonths: rule.recurrence_months,
          nextDueAt: rule.next_due_at,
          daysLeft,
          isOverdue,
          isUrgent,
          status: rule.status || "active",
        };
      });
  }, [rules, profiles, firms, statusFilter, now]);

  const hazardLabel = (h: string) => h === "cok_tehlikeli" ? "Çok Tehlikeli" : h === "tehlikeli" ? "Tehlikeli" : "Az Tehlikeli";
  const trainingLabel = (t: string) => {
    const map: Record<string, string> = { temel: "Temel", tekrar: "Tekrar", ise_baslama: "İşe Başlama", bilgi_yenileme: "Bilgi Yenileme", ilave: "İlave", ozel_grup: "Özel Grup", destek_elemani: "Destek Elemanı" };
    return map[t] || t;
  };

  const summary = useMemo(() => ({
    total: reportRows.length,
    overdue: reportRows.filter(r => r.isOverdue).length,
    urgent: reportRows.filter(r => r.isUrgent).length,
    completed: reportRows.filter(r => r.status === "completed").length,
  }), [reportRows]);

  const handleExportPDF = () => {
    exportToPDF({
      title: "Tekrar Eğitim Vadesi Raporu",
      headers: ["Ad Soyad", "Firma", "Eğitim", "Tehlike Sınıfı", "Periyot", "Vade Tarihi", "Kalan Gün", "Durum"],
      rows: reportRows.map(r => [
        r.name, r.firmName, r.courseTitle, hazardLabel(r.hazardClass),
        `${r.recurrenceMonths} ay`, formatDateTR(r.nextDueAt), r.daysLeft,
        r.isOverdue ? "Vadesi Geçmiş" : r.isUrgent ? "Acil" : r.status === "completed" ? "Tamamlandı" : "Aktif",
      ]),
      fileName: "Tekrar_Egitim_Vadesi_Raporu",
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Tekrar Eğitim Vadesi",
      headers: ["Ad Soyad", "Firma", "Eğitim", "Tehlike Sınıfı", "Periyot (Ay)", "Vade Tarihi", "Kalan Gün", "Durum"],
      rows: reportRows.map(r => [
        r.name, r.firmName, r.courseTitle, hazardLabel(r.hazardClass),
        r.recurrenceMonths, formatDateTR(r.nextDueAt), r.daysLeft,
        r.isOverdue ? "Vadesi Geçmiş" : r.isUrgent ? "Acil" : r.status === "completed" ? "Tamamlandı" : "Aktif",
      ]),
      fileName: "Tekrar_Egitim_Vadesi",
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tekrar Eğitim Vadesi Raporu</h1>
            <p className="text-muted-foreground">Yaklaşan ve geçmiş tekrar eğitim vadeleri</p>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="overdue">Vadesi Geçmiş</SelectItem>
                <SelectItem value="upcoming">Yaklaşan</SelectItem>
                <SelectItem value="completed">Tamamlanan</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" />PDF</Button>
            <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" />Excel</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{summary.total}</p><p className="text-xs text-muted-foreground">Toplam Kural</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-destructive">{summary.overdue}</p><p className="text-xs text-muted-foreground">Vadesi Geçmiş</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-warning">{summary.urgent}</p><p className="text-xs text-muted-foreground">30 Gün İçinde</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-success">{summary.completed}</p><p className="text-xs text-muted-foreground">Tamamlanan</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" />Vade Takip Tablosu</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead className="hidden md:table-cell">Firma</TableHead>
                    <TableHead>Eğitim</TableHead>
                    <TableHead className="hidden md:table-cell">Tehlike Sınıfı</TableHead>
                    <TableHead className="hidden lg:table-cell">Periyot</TableHead>
                    <TableHead>Vade</TableHead>
                    <TableHead>Kalan</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.map((row, i) => (
                    <TableRow key={i} className={row.isOverdue ? "bg-destructive/5" : row.isUrgent ? "bg-warning/5" : ""}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{row.firmName}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.courseTitle}</TableCell>
                      <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs">{hazardLabel(row.hazardClass)}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell">{row.recurrenceMonths} ay</TableCell>
                      <TableCell className="text-xs">{formatDateTR(row.nextDueAt)}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${row.isOverdue ? "text-destructive" : row.isUrgent ? "text-warning" : "text-success"}`}>
                          {row.daysLeft} gün
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.isOverdue ? <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Geçmiş</Badge>
                          : row.isUrgent ? <Badge variant="warning" className="text-xs">Acil</Badge>
                          : row.status === "completed" ? <Badge variant="success" className="text-xs">Tamamlandı</Badge>
                          : <Badge variant="default" className="text-xs">Aktif</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
