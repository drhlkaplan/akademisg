import { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LessonSidebar, type LessonItem, type LessonProgressItem } from "@/components/course/LessonSidebar";
import { LessonContent } from "@/components/course/LessonContent";
import { LessonTabsDrawer } from "@/components/course/LessonTabsDrawer";
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
import { useDeliveryMethodEnforcement } from "@/hooks/useDeliveryMethodEnforcement";
import { useCompletionEngine } from "@/hooks/useCompletionEngine";

type DangerClass = Database["public"]["Enums"]["danger_class"];
type HazardClass = Database["public"]["Enums"]["hazard_class_enum"];

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  auto_certificate?: boolean | null;
  require_sequential?: boolean | null;
  hazard_class_new?: HazardClass | null;
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
  const { toast } = useToast();
  const resumeNotifiedRef = useRef(false);
  const { checkAndComplete } = useCompletionEngine();

  useEffect(() => {
    if (user && courseId) fetchCourseData();
  }, [user, courseId]);

  const fetchCourseData = async () => {
    setIsLoading(true);
    try {
      const [courseRes, lessonsRes, scormRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, description, duration_minutes, auto_certificate, require_sequential, hazard_class_new, category:course_categories(danger_class, name)")
          .eq("id", courseId!)
          .single(),
        supabase
          .from("lessons")
          .select("id, title, type, sort_order, duration_minutes, is_active, scorm_package_id, exam_id, content_url, min_live_duration_minutes, topic_group, delivery_method, topic4_pack_id")
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
      const rawLessons = (lessonsRes.data as any[]) || [];

      // Resolve workplace-specific (topic 4) lessons: firm assignment overrides default pack
      const topic4Lessons = rawLessons.filter((l) => l.topic_group === 4);
      let resolvedLessons: any[] = rawLessons;
      if (topic4Lessons.length > 0 && user) {
        // 1) Group-level rule wins
        let groupPackId: string | null = null;
        const { data: userGroups } = await supabase
          .from("users_to_groups")
          .select("group_id, groups!inner(firm_id, is_active, deleted_at)")
          .eq("user_id", user.id);
        const activeGroups = (userGroups || []).filter(
          (g: any) => g.groups && g.groups.is_active && !g.groups.deleted_at
        );
        const groupIds = activeGroups.map((g: any) => g.group_id);
        if (groupIds.length > 0) {
          const { data: groupRules } = await supabase
            .from("group_topic4_assignments" as any)
            .select("topic4_pack_id, updated_at")
            .in("group_id", groupIds)
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(1);
          groupPackId = (groupRules?.[0] as any)?.topic4_pack_id || null;
        }

        // 2) Firm-level fallback (profile firm or first active group's firm)
        let firmPackId: string | null = null;
        if (!groupPackId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("firm_id")
            .eq("user_id", user.id)
            .maybeSingle();
          let effectiveFirmId: string | null = profile?.firm_id || null;
          if (!effectiveFirmId) {
            const groupFirm = activeGroups.map((g: any) => g.groups).find((g: any) => g.firm_id);
            effectiveFirmId = groupFirm?.firm_id || null;
          }
          if (effectiveFirmId) {
            const { data: assignment } = await supabase
              .from("company_topic4_assignments")
              .select("topic4_pack_id")
              .eq("firm_id", effectiveFirmId)
              .eq("is_active", true)
              .maybeSingle();
            firmPackId = assignment?.topic4_pack_id || null;
          }
        }
        const overridePackId = groupPackId || firmPackId;
        const syntheticPackages: any[] = [];
        // For each topic 4 lesson, pick effective pack and load its content
        const enriched = await Promise.all(
          rawLessons.map(async (l) => {
            if (l.topic_group !== 4) return l;
            const effectivePackId = overridePackId || l.topic4_pack_id;
            if (!effectivePackId) return l;
            // Load pack info (own content + name)
            const { data: pack } = await supabase
              .from("topic4_sector_packs")
              .select("id, name, content_url, scorm_package_id")
              .eq("id", effectivePackId)
              .maybeSingle();
            // Then check sub-lessons
            const { data: packLessons } = await supabase
              .from("topic4_pack_lessons")
              .select("id, title, content_type, content_url, scorm_package_id")
              .eq("topic4_pack_id", effectivePackId)
              .eq("is_active", true)
              .is("deleted_at", null)
              .order("sort_order")
              .limit(1);
            const first = packLessons?.[0];
            const titleSuffix = pack?.name ? ` — ${pack.name}` : "";
            const newTitle = `${l.title}${titleSuffix}`;
            const isScormUrl = (u?: string | null) => !!u && /\.zip(\?|$)/i.test(u);
            // Priority: sub-lesson > pack-level content
            if (first?.scorm_package_id) {
              return { ...l, title: newTitle, type: "scorm", scorm_package_id: first.scorm_package_id, content_url: null };
            }
            if (first?.content_type === "scorm" && first?.content_url) {
              const synthId = `synthetic-${first.id}`;
              syntheticPackages.push({ id: synthId, package_url: first.content_url, entry_point: "index.html", scorm_version: "1.2", course_id: l.course_id });
              return { ...l, title: newTitle, type: "scorm", scorm_package_id: synthId, content_url: null };
            }
            if (first?.content_url) {
              if (isScormUrl(first.content_url)) {
                const synthId = `synthetic-${first.id}`;
                syntheticPackages.push({ id: synthId, package_url: first.content_url, entry_point: "index.html", scorm_version: "1.2", course_id: l.course_id });
                return { ...l, title: newTitle, type: "scorm", scorm_package_id: synthId, content_url: null };
              }
              return { ...l, title: newTitle, type: "content", content_url: first.content_url };
            }
            if (pack?.scorm_package_id) {
              return { ...l, title: newTitle, type: "scorm", scorm_package_id: pack.scorm_package_id, content_url: null };
            }
            if (pack?.content_url) {
              if (isScormUrl(pack.content_url)) {
                const synthId = `synthetic-pack-${pack.id}`;
                syntheticPackages.push({ id: synthId, package_url: pack.content_url, entry_point: "index.html", scorm_version: "1.2", course_id: l.course_id });
                return { ...l, title: newTitle, type: "scorm", scorm_package_id: synthId, content_url: null };
              }
              return { ...l, title: newTitle, type: "content", content_url: pack.content_url };
            }
            return { ...l, title: newTitle };
          })
        );
        resolvedLessons = enriched;

        // Also load any extra scorm packages referenced by topic 4 packs (DB-backed only)
        const extraScormIds = enriched
          .filter((l) => l.scorm_package_id && !String(l.scorm_package_id).startsWith("synthetic-"))
          .map((l) => l.scorm_package_id as string);
        if (extraScormIds.length > 0) {
          const { data: extraPkgs } = await supabase
            .from("scorm_packages")
            .select("id, package_url, entry_point, scorm_version, course_id")
            .in("id", extraScormIds);
          extraPkgs?.forEach((p) => {
            scormRes.data?.push(p as any);
          });
        }
        // Inject synthetic packages
        syntheticPackages.forEach((p) => scormRes.data?.push(p as any));
      }

      setLessons(resolvedLessons as LessonItem[]);

      const pkgMap: Record<string, ScormPackageData> = {};
      scormRes.data?.forEach((p) => { pkgMap[p.id] = p as ScormPackageData; });
      setScormPackages(pkgMap);

      let { data: enrollData } = await supabase
        .from("enrollments")
        .select("id, progress_percent, status, started_at")
        .eq("user_id", user!.id)
        .eq("course_id", courseId!)
        .maybeSingle();

      if (!enrollData) {
        const { data: newEnroll, error: enrollError } = await supabase
          .from("enrollments")
          .insert({ user_id: user!.id, course_id: courseId!, status: "active", started_at: new Date().toISOString(), progress_percent: 0 })
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

      if (enrollData) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, lesson_status")
          .eq("enrollment_id", enrollData.id);
        setLessonProgress((progressData as LessonProgressItem[]) || []);
      }

      const sortedLessons = (resolvedLessons as LessonItem[]).slice().sort((a, b) => a.sort_order - b.sort_order);
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
        const resumeLesson = firstIncomplete ?? sortedLessons[0];
        setActiveLessonId(resumeLesson.id);

        // Notify user if they're resuming from a non-first lesson
        if (
          !resumeNotifiedRef.current &&
          completedIds.size > 0 &&
          firstIncomplete &&
          firstIncomplete.id !== sortedLessons[0].id
        ) {
          resumeNotifiedRef.current = true;
          toast({
            title: "Kaldığınız yerden devam ediyorsunuz",
            description: `${resumeLesson.title} dersine yönlendirildiniz.`,
          });
        }
      }
    } catch (err: any) {
      console.error("Error loading course:", err);
      setError("Eğitim yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndCompleteCourse = useCallback(async (enrollId: string) => {
    const result = await checkAndComplete({
      enrollmentId: enrollId,
      courseId: courseId!,
      userId: user!.id,
      hazardClass: course?.hazard_class_new,
      autoCertificate: course?.auto_certificate !== false,
    });

    // Refresh progress
    const { data: progressData } = await supabase
      .from("lesson_progress").select("lesson_id, lesson_status").eq("enrollment_id", enrollId);
    if (progressData) setLessonProgress(progressData as LessonProgressItem[]);

    setEnrollment((prev) => prev ? {
      ...prev,
      progress_percent: result.progress,
      status: result.completed ? "completed" : prev.status,
    } : prev);
  }, [courseId, course, user, checkAndComplete]);

  const handleScormComplete = useCallback(() => {
    if (enrollment) checkAndCompleteCourse(enrollment.id);
  }, [enrollment, checkAndCompleteCourse]);

  // Navigation helpers
  const sortedLessons = [...lessons].sort((a, b) => a.sort_order - b.sort_order);
  const activeIndex = sortedLessons.findIndex((l) => l.id === activeLessonId);
  const activeLesson = sortedLessons[activeIndex] || null;

  // Delivery method enforcement based on hazard class
  const enforcement = useDeliveryMethodEnforcement(
    course?.hazard_class_new,
    sortedLessons.map((l) => ({
      lessonId: l.id,
      topicGroup: l.topic_group ?? null,
      deliveryMethod: l.delivery_method ?? null,
      type: l.type,
    }))
  );

  const handlePrevious = useCallback(() => {
    if (activeIndex > 0) setActiveLessonId(sortedLessons[activeIndex - 1].id);
  }, [activeIndex, sortedLessons]);

  const handleNext = useCallback(() => {
    if (activeIndex < sortedLessons.length - 1) setActiveLessonId(sortedLessons[activeIndex + 1].id);
  }, [activeIndex, sortedLessons]);

  // Auto-complete content lessons after viewing for 10 seconds
  useEffect(() => {
    if (!activeLesson || !enrollment) return;
    if (activeLesson.type !== "content") return;

    const alreadyDone = lessonProgress.some(
      (p) => p.lesson_id === activeLesson.id && (p.lesson_status === "completed" || p.lesson_status === "passed")
    );
    if (alreadyDone) return;

    const timer = setTimeout(async () => {
      try {
        await supabase.rpc("record_lesson_progress", {
          _enrollment_id: enrollment.id,
          _lesson_id: activeLesson.id,
          _lesson_status: "completed",
        });
        await checkAndCompleteCourse(enrollment.id);
        // Auto-advance to next lesson
        const currentIdx = sortedLessons.findIndex((l) => l.id === activeLesson.id);
        if (currentIdx >= 0 && currentIdx < sortedLessons.length - 1) {
          setActiveLessonId(sortedLessons[currentIdx + 1].id);
        }
      } catch (err) {
        console.error("Content lesson auto-complete error:", err);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [activeLesson?.id, activeLesson?.type, enrollment?.id, lessonProgress, checkAndCompleteCourse]);

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
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-20 left-4 z-20 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </Button>

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
              requireSequential={course.require_sequential !== false}
              enforcement={enforcement}
              onSelectLesson={(id) => {
                setActiveLessonId(id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              onBack={() => navigate("/dashboard")}
            />
          </div>
        </div>

        <div className="hidden lg:flex items-start pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none rounded-r-md"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            <LessonContent
              lesson={activeLesson}
              scormPackages={scormPackages}
              enrollmentId={enrollment!.id}
              userId={user!.id}
              onScormComplete={handleScormComplete}
              onPrevious={handlePrevious}
              onNext={handleNext}
              hasPrevious={activeIndex > 0}
              hasNext={activeIndex < sortedLessons.length - 1}
              courseTitle={course.title}
              enforcement={enforcement}
            />
          </div>
          <LessonTabsDrawer
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
