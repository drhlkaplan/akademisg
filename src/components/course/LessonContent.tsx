import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { LiveSessionJoin } from "@/components/course/LiveSessionJoin";
import { HtmlContentViewer } from "@/components/course/HtmlContentViewer";
import { FaceToFaceLesson } from "@/components/course/FaceToFaceLesson";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  FileQuestion,
  Video,
  FileText,
  Play,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { LessonItem } from "./LessonSidebar";

interface ScormPackageData {
  id: string;
  package_url: string;
  entry_point: string | null;
  scorm_version: string | null;
}

interface EnforcementInfo {
  isBlocked: boolean;
  reason: string | null;
}

interface LessonContentProps {
  lesson: LessonItem | null;
  scormPackages: Record<string, ScormPackageData>;
  enrollmentId: string;
  userId: string;
  onScormComplete: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  courseTitle?: string;
  enforcement?: Record<string, EnforcementInfo>;
}

export function LessonContent({
  lesson,
  scormPackages,
  enrollmentId,
  userId,
  onScormComplete,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  courseTitle,
  enforcement,
}: LessonContentProps) {
  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Bir ders seçin</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Sol panelden bir ders seçerek eğitime başlayın.
        </p>
      </div>
    );
  }

  // Check if this lesson is blocked by enforcement rules (e.g., Topic 4 face-to-face only)
  const lessonEnforcement = enforcement?.[lesson.id];
  if (lessonEnforcement?.isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Users className="h-10 w-10 text-destructive" />
        </div>
        <div className="text-center space-y-3 max-w-lg">
          <h3 className="text-xl font-semibold text-foreground">{lesson.title}</h3>
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <p className="text-sm text-warning font-medium">
              {lessonEnforcement.reason}
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            Bu ders için planlanmış yüz yüze oturumlara katılmanız gerekmektedir. 
            Oturum bilgileri ve tarihler için eğitim yöneticinize başvurun.
          </p>
        </div>
      </div>
    );
  }
  const scormProps = {
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
    lessonTitle: lesson.title,
    courseTitle,
  };

  switch (lesson.type) {
    case "scorm": {
      const pkg = lesson.scorm_package_id ? scormPackages[lesson.scorm_package_id] : null;
      if (!pkg) {
        return <EmptyState icon={BookOpen} title="SCORM İçerik Yüklenmemiş" description="Bu ders için SCORM içerik paketi henüz yüklenmemiştir." />;
      }
      return (
        <div className="h-full w-full">
          <ScormPlayer
            key={lesson.id}
            packageUrl={pkg.package_url}
            entryPoint={pkg.entry_point || "index.html"}
            enrollmentId={enrollmentId}
            scormPackageId={pkg.id}
            lessonId={lesson.id}
            userId={userId}
            scormVersion={pkg.scorm_version || "1.2"}
            onComplete={onScormComplete}
            {...scormProps}
          />
        </div>
      );
    }

    case "exam": {
      if (lesson.scorm_package_id) {
        const pkg = scormPackages[lesson.scorm_package_id];
        if (pkg) {
          return (
            <div className="h-full w-full">
              <ScormPlayer
                key={lesson.id}
                packageUrl={pkg.package_url}
                entryPoint={pkg.entry_point || "index.html"}
                enrollmentId={enrollmentId}
                scormPackageId={pkg.id}
                lessonId={lesson.id}
                userId={userId}
                scormVersion={pkg.scorm_version || "1.2"}
                onComplete={onScormComplete}
                {...scormProps}
              />
            </div>
          );
        }
      }

      if (!lesson.exam_id) {
        return <EmptyState icon={FileQuestion} title="Sınav Henüz Atanmamış" description="Bu ders için sınav henüz oluşturulmamıştır." />;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="h-20 w-20 rounded-2xl bg-warning/10 flex items-center justify-center">
            <FileQuestion className="h-10 w-10 text-warning" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{lesson.title}</h3>
            <p className="text-muted-foreground max-w-md">
              Sınava başlamak için aşağıdaki butona tıklayın.
            </p>
          </div>
          <Button variant="accent" size="lg" asChild>
            <Link to={`/exam/${lesson.exam_id}/${enrollmentId}`}>
              <Play className="h-5 w-5 mr-2" />
              Sınava Başla
            </Link>
          </Button>
        </div>
      );
    }

    case "live": {
      return (
        <LiveSessionJoin
          lessonId={lesson.id}
          enrollmentId={enrollmentId}
          minDurationMinutes={lesson.min_live_duration_minutes || 0}
        />
      );
    }

    case "content": {
      if (lesson.content_url) {
        const isVideo = lesson.content_url.endsWith(".mp4") || lesson.content_url.endsWith(".webm");
        const isPdf = lesson.content_url.endsWith(".pdf");
        const isHtml = lesson.content_url.endsWith(".html") || lesson.content_url.endsWith(".htm");

        if (isVideo) {
          return (
            <div className="flex items-center justify-center h-full p-4">
              <video src={lesson.content_url} controls className="max-w-full max-h-full rounded-lg">
                Tarayıcınız video oynatmayı desteklemiyor.
              </video>
            </div>
          );
        }

        if (isPdf) {
          return <iframe src={lesson.content_url} className="w-full h-full border-0 rounded-lg" title={lesson.title} />;
        }

        if (isHtml) {
          return <HtmlContentViewer contentUrl={lesson.content_url} title={lesson.title} />;
        }

        return (
          <iframe
            src={lesson.content_url}
            className="w-full h-full border-0 rounded-lg"
            title={lesson.title}
            sandbox="allow-scripts allow-same-origin"
          />
        );
      }
      return <EmptyState icon={FileText} title="İçerik Henüz Yüklenmemiş" description="Bu ders için içerik henüz yüklenmemiştir." />;
    }

    case "face_to_face": {
      return (
        <FaceToFaceLesson
          lessonId={lesson.id}
          enrollmentId={enrollmentId}
          onComplete={onScormComplete}
        />
      );
    }

    default:
      return <EmptyState icon={BookOpen} title="Bilinmeyen Ders Tipi" description="Bu ders tipi desteklenmemektedir." />;
  }
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof BookOpen; title: string; description: string }) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center h-full gap-4">
        <Icon className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground text-center max-w-md">{description}</p>
      </CardContent>
    </Card>
  );
}
