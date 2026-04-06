import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  QrCode, Copy, Users, Clock, MapPin, Calendar,
  CheckCircle2, XCircle, AlertTriangle, Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateF2FAttendancePDF } from "@/lib/f2fPdfExport";

interface SessionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
}

const statusColors: Record<string, string> = {
  attended: "text-green-600",
  absent: "text-red-600",
  late: "text-yellow-600",
  partially_attended: "text-orange-600",
  pending: "text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  attended: "Katıldı",
  absent: "Katılmadı",
  late: "Geç Katıldı",
  partially_attended: "Kısmi",
  pending: "Beklemede",
};

export function SessionDetailDialog({ open, onOpenChange, sessionId }: SessionDetailDialogProps) {
  const { toast } = useToast();

  const { data: session } = useQuery({
    queryKey: ["f2f-session-detail", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("face_to_face_sessions")
        .select("*, firms(name), lessons(title), courses(title)")
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId && open,
  });

  const { data: attendanceRaw = [] } = useQuery({
    queryKey: ["f2f-session-attendance", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("face_to_face_attendance")
        .select("*")
        .eq("session_id", sessionId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && open,
    refetchInterval: open ? 10000 : false,
  });

  // Fetch profiles separately to avoid FK join issues
  const attUserIds = attendanceRaw.map((a: any) => a.user_id);
  const { data: attProfiles = [] } = useQuery({
    queryKey: ["f2f-att-profiles", attUserIds.sort().join(",")],
    queryFn: async () => {
      if (attUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, tc_identity")
        .in("user_id", attUserIds);
      if (error) throw error;
      return data || [];
    },
    enabled: attUserIds.length > 0 && open,
  });

  const profileMap = new Map(attProfiles.map((p: any) => [p.user_id, p]));
  const attendance = attendanceRaw.map((a: any) => ({
    ...a,
    profiles: profileMap.get(a.user_id) || null,
  }));

  if (!session) return null;

  const qrUrl = `${window.location.origin}/attend?token=${session.qr_token}`;
  const attendedCount = attendance.filter((a: any) => a.status === "attended" || a.status === "late").length;

  const copyCode = () => {
    navigator.clipboard.writeText(session.attendance_code || "");
    toast({ title: "Ders kodu kopyalandı" });
  };

  const copyQrLink = () => {
    navigator.clipboard.writeText(qrUrl);
    toast({ title: "QR linki kopyalandı" });
  };

  const handleExportPDF = () => {
    generateF2FAttendancePDF(session, attendance);
    toast({ title: "PDF oluşturuldu" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Oturum Detayı
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="qr">QR Kod & Ders Kodu</TabsTrigger>
            <TabsTrigger value="live">Canlı Katılım ({attendedCount})</TabsTrigger>
            <TabsTrigger value="export">Dışa Aktar</TabsTrigger>
          </TabsList>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* QR Code */}
              <Card>
                <CardContent className="pt-6 flex flex-col items-center gap-4">
                  <h3 className="font-semibold text-sm">QR Kod ile Katılım</h3>
                  <div className="p-4 bg-white rounded-lg border">
                    <QRCodeSVG value={qrUrl} size={200} level="H" />
                  </div>
                  <Button variant="outline" size="sm" onClick={copyQrLink}>
                    <Copy className="h-3.5 w-3.5 mr-1" />Linki Kopyala
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Öğrenciler bu QR kodu tarayarak katılım kaydı yapabilir
                  </p>
                </CardContent>
              </Card>

              {/* Lesson Code */}
              <Card>
                <CardContent className="pt-6 flex flex-col items-center gap-4">
                  <h3 className="font-semibold text-sm">Ders Kodu ile Katılım</h3>
                  <div className="bg-muted rounded-lg px-8 py-6">
                    <span className="text-4xl font-mono font-bold tracking-[0.3em] text-primary">
                      {session.attendance_code}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="h-3.5 w-3.5 mr-1" />Kodu Kopyala
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Öğrenciler <strong>/attend</strong> sayfasında bu kodu girerek katılabilir
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Session Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{session.session_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{session.start_time?.toString().slice(0, 5)} - {session.end_time?.toString().slice(0, 5)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{session.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{attendedCount} / {session.capacity}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Attendance Tab */}
          <TabsContent value="live">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Katılımcı</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Yöntem</TableHead>
                      <TableHead>Giriş Saati</TableHead>
                      <TableHead>Eğitmen Onay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Henüz katılım kaydı yok
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendance.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">
                            {a.profiles?.first_name} {a.profiles?.last_name}
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm ${statusColors[a.status] || ""}`}>
                              {statusLabels[a.status] || a.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {a.join_method === "qr" ? "QR Kod" : a.join_method === "code" ? "Ders Kodu" : "Admin"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {a.check_in_time
                              ? new Date(a.check_in_time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {a.trainer_verified ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">Yoklama Tutanağı (PDF)</h3>
                <p className="text-sm text-muted-foreground">
                  Resmi yoklama tutanağını PDF olarak indirin. Tutanak; firma bilgileri,
                  oturum detayları, katılımcı listesi ve imza sütunları içerir.
                </p>
                <Button onClick={handleExportPDF}>
                  <Download className="h-4 w-4 mr-2" />PDF İndir
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
