import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LessonManagement } from "@/components/admin/LessonManagement";
import { AIContentGenerator } from "@/components/admin/AIContentGenerator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Loader2,
  RefreshCw,
  Clock,
  List,
  Eye,
  EyeOff,
  Sparkles,
  Archive,
  RotateCcw,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type CourseCategory = Database["public"]["Tables"]["course_categories"]["Row"];
type DangerClass = Database["public"]["Enums"]["danger_class"];

interface CourseWithCategory extends Course {
  course_categories: CourseCategory | null;
}

const dangerClassLabels: Record<DangerClass, string> = {
  low: "Az Tehlikeli",
  medium: "Tehlikeli",
  high: "Çok Tehlikeli",
};

const dangerClassColors: Record<DangerClass, "success" | "warning" | "destructive"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
};

export default function CoursesManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithCategory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [managingLessonsCourseId, setManagingLessonsCourseId] = useState<string | null>(null);
  const [managingLessonsCourseTitle, setManagingLessonsCourseTitle] = useState<string>("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiCourseContext, setAiCourseContext] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration_minutes: 60,
    category_id: "",
    is_active: true,
    thumbnail_url: "",
    require_sequential: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch courses with categories
  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          course_categories (*)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CourseWithCategory[];
    },
  });

  // Fetch archived courses
  const { data: archivedCourses } = useQuery({
    queryKey: ["admin-courses-archived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`*, course_categories (*)`)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data as CourseWithCategory[];
    },
  });

  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ["course-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Create course mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("courses").insert({
        title: data.title,
        description: data.description || null,
        duration_minutes: data.duration_minutes,
        category_id: data.category_id || null,
        is_active: data.is_active,
        thumbnail_url: data.thumbnail_url || null,
        require_sequential: data.require_sequential,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Başarılı", description: "Kurs oluşturuldu." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Kurs oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Update course mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("courses")
        .update({
          title: data.title,
          description: data.description || null,
          duration_minutes: data.duration_minutes,
          category_id: data.category_id || null,
          is_active: data.is_active,
          thumbnail_url: data.thumbnail_url || null,
          require_sequential: data.require_sequential,
        } as any)
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Başarılı", description: "Kurs güncellendi." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Kurs güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Delete course mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Başarılı", description: "Kurs silindi." });
      setDeleteDialogOpen(false);
      setSelectedCourse(null);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Kurs silinirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("courses")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
  });

  // Archive course (soft delete)
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("courses")
        .update({ deleted_at: new Date().toISOString(), is_active: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-courses-archived"] });
      toast({ title: "Başarılı", description: "Kurs arşive taşındı." });
    },
  });

  // Restore course from archive
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("courses")
        .update({ deleted_at: null, is_active: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-courses-archived"] });
      toast({ title: "Başarılı", description: "Kurs arşivden geri yüklendi." });
    },
  });

  // Filter courses
  const displayCourses = statusFilter === "archived" ? archivedCourses : courses;
  const filteredCourses = displayCourses?.filter((course) => {
    const matchesSearch =
      searchQuery === "" ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || course.category_id === categoryFilter;

    const matchesStatus =
      statusFilter === "all" ||
      statusFilter === "archived" ||
      (statusFilter === "active" && course.is_active) ||
      (statusFilter === "inactive" && !course.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedCourse(null);
    setFormData({
      title: "",
      description: "",
      duration_minutes: 60,
      category_id: "",
      is_active: true,
      thumbnail_url: "",
      require_sequential: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (course: CourseWithCategory) => {
    setIsEditing(true);
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      description: course.description || "",
      duration_minutes: course.duration_minutes,
      category_id: course.category_id || "",
      is_active: course.is_active ?? true,
      thumbnail_url: course.thumbnail_url || "",
      require_sequential: (course as any).require_sequential !== false,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (course: CourseWithCategory) => {
    setSelectedCourse(course);
    setDeleteDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCourse(null);
    setFormData({
      title: "",
      description: "",
      duration_minutes: 60,
      category_id: "",
      is_active: true,
      thumbnail_url: "",
      require_sequential: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Hata",
        description: "Kurs başlığı zorunludur.",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && selectedCourse) {
      updateMutation.mutate({ ...formData, id: selectedCourse.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} dk`;
    if (mins === 0) return `${hours} saat`;
    return `${hours} saat ${mins} dk`;
  };

  if (managingLessonsCourseId) {
    return (
      <DashboardLayout userRole="admin">
        <LessonManagement
          courseId={managingLessonsCourseId}
          courseTitle={managingLessonsCourseTitle}
          onBack={() => setManagingLessonsCourseId(null)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kurs Yönetimi</h1>
            <p className="text-muted-foreground">
              Eğitim kurslarını görüntüle ve yönet
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-courses"] })
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Button variant="accent" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Kurs
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
                  placeholder="Kurs adı ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Kategori filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                  <SelectItem value="archived">Arşivlenmiş</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Courses Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Kurslar
              {filteredCourses && (
                <Badge variant="secondary" className="ml-2">
                  {filteredCourses.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCourses && filteredCourses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kurs</TableHead>
                    <TableHead className="hidden md:table-cell">Kategori</TableHead>
                    <TableHead className="hidden lg:table-cell">Süre</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {course.title}
                            </p>
                            {course.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                                {course.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {course.course_categories ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">
                              {course.course_categories.name}
                            </span>
                            <Badge
                              variant={
                                dangerClassColors[
                                  course.course_categories.danger_class
                                ]
                              }
                              className="w-fit text-xs"
                            >
                              {
                                dangerClassLabels[
                                  course.course_categories.danger_class
                                ]
                              }
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(course.duration_minutes)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={course.is_active ?? true}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({
                                id: course.id,
                                is_active: checked,
                              })
                            }
                          />
                          {course.is_active ? (
                            <Eye className="h-4 w-4 text-success" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(course)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setManagingLessonsCourseId(course.id);
                                setManagingLessonsCourseTitle(course.title);
                              }}
                            >
                              <List className="mr-2 h-4 w-4" />
                              Dersler
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setAiCourseContext({
                                  title: course.title,
                                  category: course.course_categories?.name,
                                  danger_class: course.course_categories?.danger_class,
                                  duration_minutes: course.duration_minutes,
                                });
                                setAiDialogOpen(true);
                              }}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              AI Açıklama Üret
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {statusFilter === "archived" ? (
                              <DropdownMenuItem
                                onClick={() => restoreMutation.mutate(course.id)}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Arşivden Geri Yükle
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  className="text-warning"
                                  onClick={() => archiveMutation.mutate(course.id)}
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Arşivle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleOpenDelete(course)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Kalıcı Sil
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Kurs bulunamadı
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Kurs Düzenle" : "Yeni Kurs Oluştur"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Kurs bilgilerini güncelleyin."
                : "Yeni bir eğitim kursu ekleyin."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Kurs Başlığı *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Temel İSG Eğitimi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Kurs hakkında kısa bir açıklama..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Süre (dakika)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail URL</Label>
              <Input
                id="thumbnail"
                value={formData.thumbnail_url}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnail_url: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="require_sequential">Sıralı Ders İlerlemesi</Label>
                <p className="text-xs text-muted-foreground">Öğrenciler dersleri sırayla tamamlamak zorunda olsun</p>
              </div>
              <Switch
                id="require_sequential"
                checked={formData.require_sequential}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, require_sequential: checked })
                }
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
            <AlertDialogTitle>Kursu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedCourse?.title}</strong> kursunu silmek istediğinize
              emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCourse && deleteMutation.mutate(selectedCourse.id)}
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

      {/* AI Content Generator */}
      {aiCourseContext && (
        <AIContentGenerator
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          mode="description"
          context={aiCourseContext}
          onDescriptionGenerated={(desc) => {
            // Could be used to update course description
            navigator.clipboard.writeText(desc);
            toast({ title: "Açıklama panoya kopyalandı" });
          }}
        />
      )}
    </DashboardLayout>
  );
}
