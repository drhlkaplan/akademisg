import { useQuery } from "@tanstack/react-query";
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
import { Shield, Download, FileText, Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { exportToPDF, exportToExcel, formatDateTR } from "@/lib/reportExport";
import { useState, useMemo } from "react";

export default function ComplianceReport() {
  const [firmFilter, setFirmFilter] = useState("all");

  const { data: firms } = useQuery({
    queryKey: ["compliance-firms"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name, hazard_class_new, sector_id").eq("is_active", true).is("deleted_at", null).order("name");
      return data || [];
    },
  });

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["compliance-enrollments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, user_id, course_id, status, completed_at, firm_id, training_type, recurrence_due_at")
        .is("deleted_at", null);
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["compliance-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, first_name, last_name, firm_id").is("deleted_at", null);
      return data || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["compliance-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, training_type, hazard_class_new").eq("is_active", true).is("deleted_at", null);
      return data || [];
    },
  });

  const reportRows = useMemo(() => {
    if (!firms || !enrollments || !profiles) return [];
    const now = new Date();

    return firms
      .filter(f => firmFilter === "all" || f.id === firmFilter)
      .map(firm => {
        const firmProfiles = profiles.filter(p => p.firm_id === firm.id);
        const firmEnrollments = enrollments.filter(e => e.firm_id === firm.id);
        const totalEmployees = firmProfiles.length;
        const employeesWithTraining = new Set(firmEnrollments.map(e => e.user_id)).size;
        const completed = firmEnrollments.filter(e => e.status === "completed").length;
        const overdue = firmEnrollments.filter(e => e.recurrence_due_at && new Date(e.recurrence_due_at) < now).length;
        const pending = firmEnrollments.filter(e => e.status === "pending" || e.status === "active").length;
        const coverageRate = totalEmployees > 0 ? Math.round((employeesWithTraining / totalEmployees) * 100) : 0;
        const completionRate = firmEnrollments.length > 0 ? Math.round((completed / firmEnrollments.length) * 100) : 0;

        let status: "compliant" | "warning" | "non_compliant" = "compliant";
        if (coverageRate < 50 || overdue > 0) status = "non_compliant";
        else if (coverageRate < 100 || pending > 0) status = "warning";

        return {
          firmName: firm.name,
          hazardClass: firm.hazard_class_new || "az_tehlikeli",
          totalEmployees,
          employeesWithTraining,
          coverageRate,
          completed,
          pending,
          overdue,
          completionRate,
          status,
        };
      });
  }, [firms, enrollments, profiles, firmFilter]);

  const statusBadge = (s: string) => {
    switch (s) {
      case "compliant": return <Badge variant="success" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Uyumlu</Badge>;
      case "warning": return <Badge variant="warning" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Dikkat</Badge>;
      default: return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Uyumsuz</Badge>;
    }
  };

  const hazardLabel = (h: string) => {
    switch (h) {
      case "cok_tehlikeli": return "Çok Tehlikeli";
      case "tehlikeli": return "Tehlikeli";
      default: return "Az Tehlikeli";
    }
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: "Uyumluluk Durum Raporu",
      headers: ["Firma", "Tehlike Sınıfı", "Çalışan", "Eğitimli", "Kapsam %", "Tamamlanan", "Bekleyen", "Vadesi Geçmiş", "Durum"],
      rows: reportRows.map(r => [
        r.firmName, hazardLabel(r.hazardClass), r.totalEmployees, r.employeesWithTraining,
        `%${r.coverageRate}`, r.completed, r.pending, r.overdue,
        r.status === "compliant" ? "Uyumlu" : r.status === "warning" ? "Dikkat" : "Uyumsuz",
      ]),
      fileName: "Uyumluluk_Raporu",
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Uyumluluk Raporu",
      headers: ["Firma", "Tehlike Sınıfı", "Çalışan", "Eğitimli", "Kapsam %", "Tamamlanan", "Bekleyen", "Vadesi Geçmiş", "Durum"],
      rows: reportRows.map(r => [
        r.firmName, hazardLabel(r.hazardClass), r.totalEmployees, r.employeesWithTraining,
        r.coverageRate, r.completed, r.pending, r.overdue,
        r.status === "compliant" ? "Uyumlu" : r.status === "warning" ? "Dikkat" : "Uyumsuz",
      ]),
      fileName: "Uyumluluk_Raporu",
    });
  };

  const summary = useMemo(() => {
    const compliant = reportRows.filter(r => r.status === "compliant").length;
    const warning = reportRows.filter(r => r.status === "warning").length;
    const nonCompliant = reportRows.filter(r => r.status === "non_compliant").length;
    const totalOverdue = reportRows.reduce((s, r) => s + r.overdue, 0);
    return { compliant, warning, nonCompliant, totalOverdue };
  }, [reportRows]);

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Uyumluluk Durum Raporu</h1>
            <p className="text-muted-foreground">Firma bazlı yönetmelik uyumluluk durumları</p>
          </div>
          <div className="flex gap-2">
            <Select value={firmFilter} onValueChange={setFirmFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Firma Filtresi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Firmalar</SelectItem>
                {firms?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" />PDF</Button>
            <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" />Excel</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-success">{summary.compliant}</p><p className="text-xs text-muted-foreground">Uyumlu Firma</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-warning">{summary.warning}</p><p className="text-xs text-muted-foreground">Dikkat Gerektiren</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-destructive">{summary.nonCompliant}</p><p className="text-xs text-muted-foreground">Uyumsuz Firma</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{summary.totalOverdue}</p><p className="text-xs text-muted-foreground">Toplam Vadesi Geçmiş</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Firma Uyumluluk Tablosu</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>Tehlike Sınıfı</TableHead>
                    <TableHead className="hidden md:table-cell">Çalışan</TableHead>
                    <TableHead className="hidden md:table-cell">Eğitimli</TableHead>
                    <TableHead>Kapsam</TableHead>
                    <TableHead className="hidden lg:table-cell">Tamamlanan</TableHead>
                    <TableHead className="hidden lg:table-cell">Vadesi Geçmiş</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.firmName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{hazardLabel(row.hazardClass)}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">{row.totalEmployees}</TableCell>
                      <TableCell className="hidden md:table-cell">{row.employeesWithTraining}</TableCell>
                      <TableCell><span className={`font-semibold ${row.coverageRate >= 80 ? "text-success" : row.coverageRate >= 50 ? "text-warning" : "text-destructive"}`}>%{row.coverageRate}</span></TableCell>
                      <TableCell className="hidden lg:table-cell">{row.completed}</TableCell>
                      <TableCell className="hidden lg:table-cell">{row.overdue > 0 ? <span className="text-destructive font-semibold">{row.overdue}</span> : "0"}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
