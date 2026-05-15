import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Wand2, Loader2 } from "lucide-react";
import { uploadAndCreateScormPackage } from "@/lib/scormUpload";

type Issue = "missing_package" | "zip_url_no_package" | "no_content" | "ok";

interface Row {
  id: string;
  title: string;
  content_type: string | null;
  content_url: string | null;
  scorm_package_id: string | null;
  is_active: boolean;
  topic4_pack_id: string;
  pack_name: string;
  sector_name: string | null;
  issue: Issue;
}

const isZip = (u?: string | null) => !!u && /\.zip(\?|$)/i.test(u);

function diagnose(l: { content_type: string | null; content_url: string | null; scorm_package_id: string | null }): Issue {
  if (l.content_type !== "scorm") return "ok";
  if (l.scorm_package_id) return "ok";
  if (!l.content_url) return "no_content";
  if (isZip(l.content_url)) return "zip_url_no_package";
  return "missing_package";
}

const issueMeta: Record<Issue, { label: string; tone: "ok" | "warn" | "err" }> = {
  ok: { label: "Tamam", tone: "ok" },
  missing_package: { label: "SCORM paketi eşleşmemiş", tone: "warn" },
  zip_url_no_package: { label: "Zip URL var, paket bağlanmamış", tone: "err" },
  no_content: { label: "İçerik yok", tone: "err" },
};

export default function Topic4ScormCheck() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "issues">("issues");
  const [convertRow, setConvertRow] = useState<Row | null>(null);
  const [convertCourseId, setConvertCourseId] = useState<string>("");
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);

  const { data: courses = [] } = useQuery({
    queryKey: ["scorm-host-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,hazard_class_new,training_type")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const openConvert = (r: Row) => {
    setConvertRow(r);
    setConvertCourseId(courses[0]?.id || "");
    setConvertProgress(0);
  };

  const runConvert = async () => {
    if (!convertRow || !convertRow.content_url || !convertCourseId) return;
    setConverting(true);
    setConvertProgress(0);
    try {
      // 1) Fetch zip blob from current content_url
      const res = await fetch(convertRow.content_url);
      if (!res.ok) throw new Error(`Zip indirilemedi (${res.status})`);
      const blob = await res.blob();

      // 2) Upload + extract + create scorm_packages row
      const result = await uploadAndCreateScormPackage(blob, convertCourseId, (p) =>
        setConvertProgress(p),
      );

      // 3) Link to topic4_pack_lessons
      const { error: upErr } = await supabase
        .from("topic4_pack_lessons")
        .update({ scorm_package_id: result.packageId })
        .eq("id", convertRow.id);
      if (upErr) throw upErr;

      toast({ title: "Başarılı", description: "SCORM paketi oluşturuldu ve derse bağlandı." });
      qc.invalidateQueries({ queryKey: ["topic4-scorm-check"] });
      qc.invalidateQueries({ queryKey: ["scorm-packages-all-check"] });
      setConvertRow(null);
    } catch (e: any) {
      console.error("[topic4-convert] failed:", e);
      toast({ title: "Hata", description: e.message || String(e), variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };


  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["topic4-scorm-check"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topic4_pack_lessons")
        .select("id,title,content_type,content_url,scorm_package_id,is_active,topic4_pack_id,topic4_sector_packs(name,sectors(name))")
        .is("deleted_at", null)
        .order("topic4_pack_id");
      if (error) throw error;
      return (data || []).map((l: any): Row => ({
        id: l.id,
        title: l.title,
        content_type: l.content_type,
        content_url: l.content_url,
        scorm_package_id: l.scorm_package_id,
        is_active: l.is_active,
        topic4_pack_id: l.topic4_pack_id,
        pack_name: l.topic4_sector_packs?.name ?? "—",
        sector_name: l.topic4_sector_packs?.sectors?.name ?? null,
        issue: diagnose(l),
      }));
    },
  });

  const { data: scormPackages = [] } = useQuery({
    queryKey: ["scorm-packages-all-check"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scorm_packages")
        .select("id,package_url,scorm_version,course_id,courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const linkMutation = useMutation({
    mutationFn: async ({ id, scorm_package_id }: { id: string; scorm_package_id: string | null }) => {
      const { error } = await supabase
        .from("topic4_pack_lessons")
        .update({ scorm_package_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topic4-scorm-check"] });
      toast({ title: "Eşleşme güncellendi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const scormOnly = rows.filter((r) => r.content_type === "scorm");
    return filter === "issues" ? scormOnly.filter((r) => r.issue !== "ok") : scormOnly;
  }, [rows, filter]);

  const counts = useMemo(() => {
    const scormOnly = rows.filter((r) => r.content_type === "scorm");
    return {
      total: scormOnly.length,
      ok: scormOnly.filter((r) => r.issue === "ok").length,
      issues: scormOnly.filter((r) => r.issue !== "ok").length,
    };
  }, [rows]);

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Topic 4 SCORM Eşleşme Kontrolü</h1>
            <p className="text-muted-foreground">
              İşe ve işyerine özgü konularda SCORM paket bağlantısı eksik olan dersleri listeler ve bağlamayı sağlar.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(v: "all" | "issues") => setFilter(v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="issues">Sadece sorunlular</SelectItem>
                <SelectItem value="all">Tümü</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Toplam SCORM Ders" value={counts.total} tone="ok" />
          <StatCard label="Eşleşmiş" value={counts.ok} tone="ok" />
          <StatCard label="Sorunlu" value={counts.issues} tone={counts.issues > 0 ? "err" : "ok"} />
        </div>

        <Card>
          <CardHeader><CardTitle>Dersler</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket / Ders</TableHead>
                  <TableHead>Sektör</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Mevcut URL</TableHead>
                  <TableHead className="w-[280px]">SCORM Paketi Bağla</TableHead>
                  <TableHead className="text-right">Düzenle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sorunlu kayıt yok.</TableCell></TableRow>
                ) : filtered.map((r) => {
                  const meta = issueMeta[r.issue];
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.pack_name}</div>
                        <div className="text-xs text-muted-foreground">{r.title}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.sector_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={meta.tone === "ok" ? "secondary" : meta.tone === "warn" ? "outline" : "destructive"}>
                          {meta.tone === "ok" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.content_url ? (
                          <a href={r.content_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 max-w-[260px] truncate">
                            <ExternalLink className="h-3 w-3" />
                            {r.content_url.split("/").pop()}
                          </a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.scorm_package_id || "none"}
                          onValueChange={(v) => linkMutation.mutate({ id: r.id, scorm_package_id: v === "none" ? null : v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Paket seç" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Yok —</SelectItem>
                            {scormPackages.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {(p.courses?.title || "—") + " — " + (p.package_url?.split("/").slice(-1)[0] || p.id.slice(0, 8))}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {r.content_url && /\.zip(\?|$)/i.test(r.content_url) && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openConvert(r)}
                              title="Zip dosyasını SCORM paketi olarak çıkar ve derse otomatik bağla"
                            >
                              <Wand2 className="h-4 w-4 mr-1" />
                              Zip'i SCORM'a çevir & bağla
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/admin/topic4-packs/${r.topic4_pack_id}/lessons`}>Aç</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notlar</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <b>Zip URL var, paket bağlanmamış</b>: Ders içerik URL'si bir .zip dosyası ama SCORM paketi olarak çıkarılmamış. Bu durumda SCORM oynatıcı "başlangıç dosyası bulunamadı" hatası verir. Çözüm: zip dosyasını ilgili kursa SCORM paketi olarak yeniden yükleyin (admin/courses → ders → SCORM yükle), oluşan paketi yukarıdaki listeden seçerek bağlayın.</p>
            <p>• <b>SCORM paketi eşleşmemiş</b>: scorm_package_id boş ve content_url SCORM çıktısı (story.html / index.html) içeren bir klasöre işaret etmiyor.</p>
            <p>• <b>İçerik yok</b>: Hem scorm_package_id hem content_url boş.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "ok" | "err" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${tone === "err" ? "text-destructive" : "text-foreground"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
