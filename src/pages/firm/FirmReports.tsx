import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, BarChart3, BookOpen, Download, FileText, Loader2, Users, ClipboardCheck } from "lucide-react";
import { exportToPDF, exportToExcel, formatDateTR } from "@/lib/reportExport";

type Row = (string | number)[];
interface Report { key: string; label: string; icon: any; headers: string[]; rows: Row[] }

const statusTR: Record<string, string> = {
  pending: "Bekliyor", active: "Devam Ediyor", completed: "Tamamlandı", failed: "Başarısız", expired: "Süresi Doldu",
  passed: "Geçti", in_progress: "Devam", not_started: "Başlamadı",
};

export default function FirmReports() {
  const { branding } = useFirmBranding();
  const { profile } = useAuth();
  const firmId = profile?.firm_id;
  const firmName = branding?.name || "Firma";

  const { data, isLoading } = useQuery({
    queryKey: ["firm-reports-all", firmId],
    enabled: !!firmId,
    queryFn: async () => {
      const { data: employees } = await supabase.from("profiles")
        .select("user_id, first_name, last_name, tc_identity").eq("firm_id", firmId!).is("deleted_at", null).order("first_name");
      const userIds = (employees || []).map((e) => e.user_id);
      if (!userIds.length) return { employees: [], enrollments: [], exams: [], certs: [] };
      const [enr, ex, ce] = await Promise.all([
        supabase.from("enrollments").select("user_id, course_id, status, progress_percent, started_at, completed_at, updated_at, courses(title, duration_minutes)")
          .in("user_id", userIds).is("deleted_at", null),
        supabase.from("exam_results").select("user_id, score, status, attempt_number, completed_at, exams(title, exam_type)").in("user_id", userIds),
        supabase.from("certificates").select("user_id, certificate_number, course_title, issue_date, expiry_date, is_valid").in("user_id", userIds).is("deleted_at", null),
      ]);
      return { employees: employees || [], enrollments: enr.data || [], exams: ex.data || [], certs: ce.data || [] };
    },
  });

  const emps = data?.employees || [];
  const nameOf = (uid: string) => { const e = emps.find((x) => x.user_id === uid); return e ? `${e.first_name} ${e.last_name}` : "-"; };
  const maskTc = (tc?: string | null) => (tc ? `${tc.slice(0, 3)}*****${tc.slice(-2)}` : "-");
  const enr = data?.enrollments || [];
  const exams = data?.exams || [];
  const certs = data?.certs || [];

  const completed = enr.filter((e) => e.status === "completed").length;
  const completionRate = enr.length ? Math.round((completed / enr.length) * 100) : 0;
  const passedExams = exams.filter((e) => e.status === "passed" || e.status === "completed").length;
  const avgScore = exams.length ? Math.round(exams.reduce((s, e) => s + Number(e.score), 0) / exams.length) : 0;

  const courseMap = new Map<string, { title: string; total: number; done: number; active: number; prog: number }>();
  enr.forEach((e: any) => {
    const c = courseMap.get(e.course_id) || { title: e.courses?.title || "-", total: 0, done: 0, active: 0, prog: 0 };
    c.total++; c.prog += e.progress_percent || 0;
    if (e.status === "completed") c.done++; if (e.status === "active") c.active++;
    courseMap.set(e.course_id, c);
  });

  const reports: Report[] = [
    {
      key: "employees", label: "Çalışan Bazlı", icon: Users,
      headers: ["Ad Soyad", "TC Kimlik", "Atanan Eğitim", "Tamamlanan", "Oran (%)", "Ort. Sınav", "Sertifika"],
      rows: emps.map((e) => {
        const my = enr.filter((x) => x.user_id === e.user_id);
        const myEx = exams.filter((x) => x.user_id === e.user_id);
        const d = my.filter((x) => x.status === "completed").length;
        return [`${e.first_name} ${e.last_name}`, maskTc(e.tc_identity), my.length, d,
          my.length ? Math.round((d / my.length) * 100) : 0,
          myEx.length ? Math.round(myEx.reduce((s, x) => s + Number(x.score), 0) / myEx.length) : "-",
          certs.filter((c) => c.user_id === e.user_id).length];
      }),
    },
    {
      key: "courses", label: "Eğitim Bazlı", icon: BookOpen,
      headers: ["Eğitim", "Atanan", "Devam Eden", "Tamamlanan", "Tamamlama (%)", "Ort. İlerleme (%)"],
      rows: [...courseMap.values()].map((c) => [c.title, c.total, c.active, c.done, Math.round((c.done / c.total) * 100), Math.round(c.prog / c.total)]),
    },
    {
      key: "progress", label: "Eğitim Durumu", icon: ClipboardCheck,
      headers: ["Çalışan", "Eğitim", "Durum", "İlerleme (%)", "Başlangıç", "Tamamlanma"],
      rows: enr.map((e: any) => [nameOf(e.user_id), e.courses?.title || "-", statusTR[e.status] || e.status || "-", e.progress_percent || 0,
        e.started_at ? formatDateTR(e.started_at) : "-", e.completed_at ? formatDateTR(e.completed_at) : "-"]),
    },
    {
      key: "exams", label: "Sınav Sonuçları", icon: BarChart3,
      headers: ["Çalışan", "Sınav", "Puan", "Durum", "Deneme", "Tarih"],
      rows: exams.map((e: any) => [nameOf(e.user_id), e.exams?.title || "-", Math.round(Number(e.score)), statusTR[e.status] || e.status || "-",
        e.attempt_number || 1, e.completed_at ? formatDateTR(e.completed_at) : "-"]),
    },
    {
      key: "certs", label: "Sertifikalar", icon: Award,
      headers: ["Çalışan", "Eğitim", "Sertifika No", "Düzenlenme", "Geçerlilik", "Durum"],
      rows: certs.map((c) => [nameOf(c.user_id), c.course_title, c.certificate_number,
        c.issue_date ? new Date(c.issue_date).toLocaleDateString("tr-TR") : "-",
        c.expiry_date ? new Date(c.expiry_date).toLocaleDateString("tr-TR") : "-", c.is_valid ? "Geçerli" : "Geçersiz"]),
    },
  ];

  const fileBase = (r: Report) => `${firmName.replace(/\s/g, "_")}_${r.key}_raporu`;
  const doPdf = (r: Report) => exportToPDF({ title: `${firmName} - ${r.label} Rapor`, headers: r.headers, rows: r.rows, fileName: fileBase(r) });
  const doXls = (r: Report) => exportToExcel({ title: r.label, headers: r.headers, rows: r.rows, fileName: fileBase(r) });

  const stats = [
    { label: "Çalışan", value: emps.length },
    { label: "Eğitim Ataması", value: enr.length },
    { label: "Tamamlanan", value: completed },
    { label: "Tamamlama Oranı", value: `%${completionRate}` },
    { label: "Sınav (Geçen/Toplam)", value: `${passedExams}/${exams.length}` },
    { label: "Ort. Sınav Puanı", value: avgScore },
    { label: "Sertifika", value: certs.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Raporlar ve Analizler</h1>
        <p className="text-muted-foreground">{firmName} eğitim raporları — PDF ve Excel olarak indirilebilir</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="stat-card"><CardContent className="p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {courseMap.size > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Eğitim Tamamlama Analizi</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[...courseMap.values()].map((c) => (
              <div key={c.title}>
                <div className="flex justify-between text-sm mb-1"><span>{c.title}</span><span className="text-muted-foreground">{c.done}/{c.total}</span></div>
                <Progress value={(c.done / c.total) * 100} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="employees">
          <TabsList className="flex-wrap h-auto">
            {reports.map((r) => (
              <TabsTrigger key={r.key} value={r.key}><r.icon className="h-4 w-4 mr-1" />{r.label}</TabsTrigger>
            ))}
          </TabsList>
          {reports.map((r) => (
            <TabsContent key={r.key} value={r.key}>
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">{r.label} Rapor ({r.rows.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => doPdf(r)} disabled={!r.rows.length}><FileText className="mr-2 h-4 w-4" />PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => doXls(r)} disabled={!r.rows.length}><Download className="mr-2 h-4 w-4" />Excel</Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {r.rows.length ? (
                    <Table>
                      <TableHeader><TableRow>{r.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {r.rows.map((row, i) => (
                          <TableRow key={i}>{row.map((c, j) => <TableCell key={j} className={j === 0 ? "font-medium" : ""}>{c}</TableCell>)}</TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <p className="text-center py-8 text-muted-foreground">Veri bulunamadı</p>}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
