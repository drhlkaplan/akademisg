import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Building2,
  Loader2,
  RefreshCw,
  Users,
  UserPlus,
  X,
  Phone,
  Mail,
  MapPin,
  Palette,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Firm = Database["public"]["Tables"]["firms"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface FirmWithEmployees extends Firm {
  employee_count?: number;
}

export default function FirmsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeesDialogOpen, setEmployeesDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<FirmWithEmployees | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    tax_number: "",
    sector: "",
    address: "",
    phone: "",
    email: "",
    is_active: true,
    firm_code: "",
    logo_url: "",
    primary_color: "#f97316",
    secondary_color: "#1a2744",
    bg_color: "#f8fafc",
    welcome_message: "Eğitimlerinize hoş geldiniz",
    login_bg_url: "",
    footer_text: "",
    custom_css: "",
    favicon_url: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch firms with employee counts
  const { data: firms, isLoading } = useQuery({
    queryKey: ["admin-firms"],
    queryFn: async () => {
      const { data: firmsData, error: firmsError } = await supabase
        .from("firms")
        .select("*")
        .order("created_at", { ascending: false });

      if (firmsError) throw firmsError;

      // Get employee counts
      const { data: profiles } = await supabase
        .from("profiles")
        .select("firm_id");

      const firmCounts: Record<string, number> = {};
      profiles?.forEach((p) => {
        if (p.firm_id) {
          firmCounts[p.firm_id] = (firmCounts[p.firm_id] || 0) + 1;
        }
      });

      return firmsData.map((firm) => ({
        ...firm,
        employee_count: firmCounts[firm.id] || 0,
      })) as FirmWithEmployees[];
    },
  });

  // Fetch employees of selected firm
  const { data: firmEmployees, isLoading: employeesLoading } = useQuery({
    queryKey: ["firm-employees", selectedFirm?.id],
    queryFn: async () => {
      if (!selectedFirm?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("firm_id", selectedFirm.id)
        .order("first_name");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedFirm?.id && employeesDialogOpen,
  });

  // Fetch unassigned users for assignment
  const { data: unassignedUsers } = useQuery({
    queryKey: ["unassigned-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .is("firm_id", null)
        .order("first_name");

      if (error) throw error;
      return data;
    },
    enabled: assignDialogOpen,
  });

  // Create firm mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("firms").insert({
        name: data.name,
        tax_number: data.tax_number || null,
        sector: data.sector || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        is_active: data.is_active,
        firm_code: data.firm_code || null,
        logo_url: data.logo_url || null,
        primary_color: data.primary_color || "#f97316",
        secondary_color: data.secondary_color || "#1a2744",
        bg_color: data.bg_color || "#f8fafc",
        welcome_message: data.welcome_message || null,
        login_bg_url: data.login_bg_url || null,
        footer_text: data.footer_text || null,
        custom_css: data.custom_css || null,
        favicon_url: data.favicon_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-firms"] });
      toast({ title: "Başarılı", description: "Firma oluşturuldu." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Firma oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Update firm mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("firms")
        .update({
          name: data.name,
          tax_number: data.tax_number || null,
          sector: data.sector || null,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          is_active: data.is_active,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-firms"] });
      toast({ title: "Başarılı", description: "Firma güncellendi." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Firma güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Delete firm mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("firms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-firms"] });
      toast({ title: "Başarılı", description: "Firma silindi." });
      setDeleteDialogOpen(false);
      setSelectedFirm(null);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Firma silinirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Assign employee mutation
  const assignMutation = useMutation({
    mutationFn: async ({ userId, firmId }: { userId: string; firmId: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ firm_id: firmId })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-firms"] });
      queryClient.invalidateQueries({ queryKey: ["firm-employees"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-users"] });
      toast({ title: "Başarılı", description: "Çalışan firmaya atandı." });
      setAssignDialogOpen(false);
      setSelectedUserId("");
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çalışan atanırken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Remove employee from firm mutation
  const removeEmployeeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ firm_id: null })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-firms"] });
      queryClient.invalidateQueries({ queryKey: ["firm-employees"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-users"] });
      toast({ title: "Başarılı", description: "Çalışan firmadan çıkarıldı." });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Çalışan çıkarılırken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("firms")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-firms"] });
    },
  });

  // Filter firms
  const filteredFirms = firms?.filter((firm) => {
    const matchesSearch =
      searchQuery === "" ||
      firm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      firm.tax_number?.includes(searchQuery) ||
      firm.sector?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && firm.is_active) ||
      (statusFilter === "inactive" && !firm.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedFirm(null);
    setFormData({
      name: "",
      tax_number: "",
      sector: "",
      address: "",
      phone: "",
      email: "",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (firm: FirmWithEmployees) => {
    setIsEditing(true);
    setSelectedFirm(firm);
    setFormData({
      name: firm.name,
      tax_number: firm.tax_number || "",
      sector: firm.sector || "",
      address: firm.address || "",
      phone: firm.phone || "",
      email: firm.email || "",
      is_active: firm.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (firm: FirmWithEmployees) => {
    setSelectedFirm(firm);
    setDeleteDialogOpen(true);
  };

  const handleOpenEmployees = (firm: FirmWithEmployees) => {
    setSelectedFirm(firm);
    setEmployeesDialogOpen(true);
  };

  const handleOpenAssign = (firm: FirmWithEmployees) => {
    setSelectedFirm(firm);
    setSelectedUserId("");
    setAssignDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedFirm(null);
    setFormData({
      name: "",
      tax_number: "",
      sector: "",
      address: "",
      phone: "",
      email: "",
      is_active: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Hata",
        description: "Firma adı zorunludur.",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && selectedFirm) {
      updateMutation.mutate({ ...formData, id: selectedFirm.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Firma Yönetimi</h1>
            <p className="text-muted-foreground">
              Firmaları görüntüle ve yönet
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-firms"] })
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Button variant="accent" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Firma
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Firma adı, vergi no veya sektör ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Durum filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Firms Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Firmalar
              {filteredFirms && (
                <Badge variant="secondary" className="ml-2">
                  {filteredFirms.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFirms && filteredFirms.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead className="hidden md:table-cell">Sektör</TableHead>
                    <TableHead className="hidden lg:table-cell">İletişim</TableHead>
                    <TableHead>Çalışan</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFirms.map((firm) => (
                    <TableRow key={firm.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {firm.name}
                            </p>
                            {firm.tax_number && (
                              <p className="text-xs text-muted-foreground">
                                VN: {firm.tax_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-muted-foreground">
                          {firm.sector || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {firm.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {firm.phone}
                            </div>
                          )}
                          {firm.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {firm.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleOpenEmployees(firm)}
                        >
                          <Users className="h-4 w-4" />
                          {firm.employee_count}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={firm.is_active ?? true}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({
                              id: firm.id,
                              is_active: checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(firm)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenAssign(firm)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Çalışan Ata
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEmployees(firm)}>
                              <Users className="mr-2 h-4 w-4" />
                              Çalışanlar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleOpenDelete(firm)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Firma bulunamadı
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Firm Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Firma Düzenle" : "Yeni Firma Oluştur"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Firma bilgilerini güncelleyin."
                : "Yeni bir firma ekleyin."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Firma Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="ABC İnşaat Ltd. Şti."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_number">Vergi No</Label>
                <Input
                  id="tax_number"
                  value={formData.tax_number}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_number: e.target.value })
                  }
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Sektör</Label>
                <Input
                  id="sector"
                  value={formData.sector}
                  onChange={(e) =>
                    setFormData({ ...formData, sector: e.target.value })
                  }
                  placeholder="İnşaat"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="0212 123 45 67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="info@firma.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Firma adresi..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Aktif</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Firmayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedFirm?.name}</strong> firmasını silmek istediğinize
              emin misiniz? Bu işlem geri alınamaz.
              {selectedFirm?.employee_count ? (
                <span className="block mt-2 text-warning">
                  Bu firmaya bağlı {selectedFirm.employee_count} çalışan var.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedFirm && deleteMutation.mutate(selectedFirm.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Employees Dialog */}
      <Dialog open={employeesDialogOpen} onOpenChange={setEmployeesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedFirm?.name} - Çalışanlar</DialogTitle>
            <DialogDescription>
              Bu firmaya kayıtlı çalışanların listesi
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {employeesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : firmEmployees && firmEmployees.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {firmEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-accent">
                          {employee.first_name[0]}
                          {employee.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {employee.first_name} {employee.last_name}
                        </p>
                        {employee.phone && (
                          <p className="text-xs text-muted-foreground">
                            {employee.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEmployeeMutation.mutate(employee.user_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Bu firmada kayıtlı çalışan yok
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmployeesDialogOpen(false);
                if (selectedFirm) handleOpenAssign(selectedFirm);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Çalışan Ekle
            </Button>
            <Button onClick={() => setEmployeesDialogOpen(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Çalışan Ata</DialogTitle>
            <DialogDescription>
              <strong>{selectedFirm?.name}</strong> firmasına çalışan atayın.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Kullanıcı Seçin</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kullanıcı seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedUsers && unassignedUsers.length > 0 ? (
                    unassignedUsers.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      Atanabilir kullanıcı yok
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() =>
                selectedFirm &&
                selectedUserId &&
                assignMutation.mutate({
                  userId: selectedUserId,
                  firmId: selectedFirm.id,
                })
              }
              disabled={!selectedUserId || assignMutation.isPending}
            >
              {assignMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
