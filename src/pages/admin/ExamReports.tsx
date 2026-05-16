import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";

interface ExamResult {
  id: string;
  score: number;
  status: string | null;
  correct_answers: number;
  total_questions: number;
  completed_at: string | null;
  started_at: string | null;
  attempt_number: number | null;
  user_id: string;
  exam_id: string;
  enrollment_id: string;
}

interface ExamInfo {
  id: string;
  title: string;
  passing_score: number | null;
  course_id: string;
  courses: { title: string } | null;
}

const CHART_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(0, 84%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(222, 47%, 20%)",
];

export default function ExamReports() {
  const [selectedExam, setSelectedExam] = useState<string>("all");

  // Fetch all exams
  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["admin-report-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("id, title, passing_score, course_id, courses(title)")
        .order("title");
      if (error) throw error;
      return data as ExamInfo[];
    },
  });

  // Fetch all exam results
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["admin-exam-results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("id, score, status, correct_answers, total_questions, completed_at, started_at, attempt_number, user_id, exam_id, enrollment_id")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data as ExamResult[];
    },
  });

  // Fetch profiles for user names
  const { data: profiles } = useQuery({
    queryKey: ["admin-report-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name");
      if (error) throw error;
      return new Map(data.map((p) => [p.user_id, `${p.first_name} ${p.last_name}`]));
    },
  });

  const isLoading = examsLoading || resultsLoading;

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (selectedExam === "all") return results;
    return results.filter((r) => r.exam_id === selectedExam);
  }, [results, selectedExam]);

  // Compute stats
  const stats = useMemo(() => {
    if (!filteredResults.length) {
      return {
        totalAttempts: 0,
        uniqueStudents: 0,
        avgScore: 0,
        passRate: 0,
        passCount: 0,
        failCount: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    const scores = filteredResults.map((r) => Number(r.score));
    const passed = filteredResults.filter((r) => r.status === "passed").length;
    const failed = filteredResults.filter((r) => r.status === "failed").length;
    const uniqueStudents = new Set(filteredResults.map((r) => r.user_id)).size;

    return {
      totalAttempts: filteredResults.length,
      uniqueStudents,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      passRate: Math.round((passed / filteredResults.length) * 100),
      passCount: passed,
      failCount: failed,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
    };
  }, [filteredResults]);

  // Score distribution for bar chart
  const scoreDistribution = useMemo(() => {
    const ranges = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];
    filteredResults.forEach((r) => {
      const score = Number(r.score);
      const bucket = ranges.find((b) => score >= b.min && score <= b.max);
      if (bucket) bucket.count++;
    });
    return ranges;
  }, [filteredResults]);

  // Pass/Fail pie data
  const pieData = useMemo(() => [
    { name: "Başarılı", value: stats.passCount, color: CHART_COLORS[0] },
    { name: "Başarısız", value: stats.failCount, color: CHART_COLORS[1] },
  ], [stats]);

  // Per-exam stats
  const examStats = useMemo(() => {
    if (!results || !exams) return [];
    return exams.map((exam) => {
      const examResults = results.filter((r) => r.exam_id === exam.id);
      if (!examResults.length) return { ...exam, attempts: 0, avgScore: 0, passRate: 0 };
      const scores = examResults.map((r) => Number(r.score));
      const passed = examResults.filter((r) => r.status === "passed").length;
      return {
        ...exam,
        attempts: examResults.length,
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        passRate: Math.round((passed / examResults.length) * 100),
      };
    }).filter((e) => e.attempts > 0).sort((a, b) => b.attempts - a.attempts);
  }, [results, exams]);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const chartConfig = {
    count: { label: "Öğrenci Sayısı", color: "hsl(25, 95%, 53%)" },
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sınav Raporları</h1>
            <p className="text-muted-foreground">Başarı oranları, ortalama puanlar ve detaylı istatistikler</p>
          </div>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Sınav Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Sınavlar</SelectItem>
              {exams?.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Deneme</p>
                      <p className="text-2xl font-bold text-foreground">{stats.totalAttempts}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stats.uniqueStudents} öğrenci</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-info" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ortalama Puan</p>
                      <p className="text-2xl font-bold text-foreground">{stats.avgScore}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {stats.avgScore >= 70 ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {stats.highestScore > 0 ? `En yüksek: ${stats.highestScore}` : "Veri yok"}
                        </span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Başarı Oranı</p>
                      <p className="text-2xl font-bold text-foreground">%{stats.passRate}</p>
                      <Progress value={stats.passRate} className="mt-2 h-1.5" />
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Başarılı / Başarısız</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-success font-bold">
                          <CheckCircle2 className="h-4 w-4" /> {stats.passCount}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="flex items-center gap-1 text-destructive font-bold">
                          <XCircle className="h-4 w-4" /> {stats.failCount}
                        </span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Score Distribution */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Puan Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredResults.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[280px] w-full">
                      <BarChart data={scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="range" className="text-xs" />
                        <YAxis allowDecimals={false} className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      Henüz sınav sonucu bulunmuyor
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pass/Fail Pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Başarı Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.totalAttempts > 0 ? (
                    <div className="h-[280px] flex flex-col items-center justify-center">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            dataKey="value"
                            strokeWidth={2}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} stroke="hsl(var(--card))" />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 mt-2">
                        {pieData.map((item) => (
                          <div key={item.name} className="flex items-center gap-2 text-sm">
                            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      Veri yok
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Per-Exam Stats Table */}
            {selectedExam === "all" && examStats.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Sınav Bazlı İstatistikler</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sınav</TableHead>
                        <TableHead className="hidden md:table-cell">Eğitim</TableHead>
                        <TableHead className="text-center">Deneme</TableHead>
                        <TableHead className="text-center">Ort. Puan</TableHead>
                        <TableHead className="text-center">Başarı Oranı</TableHead>
                        <TableHead className="text-center">Baraj</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examStats.map((exam) => (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.title}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {exam.courses?.title || "-"}
                          </TableCell>
                          <TableCell className="text-center">{exam.attempts}</TableCell>
                          <TableCell className="text-center">
                            <span className={exam.avgScore >= (exam.passing_score || 70) ? "text-success font-semibold" : "text-destructive font-semibold"}>
                              {exam.avgScore}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={exam.passRate} className="w-16 h-1.5" />
                              <span className="text-sm">%{exam.passRate}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {exam.passing_score || 70}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Recent Results Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Son Sınav Sonuçları</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredResults.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Öğrenci</TableHead>
                        <TableHead className="hidden md:table-cell">Sınav</TableHead>
                        <TableHead className="text-center">Puan</TableHead>
                        <TableHead className="text-center">Doğru/Toplam</TableHead>
                        <TableHead className="text-center">Durum</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Tarih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.slice(0, 20).map((result) => {
                        const exam = exams?.find((e) => e.id === result.exam_id);
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">
                              {profiles?.get(result.user_id) || "Bilinmiyor"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {exam?.title || "-"}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {Number(result.score)}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {result.correct_answers}/{result.total_questions}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.status === "passed" ? (
                                <Badge variant="success">Başarılı</Badge>
                              ) : result.status === "failed" ? (
                                <Badge variant="destructive">Başarısız</Badge>
                              ) : (
                                <Badge variant="secondary">{result.status || "-"}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right text-muted-foreground text-sm">
                              {formatDate(result.completed_at)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz sınav sonucu bulunmuyor
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
