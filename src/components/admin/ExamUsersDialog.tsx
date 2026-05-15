import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileQuestion, Search, Trash2, Plus, X } from "lucide-react";

interface ExamUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examTitle: string;
  courseId: string;
}

export function ExamUsersDialog({ open, onOpenChange, examId, examTitle, courseId }: ExamUsersDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [assignMode, setAssignMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [assignSearch, setAssignSearch] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["exam-users", examId, courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, user_id, status, profiles!inner(first_name, last_name, tc_identity, firms(name))")
        .eq("course_id", courseId)
        .is("deleted_at", null);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!courseId,
  });

  const { data: results = [] } = useQuery({
    queryKey: ["exam-results-by-exam", examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("user_id, score, status")
        .eq("exam_id", examId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!examId,
  });

  const { data: availableUsers = [] } = useQuery({
    queryKey: ["available-users-exam", courseId, enrollments.map(e => e.user_id)],
    queryFn: async () => {
      const enrolledIds = enrollments.map(e => e.user_id);
      let q = supabase
        .from("profiles")
        .select("user_id, first_name, last_name, tc_identity, firms(name)")
        .limit(500);
      if (enrolledIds.length > 0) q = q.not("user_id", "in", `(${enrolledIds.join(",")})`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: open && assignMode,
  });

  const assignMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const rows = userIds.map(uid => ({ user_id: uid, course_id: courseId, status: "pending" as const }));
      const { error } = await supabase.from("enrollments").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-users", examId, courseId] });
      toast({ title: "Kullanıcılar atandı" });
      setSelectedUserIds(new Set());
      setAssignMode(false);
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from("enrollments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-users", examId, courseId] });
      toast({ title: "Atama kaldırıldı" });
      setConfirmRemoveId(null);
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const resultMap = new Map<string, { best: number; attempts: number; passed: boolean }>();
  results.forEach(r => {
    const cur = resultMap.get(r.user_id) || { best: 0, attempts: 0, passed: false };
    cur.attempts += 1;
    if (r.score > cur.best) cur.best = r.score;
    if (r.status === "passed") cur.passed = true;
    resultMap.set(r.user_id, cur);
  });

  const filtered = enrollments.filter(e => {
    const p = e.profiles as any;
    const q = search.toLowerCase();
    return !q || `${p?.first_name} ${p?.last_name} ${p?.tc_identity || ""}`.toLowerCase().includes(q);
  });

  const filteredAvailable = availableUsers.filter(u => {
    const q = assignSearch.toLowerCase();
    return !q || `${u.first_name} ${u.last_name} ${u.tc_identity || ""}`.toLowerCase().includes(q);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              {examTitle} - Atanan Kullanıcılar
            </DialogTitle>
            <DialogDescription>
              {enrollments.length} kullanıcı bu sınavın kursuna kayıtlı
            </DialogDescription>
          </DialogHeader>

          {!assignMode ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Button onClick={() => setAssignMode(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Kullanıcı Ata
                </Button>
              </div>
              <ScrollArea className="max-h-[450px]">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : filtered.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">Kayıtlı kullanıcı yok</p>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(e => {
                      const p = e.profiles as any;
                      const r = resultMap.get(e.user_id);
                      return (
                        <div key={e.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{p?.first_name} {p?.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {p?.tc_identity || "-"} {p?.firms?.name && `• ${p.firms.name}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {r ? (
                              <Badge variant={r.passed ? "success" : "warning"} className="text-xs">
                                {r.attempts} deneme • En iyi: %{r.best}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Denenmedi</Badge>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                              onClick={() => setConfirmRemoveId(e.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Kullanıcı ara..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} />
                </div>
                <Button variant="ghost" onClick={() => { setAssignMode(false); setSelectedUserIds(new Set()); }}>
                  <X className="h-4 w-4 mr-1" /> Vazgeç
                </Button>
              </div>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1">
                  {filteredAvailable.map(u => (
                    <label key={u.user_id} className="flex items-center gap-3 border rounded-lg p-2 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={selectedUserIds.has(u.user_id)}
                        onCheckedChange={(c) => {
                          const s = new Set(selectedUserIds);
                          if (c) s.add(u.user_id); else s.delete(u.user_id);
                          setSelectedUserIds(s);
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.tc_identity || "-"} {(u.firms as any)?.name && `• ${(u.firms as any).name}`}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <Button
                disabled={selectedUserIds.size === 0 || assignMutation.isPending}
                onClick={() => assignMutation.mutate(Array.from(selectedUserIds))}
              >
                {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {selectedUserIds.size} kullanıcıyı ata
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRemoveId} onOpenChange={(o) => !o && setConfirmRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atama kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              Kullanıcının bu sınavın kursuna kaydı iptal edilecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemoveId && removeMutation.mutate(confirmRemoveId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
