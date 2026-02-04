import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Search,
  Filter,
  Clock,
  Users,
  Star,
  ArrowRight,
  BookOpen,
  Award,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DangerClass = Database["public"]["Enums"]["danger_class"];

interface Course {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  thumbnail_url: string | null;
  category: {
    id: string;
    name: string;
    danger_class: DangerClass;
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

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          description,
          duration_minutes,
          thumbnail_url,
          category:course_categories(
            id,
            name,
            danger_class
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses((data as Course[]) || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      course.category?.danger_class === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-primary py-16">
        <div className="container">
          <div className="max-w-2xl">
            <Badge variant="active" className="mb-4">
              <BookOpen className="h-3 w-3 mr-1" />
              Online Eğitimler
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              İSG Eğitim Kataloğu
            </h1>
            <p className="text-primary-foreground/70">
              Tehlike sınıfınıza uygun, SCORM tabanlı online eğitimlerle yasal
              zorunluluklarınızı karşılayın.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 bg-secondary/50 border-b border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Eğitim ara..."
                className="pl-10 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-card">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tehlike Sınıfı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="low">Az Tehlikeli</SelectItem>
                  <SelectItem value="medium">Tehlikeli</SelectItem>
                  <SelectItem value="high">Çok Tehlikeli</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Course Grid */}
      <section className="py-12">
        <div className="container">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Eğitim bulunamadı
              </h3>
              <p className="text-muted-foreground">
                Arama kriterlerinize uygun eğitim bulunamamıştır.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const dangerClass = course.category?.danger_class || "low";

                return (
                  <div
                    key={course.id}
                    className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-accent/50"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-secondary overflow-hidden">
                      <img
                        src={course.thumbnail_url || "/placeholder.svg"}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Badge
                        variant={dangerClassBadge[dangerClass]}
                        className="absolute top-3 left-3"
                      >
                        {dangerClassLabel[dangerClass]}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-semibold text-lg text-foreground mb-2 group-hover:text-accent transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {course.description || "Eğitim açıklaması"}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {Math.round(course.duration_minutes / 60)} Saat
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {Math.floor(Math.random() * 2000 + 500)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          {(Math.random() * 0.5 + 4.5).toFixed(1)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button variant="accent" className="flex-1" asChild>
                          <Link to={`/courses/${course.id}`}>
                            Eğitime Başla
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="icon">
                          <Award className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
