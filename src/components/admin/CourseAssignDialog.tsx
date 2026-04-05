import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CourseAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Assign to specific user IDs */
  userIds?: string[];
  /** Assign to all users in a firm */
  firmId?: string;
  /** Label shown in dialog header */
  targetLabel: string;
}

export function CourseAssignDialog({
  open,
  onOpenChange,
  userIds,
  firmId,
  targetLabel,
}: CourseAssignDialogProps) {
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-courses-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, hazard_class_new, training_type, duration_minutes")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // When assigning to a firm, get all user_ids in that firm
  const { data: firmUserIds = [] } = useQuery({
    queryKey: ["firm-user-ids", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data.map((p) => p.user_id);
    },
    enabled: open && !!firmId,
  });

  const resolvedUserIds = userIds ?? firmUserIds;

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (resolvedUserIds.length === 0 || selectedCourseIds.length === 0) {
        throw new Error("Kullanıcı veya kurs seçilmedi");
      }

      const inserts = resolvedUserIds.flatMap((userId) =>
        selectedCourseIds.map((courseId) => ({
          user_id: userId,
          course_id: courseId,
          status: "active" as const,
          started_at: new Date().toISOString(),
        }))
      );

      // Insert in batches to avoid conflicts
      const results: { success: number; skipped: number } = { success: 0, skipped: 0 };
      for (const ins of inserts) {
        const { error } = await supabase.from("enrollments").insert(ins);
        if (error) {
          if (error.code === "23505") {
            results.skipped++;
          } else {
            console.error("Enrollment insert error:", error);
            results.skipped++;
          }
        } else {
          results.success++;
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-firms"] });
      queryClient.invalidateQueries({ queryKey: ["user-enrollments"] });
      toast({
        title: "Kurs Atama Tamamlandı",
        description: `${results.success} kayıt oluşturuldu${results.skipped > 0 ? `, ${results.skipped} zaten kayıtlı` : ""}.`,
      });
      setSelectedCourseIds([]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Kurs atanırken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const hazardLabels: Record<string, string> = {
    az_tehlikeli: "Az Tehlikeli",
    tehlikeli: "Tehlikeli",
    cok_tehlikeli: "Çok Tehlikeli",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Kurs Ata
          </DialogTitle>
          <DialogDescription>
            {targetLabel} için kurs seçin.
            {firmId && ` (${resolvedUserIds.length} çalışan)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kurs ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            {coursesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Kurs bulunamadı</p>
            ) : (
              <div className="space-y-1">
                {filteredCourses.map((course) => (
                  <label
                    key={course.id}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedCourseIds.includes(course.id)}
                      onCheckedChange={() => toggleCourse(course.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{course.title}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {course.hazard_class_new && (
                          <Badge variant="secondary" className="text-xs">
                            {hazardLabels[course.hazard_class_new] || course.hazard_class_new}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {Math.round((course.duration_minutes || 0) / 60)} saat
                        </Badge>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedCourseIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedCourseIds.length} kurs seçildi
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending || selectedCourseIds.length === 0}
          >
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kurs Ata ({selectedCourseIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
