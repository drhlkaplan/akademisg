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
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { ClipboardCheck, Target, TrendingUp, Award } from "lucide-react";
import { useMemo } from "react";

const COLORS = [
  "hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)", "hsl(25, 95%, 53%)", "hsl(222, 47%, 40%)",
];

interface ExamAnalyticsProps {
  examResults: any[];
  courses: any[];
  profiles: any[];
  enrollments: any[];
}

export function ExamAnalytics({ examResults, courses, profiles, enrollments }: ExamAnalyticsProps) {
  // Per-course exam stats
  const courseExamStats = useMemo(() => {
    if (!examResults || !courses || !enrollments) return [];
    return courses
      .filter(c => c.is_active)
      .map(course => {
        const courseEnrollmentIds = new Set(
          enrollments.filter(e => e.course_id === course.id).map(e => e.id)
        );
        const results = examResults.filter(r => courseEnrollmentIds.has(r.enrollment_id));
        if (results.length === 0) return null;

        const scores = results.map(r => r.score);
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const passed = results.filter(r => r.status === "passed" || r.status === "completed" && r.score >= 70).length;
        const failed = results.filter(r => r.status === "failed").length;

        return {
          name: course.title.length > 25 ? course.title.substring(0, 25) + "..." : course.title,
          fullName: course.title,
          avgScore,
          totalAttempts: results.length,
          passed,
          failed,
          passRate: results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
          uniqueStudents: new Set(results.map(r => r.user_id)).size,
        };
      })
      .filter(Boolean) as any[];
  }, [examResults, courses, enrollments]);

  // Overall stats
  const overallStats = useMemo(() => {
    if (!examResults) return { total: 0, avgScore: 0, passRate: 0, avgAttempts: 0 };
    const total = examResults.length;
    const avgScore = total > 0 ? Math.round(examResults.reduce((s, r) => s + r.score, 0) / total) : 0;
    const passed = examResults.filter(r => r.status === "passed" || (r.status === "completed" && r.score >= 70)).length;

    // Avg attempts per student
    const studentAttempts: Record<string, number> = {};
    examResults.forEach(r => { studentAttempts[r.user_id] = (studentAttempts[r.user_id] || 0) + 1; });
    const uniqueStudents = Object.keys(studentAttempts).length;
    const avgAttempts = uniqueStudents > 0 ? Math.round((total / uniqueStudents) * 10) / 10 : 0;

    return { total, avgScore, passRate: total > 0 ? Math.round((passed / total) * 100) : 0, avgAttempts };
  }, [examResults]);

  // Pass/Fail distribution
  const passFailData = useMemo(() => {
    if (!examResults) return [];
    const passed = examResults.filter(r => r.status === "passed" || (r.status === "completed" && r.score >= 70)).length;
    const failed = examResults.filter(r => r.status === "failed" || (r.status === "completed" && r.score < 70)).length;
    const inProgress = examResults.filter(r => r.status === "in_progress").length;
    return [
      { name: "Başarılı", value: passed, color: COLORS[0] },
      { name: "Başarısız", value: failed, color: COLORS[1] },
      ...(inProgress > 0 ? [{ name: "Devam Ediyor", value: inProgress, color: COLORS[2] }] : []),
    ].filter(d => d.value > 0);
  }, [examResults]);

  // Score distribution histogram
  const scoreDistribution = useMemo(() => {
    if (!examResults) return [];
    const ranges = [
      { label: "0-20", min: 0, max: 20 }, { label: "21-40", min: 21, max: 40 },
      { label: "41-60", min: 41, max: 60 }, { label: "61-80", min: 61, max: 80 },
      { label: "81-100", min: 81, max: 100 },
    ];
    return ranges.map(r => ({
      range: r.label,
      count: examResults.filter(e => e.score >= r.min && e.score <= r.max).length,
    }));
  }, [examResults]);

  // Top performers
  const topPerformers = useMemo(() => {
    if (!examResults || !profiles) return [];
    const userBest: Record<string, { score: number; attempts: number }> = {};
    examResults.forEach(r => {
      if (!userBest[r.user_id] || r.score > userBest[r.user_id].score) {
        userBest[r.user_id] = { score: r.score, attempts: (userBest[r.user_id]?.attempts || 0) + 1 };
      } else {
        userBest[r.user_id].attempts++;
      }
    });
    return Object.entries(userBest)
      .map(([userId, data]) => {
        const profile = profiles.find(p => p.user_id === userId);
        return {
          name: profile ? `${profile.first_name} ${profile.last_name}` : "Bilinmeyen",
          bestScore: data.score,
          attempts: data.attempts,
        };
      })
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 10);
  }, [examResults, profiles]);

  const chartConfig = {
    avgScore: { label: "Ort. Puan", color: "hsl(25, 95%, 53%)" },
    passRate: { label: "Başarı %", color: "hsl(142, 71%, 45%)" },
    count: { label: "Sayı", color: "hsl(199, 89%, 48%)" },
    value: { label: "Sayı", color: "hsl(25, 95%, 53%)" },
  };

  if (!examResults || examResults.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Henüz sınav sonucu bulunmuyor</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Toplam Sınav", value: overallStats.total, icon: ClipboardCheck, color: "text-accent", bg: "bg-accent/10" },
          { label: "Ort. Puan", value: overallStats.avgScore, icon: Target, color: "text-info", bg: "bg-info/10" },
          { label: "Başarı Oranı", value: `%${overallStats.passRate}`, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
          { label: "Ort. Deneme", value: overallStats.avgAttempts, icon: Award, color: "text-warning", bg: "bg-warning/10" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
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
        {/* Score Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-accent" />
              Puan Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(199, 89%, 48%)" radius={[6, 6, 0, 0]} name="Sayı" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pass/Fail Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Başarı Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {passFailData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={passFailData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={2}>
                      {passFailData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke="hsl(var(--card))" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2">
                  {passFailData.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">Veri yok</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-course exam stats */}
      {courseExamStats.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Kurs Bazlı Sınav Performansı</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={courseExamStats} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={140} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgScore" fill="hsl(25, 95%, 53%)" radius={[0, 4, 4, 0]} name="Ort. Puan" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Kurs Sınav Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Kurs</TableHead>
                    <TableHead className="text-xs text-center">Ort.</TableHead>
                    <TableHead className="text-xs text-center">Başarı</TableHead>
                    <TableHead className="text-xs text-center">Deneme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseExamStats.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs max-w-[150px] truncate" title={c.fullName}>{c.fullName}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs font-bold ${c.avgScore >= 70 ? "text-success" : "text-destructive"}`}>{c.avgScore}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Progress value={c.passRate} className="w-10 h-1.5" />
                          <span className="text-[10px]">%{c.passRate}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs">{c.totalAttempts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-warning" />
              En Başarılı Öğrenciler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sıra</TableHead>
                  <TableHead>Öğrenci</TableHead>
                  <TableHead className="text-center">En İyi Puan</TableHead>
                  <TableHead className="text-center">Deneme</TableHead>
                  <TableHead className="w-[150px]">Performans</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPerformers.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {i < 3 ? (
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                          i === 0 ? "bg-warning/20 text-warning" : i === 1 ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent"
                        }`}>{i + 1}</span>
                      ) : <span className="text-muted-foreground">{i + 1}</span>}
                    </TableCell>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${u.bestScore >= 70 ? "text-success" : "text-destructive"}`}>{u.bestScore}</span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{u.attempts}</TableCell>
                    <TableCell>
                      <Progress value={u.bestScore} className="h-2" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
