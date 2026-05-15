import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge-custom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileQuestion } from "lucide-react";

interface UserExamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function UserExamsDialog({ open, onOpenChange, userId, userName }: UserExamsDialogProps) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["user-exams", userId],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, course:courses(title)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .in("status", ["active", "completed", "pending"]);

      const courseIds = (enrollments || []).map(e => e.course_id);
      if (courseIds.length === 0) return [];

      const { data: exams } = await supabase
        .from("exams")
        .select("id, title, course_id, exam_type, passing_score, max_attempts, is_active")
        .in("course_id", courseIds);

      const { data: results } = await supabase
        .from("exam_results")
        .select("exam_id, score, status")
        .eq("user_id", userId);

      const resMap = new Map<string, { best: number; attempts: number; passed: boolean }>();
      results?.forEach(r => {
        const cur = resMap.get(r.exam_id) || { best: 0, attempts: 0, passed: false };
        cur.attempts += 1;
        if (r.score > cur.best) cur.best = r.score;
        if (r.status === "passed") cur.passed = true;
        resMap.set(r.exam_id, cur);
      });

      return (exams || []).map(ex => {
        const enr = enrollments!.find(e => e.course_id === ex.course_id);
        const r = resMap.get(ex.id);
        return {
          id: ex.id,
          title: ex.title,
          course: (enr?.course as any)?.title || "",
          type: ex.exam_type,
          passing: ex.passing_score,
          isActive: ex.is_active,
          attempts: r?.attempts || 0,
          best: r?.best ?? null,
          passed: !!r?.passed,
        };
      });
    },
    enabled: open && !!userId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            {userName} - Sınavlar
          </DialogTitle>
          <DialogDescription>{items.length} erişilebilir sınav</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[500px]">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Erişilebilir sınav yok</p>
          ) : (
            <div className="space-y-2 pr-2">
              {items.map(it => (
                <div key={it.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{it.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{it.course}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!it.isActive && <Badge variant="secondary" className="text-xs">Pasif</Badge>}
                      {it.type && <Badge variant="info" className="text-xs">{it.type}</Badge>}
                      {it.attempts > 0 ? (
                        <Badge variant={it.passed ? "success" : "warning"} className="text-xs">
                          {it.attempts} deneme • En iyi %{it.best} {it.passed && "✓"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Denenmedi</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
