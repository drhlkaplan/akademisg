import { ScormPlayer } from "@/components/scorm/ScormPlayer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  FileQuestion,
  Video,
  FileText,
  Play,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { LessonItem } from "./LessonSidebar";

interface ScormPackageData {
  id: string;
  package_url: string;
  entry_point: string | null;
  scorm_version: string | null;
}

interface LessonContentProps {
  lesson: LessonItem | null;
  scormPackages: Record<string, ScormPackageData>;
  enrollmentId: string;
  userId: string;
  onScormComplete: () => void;
}

export function LessonContent({
  lesson,
  scormPackages,
  enrollmentId,
  userId,
  onScormComplete,
}: LessonContentProps) {
  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">
          Bir ders seçin
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          Sol panelden bir ders seçerek eğitime başlayın.
        </p>
      </div>
    );
  }

  switch (lesson.type) {
    case "scorm": {
      const pkg = lesson.scorm_package_id
        ? scormPackages[lesson.scorm_package_id]
        : null;

      if (!pkg) {
        return (
          <EmptyState
            icon={BookOpen}
            title="SCORM İçerik Yüklenmemiş"
            description="Bu ders için SCORM içerik paketi henüz yüklenmemiştir."
          />
        );
      }

      return (
        <ScormPlayer
          packageUrl={pkg.package_url}
          entryPoint={pkg.entry_point || "index.html"}
          enrollmentId={enrollmentId}
          scormPackageId={pkg.id}
          userId={userId}
          onComplete={onScormComplete}
        />
      );
    }

    case "exam": {
      if (!lesson.exam_id) {
        return (
          <EmptyState
            icon={FileQuestion}
            title="Sınav Henüz Atanmamış"
            description="Bu ders için sınav henüz oluşturulmamıştır."
          />
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="h-20 w-20 rounded-2xl bg-warning/10 flex items-center justify-center">
            <FileQuestion className="h-10 w-10 text-warning" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {lesson.title}
            </h3>
            <p className="text-muted-foreground max-w-md">
              Sınava başlamak için aşağıdaki butona tıklayın. Sınav süresi başladığında geri sayım başlayacaktır.
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
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="h-20 w-20 rounded-2xl bg-info/10 flex items-center justify-center">
            <Video className="h-10 w-10 text-info" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {lesson.title}
            </h3>
            <p className="text-muted-foreground max-w-md">
              Canlı oturum henüz başlamamıştır veya planlanan saatte aktif olacaktır.
            </p>
          </div>
          <Button variant="outline" disabled>
            <Video className="h-4 w-4 mr-2" />
            Oturum Bekleniyor
          </Button>
        </div>
      );
    }

    case "content": {
      if (lesson.content_url) {
        // Check if it's a video or embeddable URL
        const isVideo =
          lesson.content_url.endsWith(".mp4") ||
          lesson.content_url.endsWith(".webm");
        const isPdf = lesson.content_url.endsWith(".pdf");

        if (isVideo) {
          return (
            <div className="flex items-center justify-center h-full p-4">
              <video
                src={lesson.content_url}
                controls
                className="max-w-full max-h-full rounded-lg"
              >
                Tarayıcınız video oynatmayı desteklemiyor.
              </video>
            </div>
          );
        }

        if (isPdf) {
          return (
            <iframe
              src={lesson.content_url}
              className="w-full h-full border-0 rounded-lg"
              title={lesson.title}
            />
          );
        }

        // Generic iframe embed
        return (
          <iframe
            src={lesson.content_url}
            className="w-full h-full border-0 rounded-lg"
            title={lesson.title}
            sandbox="allow-scripts allow-same-origin"
          />
        );
      }

      return (
        <EmptyState
          icon={FileText}
          title="İçerik Henüz Yüklenmemiş"
          description="Bu ders için içerik henüz yüklenmemiştir."
        />
      );
    }

    default:
      return (
        <EmptyState
          icon={BookOpen}
          title="Bilinmeyen Ders Tipi"
          description="Bu ders tipi desteklenmemektedir."
        />
      );
  }
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center h-full gap-4">
        <Icon className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground text-center max-w-md">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
