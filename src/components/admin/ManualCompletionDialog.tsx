import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { user_id: string; name: string }[];
  courses: { id: string; title: string }[];
}

export function ManualCompletionDialog({ open, onOpenChange, users, courses }: Props) {
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [score, setScore] = useState("100");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      // Find or create enrollment
      const { data: existing } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

      let enrollmentId: string;

      if (existing) {
        enrollmentId = existing.id;
        const { error } = await supabase
          .from("enrollments")
          .update({
            status: "completed" as any,
            progress_percent: 100,
            completed_at: new Date().toISOString(),
          })
          .eq("id", enrollmentId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from("enrollments")
          .insert({
            user_id: userId,
            course_id: courseId,
            status: "completed" as any,
            progress_percent: 100,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (error) throw error;
        enrollmentId = created.id;
      }

      // Update all lesson progress to completed if lessons exist
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", courseId)
        .eq("is_active", true);

      if (lessons && lessons.length > 0) {
        for (const lesson of lessons) {
          await supabase
            .from("lesson_progress")
            .upsert(
              {
                enrollment_id: enrollmentId,
                lesson_id: lesson.id,
                lesson_status: "completed",
                score_raw: Number(score),
              },
              { onConflict: "enrollment_id,lesson_id" }
            );
        }
      }

      return enrollmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-"] });
      toast({ title: "Başarılı", description: "Eğitim manuel olarak tamamlandı olarak işaretlendi." });
      onOpenChange(false);
      setUserId("");
      setCourseId("");
      setScore("100");
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message || "İşlem başarısız.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Manuel Tamamlama
          </DialogTitle>
          <DialogDescription>
            Seçilen kullanıcının eğitimini manuel olarak tamamlandı işaretle ve puan gir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Kullanıcı</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Kullanıcı seçin" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Eğitim</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Eğitim seçin" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tamamlama Puanı (0-100)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!userId || !courseId || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tamamla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
