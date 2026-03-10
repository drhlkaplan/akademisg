import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  FileText, FileSpreadsheet, Users, BookOpen, Search,
  CheckCircle, Video,
} from "lucide-react";
import { exportToPDF, exportToExcel, formatDuration, formatDateTR } from "@/lib/reportExport";
import { ManualCompletionDialog } from "@/components/admin/ManualCompletionDialog";

export default function ReportCenter() {
  const [courseFilter, setCourseFilter] = useState("all");
  const [firmFilter, setFirmFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  // --- Data Fetching ---
  const { data: courses } = useQuery({
    queryKey: ["report-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, duration_minutes, is_active").order("title");
      return data || [];
    },
  });

  const { data: enrollments, isLoading: enrollLoading } = useQuery({
    queryKey: ["report-enrollments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, user_id, course_id, status, progress_percent, started_at, completed_at, expires_at, firm_id")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["report-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, first_name, last_name, tc_identity, firm_id");
      return data || [];
    },
  });

  const { data: firms } = useQuery({
    queryKey: ["report-firms"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["report-lessons"],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("id, course_id, title, type, duration_minutes, is_active, sort_order").order("sort_order");
      return data || [];
    },
  });

  const { data: lessonProgress } = useQuery({
    queryKey: ["report-lesson-progress"],
    queryFn: async () => {
      const { data } = await supabase.from("lesson_progress").select("id, enrollment_id, lesson_id, lesson_status, total_time, score_raw, created_at, updated_at");
      return data || [];
    },
  });

  const { data: examResults } = useQuery({
    queryKey: ["report-exam-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_results")
        .select("id, user_id, exam_id, enrollment_id, score, status, completed_at, attempt_number")
        .order("completed_at", { ascending: false });
      return data || [];
    },
  });

  const { data: exams } = useQuery({
    queryKey: ["report-exams"],
    queryFn: async () => {
      const { data } = await supabase.from("exams").select("id, title, course_id, exam_type, passing_score");
      return data || [];
    },
  });

  const { data: liveTracking } = useQuery({
    queryKey: ["report-live-tracking"],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_session_tracking")
        .select("id, live_session_id, user_id, joined_at, left_at, duration_seconds")
        .order("joined_at", { ascending: false });
      return data || [];
    },
  });

  const { data: liveSessions } = useQuery({
    queryKey: ["report-live-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("id, lesson_id, room_url, is_active, created_at");
      return data || [];
    },
  });

  const isLoading = enrollLoading || !profiles || !courses;

  // --- Helpers ---
  const profileMap = useMemo(() => new Map(profiles?.map((p) => [p.user_id, p]) || []), [profiles]);
  const courseMap = useMemo(() => new Map(courses?.map((c) => [c.id, c]) || []), [courses]);
  const firmMap = useMemo(() => new Map(firms?.map((f) => [f.id, f.name]) || []), [firms]);

  // --- USER REPORT DATA ---
  const userReportData = useMemo(() => {
    if (!enrollments || !profiles || !courses || !lessonProgress || !examResults || !exams || !lessons) return [];

    return enrollments
      .filter((e) => {
        if (courseFilter !== "all" && e.course_id !== courseFilter) return false;
        if (firmFilter !== "all") {
          const profile = profileMap.get(e.user_id);
          if (profile?.firm_id !== firmFilter) return false;
        }
        if (searchQuery) {
          const p = profileMap.get(e.user_id);
          const name = p ? `${p.first_name} ${p.last_name}`.toLowerCase() : "";
          const tc = p?.tc_identity || "";
          if (!name.includes(searchQuery.toLowerCase()) && !tc.includes(searchQuery)) return false;
        }
        return true;
      })
      .map((e) => {
        const profile = profileMap.get(e.user_id);
        const course = courseMap.get(e.course_id);
        const userName = profile ? `${profile.first_name} ${profile.last_name}` : "Bilinmiyor";
        const tcIdentity = profile?.tc_identity || "-";

        // Total time from lesson_progress
        const enrollmentLPs = lessonProgress?.filter((lp) => lp.enrollment_id === e.id) || [];
        const totalTimeSec = enrollmentLPs.reduce((sum, lp) => sum + (lp.total_time || 0), 0);
        const totalTrainingMin = course?.duration_minutes || 0;

        // Exam results for this course
        const courseExams = exams?.filter((ex) => ex.course_id === e.course_id) || [];
        const preExam = courseExams.find((ex) => ex.exam_type === "pre");
        const postExam = courseExams.find((ex) => ex.exam_type === "final" || ex.exam_type === "post" || !ex.exam_type);

        const preResult = preExam
          ? examResults?.find((r) => r.exam_id === preExam.id && r.user_id === e.user_id)
          : null;
        const postResult = postExam
          ? examResults?.find((r) => r.exam_id === postExam.id && r.user_id === e.user_id)
          : null;

        return {
          enrollmentId: e.id,
          userId: e.user_id,
          userName,
          tcIdentity,
          courseName: course?.title || "-",
          lessonTimeSec: totalTimeSec,
          totalTrainingMin,
          preExamScore: preResult ? Number(preResult.score) : null,
          postExamScore: postResult ? Number(postResult.score) : null,
          status: e.status,
          progressPercent: e.progress_percent || 0,
          completedAt: e.completed_at,
          expiresAt: e.expires_at,
          startedAt: e.started_at,
        };
      });
  }, [enrollments, profiles, courses, lessonProgress, examResults, exams, courseFilter, firmFilter, searchQuery, profileMap, courseMap, lessons]);

  // --- LESSON REPORT DATA ---
  const lessonReportData = useMemo(() => {
    if (!lessons || !lessonProgress || !enrollments || !profiles) return [];

    const filteredLessons = courseFilter !== "all"
      ? lessons.filter((l) => l.course_id === courseFilter && l.is_active)
      : lessons.filter((l) => l.is_active);

    const rows: any[] = [];

    for (const lesson of filteredLessons) {
      const course = courseMap.get(lesson.course_id);
      const lps = lessonProgress.filter((lp) => lp.lesson_id === lesson.id);

      for (const lp of lps) {
        const enrollment = enrollments.find((e) => e.id === lp.enrollment_id);
        if (!enrollment) continue;

        if (firmFilter !== "all") {
          const profile = profileMap.get(enrollment.user_id);
          if (profile?.firm_id !== firmFilter) continue;
        }

        const profile = profileMap.get(enrollment.user_id);
        const userName = profile ? `${profile.first_name} ${profile.last_name}` : "Bilinmiyor";

        if (searchQuery) {
          if (!userName.toLowerCase().includes(searchQuery.toLowerCase())) continue;
        }

        rows.push({
          userName,
          courseName: course?.title || "-",
          lessonTitle: lesson.title,
          lessonType: lesson.type,
          startedAt: lp.created_at,
          timeSec: lp.total_time || 0,
          status: lp.lesson_status || "not_started",
          completedAt: lp.lesson_status === "completed" || lp.lesson_status === "passed" ? lp.updated_at : null,
          score: lp.score_raw,
        });
      }
    }

    return rows;
  }, [lessons, lessonProgress, enrollments, profiles, courseFilter, firmFilter, searchQuery, courseMap, profileMap]);

  // --- LIVE SESSION REPORT DATA ---
  const liveReportData = useMemo(() => {
    if (!liveTracking || !liveSessions || !lessons || !profiles) return [];

    const sessionMap = new Map(liveSessions?.map((s) => [s.id, s]) || []);
    const lessonMap = new Map(lessons?.map((l) => [l.id, l]) || []);

    return liveTracking
      .map((t) => {
        const session = sessionMap.get(t.live_session_id);
        if (!session) return null;
        const lesson = lessonMap.get(session.lesson_id);
        if (!lesson) return null;
        const course = courseMap.get(lesson.course_id);
        const profile = profileMap.get(t.user_id);

        if (courseFilter !== "all" && lesson.course_id !== courseFilter) return null;
        if (firmFilter !== "all" && profile?.firm_id !== firmFilter) return null;

        const userName = profile ? `${profile.first_name} ${profile.last_name}` : "Bilinmiyor";
        if (searchQuery && !userName.toLowerCase().includes(searchQuery.toLowerCase())) return null;

        return {
          userName,
          tcIdentity: profile?.tc_identity || "-",
          courseName: course?.title || "-",
          lessonTitle: lesson.title,
          joinedAt: t.joined_at,
          leftAt: t.left_at,
          durationSeconds: t.duration_seconds || 0,
        };
      })
      .filter(Boolean) as any[];
  }, [liveTracking, liveSessions, lessons, profiles, courseFilter, firmFilter, searchQuery, courseMap, profileMap]);

  // --- EXPORT HANDLERS ---
  const statusLabel = (s: string | null) => {
    const map: Record<string, string> = {
      pending: "Beklemede", active: "Devam Ediyor", completed: "Tamamlandı",
      failed: "Başarısız", expired: "Süresi Doldu", passed: "Başarılı", not_started: "Başlamadı",
    };
    return map[s || ""] || s || "-";
  };

  const handleExportUserReport = (format: "pdf" | "excel") => {
    const headers = [
      "Ad Soyad", "TC Kimlik", "Eğitim", "Derste Geçirilen Süre",
      "Toplam Eğitim Süresi", "Ön Değerlendirme", "Son Değerlendirme",
      "Durum", "İlerleme %", "Tamamlama Zamanı", "Geçerlilik Tarihi",
    ];
    const rows = userReportData.map((r) => [
      r.userName,
      r.tcIdentity,
      r.courseName,
      formatDuration(r.lessonTimeSec),
      `${r.totalTrainingMin} dk`,
      r.preExamScore !== null ? `${r.preExamScore}` : "-",
      r.postExamScore !== null ? `${r.postExamScore}` : "-",
      statusLabel(r.status),
      `%${r.progressPercent}`,
      formatDateTR(r.completedAt),
      formatDateTR(r.expiresAt),
    ]);

    const opts = {
      title: "Kullanıcı Eğitim Raporu",
      headers,
      rows,
      fileName: `kullanici_raporu_${new Date().toISOString().slice(0, 10)}`,
    };

    format === "pdf" ? exportToPDF(opts) : exportToExcel(opts);
  };

  const handleExportLessonReport = (format: "pdf" | "excel") => {
    const headers = [
      "Ad Soyad", "Eğitim", "Ders", "Ders Türü", "Başlama Zamanı",
      "Derste Geçirilen Süre", "Durum", "Tamamlama Zamanı", "Puan",
    ];
    const typeLabels: Record<string, string> = {
      scorm: "SCORM", exam: "Sınav", live: "Canlı", content: "İçerik",
    };
    const rows = lessonReportData.map((r: any) => [
      r.userName,
      r.courseName,
      r.lessonTitle,
      typeLabels[r.lessonType] || r.lessonType,
      formatDateTR(r.startedAt),
      formatDuration(r.timeSec),
      statusLabel(r.status),
      formatDateTR(r.completedAt),
      r.score !== null && r.score !== undefined ? `${r.score}` : "-",
    ]);

    const opts = {
      title: "Ders Bazlı Rapor",
      headers,
      rows,
      fileName: `ders_raporu_${new Date().toISOString().slice(0, 10)}`,
    };

    format === "pdf" ? exportToPDF(opts) : exportToExcel(opts);
  };

  const handleExportLiveReport = (format: "pdf" | "excel") => {
    const headers = [
      "Ad Soyad", "TC Kimlik", "Eğitim", "Ders", "Giriş Zamanı",
      "Çıkış Zamanı", "Katılım Süresi",
    ];
    const rows = liveReportData.map((r: any) => [
      r.userName,
      r.tcIdentity !== "-" ? `${r.tcIdentity.slice(0, 3)}***${r.tcIdentity.slice(-2)}` : "-",
      r.courseName,
      r.lessonTitle,
      formatDateTR(r.joinedAt),
      r.leftAt ? formatDateTR(r.leftAt) : "Devam ediyor",
      formatDuration(r.durationSeconds),
    ]);

    const opts = {
      title: "Canlı Ders Katılım Raporu",
      headers,
      rows,
      fileName: `canli_ders_raporu_${new Date().toISOString().slice(0, 10)}`,
    };

    format === "pdf" ? exportToPDF(opts) : exportToExcel(opts);
  };

  const usersForManual = useMemo(() =>
    profiles?.map((p) => ({ user_id: p.user_id, name: `${p.first_name} ${p.last_name}` })) || [],
    [profiles]
  );

  const coursesForManual = useMemo(() =>
    courses?.filter((c) => c.is_active).map((c) => ({ id: c.id, title: c.title })) || [],
    [courses]
  );

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rapor Merkezi</h1>
            <p className="text-muted-foreground">Detaylı raporlar oluştur, PDF ve Excel olarak indir</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setManualOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Manuel Tamamlama
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="İsim veya TC ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Eğitim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Eğitimler</SelectItem>
                  {courses?.filter((c) => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={firmFilter} onValueChange={setFirmFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Firma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Firmalar</SelectItem>
                  {firms?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" /> Kullanıcı Raporu
              </TabsTrigger>
              <TabsTrigger value="lessons" className="gap-2">
                <BookOpen className="h-4 w-4" /> Ders Raporu
              </TabsTrigger>
            </TabsList>

            {/* USER REPORT TAB */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <Badge variant="secondary">{userReportData.length}</Badge> kayıt bulundu
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExportUserReport("pdf")}>
                    <FileText className="mr-2 h-4 w-4 text-destructive" /> PDF İndir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportUserReport("excel")}>
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-success" /> Excel İndir
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ad Soyad</TableHead>
                          <TableHead className="hidden md:table-cell">TC Kimlik</TableHead>
                          <TableHead>Eğitim</TableHead>
                          <TableHead className="text-center hidden lg:table-cell">Ders Süresi</TableHead>
                          <TableHead className="text-center hidden lg:table-cell">Toplam Süre</TableHead>
                          <TableHead className="text-center hidden xl:table-cell">Ön Değ.</TableHead>
                          <TableHead className="text-center hidden xl:table-cell">Son Değ.</TableHead>
                          <TableHead className="text-center">Durum</TableHead>
                          <TableHead className="text-center hidden md:table-cell">İlerleme</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">Tamamlama</TableHead>
                          <TableHead className="text-right hidden xl:table-cell">Geçerlilik</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userReportData.slice(0, 50).map((r, i) => (
                          <TableRow key={`${r.enrollmentId}-${i}`}>
                            <TableCell className="font-medium">{r.userName}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm font-mono">
                              {r.tcIdentity !== "-" ? `${r.tcIdentity.slice(0, 3)}***${r.tcIdentity.slice(-2)}` : "-"}
                            </TableCell>
                            <TableCell className="max-w-[160px] truncate">{r.courseName}</TableCell>
                            <TableCell className="text-center hidden lg:table-cell text-sm">{formatDuration(r.lessonTimeSec)}</TableCell>
                            <TableCell className="text-center hidden lg:table-cell text-sm">{r.totalTrainingMin} dk</TableCell>
                            <TableCell className="text-center hidden xl:table-cell">
                              {r.preExamScore !== null ? (
                                <span className={r.preExamScore >= 70 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                                  {r.preExamScore}
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-center hidden xl:table-cell">
                              {r.postExamScore !== null ? (
                                <span className={r.postExamScore >= 70 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                                  {r.postExamScore}
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  r.status === "completed" ? "success" :
                                  r.status === "active" ? "info" :
                                  r.status === "failed" ? "destructive" :
                                  "secondary"
                                }
                              >
                                {statusLabel(r.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center hidden md:table-cell text-sm">%{r.progressPercent}</TableCell>
                            <TableCell className="text-right hidden lg:table-cell text-sm text-muted-foreground">
                              {formatDateTR(r.completedAt)}
                            </TableCell>
                            <TableCell className="text-right hidden xl:table-cell text-sm text-muted-foreground">
                              {formatDateTR(r.expiresAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {userReportData.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">Filtrelerinize uygun kayıt bulunamadı</div>
                  )}
                  {userReportData.length > 50 && (
                    <div className="text-center py-3 text-sm text-muted-foreground border-t">
                      İlk 50 kayıt gösteriliyor. Tamamı için PDF veya Excel olarak indirin.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* LESSON REPORT TAB */}
            <TabsContent value="lessons" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <Badge variant="secondary">{lessonReportData.length}</Badge> kayıt bulundu
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExportLessonReport("pdf")}>
                    <FileText className="mr-2 h-4 w-4 text-destructive" /> PDF İndir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportLessonReport("excel")}>
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-success" /> Excel İndir
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ad Soyad</TableHead>
                          <TableHead>Eğitim</TableHead>
                          <TableHead className="hidden md:table-cell">Ders</TableHead>
                          <TableHead className="text-center hidden lg:table-cell">Tür</TableHead>
                          <TableHead className="text-center hidden lg:table-cell">Başlama</TableHead>
                          <TableHead className="text-center">Süre</TableHead>
                          <TableHead className="text-center">Durum</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Tamamlama</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">Puan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lessonReportData.slice(0, 50).map((r: any, i: number) => {
                          const typeLabels: Record<string, string> = {
                            scorm: "SCORM", exam: "Sınav", live: "Canlı", content: "İçerik",
                          };
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{r.userName}</TableCell>
                              <TableCell className="max-w-[140px] truncate">{r.courseName}</TableCell>
                              <TableCell className="hidden md:table-cell max-w-[140px] truncate">{r.lessonTitle}</TableCell>
                              <TableCell className="text-center hidden lg:table-cell">
                                <Badge variant="secondary">{typeLabels[r.lessonType] || r.lessonType}</Badge>
                              </TableCell>
                              <TableCell className="text-center hidden lg:table-cell text-sm text-muted-foreground">
                                {formatDateTR(r.startedAt)}
                              </TableCell>
                              <TableCell className="text-center text-sm">{formatDuration(r.timeSec)}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={
                                    r.status === "completed" || r.status === "passed" ? "success" :
                                    r.status === "failed" ? "destructive" :
                                    "secondary"
                                  }
                                >
                                  {statusLabel(r.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right hidden md:table-cell text-sm text-muted-foreground">
                                {formatDateTR(r.completedAt)}
                              </TableCell>
                              <TableCell className="text-right hidden lg:table-cell text-sm">
                                {r.score !== null && r.score !== undefined ? r.score : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {lessonReportData.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">Filtrelerinize uygun kayıt bulunamadı</div>
                  )}
                  {lessonReportData.length > 50 && (
                    <div className="text-center py-3 text-sm text-muted-foreground border-t">
                      İlk 50 kayıt gösteriliyor. Tamamı için PDF veya Excel olarak indirin.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <ManualCompletionDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        users={usersForManual}
        courses={coursesForManual}
      />
    </DashboardLayout>
  );
}
