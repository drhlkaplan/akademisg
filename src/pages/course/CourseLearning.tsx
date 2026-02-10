import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge-custom";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DangerClass = Database["public"]["Enums"]["danger_class"];

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

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  category: { danger_class: DangerClass; name: string } | null;
}

interface ScormPackage {
  id: string;
  package_url: string;
  entry_point: string | null;
  scorm_version: string | null;
}

interface EnrollmentData {
  id: string;
  progress_percent: number | null;
  status: string | null;
  started_at: string | null;
}

export default function CourseLearning() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [scormPackage, setScormPackage] = useState<ScormPackage | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && courseId) fetchCourseData();
  }, [user, courseId]);

  const fetchCourseData = async () => {
    setIsLoading(true);
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(`
          id, title, description, duration_minutes,
          category:course_categories(danger_class, name)
        `)
        .eq("id", courseId!)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData as CourseData);

      // Fetch SCORM package
      const { data: scormData } = await supabase
        .from("scorm_packages")
        .select("id, package_url, entry_point, scorm_version")
        .eq("course_id", courseId!)
        .limit(1)
        .maybeSingle();

      setScormPackage(scormData);

      // Fetch or create enrollment
      let { data: enrollData } = await supabase
        .from("enrollments")
        .select("id, progress_percent, status, started_at")
        .eq("user_id", user!.id)
        .eq("course_id", courseId!)
        .maybeSingle();

      if (!enrollData) {
        const { data: newEnroll, error: enrollError } = await supabase
          .from("enrollments")
          .insert({
            user_id: user!.id,
            course_id: courseId!,
            status: "active",
            started_at: new Date().toISOString(),
            progress_percent: 0,
          })
          .select("id, progress_percent, status, started_at")
          .single();

        if (enrollError) throw enrollError;
        enrollData = newEnroll;
      } else if (enrollData.status === "pending") {
        await supabase
          .from("enrollments")
          .update({ status: "active", started_at: new Date().toISOString() })
          .eq("id", enrollData.id);
        enrollData.status = "active";
        enrollData.started_at = new Date().toISOString();
      }

      setEnrollment(enrollData);
    } catch (err: any) {
      console.error("Error loading course:", err);
      setError("Eğitim yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScormComplete = () => {
    setEnrollment((prev) =>
      prev ? { ...prev, progress_percent: 100, status: "completed" } : prev
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="student">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <DashboardLayout userRole="student">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertTriangle className="h-12 w-12 text-warning" />
          <p className="text-muted-foreground">{error || "Eğitim bulunamadı."}</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard'a Dön
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const progress = enrollment?.progress_percent || 0;
  const dangerClass = course.category?.danger_class || "low";
  const isCompleted = enrollment?.status === "completed";

  return (
    <DashboardLayout userRole="student">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={dangerClassBadge[dangerClass]}>
                  {dangerClassLabel[dangerClass]}
                </Badge>
                {isCompleted && (
                  <Badge variant="active">
                    <CheckCircle className="h-3 w-3 mr-1" /> Tamamlandı
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {Math.round(course.duration_minutes / 60)} Saat
            </div>
            <div className="w-32">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>İlerleme</span>
                <span>%{progress}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        {/* Player Area */}
        <div className="h-[calc(100vh-220px)] min-h-[400px]">
          {scormPackage ? (
            <ScormPlayer
              packageUrl={scormPackage.package_url}
              entryPoint={scormPackage.entry_point || "index.html"}
              enrollmentId={enrollment!.id}
              scormPackageId={scormPackage.id}
              userId={user!.id}
              onComplete={handleScormComplete}
            />
          ) : (
            <Card className="h-full">
              <CardContent className="flex flex-col items-center justify-center h-full gap-4">
                <BookOpen className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">
                  İçerik Henüz Yüklenmemiş
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Bu eğitim için SCORM içerik paketi henüz yüklenmemiştir. Lütfen yönetici ile iletişime geçin.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
