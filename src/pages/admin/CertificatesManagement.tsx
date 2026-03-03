import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Award, RefreshCw, Loader2, Ban, CheckCircle, Calendar,
  Download, Users, Zap, Eye,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Certificate = Database["public"]["Tables"]["certificates"]["Row"];
type DangerClass = Database["public"]["Enums"]["danger_class"];

const dangerClassLabels: Record<DangerClass, string> = {
  low: "Az Tehlikeli",
  medium: "Tehlikeli",
  high: "Çok Tehlikeli",
};

const dangerBadgeVariant: Record<DangerClass, "success" | "warning" | "destructive"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
};

export default function CertificatesManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all certificates
  const { data: certificates, isLoading } = useQuery({
    queryKey: ["admin-certificates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Certificate[];
    },
  });

  // Fetch completed enrollments without certificates (for bulk generation)
  const { data: pendingEnrollments } = useQuery({
    queryKey: ["admin-pending-certificates"],
    queryFn: async () => {
      // Get completed enrollments
      const { data: enrollments, error: eErr } = await supabase
        .from("enrollments")
        .select("id, user_id, course_id, completed_at")
        .eq("status", "completed");
      if (eErr) throw eErr;

      // Get existing certificate enrollment IDs
      const { data: existingCerts, error: cErr } = await supabase
        .from("certificates")
        .select("enrollment_id");
      if (cErr) throw cErr;

      const certEnrollmentIds = new Set(existingCerts?.map((c) => c.enrollment_id));
      const pending = enrollments?.filter((e) => !certEnrollmentIds.has(e.id)) || [];

      // Get course titles
      if (pending.length === 0) return [];
      const courseIds = [...new Set(pending.map((e) => e.course_id))];
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title")
        .in("id", courseIds);
      const courseMap = new Map(courses?.map((c) => [c.id, c.title]));

      // Get user names
      const userIds = [...new Set(pending.map((e) => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return pending.map((e) => ({
        ...e,
        course_title: courseMap.get(e.course_id) || "Bilinmiyor",
        user_name: profileMap.get(e.user_id)
          ? `${profileMap.get(e.user_id)!.first_name} ${profileMap.get(e.user_id)!.last_name}`
          : "Bilinmiyor",
      }));
    },
  });

  // Revoke certificate
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("certificates")
        .update({ is_valid: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
      toast({ title: "Başarılı", description: "Sertifika iptal edildi." });
      setRevokeDialogOpen(false);
      setSelectedCert(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "İptal işlemi başarısız.", variant: "destructive" });
    },
  });

  // Reactivate certificate
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("certificates")
        .update({ is_valid: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
      toast({ title: "Başarılı", description: "Sertifika yeniden aktifleştirildi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem başarısız.", variant: "destructive" });
    },
  });

  // Bulk generate certificates
  const handleBulkGenerate = async () => {
    if (!pendingEnrollments || pendingEnrollments.length === 0) return;
    setBulkGenerating(true);

    let successCount = 0;
    let failCount = 0;

    for (const enrollment of pendingEnrollments) {
      try {
        const { error } = await supabase.functions.invoke("generate-certificate", {
          body: { enrollment_id: enrollment.id },
        });
        if (error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    setBulkGenerating(false);
    setBulkDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-certificates"] });

    toast({
      title: "Toplu Üretim Tamamlandı",
      description: `${successCount} başarılı, ${failCount} başarısız.`,
    });
  };

  // Bulk revoke selected
  const handleBulkRevoke = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("certificates")
      .update({ is_valid: false })
      .in("id", ids);

    if (error) {
      toast({ title: "Hata", description: "Toplu iptal başarısız.", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
      toast({ title: "Başarılı", description: `${ids.length} sertifika iptal edildi.` });
      setSelectedIds(new Set());
    }
  };

  // Filter
  const filtered = certificates?.filter((cert) => {
    const matchesSearch =
      searchQuery === "" ||
      cert.holder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.course_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.holder_tc?.includes(searchQuery);

    const now = new Date();
    const isExpired = cert.expiry_date && new Date(cert.expiry_date) < now;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "valid" && cert.is_valid && !isExpired) ||
      (statusFilter === "expired" && isExpired) ||
      (statusFilter === "revoked" && !cert.is_valid);

    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filtered) return;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  const getCertStatus = (cert: Certificate) => {
    if (!cert.is_valid) return <Badge variant="destructive">İptal Edildi</Badge>;
    if (cert.expiry_date && new Date(cert.expiry_date) < new Date())
      return <Badge variant="warning">Süresi Doldu</Badge>;
    return <Badge variant="success">Geçerli</Badge>;
  };

  const totalValid = certificates?.filter((c) => c.is_valid && (!c.expiry_date || new Date(c.expiry_date) >= new Date())).length || 0;
  const totalExpired = certificates?.filter((c) => c.expiry_date && new Date(c.expiry_date) < new Date()).length || 0;
  const totalRevoked = certificates?.filter((c) => !c.is_valid).length || 0;

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sertifika Yönetimi</h1>
            <p className="text-muted-foreground">Sertifika listesi, iptal ve toplu üretim</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-certificates"] })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="destructive" onClick={handleBulkRevoke}>
                <Ban className="mr-2 h-4 w-4" />
                {selectedIds.size} Sertifika İptal Et
              </Button>
            )}
            <Button variant="accent" onClick={() => setBulkDialogOpen(true)}>
              <Zap className="mr-2 h-4 w-4" />
              Toplu Üret ({pendingEnrollments?.length || 0})
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Toplam", value: certificates?.length || 0, icon: Award, color: "text-info", bg: "bg-info/10" },
            { label: "Geçerli", value: totalValid, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
            { label: "Süresi Dolmuş", value: totalExpired, icon: Calendar, color: "text-warning", bg: "bg-warning/10" },
            { label: "İptal Edilmiş", value: totalRevoked, icon: Ban, color: "text-destructive", bg: "bg-destructive/10" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="İsim, sertifika no, TC veya kurs ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="valid">Geçerli</SelectItem>
                  <SelectItem value="expired">Süresi Dolmuş</SelectItem>
                  <SelectItem value="revoked">İptal Edilmiş</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="h-5 w-5" />
              Sertifikalar
              {filtered && <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered && filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Sahip</TableHead>
                    <TableHead className="hidden md:table-cell">Sertifika No</TableHead>
                    <TableHead className="hidden lg:table-cell">Kurs</TableHead>
                    <TableHead className="hidden lg:table-cell">Tehlike</TableHead>
                    <TableHead className="hidden md:table-cell">Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cert) => (
                    <TableRow key={cert.id} className={selectedIds.has(cert.id) ? "bg-accent/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(cert.id)}
                          onCheckedChange={() => toggleSelect(cert.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{cert.holder_name}</p>
                          {cert.holder_tc && (
                            <p className="text-xs text-muted-foreground">TC: {cert.holder_tc.slice(0, 3)}***</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {cert.certificate_number}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                        {cert.course_title}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {cert.danger_class ? (
                          <Badge variant={dangerBadgeVariant[cert.danger_class]}>
                            {dangerClassLabels[cert.danger_class]}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        <div>{formatDate(cert.issue_date)}</div>
                        <div className="text-xs">→ {formatDate(cert.expiry_date)}</div>
                      </TableCell>
                      <TableCell>{getCertStatus(cert)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedCert(cert); setDetailDialogOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {cert.is_valid ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => { setSelectedCert(cert); setRevokeDialogOpen(true); }}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-success"
                              onClick={() => reactivateMutation.mutate(cert.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Sertifika bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revoke Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sertifika İptal Et</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedCert?.certificate_number}</strong> numaralı sertifikayı iptal etmek istediğinize emin misiniz?
              Bu işlem sertifikayı geçersiz kılacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedCert && revokeMutation.mutate(selectedCert.id)}
            >
              İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Generate Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Sertifika Üretimi</DialogTitle>
            <DialogDescription>
              Eğitimini tamamlamış ancak henüz sertifikası oluşturulmamış kayıtlar için otomatik sertifika üretilecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {pendingEnrollments && pendingEnrollments.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Users className="h-4 w-4" />
                  {pendingEnrollments.length} bekleyen kayıt
                </div>
                <div className="max-h-[200px] overflow-y-auto border rounded-lg divide-y">
                  {pendingEnrollments.map((e) => (
                    <div key={e.id} className="px-3 py-2 text-sm flex justify-between">
                      <span className="text-foreground">{e.user_name}</span>
                      <span className="text-muted-foreground truncate ml-2 max-w-[180px]">{e.course_title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Bekleyen sertifika kaydı bulunmuyor.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Kapat</Button>
            <Button
              variant="accent"
              disabled={!pendingEnrollments?.length || bulkGenerating}
              onClick={handleBulkGenerate}
            >
              {bulkGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Üretiliyor...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" />Tümünü Üret</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sertifika Detayı</DialogTitle>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Sertifika No:</span>
                <span className="font-mono font-medium">{selectedCert.certificate_number}</span>
                <span className="text-muted-foreground">Sahip:</span>
                <span className="font-medium">{selectedCert.holder_name}</span>
                <span className="text-muted-foreground">TC Kimlik:</span>
                <span>{selectedCert.holder_tc || "-"}</span>
                <span className="text-muted-foreground">Kurs:</span>
                <span>{selectedCert.course_title}</span>
                <span className="text-muted-foreground">Tehlike Sınıfı:</span>
                <span>{selectedCert.danger_class ? dangerClassLabels[selectedCert.danger_class] : "-"}</span>
                <span className="text-muted-foreground">Süre:</span>
                <span>{selectedCert.duration_hours ? `${selectedCert.duration_hours} saat` : "-"}</span>
                <span className="text-muted-foreground">Veriliş Tarihi:</span>
                <span>{formatDate(selectedCert.issue_date)}</span>
                <span className="text-muted-foreground">Geçerlilik:</span>
                <span>{formatDate(selectedCert.expiry_date)}</span>
                <span className="text-muted-foreground">Durum:</span>
                <span>{getCertStatus(selectedCert)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
