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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Users, Trash2, Plus, X } from "lucide-react";

interface CourseEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
}

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  active: "Devam Ediyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  expired: "Süresi Dolmuş",
};

export function CourseEnrollmentsDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
}: CourseEnrollmentsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["course-enrollments", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(
          `id, user_id, status, progress_percent, started_at, completed_at, created_at,
           profiles:profiles!inner(first_name, last_name, tc_identity, firm_id, firms(name))`
        )
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: open && !!courseId,
  });

  const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));

  const { data: availableUsers = [] } = useQuery({
    queryKey: ["assignable-users", courseId, assignSearch],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("user_id, first_name, last_name, tc_identity, firms(name)")
        .is("deleted_at", null)
        .limit(50);
      if (assignSearch.trim()) {
        const s = `%${assignSearch.trim()}%`;
        q = q.or(`first_name.ilike.${s},last_name.ilike.${s},tc_identity.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]).filter((u) => !enrolledUserIds.has(u.user_id));
    },
    enabled: open && showAssign,
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
      queryClient.invalidateQueries({ queryKey: ["course-enrollments", courseId] });
      queryClient.invalidateQueries({ queryKey: ["user-enrollments"] });
      toast({ title: "Atama iptal edildi" });
      setConfirmRemoveId(null);
    },
    onError: (e: any) =>
      toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("enrollments")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-enrollments", courseId] });
      toast({ title: "Durum güncellendi" });
    },
    onError: (e: any) =>
      toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      let success = 0;
      let skipped = 0;
      for (const userId of selectedUserIds) {
        const { error } = await supabase.from("enrollments").insert({
          user_id: userId,
          course_id: courseId,
          status: "active" as any,
          started_at: new Date().toISOString(),
        });
        if (error) skipped++;
        else success++;
      }
      return { success, skipped };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["course-enrollments", courseId] });
      toast({
        title: "Kullanıcılar atandı",
        description: `${r.success} eklendi${r.skipped ? `, ${r.skipped} atlandı` : ""}.`,
      });
      setSelectedUserIds([]);
      setShowAssign(false);
    },
    onError: (e: any) =>
      toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const filtered = enrollments.filter((e) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const p = e.profiles;
    return (
      p?.first_name?.toLowerCase().includes(s) ||
      p?.last_name?.toLowerCase().includes(s) ||
      p?.tc_identity?.includes(s)
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {courseTitle} - Kayıtlı Kullanıcılar
            </DialogTitle>
            <DialogDescription>
              {enrollments.length} kayıt · Atama, iptal ve durum yönetimi
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowAssign(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Kullanıcı Ata
            </Button>
          </div>

          <ScrollArea className="flex-1 border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Kayıt bulunamadı</p>
            ) : (
              <div className="divide-y">
                {filtered.map((e) => {
                  const p = e.profiles;
                  return (
                    <div key={e.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p?.first_name} {p?.last_name}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          {p?.tc_identity && <span>TC: {p.tc_identity}</span>}
                          {p?.firms?.name && <span>· {p.firms.name}</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={e.progress_percent || 0} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            %{e.progress_percent || 0}
                          </span>
                        </div>
                      </div>
                      <Select
                        value={e.status || "pending"}
                        onValueChange={(v) =>
                          statusMutation.mutate({ id: e.id, status: v })
                        }
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmRemoveId(e.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Assign users dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kullanıcı Ata</DialogTitle>
            <DialogDescription>{courseTitle}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="İsim veya TC ara..."
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-[320px] border rounded-md p-2">
            {availableUsers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Kullanıcı bulunamadı
              </p>
            ) : (
              availableUsers.map((u: any) => (
                <label
                  key={u.user_id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedUserIds.includes(u.user_id)}
                    onCheckedChange={() =>
                      setSelectedUserIds((prev) =>
                        prev.includes(u.user_id)
                          ? prev.filter((x) => x !== u.user_id)
                          : [...prev, u.user_id]
                      )
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {u.tc_identity || ""} {u.firms?.name ? `· ${u.firms.name}` : ""}
                    </p>
                  </div>
                </label>
              ))
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>
              İptal
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={selectedUserIds.length === 0 || assignMutation.isPending}
            >
              {assignMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Ata ({selectedUserIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmRemoveId}
        onOpenChange={(o) => !o && setConfirmRemoveId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kayıt iptal edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Kullanıcının bu kursa olan kaydı iptal edilecek. Bu işlem geri alınamaz.
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
