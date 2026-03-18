import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Search, User, FileDown, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";

const COLORS = [
  "hsl(142, 71%, 45%)", "hsl(199, 89%, 48%)", "hsl(25, 95%, 53%)",
  "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(222, 47%, 40%)",
];

interface StudentProgressProps {
  profiles: any[];
  enrollments: any[];
  courses: any[];
  lessonProgress: any[];
  lessons: any[];
  examResults: any[];
}

interface StudentSummary {
  userId: string;
  name: string;
  firmId: string | null;
  totalCourses: number;
  completedCourses: number;
  avgProgress: number;
  avgExamScore: number | null;
  totalLessonsCompleted: number;
  totalTimeMinutes: number;
}

export function StudentProgressAnalytics({
  profiles, enrollments, courses, lessonProgress, lessons, examResults,
}: StudentProgressProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"progress" | "score" | "courses">("progress");

  const studentSummaries = useMemo(() => {
    if (!profiles || !enrollments) return [];

    return profiles.map((p): StudentSummary => {
      const userEnrollments = enrollments.filter(e => e.user_id === p.user_id);
      const completedCount = userEnrollments.filter(e => e.status === "completed").length;
      const avgProgress = userEnrollments.length > 0
        ? Math.round(userEnrollments.reduce((s, e) => s + (e.progress_percent || 0), 0) / userEnrollments.length)
        : 0;

      // Exam scores
      const userExams = examResults?.filter(r => r.user_id === p.user_id) || [];
      const avgExamScore = userExams.length > 0
        ? Math.round(userExams.reduce((s, r) => s + r.score, 0) / userExams.length)
        : null;

      // Lesson progress
      const userEnrollmentIds = new Set(userEnrollments.map(e => e.id));
      const userLessonProgress = lessonProgress?.filter(lp => userEnrollmentIds.has(lp.enrollment_id)) || [];
      const completedLessons = userLessonProgress.filter(
        lp => lp.lesson_status === "completed" || lp.lesson_status === "passed"
      ).length;
      const totalTime = userLessonProgress.reduce((s, lp) => s + (lp.total_time || 0), 0);

      return {
        userId: p.user_id,
        name: `${p.first_name} ${p.last_name}`,
        firmId: p.firm_id,
        totalCourses: userEnrollments.length,
        completedCourses: completedCount,
        avgProgress,
        avgExamScore,
        totalLessonsCompleted: completedLessons,
        totalTimeMinutes: Math.round(totalTime / 60),
      };
    }).filter(s => s.totalCourses > 0);
  }, [profiles, enrollments, lessonProgress, examResults]);

  const filteredStudents = useMemo(() => {
    let list = studentSummaries;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(term));
    }
    list.sort((a, b) => {
      if (sortBy === "progress") return b.avgProgress - a.avgProgress;
      if (sortBy === "score") return (b.avgExamScore || 0) - (a.avgExamScore || 0);
      return b.completedCourses - a.completedCourses;
    });
    return list;
  }, [studentSummaries, searchTerm, sortBy]);

  // Progress distribution
  const progressDistribution = useMemo(() => {
    const ranges = [
      { label: "0-25%", min: 0, max: 25 }, { label: "26-50%", min: 26, max: 50 },
      { label: "51-75%", min: 51, max: 75 }, { label: "76-100%", min: 76, max: 100 },
    ];
    return ranges.map((r, i) => ({
      range: r.label,
      count: studentSummaries.filter(s => s.avgProgress >= r.min && s.avgProgress <= r.max).length,
      color: COLORS[i],
    }));
  }, [studentSummaries]);

  // Status overview
  const statusOverview = useMemo(() => {
    const active = studentSummaries.filter(s => s.avgProgress > 0 && s.avgProgress < 100).length;
    const completed = studentSummaries.filter(s => s.completedCourses > 0).length;
    const notStarted = studentSummaries.filter(s => s.avgProgress === 0).length;
    return [
      { name: "Tamamlayan", value: completed, color: COLORS[0] },
      { name: "Devam Eden", value: active, color: COLORS[1] },
      { name: "Başlamamış", value: notStarted, color: COLORS[2] },
    ].filter(d => d.value > 0);
  }, [studentSummaries]);

  const chartConfig = {
    count: { label: "Öğrenci", color: "hsl(199, 89%, 48%)" },
    value: { label: "Sayı", color: "hsl(25, 95%, 53%)" },
  };

  if (studentSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Henüz öğrenci ilerleme verisi bulunmuyor</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Toplam Öğrenci", value: studentSummaries.length, color: "text-info", bg: "bg-info/10" },
          { label: "Ort. İlerleme", value: `%${Math.round(studentSummaries.reduce((s, st) => s + st.avgProgress, 0) / studentSummaries.length)}`, color: "text-accent", bg: "bg-accent/10" },
          { label: "Kurs Tamamlayan", value: studentSummaries.filter(s => s.completedCourses > 0).length, color: "text-success", bg: "bg-success/10" },
          { label: "Ort. Sınav Puanı", value: (() => { const withScores = studentSummaries.filter(s => s.avgExamScore !== null); return withScores.length > 0 ? Math.round(withScores.reduce((s, st) => s + (st.avgExamScore || 0), 0) / withScores.length) : "-"; })(), color: "text-warning", bg: "bg-warning/10" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <User className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Progress distribution chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">İlerleme Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={progressDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" name="Öğrenci" radius={[6, 6, 0, 0]}>
                  {progressDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Öğrenci Durumları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusOverview} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={2}>
                    {statusOverview.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="hsl(var(--card))" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {statusOverview.map(item => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-accent" />
              Öğrenci İlerleme Tablosu
              <Badge variant="secondary">{filteredStudents.length} öğrenci</Badge>
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">İlerleme</SelectItem>
                  <SelectItem value="score">Sınav Puanı</SelectItem>
                  <SelectItem value="courses">Kurs Sayısı</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Öğrenci</TableHead>
                <TableHead className="text-center">Kurs</TableHead>
                <TableHead className="text-center hidden md:table-cell">Tamamlanan</TableHead>
                <TableHead className="w-[120px]">İlerleme</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Sınav Ort.</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Ders</TableHead>
                <TableHead className="text-center hidden xl:table-cell">Süre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.slice(0, 30).map(s => (
                <TableRow key={s.userId}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-center">{s.totalCourses}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <Badge variant={s.completedCourses > 0 ? "success" : "secondary"} className="text-xs">
                      {s.completedCourses}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={s.avgProgress} className="w-16 h-1.5" />
                      <span className="text-xs text-muted-foreground">%{s.avgProgress}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell">
                    {s.avgExamScore !== null ? (
                      <span className={`text-xs font-bold ${s.avgExamScore >= 70 ? "text-success" : "text-destructive"}`}>{s.avgExamScore}</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell text-xs">{s.totalLessonsCompleted}</TableCell>
                  <TableCell className="text-center hidden xl:table-cell text-xs text-muted-foreground">
                    {s.totalTimeMinutes > 0 ? (s.totalTimeMinutes >= 60 ? `${Math.floor(s.totalTimeMinutes / 60)}sa ${s.totalTimeMinutes % 60}dk` : `${s.totalTimeMinutes}dk`) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredStudents.length > 30 && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              İlk 30 öğrenci gösteriliyor ({filteredStudents.length} toplam)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
