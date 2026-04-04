import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, Database, RefreshCw, Rocket, Shield, FileCheck } from "lucide-react";

interface AnalysisData {
  courses: { total: number; missing_hazard_class: number; missing_training_type: number; with_template_rules: number };
  firms: { total: number; missing_sector: number; missing_hazard_class: number };
  enrollments: { total: number; missing_training_type: number };
}

const MigrationDashboard = () => {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("migrate-legacy-data", {
        body: { action: "analyze" },
      });
      if (error) throw error;
      setAnalysis(data.analysis);
    } catch {
      toast({ title: "Hata", description: "Analiz çalıştırılamadı", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (action: string, label: string) => {
    setMigrating(action);
    try {
      const { data, error } = await supabase.functions.invoke("migrate-legacy-data", {
        body: { action },
      });
      if (error) throw error;
      toast({ title: "Başarılı", description: `${label} tamamlandı. ${JSON.stringify(data)}` });
      await runAnalysis();
    } catch {
      toast({ title: "Hata", description: `${label} başarısız`, variant: "destructive" });
    } finally {
      setMigrating(null);
    }
  };

  const getComplianceScore = (): number => {
    if (!analysis) return 0;
    const totalIssues =
      analysis.courses.missing_hazard_class +
      analysis.courses.missing_training_type +
      analysis.firms.missing_sector +
      analysis.firms.missing_hazard_class +
      analysis.enrollments.missing_training_type;
    const totalFields =
      analysis.courses.total * 2 +
      analysis.firms.total * 2 +
      analysis.enrollments.total;
    if (totalFields === 0) return 100;
    return Math.round(((totalFields - totalIssues) / totalFields) * 100);
  };

  const checklist = [
    { label: "Veritabanı şeması güncel", done: true },
    { label: "RLS politikaları aktif", done: true },
    { label: "Eğitim türleri tanımlı", done: true },
    { label: "Tehlike sınıfı enum'ları hazır", done: true },
    { label: "Sektör tablosu doldurulmuş", done: analysis ? analysis.firms.missing_sector === 0 : false },
    { label: "Firmalar tehlike sınıfına atanmış", done: analysis ? analysis.firms.missing_hazard_class === 0 : false },
    { label: "Kurslar sınıflandırılmış", done: analysis ? analysis.courses.missing_hazard_class === 0 : false },
    { label: "Kurs şablon kuralları tanımlı", done: analysis ? analysis.courses.with_template_rules > 0 : false },
    { label: "Tamamlama motoru aktif", done: true },
    { label: "Tekrar eğitim zamanlayıcısı aktif", done: true },
    { label: "Belge üretim modülü hazır", done: true },
    { label: "Raporlama modülleri hazır", done: true },
  ];

  const score = getComplianceScore();

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Migrasyon & Canlıya Geçiş</h1>
            <p className="text-muted-foreground">Eski yönetmelikten yeni yönetmeliğe geçiş durumu</p>
          </div>
          <Button onClick={runAnalysis} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Analiz Çalıştır
          </Button>
        </div>

        {/* Compliance Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Uyumluluk Skoru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Progress value={score} className="flex-1" />
                <span className="text-2xl font-bold">{score}%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {score === 100 ? "Tüm veriler yeni yönetmeliğe uyumlu!" : "Bazı veriler henüz yeni yönetmelik alanlarına eşlenmedi."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Kurslar</CardTitle>
                <CardDescription>Toplam: {analysis.courses.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <StatRow label="Tehlike sınıfı eksik" value={analysis.courses.missing_hazard_class} total={analysis.courses.total} />
                <StatRow label="Eğitim türü eksik" value={analysis.courses.missing_training_type} total={analysis.courses.total} />
                <StatRow label="Şablon kuralı var" value={analysis.courses.with_template_rules} total={analysis.courses.total} isPositive />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Firmalar</CardTitle>
                <CardDescription>Toplam: {analysis.firms.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <StatRow label="Sektör eksik" value={analysis.firms.missing_sector} total={analysis.firms.total} />
                <StatRow label="Tehlike sınıfı eksik" value={analysis.firms.missing_hazard_class} total={analysis.firms.total} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Kayıtlar</CardTitle>
                <CardDescription>Toplam: {analysis.enrollments.total}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <StatRow label="Eğitim türü eksik" value={analysis.enrollments.missing_training_type} total={analysis.enrollments.total} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Migration Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Migrasyon Aksiyonları
            </CardTitle>
            <CardDescription>Eski verileri yeni yönetmelik yapısına eşleyin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Kursları Legacy Olarak Etiketle</p>
                <p className="text-sm text-muted-foreground">Tehlike sınıfı atanmamış kursları "Eski Yönetmelik" olarak işaretle</p>
              </div>
              <Button
                variant="outline"
                onClick={() => runMigration("migrate_courses", "Kurs etiketleme")}
                disabled={migrating !== null}
              >
                {migrating === "migrate_courses" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Çalıştır
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Kayıt Eğitim Türlerini Devral</p>
                <p className="text-sm text-muted-foreground">Kurstan eğitim türünü enrollment'a aktar</p>
              </div>
              <Button
                variant="outline"
                onClick={() => runMigration("migrate_enrollments", "Kayıt migrasyonu")}
                disabled={migrating !== null}
              >
                {migrating === "migrate_enrollments" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Çalıştır
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Go-Live Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Canlıya Geçiş Kontrol Listesi
            </CardTitle>
            <CardDescription>
              {checklist.filter(c => c.done).length} / {checklist.length} tamamlandı
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  )}
                  <span className={item.done ? "text-muted-foreground" : "font-medium"}>{item.label}</span>
                  {item.done && <Badge variant="outline" className="ml-auto text-xs">Tamam</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Alert>
          <FileCheck className="h-4 w-4" />
          <AlertTitle>Önemli</AlertTitle>
          <AlertDescription>
            Canlıya geçmeden önce tüm kontrol listesinin tamamlandığından emin olun. Legacy etiketli kurslar
            çalışmaya devam eder ancak yeni yönetmelik kuralları uygulanmaz.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
};

function StatRow({ label, value, total, isPositive }: { label: string; value: number; total: number; isPositive?: boolean }) {
  const isOk = isPositive ? value > 0 : value === 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <Badge variant={isOk ? "outline" : "destructive"} className="text-xs">
        {value} / {total}
      </Badge>
    </div>
  );
}

export default MigrationDashboard;
