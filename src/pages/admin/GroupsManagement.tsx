import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, MoreHorizontal, Plus, Edit, Trash2, Loader2, RefreshCw,
  Users, KeyRound, BookOpen, Copy,
} from "lucide-react";

export default function GroupsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [coursesDialogOpen, setCoursesDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", group_key: "", firm_id: "", is_active: true });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch groups
  const { data: groups, isLoading } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get member counts
      const { data: memberships } = await supabase.from("users_to_groups").select("group_id");
      const counts: Record<string, number> = {};
      memberships?.forEach((m) => { counts[m.group_id] = (counts[m.group_id] || 0) + 1; });

      // Get course counts
      const { data: gc } = await supabase.from("group_courses").select("group_id");
      const courseCounts: Record<string, number> = {};
      gc?.forEach((g) => { courseCounts[g.group_id] = (courseCounts[g.group_id] || 0) + 1; });

      return data.map((g) => ({ ...g, member_count: counts[g.id] || 0, course_count: courseCounts[g.id] || 0 }));
    },
  });

  // Fetch firms for dropdown
  const { data: firms } = useQuery({
    queryKey: ["firms-list"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  // Fetch courses for assignment
  const { data: allCourses } = useQuery({
    queryKey: ["courses-list"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").eq("is_active", true).order("title");
      return data || [];
    },
  });

  // Fetch assigned courses for selected group
  const { data: assignedCourseIds } = useQuery({
    queryKey: ["group-courses", selectedGroup?.id],
    queryFn: async () => {
      const { data } = await supabase.from("group_courses").select("course_id").eq("group_id", selectedGroup.id);
      return data?.map((d) => d.course_id) || [];
    },
    enabled: !!selectedGroup?.id && coursesDialogOpen,
  });

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `ISG-${new Date().getFullYear()}-${random}`;
  };

  // Create group
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("groups").insert({
        name: data.name,
        group_key: data.group_key,
        firm_id: data.firm_id || null,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      toast({ title: "Başarılı", description: "Grup oluşturuldu." });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  // Update group
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from("groups").update({
        name: data.name,
        group_key: data.group_key,
        firm_id: data.firm_id || null,
        is_active: data.is_active,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      toast({ title: "Başarılı", description: "Grup güncellendi." });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  // Delete group
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      toast({ title: "Başarılı", description: "Grup silindi." });
      setDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  // Toggle course assignment
  const toggleCourseMutation = useMutation({
    mutationFn: async ({ groupId, courseId, assign }: { groupId: string; courseId: string; assign: boolean }) => {
      if (assign) {
        const { error } = await supabase.from("group_courses").insert({ group_id: groupId, course_id: courseId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("group_courses").delete().eq("group_id", groupId).eq("course_id", courseId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-courses", selectedGroup?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedGroup(null);
    setFormData({ name: "", group_key: generateKey(), firm_id: "", is_active: true });
    setDialogOpen(true);
  };

  const handleOpenEdit = (group: any) => {
    setIsEditing(true);
    setSelectedGroup(group);
    setFormData({ name: group.name, group_key: group.group_key, firm_id: group.firm_id || "", is_active: group.is_active });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.group_key.trim()) {
      toast({ title: "Hata", description: "Grup adı ve anahtar zorunludur.", variant: "destructive" });
      return;
    }
    if (isEditing && selectedGroup) {
      updateMutation.mutate({ ...formData, id: selectedGroup.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Kopyalandı", description: "Grup anahtarı panoya kopyalandı." });
  };

  const filtered = groups?.filter((g) =>
    !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.group_key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grup Yönetimi</h1>
            <p className="text-muted-foreground">Grupları oluşturun, anahtar atayın ve kurs tanımlayın</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-groups"] })}>
              <RefreshCw className="mr-2 h-4 w-4" /> Yenile
            </Button>
            <Button variant="accent" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Grup
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Grup adı veya anahtar ile ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" /> Gruplar
              {filtered && <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered && filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grup</TableHead>
                    <TableHead>Anahtar</TableHead>
                    <TableHead className="hidden md:table-cell">Üyeler</TableHead>
                    <TableHead className="hidden md:table-cell">Kurslar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-accent" />
                          </div>
                          <p className="font-medium text-foreground">{group.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{group.group_key}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyKey(group.group_key)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary">{group.member_count}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary">{group.course_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.is_active ? "success" : "destructive"}>
                          {group.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(group)}>
                              <Edit className="mr-2 h-4 w-4" /> Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedGroup(group); setCoursesDialogOpen(true); }}>
                              <BookOpen className="mr-2 h-4 w-4" /> Kurs Ata
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedGroup(group); setDeleteDialogOpen(true); }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Henüz grup oluşturulmamış.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Grubu Düzenle" : "Yeni Grup Oluştur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grup Adı *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Örn: 2026 Mart Grubu" />
            </div>
            <div>
              <Label>Grup Anahtarı *</Label>
              <div className="flex gap-2">
                <Input value={formData.group_key} onChange={(e) => setFormData({ ...formData, group_key: e.target.value })} placeholder="ISG-2026-XXXXXX" />
                <Button variant="outline" onClick={() => setFormData({ ...formData, group_key: generateKey() })}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Firma (Opsiyonel)</Label>
              <Select value={formData.firm_id} onValueChange={(v) => setFormData({ ...formData, firm_id: v })}>
                <SelectTrigger><SelectValue placeholder="Firma seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Firma yok</SelectItem>
                  {firms?.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button variant="accent" onClick={handleSubmit}>{isEditing ? "Güncelle" : "Oluştur"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Assignment Dialog */}
      <Dialog open={coursesDialogOpen} onOpenChange={setCoursesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kurs Ata — {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {allCourses?.map((course) => {
              const isAssigned = assignedCourseIds?.includes(course.id) ?? false;
              return (
                <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={(checked) =>
                      toggleCourseMutation.mutate({ groupId: selectedGroup.id, courseId: course.id, assign: !!checked })
                    }
                  />
                  <span className="text-sm text-foreground">{course.title}</span>
                </div>
              );
            })}
            {(!allCourses || allCourses.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Henüz kurs oluşturulmamış.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoursesDialogOpen(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grubu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedGroup?.name}" grubunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedGroup && deleteMutation.mutate(selectedGroup.id)}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
