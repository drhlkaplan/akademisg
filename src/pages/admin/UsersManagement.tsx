import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
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
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Edit,
  Shield,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  tc_identity: string | null;
  phone: string | null;
  firm_id: string | null;
  created_at: string | null;
  email?: string;
  roles: AppRole[];
}

const roleLabels: Record<AppRole, string> = {
  super_admin: "Süper Admin",
  admin: "Admin",
  company_admin: "Firma Yetkilisi",
  student: "Öğrenci",
};

const roleBadgeVariants: Record<AppRole, "destructive" | "warning" | "info" | "success"> = {
  super_admin: "destructive",
  admin: "warning",
  company_admin: "info",
  student: "success",
};

export default function UsersManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    tc_identity: "",
  });
  const [selectedRole, setSelectedRole] = useState<AppRole>("student");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with their roles
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Map roles to users
      const usersWithRoles: UserWithRoles[] = profiles.map((profile) => ({
        ...profile,
        roles: allRoles
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role),
      }));

      return usersWithRoles;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      user_id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      tc_identity: string | null;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          tc_identity: data.tc_identity || null,
        })
        .eq("user_id", data.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Başarılı",
        description: "Kullanıcı bilgileri güncellendi.",
      });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Kullanıcı güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Update error:", error);
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async (data: { user_id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: data.user_id,
        role: data.role,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Başarılı",
        description: "Rol başarıyla atandı.",
      });
      setRoleDialogOpen(false);
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast({
          title: "Bilgi",
          description: "Bu rol zaten kullanıcıya atanmış.",
        });
      } else {
        toast({
          title: "Hata",
          description: "Rol atanırken bir hata oluştu.",
          variant: "destructive",
        });
      }
      console.error("Role error:", error);
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (data: { user_id: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Başarılı",
        description: "Rol kaldırıldı.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Rol kaldırılırken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("Remove role error:", error);
    },
  });

  // Filter users
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      `${user.first_name} ${user.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      user.tc_identity?.includes(searchQuery) ||
      user.phone?.includes(searchQuery);

    const matchesRole =
      roleFilter === "all" || user.roles.includes(roleFilter as AppRole);

    return matchesSearch && matchesRole;
  });

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || "",
      tc_identity: user.tc_identity || "",
    });
    setEditDialogOpen(true);
  };

  const handleAddRole = (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRole("student");
    setRoleDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedUser) return;
    updateProfileMutation.mutate({
      user_id: selectedUser.user_id,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      phone: editForm.phone,
      tc_identity: editForm.tc_identity,
    });
  };

  const handleSaveRole = () => {
    if (!selectedUser) return;
    addRoleMutation.mutate({
      user_id: selectedUser.user_id,
      role: selectedRole,
    });
  };

  const handleRemoveRole = (user: UserWithRoles, role: AppRole) => {
    if (user.roles.length === 1) {
      toast({
        title: "Uyarı",
        description: "Kullanıcının en az bir rolü olmalıdır.",
        variant: "destructive",
      });
      return;
    }
    removeRoleMutation.mutate({ user_id: user.user_id, role });
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Kullanıcı Yönetimi
            </h1>
            <p className="text-muted-foreground">
              Tüm kullanıcıları görüntüle ve yönet
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Button variant="accent">
              <UserPlus className="mr-2 h-4 w-4" />
              Yeni Kullanıcı
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
                  placeholder="İsim, TC veya telefon ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Rol filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Roller</SelectItem>
                  <SelectItem value="super_admin">Süper Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="company_admin">Firma Yetkilisi</SelectItem>
                  <SelectItem value="student">Öğrenci</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kullanıcılar
              {filteredUsers && (
                <Badge variant="secondary" className="ml-2">
                  {filteredUsers.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead className="hidden md:table-cell">TC Kimlik</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefon</TableHead>
                    <TableHead>Roller</TableHead>
                    <TableHead className="hidden md:table-cell">Kayıt Tarihi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-accent">
                              {user.first_name[0]}
                              {user.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {user.first_name} {user.last_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-muted-foreground">
                          {user.tc_identity || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-muted-foreground">
                          {user.phone || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={roleBadgeVariants[role]}
                              className="text-xs cursor-pointer"
                              onClick={() => handleRemoveRole(user, role)}
                              title="Kaldırmak için tıklayın"
                            >
                              {roleLabels[role]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-muted-foreground text-sm">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("tr-TR")
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddRole(user)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Rol Ata
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Kullanıcıyı Sil
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
                Kullanıcı bulunamadı
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>
              Kullanıcı bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Ad</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Soyad</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc_identity">TC Kimlik No</Label>
              <Input
                id="tc_identity"
                value={editForm.tc_identity}
                onChange={(e) =>
                  setEditForm({ ...editForm, tc_identity: e.target.value })
                }
                maxLength={11}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rol Ata</DialogTitle>
            <DialogDescription>
              {selectedUser?.first_name} {selectedUser?.last_name} kullanıcısına
              yeni bir rol atayın.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Rol Seçin</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Öğrenci</SelectItem>
                  <SelectItem value="company_admin">Firma Yetkilisi</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Süper Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={addRoleMutation.isPending}
            >
              {addRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Rol Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
