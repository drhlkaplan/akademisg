import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Settings2, AlertTriangle, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type HazardClass = Database["public"]["Enums"]["hazard_class_enum"];
type TrainingType = Database["public"]["Enums"]["training_type_enum"];
type DeliveryMethod = Database["public"]["Enums"]["lesson_delivery_method"];
type TemplateRule = Database["public"]["Tables"]["course_template_rules"]["Row"];

const hazardLabels: Record<HazardClass, string> = {
  az_tehlikeli: "Az Tehlikeli",
  tehlikeli: "Tehlikeli",
  cok_tehlikeli: "Çok Tehlikeli",
};

const hazardColors: Record<HazardClass, "success" | "warning" | "destructive"> = {
  az_tehlikeli: "success",
  tehlikeli: "warning",
  cok_tehlikeli: "destructive",
};

const trainingLabels: Record<TrainingType, string> = {
  ise_baslama: "İşe Başlama",
  temel: "Temel Eğitim",
  tekrar: "Tekrar Eğitim",
  bilgi_yenileme: "Bilgi Yenileme",
  ilave: "İlave Eğitim",
  ozel_grup: "Özel Grup",
  destek_elemani: "Destek Elemanı",
  calisan_temsilcisi: "Çalışan Temsilcisi",
};

const methodLabels: Record<DeliveryMethod, string> = {
  scorm: "Online (SCORM)",
  bbb_live: "Canlı Ders (BBB)",
  face_to_face: "Yüz Yüze",
  hybrid: "Hibrit",
};

export default function CourseTemplateRules() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TemplateRule | null>(null);
  const [formData, setFormData] = useState({
    course_id: "",
    training_type: "temel" as TrainingType,
    hazard_class: "az_tehlikeli" as HazardClass,
    min_total_hours: 8,
    min_topic4_hours: 2,
    topic4_method: "scorm" as DeliveryMethod,
    recurrence_months: null as number | null,
    passing_score: 60,
    max_exam_attempts: 3,
    requires_pre_assessment: true,
    requires_final_assessment: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["course-template-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_template_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["courses-for-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, hazard_class_new, training_type")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Auto-enforce: tehlikeli/cok_tehlikeli topic4 must be face_to_face
      let topic4Method = data.topic4_method;
      if (data.hazard_class === "tehlikeli" || data.hazard_class === "cok_tehlikeli") {
        topic4Method = "face_to_face";
      }

      const payload = { ...data, topic4_method: topic4Method };

      if (editingRule) {
        const { error } = await supabase
          .from("course_template_rules")
          .update(payload)
          .eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("course_template_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-template-rules"] });
      setDialogOpen(false);
      setEditingRule(null);
      toast({ title: editingRule ? "Kural güncellendi" : "Kural oluşturuldu" });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingRule(null);
    setFormData({
      course_id: courses?.[0]?.id || "",
      training_type: "temel",
      hazard_class: "az_tehlikeli",
      min_total_hours: 8,
      min_topic4_hours: 2,
      topic4_method: "scorm",
      recurrence_months: null,
      passing_score: 60,
      max_exam_attempts: 3,
      requires_pre_assessment: true,
      requires_final_assessment: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (rule: TemplateRule) => {
    setEditingRule(rule);
    setFormData({
      course_id: rule.course_id,
      training_type: rule.training_type,
      hazard_class: rule.hazard_class,
      min_total_hours: Number(rule.min_total_hours),
      min_topic4_hours: Number(rule.min_topic4_hours),
      topic4_method: rule.topic4_method,
      recurrence_months: rule.recurrence_months,
      passing_score: rule.passing_score || 60,
      max_exam_attempts: rule.max_exam_attempts || 3,
      requires_pre_assessment: rule.requires_pre_assessment ?? true,
      requires_final_assessment: rule.requires_final_assessment ?? true,
    });
    setDialogOpen(true);
  };

  const courseTitle = (id: string) => courses?.find((c) => c.id === id)?.title || id;

  // Auto-set minimum hours when hazard class changes
  const handleHazardChange = (hc: HazardClass) => {
    const minHours: Record<HazardClass, number> = { az_tehlikeli: 8, tehlikeli: 12, cok_tehlikeli: 16 };
    const minTopic4: Record<HazardClass, number> = { az_tehlikeli: 2, tehlikeli: 3, cok_tehlikeli: 4 };
    const recurrence: Record<HazardClass, number> = { az_tehlikeli: 36, tehlikeli: 24, cok_tehlikeli: 12 };
    const topic4Method: DeliveryMethod = hc === "az_tehlikeli" ? formData.topic4_method : "face_to_face";

    setFormData((prev) => ({
      ...prev,
      hazard_class: hc,
      min_total_hours: Math.max(prev.min_total_hours, minHours[hc]),
      min_topic4_hours: Math.max(prev.min_topic4_hours, minTopic4[hc]),
      topic4_method: topic4Method,
      recurrence_months: prev.training_type === "temel" ? recurrence[hc] : prev.recurrence_months,
    }));
  };

  const isTopic4ForcedF2F = formData.hazard_class === "tehlikeli" || formData.hazard_class === "cok_tehlikeli";

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kurs Şablon Kuralları</h1>
            <p className="text-muted-foreground">
              Tehlike sınıfı, eğitim türü ve ders yöntemi kurallarını yönetin
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Yeni Kural
          </Button>
        </div>

        {/* Regulation Info Card */}
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-foreground">Yönetmelik Kuralları Otomatik Uygulanır</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• <strong>Tehlikeli</strong> ve <strong>Çok Tehlikeli</strong> sınıflarda İşe ve İşyerine Özgü Konular <strong>yüz yüze zorunludur</strong></li>
                  <li>• Minimum süre: Az Tehlikeli 8 saat / Tehlikeli 12 saat / Çok Tehlikeli 16 saat</li>
                  <li>• İşyeri Konusu minimum: Az Tehlikeli 2 saat / Tehlikeli 3 saat / Çok Tehlikeli 4 saat</li>
                  <li>• Final sınavı geçme notu minimum 60/100, en fazla 3 deneme hakkı</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !rules?.length ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz kural tanımlanmamış</p>
                <Button onClick={openCreate} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" /> İlk Kuralı Oluştur
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kurs</TableHead>
                    <TableHead>Eğitim Türü</TableHead>
                    <TableHead>Tehlike Sınıfı</TableHead>
                    <TableHead>Min. Süre</TableHead>
                    <TableHead>İşyeri K. Min.</TableHead>
                    <TableHead>İşyeri K. Yöntemi</TableHead>
                    <TableHead>Tekrar Periyodu</TableHead>
                    <TableHead>Geçme Notu</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {courseTitle(rule.course_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{trainingLabels[rule.training_type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={hazardColors[rule.hazard_class]}>
                          {hazardLabels[rule.hazard_class]}
                        </Badge>
                      </TableCell>
                      <TableCell>{rule.min_total_hours} saat</TableCell>
                      <TableCell>{rule.min_topic4_hours} saat</TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.topic4_method === "face_to_face" ? "destructive" : "outline"}
                        >
                          {methodLabels[rule.topic4_method]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rule.recurrence_months ? `${rule.recurrence_months} ay` : "—"}
                      </TableCell>
                      <TableCell>{rule.passing_score}/100</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Kuralı Düzenle" : "Yeni Şablon Kuralı"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Kurs</Label>
              <Select
                value={formData.course_id}
                onValueChange={(v) => setFormData((p) => ({ ...p, course_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Kurs seçin" /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Eğitim Türü</Label>
                <Select
                  value={formData.training_type}
                  onValueChange={(v) => setFormData((p) => ({ ...p, training_type: v as TrainingType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(trainingLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tehlike Sınıfı</Label>
                <Select
                  value={formData.hazard_class}
                  onValueChange={(v) => handleHazardChange(v as HazardClass)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(hazardLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min. Toplam Süre (saat)</Label>
                <Input
                  type="number"
                  value={formData.min_total_hours}
                  onChange={(e) => setFormData((p) => ({ ...p, min_total_hours: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>İşyeri Konusu Min. Süre (saat)</Label>
                <Input
                  type="number"
                  value={formData.min_topic4_hours}
                  onChange={(e) => setFormData((p) => ({ ...p, min_topic4_hours: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>İşyeri Konusu Teslimat Yöntemi</Label>
              {isTopic4ForcedF2F ? (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">
                    {hazardLabels[formData.hazard_class]} sınıfında İşyeri Konusu yüz yüze zorunludur
                  </span>
                </div>
              ) : (
                <Select
                  value={formData.topic4_method}
                  onValueChange={(v) => setFormData((p) => ({ ...p, topic4_method: v as DeliveryMethod }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(methodLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Geçme Notu (100 üzerinden)</Label>
                <Input
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData((p) => ({ ...p, passing_score: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Maks. Sınav Deneme</Label>
                <Input
                  type="number"
                  value={formData.max_exam_attempts}
                  onChange={(e) => setFormData((p) => ({ ...p, max_exam_attempts: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Tekrar Periyodu (ay, boş bırakılabilir)</Label>
              <Input
                type="number"
                value={formData.recurrence_months ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    recurrence_months: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Örn: 12, 24, 36"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.requires_pre_assessment}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, requires_pre_assessment: v }))}
                />
                <Label>Ön Değerlendirme</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.requires_final_assessment}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, requires_final_assessment: v }))}
                />
                <Label>Final Sınavı</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending || !formData.course_id}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRule ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
