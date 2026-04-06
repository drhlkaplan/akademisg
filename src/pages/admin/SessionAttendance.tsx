import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Download,
  UserCheck, AlertTriangle, MapPin, Calendar, Users,
} from "lucide-react";
import { generateF2FAttendancePDF } from "@/lib/f2fPdfExport";

const statusOptions = [
  { value: "attended", label: "Katıldı", icon: CheckCircle2, color: "text-green-600" },
  { value: "absent", label: "Katılmadı", icon: XCircle, color: "text-red-600" },
  { value: "late", label: "Geç Katıldı", icon: Clock, color: "text-yellow-600" },
  { value: "partially_attended", label: "Kısmi Katılım", icon: AlertTriangle, color: "text-orange-600" },
  { value: "pending", label: "Beklemede", icon: Clock, color: "text-muted-foreground" },
];

interface MergedUser {
  user_id: string;
  enrollment_id: string | null;
  first_name: string;
  last_name: string;
  tc_identity: string | null;
  attendance: any | null;
}

export default function SessionAttendance() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: session } = useQuery({
    queryKey: ["f2f-session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("face_to_face_sessions")
        .select("*, firms(name), lessons(title, course_id), courses(title)")
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  // Fetch enrolled users for this course — two-step to avoid FK join issues
  const courseId = session?.course_id || (session as any)?.lessons?.course_id;

  const { data: enrolledUsers = [] } = useQuery({
    queryKey: ["session-enrolled-users", courseId, session?.firm_id],
    queryFn: async () => {
      if (!courseId) return [];
      let query = supabase
        .from("enrollments")
        .select("id, user_id")
        .eq("course_id", courseId)
        .in("status", ["active", "pending"]);

      if (session?.firm_id) {
        query = query.eq("firm_id", session.firm_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  // Fetch attendance records with profile info
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["session-attendance", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("face_to_face_attendance")
        .select("*")
        .eq("session_id", sessionId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
    refetchInterval: 10000,
  });

  // Fetch profiles for all relevant user_ids
  const allUserIds = [
    ...new Set([
      ...enrolledUsers.map((e: any) => e.user_id),
      ...attendanceRecords.map((a: any) => a.user_id),
    ]),
  ];

  const { data: profiles = [] } = useQuery({
    queryKey: ["session-profiles", allUserIds.sort().join(",")],
    queryFn: async () => {
      if (allUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, tc_identity")
        .in("user_id", allUserIds);
      if (error) throw error;
      return data || [];
    },
    enabled: allUserIds.length > 0,
  });

  // Build merged user list: enrolled users + any attendance-only users
  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
  const attendanceMap = new Map(attendanceRecords.map((a: any) => [a.user_id, a]));
  const enrollmentMap = new Map(enrolledUsers.map((e: any) => [e.user_id, e.id]));

  const mergedUsers: MergedUser[] = [];
  const seenUsers = new Set<string>();

  // First add enrolled users
  for (const eu of enrolledUsers) {
    const uid = eu.user_id;
    seenUsers.add(uid);
    const profile = profileMap.get(uid);
    mergedUsers.push({
      user_id: uid,
      enrollment_id: eu.id,
      first_name: profile?.first_name || "—",
      last_name: profile?.last_name || "",
      tc_identity: profile?.tc_identity || null,
      attendance: attendanceMap.get(uid) || null,
    });
  }

  // Then add attendance-only users (self-attended but not in enrollment list view)
  for (const att of attendanceRecords) {
    if (!seenUsers.has(att.user_id)) {
      seenUsers.add(att.user_id);
      const profile = profileMap.get(att.user_id);
      mergedUsers.push({
        user_id: att.user_id,
        enrollment_id: att.enrollment_id,
        first_name: profile?.first_name || "—",
        last_name: profile?.last_name || "",
        tc_identity: profile?.tc_identity || null,
        attendance: att,
      });
    }
  }

  const upsertAttendance = useMutation({
    mutationFn: async ({ userId, enrollmentId, status, note }: {
      userId: string; enrollmentId: string | null; status: string; note?: string;
    }) => {
      const existing = attendanceMap.get(userId);
      if (existing) {
        const { error } = await supabase
          .from("face_to_face_attendance")
          .update({
            status: status as any,
            notes: note || existing.notes,
            check_in_time: (status === "attended" || status === "late") && !existing.check_in_time
              ? new Date().toISOString() : existing.check_in_time,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("face_to_face_attendance")
          .insert({
            session_id: sessionId!,
            user_id: userId,
            enrollment_id: enrollmentId,
            status: status as any,
            notes: note || null,
            check_in_time: (status === "attended" || status === "late") ? new Date().toISOString() : null,
            join_method: "admin",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-attendance", sessionId] });
      toast({ title: "Yoklama güncellendi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const bulkMarkAttended = useMutation({
    mutationFn: async () => {
      for (const mu of mergedUsers) {
        if (mu.attendance?.status === "attended") continue;
        await upsertAttendance.mutateAsync({
          userId: mu.user_id,
          enrollmentId: mu.enrollment_id,
          status: "attended",
        });
      }
    },
    onSuccess: () => toast({ title: "Tüm katılımcılar 'Katıldı' olarak işaretlendi" }),
  });

  const verifyAll = useMutation({
    mutationFn: async () => {
      const ids = attendanceRecords.filter((a: any) => !a.trainer_verified).map((a: any) => a.id);
      if (ids.length === 0) return;
      for (const id of ids) {
        await supabase
          .from("face_to_face_attendance")
          .update({ trainer_verified: true })
          .eq("id", id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-attendance", sessionId] });
      toast({ title: "Eğitmen onayı tamamlandı" });
    },
  });

  const handleExportPDF = () => {
    if (!session) return;
    // Build attendance data with profile info for PDF
    const attendanceWithProfiles = attendanceRecords.map((a: any) => {
      const profile = profileMap.get(a.user_id);
      return {
        ...a,
        profiles: profile ? {
          first_name: profile.first_name,
          last_name: profile.last_name,
          tc_identity: profile.tc_identity,
        } : null,
      };
    });
    generateF2FAttendancePDF(session, attendanceWithProfiles);
    toast({ title: "PDF oluşturuldu" });
  };

  const attendedCount = attendanceRecords.filter((a: any) => a.status === "attended" || a.status === "late").length;
  const verifiedCount = attendanceRecords.filter((a: any) => a.trainer_verified).length;

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/face-to-face")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Yoklama</h1>
            {session && (
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{session.session_date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{session.start_time?.toString().slice(0, 5)} - {session.end_time?.toString().slice(0, 5)}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{session.location}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{(session as any).firms?.name || "Tüm firmalar"}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{mergedUsers.length}</div>
              <div className="text-xs text-muted-foreground">Kayıtlı Öğrenci</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-600">{attendedCount}</div>
              <div className="text-xs text-muted-foreground">Katılan</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-red-600">{attendanceRecords.filter((a: any) => a.status === "absent").length}</div>
              <div className="text-xs text-muted-foreground">Katılmayan</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-600">{verifiedCount}</div>
              <div className="text-xs text-muted-foreground">Onaylanan</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => bulkMarkAttended.mutate()} disabled={bulkMarkAttended.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" />Tümünü Katıldı İşaretle
          </Button>
          <Button variant="outline" onClick={() => verifyAll.mutate()} disabled={verifyAll.isPending}>
            <UserCheck className="h-4 w-4 mr-2" />Eğitmen Onayı (Tümü)
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />PDF İndir
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Öğrenci</TableHead>
                  <TableHead>TC Kimlik</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Giriş Saati</TableHead>
                  <TableHead>Eğitmen Onay</TableHead>
                  <TableHead>Not</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Bu oturum için kayıtlı öğrenci bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  mergedUsers.map((mu) => {
                    const currentStatus = mu.attendance?.status || "pending";
                    const statusInfo = statusOptions.find(s => s.value === currentStatus) || statusOptions[4];
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={mu.user_id}>
                        <TableCell className="font-medium">
                          {mu.first_name} {mu.last_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {mu.tc_identity
                            ? `${mu.tc_identity.slice(0, 3)}*****${mu.tc_identity.slice(-2)}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                            <span className="text-sm">{statusInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {mu.attendance?.check_in_time
                            ? new Date(mu.attendance.check_in_time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {mu.attendance?.trainer_verified ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Onaylı</Badge>
                          ) : (
                            <Badge variant="secondary">Beklemede</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Textarea
                            className="min-h-[32px] h-8 text-xs resize-none"
                            placeholder="Not..."
                            value={notes[mu.user_id] ?? mu.attendance?.notes ?? ""}
                            onChange={(e) => setNotes(prev => ({ ...prev, [mu.user_id]: e.target.value }))}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={currentStatus}
                            onValueChange={(v) => upsertAttendance.mutate({
                              userId: mu.user_id,
                              enrollmentId: mu.enrollment_id,
                              status: v,
                              note: notes[mu.user_id],
                            })}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
