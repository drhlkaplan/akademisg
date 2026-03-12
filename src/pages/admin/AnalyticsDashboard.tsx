import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  BarChart3, Users, BookOpen, Building2, Award, GraduationCap,
  TrendingUp, Clock, Target, Layers, KeyRound, Activity, Zap,
  MousePointerClick, Timer,
} from "lucide-react";
import { useMemo, useState } from "react";

const COLORS = [
  "hsl(25, 95%, 53%)", "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(222, 47%, 40%)",
];

export default function AnalyticsDashboard() {
  // Fetch all data in parallel
  const { data: courses } = useQuery({
    queryKey: ["analytics-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, is_active, duration_minutes, category_id");
      return data || [];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["analytics-enrollments"],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("id, user_id, course_id, firm_id, status, progress_percent, created_at, completed_at");
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["analytics-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, first_name, last_name, firm_id, created_at");
      return data || [];
    },
  });

  const { data: firms } = useQuery({
    queryKey: ["analytics-firms"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name, is_active, sector");
      return data || [];
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["analytics-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("id, name, firm_id, is_active");
      return data || [];
    },
  });

  const { data: userGroups } = useQuery({
    queryKey: ["analytics-user-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("users_to_groups").select("user_id, group_id");
      return data || [];
    },
  });

  const { data: certificates } = useQuery({
    queryKey: ["analytics-certificates"],
    queryFn: async () => {
      const { data } = await supabase.from("certificates").select("id, user_id, course_id, is_valid, issue_date, expiry_date");
      return data || [];
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["analytics-lessons"],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("id, course_id, title, type, is_active, duration_minutes");
      return data || [];
    },
  });

  const { data: lessonProgress } = useQuery({
    queryKey: ["analytics-lesson-progress"],
    queryFn: async () => {
      const { data } = await supabase.from("lesson_progress").select("id, enrollment_id, lesson_id, lesson_status, total_time, score_raw");
      return data || [];
    },
  });

  const { data: xapiStatements } = useQuery({
    queryKey: ["analytics-xapi"],
    queryFn: async () => {
      const { data } = await supabase
        .from("xapi_statements")
        .select("id, user_id, verb, object_type, object_id, result, context, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  });

  const isLoading = !courses || !enrollments || !profiles || !firms;

  // --- Computed Stats ---
  const overviewStats = useMemo(() => {
    if (!courses || !enrollments || !profiles || !firms || !certificates) return null;
    const activeEnrollments = enrollments.filter(e => e.status === "active").length;
    const completedEnrollments = enrollments.filter(e => e.status === "completed").length;
    const avgProgress = enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / enrollments.length)
      : 0;
    return {
      totalUsers: profiles.length,
      totalCourses: courses.filter(c => c.is_active).length,
      totalFirms: firms.filter(f => f.is_active).length,
      totalEnrollments: enrollments.length,
      activeEnrollments,
      completedEnrollments,
      totalCertificates: certificates.length,
      avgProgress,
      completionRate: enrollments.length > 0 ? Math.round((completedEnrollments / enrollments.length) * 100) : 0,
    };
  }, [courses, enrollments, profiles, firms, certificates]);

  // Course completion data
  const courseCompletionData = useMemo(() => {
    if (!courses || !enrollments) return [];
    return courses
      .filter(c => c.is_active)
      .map(course => {
        const courseEnrollments = enrollments.filter(e => e.course_id === course.id);
        const completed = courseEnrollments.filter(e => e.status === "completed").length;
        const active = courseEnrollments.filter(e => e.status === "active").length;
        const total = courseEnrollments.length;
        return {
          name: course.title.length > 20 ? course.title.substring(0, 20) + "..." : course.title,
          fullName: course.title,
          total,
          completed,
          active,
          rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [courses, enrollments]);

  // Enrollment status distribution
  const statusDistribution = useMemo(() => {
    if (!enrollments) return [];
    const counts: Record<string, number> = {};
    enrollments.forEach(e => { counts[e.status || "pending"] = (counts[e.status || "pending"] || 0) + 1; });
    const labels: Record<string, string> = {
      pending: "Beklemede", active: "Devam Ediyor", completed: "Tamamlandı",
      failed: "Başarısız", expired: "Süresi Doldu",
    };
    return Object.entries(counts).map(([key, value], i) => ({
      name: labels[key] || key, value, color: COLORS[i % COLORS.length],
    }));
  }, [enrollments]);

  // Firm performance
  const firmPerformance = useMemo(() => {
    if (!firms || !profiles || !enrollments || !certificates) return [];
    return firms
      .filter(f => f.is_active)
      .map(firm => {
        const firmUsers = profiles.filter(p => p.firm_id === firm.id).length;
        const firmEnrollments = enrollments.filter(e => e.firm_id === firm.id);
        const firmCompleted = firmEnrollments.filter(e => e.status === "completed").length;
        const firmCerts = certificates.filter(c => {
          const enrollment = enrollments.find(e => e.id === c.course_id);
          return enrollment?.firm_id === firm.id;
        }).length;
        return {
          name: firm.name,
          sector: firm.sector || "-",
          users: firmUsers,
          enrollments: firmEnrollments.length,
          completed: firmCompleted,
          rate: firmEnrollments.length > 0 ? Math.round((firmCompleted / firmEnrollments.length) * 100) : 0,
        };
      })
      .filter(f => f.users > 0)
      .sort((a, b) => b.users - a.users);
  }, [firms, profiles, enrollments, certificates]);

  // Group stats
  const groupStats = useMemo(() => {
    if (!groups || !userGroups || !enrollments) return [];
    return groups
      .filter(g => g.is_active)
      .map(group => {
        const members = userGroups.filter(ug => ug.group_id === group.id).length;
        const firm = firms?.find(f => f.id === group.firm_id);
        return {
          name: group.name,
          firm: firm?.name || "-",
          members,
        };
      })
      .sort((a, b) => b.members - a.members);
  }, [groups, userGroups, firms, enrollments]);

  // Monthly enrollment trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    if (!enrollments) return [];
    const months: Record<string, { enrolled: number; completed: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
      months[key] = { enrolled: 0, completed: 0 };
    }
    enrollments.forEach(e => {
      const d = new Date(e.created_at || "");
      const key = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
      if (months[key]) months[key].enrolled++;
      if (e.status === "completed" && e.completed_at) {
        const cd = new Date(e.completed_at);
        const ck = cd.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
        if (months[ck]) months[ck].completed++;
      }
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  }, [enrollments]);

  // Lesson type distribution
  const lessonTypeData = useMemo(() => {
    if (!lessons) return [];
    const counts: Record<string, number> = {};
    const labels: Record<string, string> = {
      scorm: "SCORM", exam: "Sınav", live: "Canlı", content: "İçerik",
    };
    lessons.filter(l => l.is_active).forEach(l => {
      counts[l.type] = (counts[l.type] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value], i) => ({
      name: labels[key] || key, value, color: COLORS[i % COLORS.length],
    }));
  }, [lessons]);

  const chartConfig = {
    completed: { label: "Tamamlanan", color: "hsl(142, 71%, 45%)" },
    active: { label: "Devam Eden", color: "hsl(199, 89%, 48%)" },
    enrolled: { label: "Kayıt", color: "hsl(25, 95%, 53%)" },
    total: { label: "Toplam", color: "hsl(222, 47%, 40%)" },
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="admin">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analiz & Raporlar</h1>
          <p className="text-muted-foreground">Kurs, kullanıcı, firma ve grup bazlı detaylı istatistikler</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Toplam Kullanıcı", value: overviewStats?.totalUsers, icon: Users, color: "text-info", bg: "bg-info/10" },
            { label: "Aktif Eğitim", value: overviewStats?.totalCourses, icon: BookOpen, color: "text-accent", bg: "bg-accent/10" },
            { label: "Aktif Firma", value: overviewStats?.totalFirms, icon: Building2, color: "text-success", bg: "bg-success/10" },
            { label: "Sertifika", value: overviewStats?.totalCertificates, icon: Award, color: "text-warning", bg: "bg-warning/10" },
            { label: "Toplam Kayıt", value: overviewStats?.totalEnrollments, icon: GraduationCap, color: "text-info", bg: "bg-info/10" },
            { label: "Devam Eden", value: overviewStats?.activeEnrollments, icon: Clock, color: "text-accent", bg: "bg-accent/10" },
            { label: "Tamamlanan", value: overviewStats?.completedEnrollments, icon: Target, color: "text-success", bg: "bg-success/10" },
            { label: "Tamamlama Oranı", value: `%${overviewStats?.completionRate || 0}`, icon: TrendingUp, color: "text-warning", bg: "bg-warning/10", isPercent: true },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold text-foreground">{s.value ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="courses">Eğitimler</TabsTrigger>
            <TabsTrigger value="firms">Firmalar</TabsTrigger>
            <TabsTrigger value="groups">Gruplar</TabsTrigger>
            <TabsTrigger value="trends">Trendler</TabsTrigger>
          </TabsList>

          {/* COURSES TAB */}
          <TabsContent value="courses" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Course completion bar chart */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-accent" />
                    Eğitim Tamamlama Oranları
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {courseCompletionData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                      <BarChart data={courseCompletionData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={130} className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="completed" stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 0, 0, 0]} name="Tamamlanan" />
                        <Bar dataKey="active" stackId="a" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} name="Devam Eden" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">Veri yok</div>
                  )}
                </CardContent>
              </Card>

              {/* Enrollment status pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Kayıt Durumu Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusDistribution.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" strokeWidth={2}>
                            {statusDistribution.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} stroke="hsl(var(--card))" />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {statusDistribution.map(item => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">Veri yok</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Lesson type distribution */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5 text-info" />
                    Ders Türü Dağılımı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={lessonTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {lessonTypeData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Course details table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Eğitim Detayları</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Eğitim</TableHead>
                        <TableHead className="text-center">Kayıt</TableHead>
                        <TableHead className="text-center">Tamamlama</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseCompletionData.slice(0, 6).map(course => (
                        <TableRow key={course.fullName}>
                          <TableCell className="font-medium max-w-[180px] truncate">{course.fullName}</TableCell>
                          <TableCell className="text-center">{course.total}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={course.rate} className="w-12 h-1.5" />
                              <span className="text-xs">%{course.rate}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FIRMS TAB */}
          <TabsContent value="firms" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-success" />
                  Firma Performans Tablosu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {firmPerformance.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Firma</TableHead>
                        <TableHead className="hidden md:table-cell">Sektör</TableHead>
                        <TableHead className="text-center">Çalışan</TableHead>
                        <TableHead className="text-center">Kayıt</TableHead>
                        <TableHead className="text-center">Tamamlanan</TableHead>
                        <TableHead className="text-center">Oran</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {firmPerformance.map(firm => (
                        <TableRow key={firm.name}>
                          <TableCell className="font-medium">{firm.name}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{firm.sector}</TableCell>
                          <TableCell className="text-center">{firm.users}</TableCell>
                          <TableCell className="text-center">{firm.enrollments}</TableCell>
                          <TableCell className="text-center">{firm.completed}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={firm.rate} className="w-12 h-1.5" />
                              <span className="text-xs font-semibold">%{firm.rate}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Firma verisi bulunamadı</div>
                )}
              </CardContent>
            </Card>

            {/* Firm bar chart */}
            {firmPerformance.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Firma Karşılaştırma</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={firmPerformance.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" angle={-15} textAnchor="end" height={60} />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="users" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="Çalışan" />
                      <Bar dataKey="completed" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Tamamlanan" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* GROUPS TAB */}
          <TabsContent value="groups" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-accent" />
                  Grup İstatistikleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groupStats.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grup</TableHead>
                        <TableHead>Firma</TableHead>
                        <TableHead className="text-center">Üye Sayısı</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupStats.map(group => (
                        <TableRow key={group.name}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell className="text-muted-foreground">{group.firm}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{group.members}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Grup verisi bulunamadı</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRENDS TAB */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Aylık Kayıt & Tamamlama Trendi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyTrend.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <AreaChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="enrolled" stackId="1" fill="hsl(25, 95%, 53%)" fillOpacity={0.3} stroke="hsl(25, 95%, 53%)" name="Kayıt" />
                      <Area type="monotone" dataKey="completed" stackId="2" fill="hsl(142, 71%, 45%)" fillOpacity={0.3} stroke="hsl(142, 71%, 45%)" name="Tamamlanan" />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">Veri yok</div>
                )}
              </CardContent>
            </Card>

            {/* Avg progress */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Genel İlerleme Özeti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-accent">%{overviewStats?.avgProgress || 0}</p>
                      <p className="text-sm text-muted-foreground mt-1">Ortalama İlerleme</p>
                      <Progress value={overviewStats?.avgProgress || 0} className="mt-3 h-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="text-center p-3 rounded-lg bg-success/10">
                        <p className="text-2xl font-bold text-success">{overviewStats?.completedEnrollments || 0}</p>
                        <p className="text-xs text-muted-foreground">Tamamlanan</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-info/10">
                        <p className="text-2xl font-bold text-info">{overviewStats?.activeEnrollments || 0}</p>
                        <p className="text-xs text-muted-foreground">Devam Eden</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Özet Bilgiler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Toplam Ders", value: lessons?.filter(l => l.is_active).length || 0 },
                      { label: "Toplam Grup", value: groups?.filter(g => g.is_active).length || 0 },
                      { label: "Ders İlerleme Kaydı", value: lessonProgress?.length || 0 },
                      { label: "Tamamlanan Ders", value: lessonProgress?.filter(lp => lp.lesson_status === "completed" || lp.lesson_status === "passed").length || 0 },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="font-semibold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}