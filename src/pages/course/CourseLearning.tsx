import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LessonSidebar, type LessonItem, type LessonProgressItem } from "@/components/course/LessonSidebar";
import { LessonContent } from "@/components/course/LessonContent";
import { LessonTabs } from "@/components/course/LessonTabs";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { useCertificateGeneration } from "@/hooks/useCertificateGeneration";

type DangerClass = Database["public"]["Enums"]["danger_class"];

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  auto_certificate?: boolean | null;
  require_sequential?: boolean | null;
  category: { danger_class: DangerClass; name: string } | null;
}

interface ScormPackageData {
  id: string;
  package_url: string;
  entry_point: string | null;
  scorm_version: string | null;
  course_id: string;
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
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressItem[]>([]);
  const [scormPackages, setScormPackages] = useState<Record<string, ScormPackageData>>({});
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { generateCertificate } = useCertificateGeneration();

  useEffect(() => {
    if (user && courseId) fetchCourseData();
  }, [user, courseId]);

  const fetchCourseData = async () => {
    setIsLoading(true);
    try {
      // Parallel fetches
      const [courseRes, lessonsRes, scormRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, description, duration_minutes, auto_certificate, require_sequential, category:course_categories(danger_class, name)")
          .eq("id", courseId!)
          .single(),
        supabase
          .from("lessons")
          .select("id, title, type, sort_order, duration_minutes, is_active, scorm_package_id, exam_id, content_url")
          .eq("course_id", courseId!)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("scorm_packages")
          .select("id, package_url, entry_point, scorm_version, course_id")
          .eq("course_id", courseId!),
      ]);

      if (courseRes.error) throw courseRes.error;
      setCourse(courseRes.data as CourseData);
      setLessons((lessonsRes.data as LessonItem[]) || []);

      // Index scorm packages by id
      const pkgMap: Record<string, ScormPackageData> = {};
      scormRes.data?.forEach((p) => {
        pkgMap[p.id] = p as ScormPackageData;
      });
      setScormPackages(pkgMap);

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
        await supabase.rpc("update_enrollment_progress", {
          _enrollment_id: enrollData.id,
          _progress_percent: enrollData.progress_percent || 0,
          _status: "active",
        });
        enrollData.status = "active";
      }

      setEnrollment(enrollData);

      // Fetch lesson progress
      if (enrollData) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, lesson_status")
          .eq("enrollment_id", enrollData.id);
        setLessonProgress((progressData as LessonProgressItem[]) || []);
      }

      // Auto-select first incomplete lesson
      const sortedLessons = (lessonsRes.data as LessonItem[] || []).sort(
        (a, b) => a.sort_order - b.sort_order
      );
      if (sortedLessons.length > 0) {
        const progressData = await supabase
          .from("lesson_progress")
          .select("lesson_id, lesson_status")
          .eq("enrollment_id", enrollData!.id);

        const completedIds = new Set(
          progressData.data
            ?.filter((p) => p.lesson_status === "completed" || p.lesson_status === "passed")
            .map((p) => p.lesson_id) || []
        );

        const firstIncomplete = sortedLessons.find((l) => !completedIds.has(l.id));
        setActiveLessonId(firstIncomplete?.id || sortedLessons[0].id);
      }
    } catch (err: any) {
      console.error("Error loading course:", err);
      setError("Eğitim yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndCompleteCourse = useCallback(async (enrollId: string) => {
    // Check if all lessons are completed
    const { data: allLessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId!)
      .eq("is_active", true);

    const { data: progressData } = await supabase
      .from("lesson_progress")
      .select("lesson_id, lesson_status")
      .eq("enrollment_id", enrollId);

    if (progressData) setLessonProgress(progressData as LessonProgressItem[]);

    const completedIds = new Set(
      progressData
        ?.filter((p) => p.lesson_status === "completed" || p.lesson_status === "passed")
        .map((p) => p.lesson_id) || []
    );

    const allCompleted = allLessons?.every((l) => completedIds.has(l.id)) ?? false;

    if (allCompleted) {
      // Mark enrollment as completed via RPC
      await supabase.rpc("update_enrollment_progress", {
        _enrollment_id: enrollId,
        _progress_percent: 100,
      });
      // Admin-level completion status change - use edge function or let server handle
      // For now, the progress is set to 100; actual status change to 'completed' 
      // needs a server-side function
      await supabase.rpc("complete_enrollment", { _enrollment_id: enrollId });

      setEnrollment((prev) =>
        prev ? { ...prev, progress_percent: 100, status: "completed" } : prev
      );

      // Auto-generate certificate only if course has auto_certificate enabled
      const autoCert = course?.auto_certificate !== false;
      if (autoCert) {
        await generateCertificate(enrollId);
      }
    } else {
      // Update progress percentage via RPC
      const total = allLessons?.length || 1;
      const completed = completedIds.size;
      const pct = Math.round((completed / total) * 100);

      await supabase.rpc("update_enrollment_progress", {
        _enrollment_id: enrollId,
        _progress_percent: pct,
      });

      setEnrollment((prev) => (prev ? { ...prev, progress_percent: pct } : prev));
    }
  }, [courseId, generateCertificate]);

  const handleScormComplete = useCallback(() => {
    if (enrollment) {
      checkAndCompleteCourse(enrollment.id);
    }
  }, [enrollment, checkAndCompleteCourse]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) || null;

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

  return (
    <DashboardLayout userRole="student">
      <div className="h-[calc(100vh-130px)] flex rounded-lg border border-border overflow-hidden bg-background">
        {/* Sidebar toggle for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-20 left-4 z-20 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>

        {/* Lesson Sidebar */}
        <div
          className={cn(
            "transition-all duration-300 flex-shrink-0 overflow-hidden",
            sidebarOpen ? "w-80" : "w-0",
            "max-lg:absolute max-lg:z-10 max-lg:h-[calc(100vh-130px)]"
          )}
        >
          <div className="w-80 h-full">
            <LessonSidebar
              courseTitle={course.title}
              lessons={lessons}
              lessonProgress={lessonProgress}
              activeLessonId={activeLessonId}
              overallProgress={progress}
              onSelectLesson={(id) => {
                setActiveLessonId(id);
                // auto-close on mobile
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              onBack={() => navigate("/dashboard")}
            />
          </div>
        </div>

        {/* Desktop toggle */}
        <div className="hidden lg:flex items-start pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none rounded-r-md"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <LessonContent
              lesson={activeLesson}
              scormPackages={scormPackages}
              enrollmentId={enrollment!.id}
              userId={user!.id}
              onScormComplete={handleScormComplete}
            />
          </div>
          <LessonTabs
            lesson={activeLesson}
            courseTitle={course.title}
            category={course.category?.name}
            dangerClass={course.category?.danger_class}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
