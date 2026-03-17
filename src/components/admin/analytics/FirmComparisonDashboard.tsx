import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Legend,
} from "recharts";
import { Building2, TrendingUp, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import { useMemo } from "react";

const COLORS = [
  "hsl(25, 95%, 53%)", "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(222, 47%, 40%)",
];

interface FirmComparisonProps {
  firms: any[];
  profiles: any[];
  enrollments: any[];
  examResults: any[];
  certificates: any[];
  lessonProgress: any[];
}

interface FirmMetrics {
  id: string;
  name: string;
  sector: string;
  employeeCount: number;
  enrollmentCount: number;
  completedCount: number;
  completionRate: number;
  avgProgress: number;
  avgExamScore: number | null;
  certificateCount: number;
  totalTrainingHours: number;
  engagementScore: number;
}

export function FirmComparisonDashboard({
  firms, profiles, enrollments, examResults, certificates, lessonProgress,
}: FirmComparisonProps) {
  const firmMetrics = useMemo((): FirmMetrics[] => {
    if (!firms || !profiles || !enrollments) return [];

    return firms
      .filter(f => f.is_active)
      .map(firm => {
        const employees = profiles.filter(p => p.firm_id === firm.id);
        const employeeIds = new Set(employees.map(e => e.user_id));
        const firmEnrollments = enrollments.filter(e => e.firm_id === firm.id || employeeIds.has(e.user_id));
        const completed = firmEnrollments.filter(e => e.status === "completed").length;
        const avgProgress = firmEnrollments.length > 0
          ? Math.round(firmEnrollments.reduce((s, e) => s + (e.progress_percent || 0), 0) / firmEnrollments.length)
          : 0;

        // Exam scores
        const firmExams = examResults?.filter(r => employeeIds.has(r.user_id)) || [];
        const avgExamScore = firmExams.length > 0
          ? Math.round(firmExams.reduce((s, r) => s + r.score, 0) / firmExams.length)
          : null;

        // Certificates
        const firmCerts = certificates?.filter(c => employeeIds.has(c.user_id)).length || 0;

        // Training hours from lesson progress
        const enrollmentIds = new Set(firmEnrollments.map(e => e.id));
        const firmLessonProgress = lessonProgress?.filter(lp => enrollmentIds.has(lp.enrollment_id)) || [];
        const totalSeconds = firmLessonProgress.reduce((s, lp) => s + (lp.total_time || 0), 0);
        const totalHours = Math.round(totalSeconds / 3600 * 10) / 10;

        // Engagement score (0-100 composite)
        const completionRate = firmEnrollments.length > 0 ? (completed / firmEnrollments.length) * 100 : 0;
        const participationRate = employees.length > 0 ? Math.min(100, (firmEnrollments.length / employees.length) * 50) : 0;
        const engagementScore = Math.round((completionRate * 0.4 + participationRate * 0.3 + (avgExamScore || 0) * 0.3));

        return {
          id: firm.id,
          name: firm.name,
          sector: firm.sector || "-",
          employeeCount: employees.length,
          enrollmentCount: firmEnrollments.length,
          completedCount: completed,
          completionRate: Math.round(completionRate),
          avgProgress,
          avgExamScore,
          certificateCount: firmCerts,
          totalTrainingHours: totalHours,
          engagementScore,
        };
      })
      .filter(f => f.employeeCount > 0)
      .sort((a, b) => b.engagementScore - a.engagementScore);
  }, [firms, profiles, enrollments, examResults, certificates, lessonProgress]);

  // Radar data for top firms
  const radarData = useMemo(() => {
    const topFirms = firmMetrics.slice(0, 5);
    if (topFirms.length === 0) return [];

    const metrics = ["Tamamlama", "İlerleme", "Sınav", "Katılım", "Sertifika"];
    return metrics.map(metric => {
      const point: any = { metric };
      topFirms.forEach(firm => {
        const shortName = firm.name.length > 12 ? firm.name.substring(0, 12) + "…" : firm.name;
        if (metric === "Tamamlama") point[shortName] = firm.completionRate;
        else if (metric === "İlerleme") point[shortName] = firm.avgProgress;
        else if (metric === "Sınav") point[shortName] = firm.avgExamScore || 0;
        else if (metric === "Katılım") point[shortName] = Math.min(100, firm.enrollmentCount > 0 ? Math.round((firm.enrollmentCount / firm.employeeCount) * 100) : 0);
        else if (metric === "Sertifika") point[shortName] = Math.min(100, firm.certificateCount > 0 ? Math.round((firm.certificateCount / firm.employeeCount) * 100) : 0);
      });
      return point;
    });
  }, [firmMetrics]);

  // Bar chart data
  const barData = useMemo(() => {
    return firmMetrics.slice(0, 8).map(f => ({
      name: f.name.length > 15 ? f.name.substring(0, 15) + "…" : f.name,
      tamamlama: f.completionRate,
      ilerleme: f.avgProgress,
      sinav: f.avgExamScore || 0,
    }));
  }, [firmMetrics]);

  const handleExportPDF = () => {
    const headers = ["Firma", "Sektör", "Çalışan", "Kayıt", "Tamamlanan", "Tamamlama %", "İlerleme %", "Sınav Ort.", "Sertifika", "Eğitim Saati"];
    const rows = firmMetrics.map(f => [
      f.name, f.sector, f.employeeCount, f.enrollmentCount, f.completedCount,
      `%${f.completionRate}`, `%${f.avgProgress}`, f.avgExamScore !== null ? f.avgExamScore : "-",
      f.certificateCount, f.totalTrainingHours,
    ] as (string | number)[]);
    exportToPDF({ title: "Firma Karşılaştırma Raporu", headers, rows, fileName: "firma-karsilastirma" });
  };

  const handleExportExcel = () => {
    const headers = ["Firma", "Sektör", "Çalışan", "Kayıt", "Tamamlanan", "Tamamlama %", "İlerleme %", "Sınav Ort.", "Sertifika", "Eğitim Saati", "Katılım Skoru"];
    const rows = firmMetrics.map(f => [
      f.name, f.sector, f.employeeCount, f.enrollmentCount, f.completedCount,
      f.completionRate, f.avgProgress, f.avgExamScore !== null ? f.avgExamScore : 0,
      f.certificateCount, f.totalTrainingHours, f.engagementScore,
    ] as (string | number)[]);
    exportToExcel({ title: "Firma Karşılaştırma", headers, rows, fileName: "firma-karsilastirma" });
  };

  const chartConfig = {
    tamamlama: { label: "Tamamlama %", color: "hsl(142, 71%, 45%)" },
    ilerleme: { label: "İlerleme %", color: "hsl(199, 89%, 48%)" },
    sinav: { label: "Sınav Ort.", color: "hsl(25, 95%, 53%)" },
  };

  if (firmMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Firma verisi bulunmuyor</p>
        </CardContent>
      </Card>
    );
  }

  const topFirmNames = firmMetrics.slice(0, 5).map(f =>
    f.name.length > 12 ? f.name.substring(0, 12) + "…" : f.name
  );

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
          <Download className="h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1">
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Multi-metric bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Firma Performans Karşılaştırması
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" angle={-15} textAnchor="end" height={60} />
                <YAxis className="text-xs" domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="tamamlama" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Tamamlama %" />
                <Bar dataKey="ilerleme" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="İlerleme %" />
                <Bar dataKey="sinav" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} name="Sınav Ort." />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Radar chart */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-info" />
                Çok Boyutlu Karşılaştırma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="metric" className="text-xs" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
                  {topFirmNames.map((name, i) => (
                    <Radar key={name} name={name} dataKey={name}
                      stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]}
                      fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-success" />
            Detaylı Firma Metrikleri
            <Badge variant="secondary">{firmMetrics.length} firma</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firma</TableHead>
                <TableHead className="hidden md:table-cell">Sektör</TableHead>
                <TableHead className="text-center">Çalışan</TableHead>
                <TableHead className="text-center">Kayıt</TableHead>
                <TableHead className="text-center">Tamamlama</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Sınav Ort.</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Sertifika</TableHead>
                <TableHead className="text-center hidden xl:table-cell">Eğitim Saati</TableHead>
                <TableHead className="text-center">Katılım</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firmMetrics.map((f, i) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {i < 3 && (
                        <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                          i === 0 ? "bg-warning/20 text-warning" : i === 1 ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent"
                        }`}>{i + 1}</span>
                      )}
                      <span>{f.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{f.sector}</TableCell>
                  <TableCell className="text-center">{f.employeeCount}</TableCell>
                  <TableCell className="text-center">{f.enrollmentCount}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Progress value={f.completionRate} className="w-12 h-1.5" />
                      <span className="text-xs">%{f.completionRate}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell">
                    {f.avgExamScore !== null ? (
                      <span className={`text-xs font-bold ${f.avgExamScore >= 70 ? "text-success" : "text-destructive"}`}>{f.avgExamScore}</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell">
                    <Badge variant={f.certificateCount > 0 ? "success" : "secondary"} className="text-xs">{f.certificateCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center hidden xl:table-cell text-xs text-muted-foreground">{f.totalTrainingHours}sa</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={f.engagementScore >= 60 ? "success" : f.engagementScore >= 30 ? "warning" : "destructive"} className="text-xs">
                      {f.engagementScore}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
