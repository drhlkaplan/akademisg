import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  ArrowRight,
  Play,
  CheckCircle,
  Loader2,
  FileQuestion,
  KeyRound,
  CalendarClock,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type DangerClass = Database["public"]["Enums"]["danger_class"];

interface EnrollmentWithCourse {
  id: string;
  progress_percent: number | null;
  status: string | null;
  course: {
    id: string;
    title: string;
    duration_minutes: number;
    category: {
      danger_class: DangerClass;
      name: string;
    } | null;
  } | null;
}

interface Certificate {
  id: string;
  certificate_number: string;
  course_title: string;
  issue_date: string | null;
}

interface AvailableExam {
  exam_id: string;
  exam_title: string;
  enrollment_id: string;
  course_title: string;
  duration_minutes: number;
  passing_score: number;
  attempts_used: number;
  max_attempts: number;
}

const dangerClassBadge: Record<DangerClass, "dangerLow" | "dangerMedium" | "dangerHigh"> = {
  low: "dangerLow",
  medium: "dangerMedium",
  high: "dangerHigh",
};

const dangerClassLabel: Record<DangerClass, string> = {
  low: "Az Tehlikeli",
  medium: "Tehlikeli",
  high: "Çok Tehlikeli",
};

export default function StudentDashboard() {
  const { user, profile, isFirmAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [availableExams, setAvailableExams] = useState<AvailableExam[]>([]);
  const [groupKey, setGroupKey] = useState("");
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect firm admins to firm panel
  useEffect(() => {
    if (isFirmAdmin) {
      navigate("/firm", { replace: true });
    }
  }, [isFirmAdmin, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch enrollments with course info
      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select(`
          id,
          progress_percent,
          status,
          course:courses(
            id,
            title,
            duration_minutes,
            category:course_categories(
              danger_class,
              name
            )
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      setEnrollments((enrollmentData as EnrollmentWithCourse[]) || []);

      // Fetch certificates
      const { data: certData } = await supabase
        .from("certificates")
        .select("id, certificate_number, course_title, issue_date")
        .eq("user_id", user!.id)
        .order("issue_date", { ascending: false })
        .limit(5);

      setCertificates(certData || []);

      // Fetch available exams for active enrollments
      const activeEnrollmentsList = (enrollmentData as EnrollmentWithCourse[])?.filter(
        (e) => e.status === "active"
      ) || [];

      if (activeEnrollmentsList.length > 0) {
        const courseIds = activeEnrollmentsList.map((e) => e.course?.id).filter(Boolean) as string[];
        
        const { data: examsData } = await supabase
          .from("exams")
          .select("id, title, course_id, duration_minutes, passing_score, max_attempts")
          .eq("is_active", true)
          .in("course_id", courseIds);

        // Fetch exam attempts
        const { data: resultsData } = await supabase
          .from("exam_results")
          .select("exam_id, status")
          .eq("user_id", user!.id);

        const attemptsByExam = resultsData?.reduce((acc, r) => {
          acc[r.exam_id] = (acc[r.exam_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const passedExams = new Set(
          resultsData?.filter((r) => r.status === "passed").map((r) => r.exam_id) || []
        );

        const examsWithEnrollment: AvailableExam[] = [];
        examsData?.forEach((exam) => {
          if (passedExams.has(exam.id)) return; // Skip passed exams
          const enrollment = activeEnrollmentsList.find((e) => e.course?.id === exam.course_id);
          if (enrollment) {
            examsWithEnrollment.push({
              exam_id: exam.id,
              exam_title: exam.title,
              enrollment_id: enrollment.id,
              course_title: enrollment.course?.title || "",
              duration_minutes: exam.duration_minutes || 60,
              passing_score: exam.passing_score || 70,
              attempts_used: attemptsByExam[exam.id] || 0,
              max_attempts: exam.max_attempts || 3,
            });
          }
        });

        setAvailableExams(examsWithEnrollment);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    const normalizedKey = groupKey.trim();
    if (!normalizedKey) {
      toast({ title: "Hata", description: "Lütfen bir grup anahtarı girin.", variant: "destructive" });
      return;
    }

    try {
      setJoiningGroup(true);
      const { data, error } = await supabase.functions.invoke("join-group-key", {
        body: { groupKey: normalizedKey },
      });

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: data?.message || "Gruba katıldınız. Eğitimleriniz güncellendi.",
      });
      setGroupKey("");
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Grup anahtarı hatası",
        description: err.message || "Grup anahtarı doğrulanamadı.",
        variant: "destructive",
      });
    } finally {
      setJoiningGroup(false);
    }
  };

  const activeEnrollments = enrollments.filter(
    (e) => e.status === "active" || e.status === "pending"
  );
  const completedEnrollments = enrollments.filter(
    (e) => e.status === "completed"
  );
  const totalHours = enrollments.reduce((acc, e) => {
    return acc + (e.course?.duration_minutes || 0) / 60;
  }, 0);

  const stats = [
    {
      title: "Aktif Eğitimler",
      value: activeEnrollments.length.toString(),
      icon: BookOpen,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Tamamlanan",
      value: completedEnrollments.length.toString(),
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Sertifikalar",
      value: certificates.length.toString(),
      icon: Award,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Toplam Süre",
      value: `${Math.round(totalHours)} saat`,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const userName = profile?.first_name || "Kullanıcı";

  if (isLoading) {
    return (
      <DashboardLayout userRole="student">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Hoş Geldiniz, {userName}! 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Eğitimlerinize kaldığınız yerden devam edin.
            </p>
          </div>
          <Button variant="accent" size="sm" asChild>
            <Link to="/courses">
              Yeni Eğitim Keşfet
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Group Key */}
        <div className="dashboard-card p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-accent" />
                Grup Anahtarı ile Eğitime Katıl
              </p>
              <p className="text-xs text-muted-foreground">
                Yönetici tarafından verilen anahtarı girin, atanmış eğitimler otomatik eklensin.
              </p>
              <Input
                value={groupKey}
                onChange={(e) => setGroupKey(e.target.value)}
                placeholder="Örn: ISG-2026-ABC123"
                className="max-w-md"
              />
            </div>
            <Button variant="accent" size="sm" onClick={handleJoinGroup} disabled={joiningGroup}>
              {joiningGroup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Doğrulanıyor...
                </>
              ) : (
                "Gruba Katıl"
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.title} className="stat-card">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-xl ${stat.bgColor} flex items-center justify-center`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Courses */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Eğitimlerim
              </h3>
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <Link to="/dashboard/courses">Tümünü Gör</Link>
              </Button>
            </div>

            {activeEnrollments.length === 0 ? (
              <div className="dashboard-card p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  Henüz kayıtlı eğitiminiz yok
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  İSG eğitimlerinize hemen başlayın
                </p>
                <Button variant="accent" size="sm" asChild>
                  <Link to="/courses">Eğitimleri Keşfet</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeEnrollments.slice(0, 3).map((enrollment) => {
                  const course = enrollment.course;
                  if (!course) return null;
                  
                  const dangerClass = course.category?.danger_class || "low";
                  const progress = enrollment.progress_percent || 0;
                  const totalMinutes = course.duration_minutes;
                  const remainingMinutes = Math.round(
                    totalMinutes * (1 - progress / 100)
                  );

                  return (
                    <div key={enrollment.id} className="dashboard-card p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={dangerClassBadge[dangerClass]}>
                              {dangerClassLabel[dangerClass]}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-foreground text-sm mb-1">
                            {course.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {Math.round(totalMinutes / 60)} Saat
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5" />
                              %{progress} tamamlandı
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-28">
                            <Progress value={progress} className="h-2" />
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Kalan: {Math.round(remainingMinutes / 60)} saat
                            </p>
                          </div>
                          <Button variant="accent" size="sm" asChild>
                            <Link to={`/learn/${course.id}`}>
                              <Play className="h-3.5 w-3.5 mr-1" />
                              Devam Et
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Available Exams */}
            {availableExams.length > 0 && (
              <>
                <h3 className="text-base font-semibold text-foreground">
                  Bekleyen Sınavlar
                </h3>
                <div className="space-y-3">
                  {availableExams.slice(0, 3).map((exam) => (
                    <div key={exam.exam_id} className="dashboard-card border-accent/20 p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                          <FileQuestion className="h-5 w-5 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm">
                            {exam.exam_title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {exam.course_title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span>{exam.duration_minutes} dk</span>
                            <span>•</span>
                            <span>%{exam.passing_score} geçme</span>
                            <span>•</span>
                            <span>{exam.attempts_used}/{exam.max_attempts}</span>
                          </div>
                        </div>
                        <Button variant="accent" size="sm" asChild>
                          <Link to={`/exam/${exam.exam_id}/${exam.enrollment_id}`}>
                            Başla
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Recent Certificates */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Son Sertifikalar
              </h3>
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <Link to="/dashboard/certificates">Tümü</Link>
              </Button>
            </div>

            {certificates.length === 0 ? (
              <div className="dashboard-card p-6 text-center">
                <Award className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Henüz sertifikanız yok
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {certificates.map((cert) => (
                  <div key={cert.id} className="dashboard-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">
                          {cert.course_title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {cert.issue_date
                            ? new Date(cert.issue_date).toLocaleDateString("tr-TR")
                            : "-"}
                        </p>
                        <p className="text-[11px] text-accent font-mono mt-0.5">
                          {cert.certificate_number}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">
                        İndir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="dashboard-card bg-gradient-accent p-5">
              <h3 className="font-semibold text-accent-foreground text-sm mb-2">
                Sertifika Doğrula
              </h3>
              <p className="text-xs text-accent-foreground/80 mb-3">
                Sertifika numarası ile doğrulama yapın.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                asChild
              >
                <Link to="/verify">Doğrula</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
