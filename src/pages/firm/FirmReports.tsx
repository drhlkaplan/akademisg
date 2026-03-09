import { useQuery } from "@tanstack/react-query";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, FileText, Loader2, Users } from "lucide-react";
import { exportToPDF, exportToExcel, formatDateTR, formatDuration } from "@/lib/reportExport";
import jsPDF from "jspdf";

export default function FirmReports() {
  const { branding } = useFirmBranding();
  const { profile } = useAuth();
  const firmId = profile?.firm_id;

  const { data: employees } = useQuery({
    queryKey: ["firm-report-employees", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("firm_id", firmId)
        .order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["firm-report-enrollments", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title, duration_minutes)")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  const { data: examResults } = useQuery({
    queryKey: ["firm-report-exams", firmId],
    queryFn: async () => {
      if (!firmId || !employees) return [];
      const userIds = employees.map((e) => e.user_id);
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("exam_results")
        .select("*, exams(title)")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId && !!employees && employees.length > 0,
  });

  // Build report rows
  const reportRows = employees?.map((emp) => {
    const empEnrollments = enrollments?.filter((e) => e.user_id === emp.user_id) || [];
    const empExams = examResults?.filter((e) => e.user_id === emp.user_id) || [];
    const completed = empEnrollments.filter((e) => e.status === "completed").length;
    const total = empEnrollments.length;
    const avgScore = empExams.length > 0
      ? Math.round(empExams.reduce((sum, e) => sum + Number(e.score), 0) / empExams.length)
      : null;

    return {
      name: `${emp.first_name} ${emp.last_name}`,
      tc: emp.tc_identity ? `${emp.tc_identity.slice(0, 3)}***${emp.tc_identity.slice(-2)}` : "-",
      totalCourses: total,
      completedCourses: completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgScore,
      examCount: empExams.length,
      lastActivity: empEnrollments.length > 0
        ? empEnrollments.sort((a, b) => new Date(b.updated_at || "").getTime() - new Date(a.updated_at || "").getTime())[0]?.updated_at
        : null,
    };
  }) || [];

  const handleExportPDF = () => {
    const firmName = branding?.name || "Firma";
    const headers = ["Ad Soyad", "TC Kimlik", "Toplam Eğitim", "Tamamlanan", "Oran", "Ort. Sınav", "Son Aktivite"];
    const rows = reportRows.map((r) => [
      r.name, r.tc, r.totalCourses, r.completedCourses,
      `%${r.pct}`, r.avgScore !== null ? `${r.avgScore}` : "-",
      r.lastActivity ? formatDateTR(r.lastActivity) : "-",
    ]);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Add firm logo if available
    if (branding?.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = branding.logo_url;
        // We'll add logo asynchronously but for now use text header
      } catch (_) {}
    }

    doc.setFontSize(16);
    doc.setTextColor(26, 39, 68);
    doc.text(`${firmName} - Eğitim Raporu`, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Oluşturulma: ${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}`, 14, 25);

    doc.autoTable({
      startY: 30,
      head: [headers],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [26, 39, 68], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${firmName} - Sayfa ${i}/${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: "center" });
    }

    doc.save(`${firmName.replace(/\s/g, "_")}_Egitim_Raporu.pdf`);
  };

  const handleExportExcel = () => {
    const firmName = branding?.name || "Firma";
    exportToExcel({
      title: `${firmName} Rapor`,
      headers: ["Ad Soyad", "TC Kimlik", "Toplam Eğitim", "Tamamlanan", "Oran (%)", "Ort. Sınav", "Son Aktivite"],
      rows: reportRows.map((r) => [
        r.name, r.tc, r.totalCourses, r.completedCourses,
        r.pct, r.avgScore ?? "-",
        r.lastActivity ? formatDateTR(r.lastActivity) : "-",
      ]),
      fileName: `${firmName.replace(/\s/g, "_")}_Rapor`,
    });
  };

  return (
    <DashboardLayout userRole="company">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Raporlar</h1>
            <p className="text-muted-foreground">
              {branding?.name || "Firma"} eğitim raporları
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{employees?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Toplam Çalışan</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{enrollments?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Toplam Kayıt</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{enrollments?.filter(e => e.status === "completed").length || 0}</p>
              <p className="text-xs text-muted-foreground">Tamamlanan</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{examResults?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Sınav Sonucu</p>
            </CardContent>
          </Card>
        </div>

        {/* Detail Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: branding?.primary_color }} />
              Çalışan Bazlı Rapor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead className="hidden md:table-cell">TC Kimlik</TableHead>
                    <TableHead>Eğitim</TableHead>
                    <TableHead>Tamamlanan</TableHead>
                    <TableHead>Oran</TableHead>
                    <TableHead className="hidden md:table-cell">Ort. Sınav</TableHead>
                    <TableHead className="hidden lg:table-cell">Son Aktivite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{row.tc}</TableCell>
                      <TableCell>{row.totalCourses}</TableCell>
                      <TableCell>
                        <Badge variant={row.completedCourses > 0 ? "success" : "default"} className="text-xs">
                          {row.completedCourses}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${row.pct >= 80 ? "text-success" : row.pct >= 50 ? "text-warning" : "text-destructive"}`}>
                          %{row.pct}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {row.avgScore !== null ? (
                          <span className={`font-medium ${row.avgScore >= 70 ? "text-success" : "text-destructive"}`}>
                            {row.avgScore}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {row.lastActivity ? formatDateTR(row.lastActivity) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Rapor verisi bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
