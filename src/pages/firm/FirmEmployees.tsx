import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import {
  Users, Search, Loader2, UserCircle, Plus, Upload, BookOpen,
  CheckCircle, AlertCircle, FileSpreadsheet, X,
} from "lucide-react";

export default function FirmEmployees() {
  const { branding } = useFirmBranding();
  const { profile } = useAuth();
  const firmId = profile?.firm_id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [csvResults, setCsvResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add employee form
  const [newEmployee, setNewEmployee] = useState({
    first_name: "", last_name: "", email: "", password: "", tc_identity: "", phone: "",
  });

  // Assign course state
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Queries
  const { data: employees, isLoading } = useQuery({
    queryKey: ["firm-employees", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .eq("firm_id", firmId)
        .order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  const { data: enrollments } = useQuery({
    queryKey: ["firm-enrollments", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title)")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  const { data: courses } = useQuery({
    queryKey: ["active-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, duration_minutes")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Add employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: async (emp: typeof newEmployee) => {
      const { data, error } = await supabase.functions.invoke("manage-firm-employees", {
        body: { action: "add_employee", ...emp },
      });
      if (error) {
        // Extract JSON body from FunctionsHttpError
        let msg = "İşlem sırasında bir hata oluştu";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {
          if (typeof error === "object" && "message" in error) msg = (error as any).message;
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firm-employees"] });
      toast({ title: "Başarılı", description: "Çalışan eklendi." });
      setAddDialogOpen(false);
      setNewEmployee({ first_name: "", last_name: "", email: "", password: "", tc_identity: "", phone: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // CSV bulk upload mutation
  const csvUploadMutation = useMutation({
    mutationFn: async (employees: any[]) => {
      const { data, error } = await supabase.functions.invoke("manage-firm-employees", {
        body: { action: "bulk_add", employees },
      });
      if (error) {
        let msg = "İşlem sırasında bir hata oluştu";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {
          if (typeof error === "object" && "message" in error) msg = (error as any).message;
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["firm-employees"] });
      setCsvResults(data.results);
      const successCount = data.results.filter((r: any) => r.success).length;
      toast({
        title: "Toplu Yükleme Tamamlandı",
        description: `${successCount}/${data.results.length} çalışan başarıyla eklendi.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Assign course mutation
  const assignCourseMutation = useMutation({
    mutationFn: async ({ user_ids, course_id }: { user_ids: string[]; course_id: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-firm-employees", {
        body: { action: "assign_course", user_ids, course_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["firm-enrollments"] });
      toast({
        title: "Başarılı",
        description: `${data.count || selectedUserIds.length} çalışana eğitim atandı.`,
      });
      setAssignDialogOpen(false);
      setSelectedUserIds([]);
      setSelectedCourseId("");
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // CSV parsing
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast({ title: "Hata", description: "CSV dosyasında veri bulunamadı.", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
      const employees = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/[,;]/).map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const row: any = {};
        headers.forEach((h, idx) => {
          if (h === "ad" || h === "first_name" || h === "isim") row.first_name = values[idx];
          else if (h === "soyad" || h === "last_name") row.last_name = values[idx];
          else if (h === "e-posta" || h === "email" || h === "eposta") row.email = values[idx];
          else if (h === "şifre" || h === "password" || h === "sifre") row.password = values[idx];
          else if (h === "tc" || h === "tc_identity" || h === "tc kimlik" || h === "tckimlik") row.tc_identity = values[idx];
          else if (h === "telefon" || h === "phone" || h === "tel") row.phone = values[idx];
        });

        if (row.email && row.first_name && row.last_name) {
          employees.push(row);
        }
      }

      if (employees.length === 0) {
        toast({
          title: "Hata",
          description: "Geçerli çalışan verisi bulunamadı. CSV sütunları: Ad, Soyad, E-posta (zorunlu), Şifre, TC, Telefon",
          variant: "destructive",
        });
        return;
      }

      csvUploadMutation.mutate(employees);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Toggle user selection
  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (!filtered) return;
    if (selectedUserIds.length === filtered.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filtered.map((e) => e.user_id));
    }
  };

  const filtered = employees?.filter((e) => {
    const name = `${e.first_name} ${e.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || e.tc_identity?.includes(search);
  });

  return (
    <DashboardLayout userRole="company">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Çalışanlar</h1>
            <p className="text-muted-foreground">
              {branding?.name || "Firma"} çalışan yönetimi
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                setCsvResults(null);
                setCsvDialogOpen(true);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              CSV Yükle
            </Button>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(true)}
              disabled={!employees || employees.length === 0}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Eğitim Ata
            </Button>
            <Button variant="accent" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Çalışan Ekle
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" style={{ color: branding?.primary_color }} />
                Çalışanlar ({filtered?.length || 0})
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered && filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead className="hidden md:table-cell">TC Kimlik</TableHead>
                    <TableHead className="hidden md:table-cell">Telefon</TableHead>
                    <TableHead>Eğitim Durumu</TableHead>
                    <TableHead>İlerleme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => {
                    const empEnrollments = enrollments?.filter((e) => e.user_id === emp.user_id) || [];
                    const completed = empEnrollments.filter((e) => e.status === "completed").length;
                    const total = empEnrollments.length;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-8 w-8 text-muted-foreground shrink-0" />
                            <div>
                              <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(emp as any).user_roles?.map((r: any) => r.role).join(", ") || "student"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {emp.tc_identity ? `${emp.tc_identity.slice(0, 3)}***${emp.tc_identity.slice(-2)}` : "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{emp.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {completed > 0 && <Badge variant="success" className="text-xs">{completed} tamamlandı</Badge>}
                            {total - completed > 0 && <Badge variant="info" className="text-xs">{total - completed} devam</Badge>}
                            {total === 0 && <span className="text-xs text-muted-foreground">Eğitim yok</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={pct} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">%{pct}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Çalışan bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== Add Employee Dialog ====== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Çalışan Ekle</DialogTitle>
            <DialogDescription>Çalışan bilgilerini girerek hesap oluşturun</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ad *</Label>
                <Input
                  value={newEmployee.first_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                  placeholder="Ad"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Soyad *</Label>
                <Input
                  value={newEmployee.last_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                  placeholder="Soyad"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-posta *</Label>
              <Input
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                placeholder="calisan@firma.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Şifre *</Label>
              <Input
                type="text"
                value={newEmployee.password}
                onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                placeholder="En az 6 karakter"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>TC Kimlik</Label>
                <Input
                  value={newEmployee.tc_identity}
                  onChange={(e) => setNewEmployee({ ...newEmployee, tc_identity: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                  placeholder="11 haneli"
                  maxLength={11}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="0555..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>İptal</Button>
            <Button
              variant="accent"
              onClick={() => addEmployeeMutation.mutate(newEmployee)}
              disabled={addEmployeeMutation.isPending || !newEmployee.email || !newEmployee.first_name || !newEmployee.last_name || !newEmployee.password}
            >
              {addEmployeeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== CSV Upload Dialog ====== */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              CSV ile Toplu Çalışan Yükleme
            </DialogTitle>
            <DialogDescription>
              CSV dosyanızda şu sütunlar olmalıdır: <strong>Ad, Soyad, E-posta</strong> (zorunlu), Şifre, TC, Telefon
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sample format */}
            <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
              <p className="text-muted-foreground mb-1 font-sans text-xs font-medium">Örnek CSV formatı:</p>
              <p>Ad;Soyad;E-posta;Şifre;TC;Telefon</p>
              <p>Ahmet;Yılmaz;ahmet@firma.com;Sifre123;12345678901;05551234567</p>
              <p>Ayşe;Demir;ayse@firma.com;Sifre456;;05559876543</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleCsvFile}
            />

            <Button
              variant="outline"
              className="w-full h-20 border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={csvUploadMutation.isPending}
            >
              {csvUploadMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Yükleniyor...
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">CSV dosyası seçin</span>
                </div>
              )}
            </Button>

            {/* Results */}
            {csvResults && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <p className="text-sm font-medium">
                  Sonuçlar: {csvResults.filter((r) => r.success).length} başarılı, {csvResults.filter((r) => !r.success).length} hatalı
                </p>
                {csvResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs p-2 rounded ${r.success ? "bg-success/10" : "bg-destructive/10"}`}
                  >
                    {r.success ? (
                      <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                    <span className="truncate">{r.email}</span>
                    {r.error && <span className="text-destructive ml-auto shrink-0">{r.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Assign Course Dialog ====== */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Eğitim Ata
            </DialogTitle>
            <DialogDescription>Çalışanları seçin ve atamak istediğiniz eğitimi belirleyin</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Course Selection */}
            <div className="space-y-1.5">
              <Label>Eğitim *</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Eğitim seçin" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} ({c.duration_minutes} dk)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Çalışanlar ({selectedUserIds.length} seçili)</Label>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAllUsers}>
                  {selectedUserIds.length === (filtered?.length || 0) ? "Hiçbirini Seçme" : "Tümünü Seç"}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md p-1 space-y-0.5">
                {employees?.map((emp) => (
                  <label
                    key={emp.user_id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(emp.user_id)}
                      onCheckedChange={() => toggleUser(emp.user_id)}
                    />
                    <span className="text-sm">{emp.first_name} {emp.last_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>İptal</Button>
            <Button
              variant="accent"
              disabled={!selectedCourseId || selectedUserIds.length === 0 || assignCourseMutation.isPending}
              onClick={() => assignCourseMutation.mutate({ user_ids: selectedUserIds, course_id: selectedCourseId })}
            >
              {assignCourseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
              {selectedUserIds.length} Çalışana Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
