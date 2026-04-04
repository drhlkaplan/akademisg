import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Download, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { exportToPDF, exportToExcel, formatDateTR } from "@/lib/reportExport";
import { useMemo } from "react";

export default function F2FAttendanceReport() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["f2f-report-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("face_to_face_sessions")
        .select("id, session_date, start_time, end_time, location, status, course_id, firm_id, lesson_id, trainer_id, capacity")
        .order("session_date", { ascending: false });
      return data || [];
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["f2f-report-attendance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("face_to_face_attendance")
        .select("id, session_id, user_id, status, check_in_time, check_out_time, trainer_verified, duration_minutes");
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["f2f-report-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, first_name, last_name").is("deleted_at", null);
      return data || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["f2f-report-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").eq("is_active", true).is("deleted_at", null);
      return data || [];
    },
  });

  const { data: firms } = useQuery({
    queryKey: ["f2f-report-firms"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name").eq("is_active", true).is("deleted_at", null);
      return data || [];
    },
  });

  const reportRows = useMemo(() => {
    if (!sessions || !attendance) return [];
    return sessions.map(session => {
      const sessionAttendance = attendance.filter(a => a.session_id === session.id);
      const course = courses?.find(c => c.id === session.course_id);
      const firm = firms?.find(f => f.id === session.firm_id);
      const trainer = profiles?.find(p => p.user_id === session.trainer_id);
      const attended = sessionAttendance.filter(a => a.status === "attended").length;
      const absent = sessionAttendance.filter(a => a.status === "absent").length;
      const total = sessionAttendance.length;
      const verified = sessionAttendance.filter(a => a.trainer_verified).length;

      return {
        sessionDate: session.session_date,
        time: `${session.start_time?.slice(0, 5)}-${session.end_time?.slice(0, 5)}`,
        location: session.location,
        courseName: course?.title || "-",
        firmName: firm?.name || "-",
        trainerName: trainer ? `${trainer.first_name} ${trainer.last_name}` : "-",
        status: session.status || "scheduled",
        capacity: session.capacity || 0,
        total,
        attended,
        absent,
        attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
        verified,
      };
    });
  }, [sessions, attendance, courses, firms, profiles]);

  const summary = useMemo(() => ({
    totalSessions: reportRows.length,
    completedSessions: reportRows.filter(r => r.status === "completed").length,
    totalAttendees: reportRows.reduce((s, r) => s + r.attended, 0),
    avgRate: reportRows.length > 0 ? Math.round(reportRows.reduce((s, r) => s + r.attendanceRate, 0) / reportRows.length) : 0,
  }), [reportRows]);

  const handleExportPDF = () => {
    exportToPDF({
      title: "Yüz Yüze Katılım Raporu",
      headers: ["Tarih", "Saat", "Eğitim", "Firma", "Eğitmen", "Konum", "Katılım", "Oran", "Onaylı"],
      rows: reportRows.map(r => [
        r.sessionDate, r.time, r.courseName, r.firmName, r.trainerName,
        r.location, `${r.attended}/${r.total}`, `%${r.attendanceRate}`, r.verified,
      ]),
      fileName: "Yuz_Yuze_Katilim_Raporu",
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Yüz Yüze Katılım",
      headers: ["Tarih", "Saat", "Eğitim", "Firma", "Eğitmen", "Konum", "Katılan", "Toplam", "Oran %", "Onaylı"],
      rows: reportRows.map(r => [
        r.sessionDate, r.time, r.courseName, r.firmName, r.trainerName,
        r.location, r.attended, r.total, r.attendanceRate, r.verified,
      ]),
      fileName: "Yuz_Yuze_Katilim",
    });
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "completed": return <Badge variant="success" className="text-xs">Tamamlandı</Badge>;
      case "in_progress": return <Badge variant="warning" className="text-xs">Devam Ediyor</Badge>;
      case "cancelled": return <Badge variant="destructive" className="text-xs">İptal</Badge>;
      default: return <Badge variant="default" className="text-xs">Planlandı</Badge>;
    }
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Yüz Yüze Katılım Raporu</h1>
            <p className="text-muted-foreground">Oturum bazlı katılım ve yoklama istatistikleri</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" />PDF</Button>
            <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" />Excel</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{summary.totalSessions}</p><p className="text-xs text-muted-foreground">Toplam Oturum</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-success">{summary.completedSessions}</p><p className="text-xs text-muted-foreground">Tamamlanan</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{summary.totalAttendees}</p><p className="text-xs text-muted-foreground">Toplam Katılım</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{summary.avgRate > 0 ? `%${summary.avgRate}` : "-"}</p><p className="text-xs text-muted-foreground">Ort. Katılım Oranı</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Oturum Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="hidden md:table-cell">Saat</TableHead>
                    <TableHead>Eğitim</TableHead>
                    <TableHead className="hidden md:table-cell">Firma</TableHead>
                    <TableHead className="hidden lg:table-cell">Eğitmen</TableHead>
                    <TableHead>Katılım</TableHead>
                    <TableHead>Oran</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-xs">{row.sessionDate}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{row.time}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{row.courseName}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{row.firmName}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{row.trainerName}</TableCell>
                      <TableCell>
                        <span className="font-medium">{row.attended}</span>
                        <span className="text-muted-foreground">/{row.total}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${row.attendanceRate >= 80 ? "text-success" : row.attendanceRate >= 50 ? "text-warning" : "text-destructive"}`}>
                          %{row.attendanceRate}
                        </span>
                      </TableCell>
                      <TableCell>{statusLabel(row.status)}</TableCell>
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
