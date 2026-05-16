import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Play,
  CheckCircle,
  Loader2,
  Search,
} from "lucide-react";
import { formatLessonsShort } from "@/lib/lessonDuration";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DangerClass = Database["public"]["Enums"]["danger_class"];

interface EnrollmentWithCourse {
  id: string;
  progress_percent: number | null;
  status: string | null;
  created_at: string | null;
  course: {
    id: string;
    title: string;
    duration_minutes: number;
    category: { danger_class: DangerClass; name: string } | null;
  } | null;
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

export default function MyCourses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    fetchEnrollments();
    const ch = supabase
      .channel(`my-courses-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments", filter: `user_id=eq.${user.id}` }, () => fetchEnrollments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const fetchEnrollments = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("enrollments")
        .select(`
          id, progress_percent, status, created_at,
          course:courses(id, title, duration_minutes, category:course_categories(danger_class, name))
        `)
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      setEnrollments((data as EnrollmentWithCourse[]) || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = enrollments.filter((e) => {
    const matchesSearch =
      !searchQuery || e.course?.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && (e.status === "active" || e.status === "pending")) ||
      (statusFilter === "completed" && e.status === "completed");
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eğitimlerim</h1>
          <p className="text-muted-foreground">Kayıtlı olduğunuz tüm eğitimler</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Eğitim ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Devam Eden</SelectItem>
                  <SelectItem value="completed">Tamamlanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Eğitim bulunamadı</h3>
              <p className="text-muted-foreground">Henüz kayıtlı eğitiminiz yok veya filtreleme kriterlerine uygun eğitim bulunamadı.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((enrollment) => {
              const course = enrollment.course;
              if (!course) return null;
              const dangerClass = course.category?.danger_class || "low";
              const progress = enrollment.progress_percent || 0;
              const isCompleted = enrollment.status === "completed";

              return (
                <Card key={enrollment.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={dangerClassBadge[dangerClass]}>
                            {dangerClassLabel[dangerClass]}
                          </Badge>
                          {isCompleted && (
                            <Badge variant="success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Tamamlandı
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{course.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatLessonsShort(course.duration_minutes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            %{progress}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32">
                          <Progress value={progress} className="h-2" />
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/dashboard/courses/${enrollment.id}`}>
                            Detay
                          </Link>
                        </Button>
                        <Button variant="accent" size="sm" asChild>
                          <Link to={`/learn/${course.id}`}>
                            <Play className="h-4 w-4 mr-1" />
                            {isCompleted ? "Tekrar İzle" : "Devam Et"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
