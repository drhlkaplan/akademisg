import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type JoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

interface JoinRequestRow {
  id: string;
  user_id: string;
  course_id: string;
  firm_id: string | null;
  status: JoinRequestStatus;
  note: string | null;
  decision_note: string | null;
  requested_at: string;
  decided_at: string | null;
  profiles?: { first_name: string | null; last_name: string | null; tc_identity: string | null } | null;
  courses?: { title: string | null } | null;
  firms?: { name: string | null } | null;
}

const statusLabels: Record<JoinRequestStatus, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal",
};

const statusVariant: Record<JoinRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
  cancelled: "outline",
};

export default function JoinRequests() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<JoinRequestStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ mode: "approve" | "reject"; ids: string[] } | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-join-requests", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("course_join_requests")
        .select(
          `id, user_id, course_id, firm_id, status, note, decision_note, requested_at, decided_at,
           profiles:profiles!course_join_requests_user_id_fkey(first_name,last_name,tc_identity),
           courses:courses!course_join_requests_course_id_fkey(title),
           firms:firms!course_join_requests_firm_id_fkey(name)`
        )
        .order("requested_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) {
        // Fallback without FK aliases if relationships not auto-detected
        const { data: d2, error: e2 } = await supabase
          .from("course_join_requests")
          .select("id, user_id, course_id, firm_id, status, note, decision_note, requested_at, decided_at")
          .order("requested_at", { ascending: false })
          .limit(500);
        if (e2) throw e2;
        // hydrate manually
        const userIds = Array.from(new Set(d2.map((r) => r.user_id)));
        const courseIds = Array.from(new Set(d2.map((r) => r.course_id)));
        const firmIds = Array.from(new Set(d2.map((r) => r.firm_id).filter(Boolean) as string[]));
        const [{ data: profs }, { data: crs }, { data: fms }] = await Promise.all([
          supabase.from("profiles").select("user_id, first_name, last_name, tc_identity").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
          supabase.from("courses").select("id, title").in("id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]),
          firmIds.length
            ? supabase.from("firms").select("id, name").in("id", firmIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const pMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
        const cMap = new Map((crs || []).map((c: any) => [c.id, c]));
        const fMap = new Map((fms || []).map((f: any) => [f.id, f]));
        return (statusFilter === "all" ? d2 : d2.filter((r) => r.status === statusFilter)).map((r) => ({
          ...r,
          profiles: pMap.get(r.user_id) || null,
          courses: cMap.get(r.course_id) || null,
          firms: r.firm_id ? fMap.get(r.firm_id) || null : null,
        })) as JoinRequestRow[];
      }
      return data as unknown as JoinRequestRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data || [];
    return (data || []).filter((r) => {
      const name = `${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}`.toLowerCase();
      const tc = (r.profiles?.tc_identity || "").toLowerCase();
      const course = (r.courses?.title || "").toLowerCase();
      const firm = (r.firms?.name || "").toLowerCase();
      return name.includes(term) || tc.includes(term) || course.includes(term) || firm.includes(term);
    });
  }, [data, search]);

  const pendingIds = useMemo(
    () => filtered.filter((r) => r.status === "pending").map((r) => r.id),
    [filtered]
  );
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const decide = useMutation({
    mutationFn: async ({ mode, ids, note }: { mode: "approve" | "reject"; ids: string[]; note: string }) => {
      const fn = mode === "approve" ? "approve_join_request" : "reject_join_request";
      const results = await Promise.allSettled(
        ids.map((id) =>
          supabase.rpc(fn, { _request_id: id, _note: note || null })
        )
      );
      const errors = results
        .map((r, i) => (r.status === "rejected" ? `${ids[i]}: ${(r.reason as Error).message}` : (r.value as any).error ? `${ids[i]}: ${(r.value as any).error.message}` : null))
        .filter(Boolean);
      return { ok: ids.length - errors.length, errors };
    },
    onSuccess: ({ ok, errors }, vars) => {
      toast({
        title: vars.mode === "approve" ? "Onay tamamlandı" : "Red tamamlandı",
        description: `${ok} kayıt işlendi${errors.length ? `, ${errors.length} hata` : ""}.`,
        variant: errors.length ? "destructive" : "default",
      });
      setSelected(new Set());
      setDialog(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-join-requests"] });
    },
    onError: (e: Error) => {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    },
  });

  const openDialog = (mode: "approve" | "reject", ids: string[]) => {
    if (!ids.length) return;
    setDialog({ mode, ids });
    setNote("");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Katılma Talepleri</h1>
            <p className="text-muted-foreground text-sm">
              Eğitime kayıt taleplerini inceleyin ve onaylayın/reddedin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Talepler ({filtered.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ad, TC, eğitim, firma ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setSelected(new Set()); }}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="approved">Onaylanan</SelectItem>
                  <SelectItem value="rejected">Reddedilen</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                  <SelectItem value="all">Tümü</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {selected.size > 0 && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">{selected.size} talep seçildi</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" onClick={() => openDialog("approve", Array.from(selected))}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Toplu Onayla
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openDialog("reject", Array.from(selected))}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Toplu Reddet
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPendingSelected}
                        onCheckedChange={toggleAll}
                        disabled={pendingIds.length === 0}
                        aria-label="Tümünü seç"
                      />
                    </TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Eğitim</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Talep Tarihi</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Not</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Kayıt bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => {
                      const isPending = r.status === "pending";
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(r.id)}
                              onCheckedChange={() => toggleOne(r.id)}
                              disabled={!isPending}
                              aria-label="Seç"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {r.profiles?.first_name || ""} {r.profiles?.last_name || ""}
                            </div>
                            {r.profiles?.tc_identity && (
                              <div className="text-xs text-muted-foreground">{r.profiles.tc_identity}</div>
                            )}
                          </TableCell>
                          <TableCell>{r.courses?.title || "—"}</TableCell>
                          <TableCell>{r.firms?.name || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(r.requested_at), "d MMM yyyy HH:mm", { locale: tr })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant[r.status]}>{statusLabels[r.status]}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={r.note || r.decision_note || ""}>
                            {r.decision_note || r.note || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {isPending ? (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => openDialog("approve", [r.id])}>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Onayla
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openDialog("reject", [r.id])}>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reddet
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {r.decided_at ? format(new Date(r.decided_at), "d MMM HH:mm", { locale: tr }) : "—"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "approve" ? "Talepleri Onayla" : "Talepleri Reddet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {dialog?.ids.length} talep işlenecek. İsterseniz bir not bırakabilirsiniz.
            </p>
            <Textarea
              placeholder="Not (opsiyonel)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={decide.isPending}>
              Vazgeç
            </Button>
            <Button
              variant={dialog?.mode === "reject" ? "destructive" : "default"}
              disabled={decide.isPending}
              onClick={() =>
                dialog && decide.mutate({ mode: dialog.mode, ids: dialog.ids, note })
              }
            >
              {decide.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {dialog?.mode === "approve" ? "Onayla" : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
