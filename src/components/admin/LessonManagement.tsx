import { useState, useMemo } from "react";
import JSZip from "jszip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge-custom";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Plus, Edit, Trash2, GripVertical, BookOpen, FileQuestion, Video,
  FileText, Loader2, Upload, ArrowLeft, Package, ExternalLink, RefreshCw,
  Users,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { ScormScoDetails } from "./ScormScoDetails";
import { ScormProgressReport } from "./ScormProgressReport";

type LessonType = Database["public"]["Enums"]["lesson_type"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

interface LessonManagementProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
}

const lessonTypeLabels: Record<LessonType, string> = {
  scorm: "SCORM Eğitim",
  exam: "Sınav",
  live: "Canlı Oturum",
  content: "İçerik (Video/PDF)",
  face_to_face: "Yüz Yüze Eğitim",
};

const lessonTypeIcons: Record<LessonType, typeof BookOpen> = {
  scorm: BookOpen,
  exam: FileQuestion,
  live: Video,
  content: FileText,
  face_to_face: Users,
};

/** Sanitize filename/path segment for storage compatibility */
function sanitizePathSegment(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function sanitizeRelativePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(sanitizePathSegment)
    .join("/");
}

function detectScormEntryPoint(paths: string[]): string {
  const prioritized = [
    // Articulate/Storyline direct content files first
    "story.html",
    "story_html5.html",
    "index_lms_html5.html",
    "scormcontent/index.html",
    // Router/redirect pages as fallback
    "index_lms.html",
    "index.html",
    "launch.html",
    "start.html",
    "default.html",
  ];

  const lowerMap = new Map(paths.map((p) => [p.toLowerCase(), p]));

  for (const candidate of prioritized) {
    const found = lowerMap.get(candidate);
    if (found) return found;
  }

  const htmlFallback = paths.find((p) => /\.html?$/i.test(p));
  return htmlFallback || "index.html";
}

/** Minimal client-side SCORM manifest parser. Detects version + entry point + SCO list. */
function parseManifestXml(xml: string): {
  version: string;
  title?: string;
  entryPoint?: string;
  scos: Array<{ identifier: string; title: string; launchPath: string }>;
} {
  const result = {
    version: "1.2",
    title: undefined as string | undefined,
    entryPoint: undefined as string | undefined,
    scos: [] as Array<{ identifier: string; title: string; launchPath: string }>,
  };
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const schemaVersion = doc.querySelector("metadata schemaversion")?.textContent?.trim() || "";
    const lower = xml.toLowerCase();
    if (schemaVersion.includes("2004") || lower.includes("adlcp_v1p3") || lower.includes("imscp_v1p1")) {
      result.version = "2004";
    }
    result.title =
      doc.querySelector("organization > title")?.textContent?.trim() ||
      doc.querySelector("title")?.textContent?.trim();

    const resources: Record<string, string> = {};
    doc.querySelectorAll("resource").forEach((r) => {
      const id = r.getAttribute("identifier");
      const href = r.getAttribute("href");
      if (id && href) resources[id] = href;
    });

    doc.querySelectorAll("item").forEach((item) => {
      const idRef = item.getAttribute("identifierref");
      if (!idRef || !resources[idRef]) return;
      result.scos.push({
        identifier: item.getAttribute("identifier") || idRef,
        title: item.querySelector("title")?.textContent?.trim() || "SCO",
        launchPath: resources[idRef],
      });
    });

    if (result.scos.length > 0) result.entryPoint = result.scos[0].launchPath;
  } catch (e) {
    console.warn("[manifest] parse error:", e);
  }
  return result;
}

function getContentTypeByPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";

  const mimeMap: Record<string, string> = {
    html: "text/html",
    htm: "text/html",
    js: "application/javascript",
    mjs: "application/javascript",
    css: "text/css",
    json: "application/json",
    xml: "application/xml",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    pdf: "application/pdf",
    txt: "text/plain",
  };

  return mimeMap[extension] ?? "application/octet-stream";
}

export function LessonManagement({ courseId, courseTitle, onBack }: LessonManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteScormDialogOpen, setDeleteScormDialogOpen] = useState(false);
  const [selectedScormPkg, setSelectedScormPkg] = useState<string | null>(null);
  const [examMode, setExamMode] = useState<"platform" | "scorm">("platform");
  const [reparsingAll, setReparsingAll] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    type: "content" as LessonType,
    sort_order: 0,
    duration_minutes: 0,
    is_active: true,
    content_url: "",
    content_html: "",
    exam_id: "",
    scorm_package_id: "",
    min_live_duration_minutes: 0,
    f2f_session_id: "",
  });

  // Fetch lessons
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["admin-lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch exams for this course
  const { data: exams } = useQuery({
    queryKey: ["course-exams", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("id, title")
        .eq("course_id", courseId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch SCORM packages for this course
  const { data: scormPackages } = useQuery({
    queryKey: ["course-scorm-packages", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scorm_packages")
        .select("id, package_url, entry_point, scorm_version, manifest_data")
        .eq("course_id", courseId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch face-to-face sessions for this course
  const { data: f2fSessions } = useQuery({
    queryKey: ["course-f2f-sessions", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("face_to_face_sessions")
        .select("id, session_date, start_time, end_time, location, status, lesson_id, firms(name)")
        .eq("course_id", courseId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Re-parse all SCORM manifests (client-side, fetches imsmanifest.xml from public CDN)
  const handleReparseAll = async () => {
    if (!scormPackages || scormPackages.length === 0) return;
    setReparsingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const pkg of scormPackages) {
      try {
        const manifestUrl = `${pkg.package_url.replace(/\/+$/, "")}/imsmanifest.xml`;
        const res = await fetch(manifestUrl);
        if (!res.ok) { failCount++; continue; }
        const xml = await res.text();
        const parsed = parseManifestXml(xml);
        const update: Record<string, unknown> = { manifest_data: parsed };
        if (parsed.version) update.scorm_version = parsed.version;
        if (parsed.entryPoint) update.entry_point = parsed.entryPoint;
        const { error } = await supabase
          .from("scorm_packages")
          .update(update)
          .eq("id", pkg.id);
        if (error) { failCount++; continue; }
        successCount++;
      } catch {
        failCount++;
      }
    }

    setReparsingAll(false);
    queryClient.invalidateQueries({ queryKey: ["course-scorm-packages", courseId] });
    toast({
      title: "Manifest Parse Tamamlandı",
      description: `${successCount} başarılı, ${failCount} başarısız.`,
    });
  };

  // Create lesson
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: newLesson, error } = await supabase.from("lessons").insert({
        course_id: courseId,
        title: data.title,
        type: data.type,
        sort_order: data.sort_order,
        duration_minutes: data.duration_minutes,
        is_active: data.is_active,
        content_url: data.type === "content" ? (data.content_html || data.content_url || null) : (data.content_url || null),
        exam_id: data.exam_id || null,
        scorm_package_id: data.scorm_package_id || null,
        min_live_duration_minutes: data.type === "live" ? data.min_live_duration_minutes : 0,
      } as any).select().single();
      if (error) throw error;
      // Link f2f session to this lesson
      if (data.type === "face_to_face" && data.f2f_session_id && newLesson) {
        await supabase.from("face_to_face_sessions").update({ lesson_id: newLesson.id }).eq("id", data.f2f_session_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-f2f-sessions", courseId] });
      toast({ title: "Başarılı", description: "Ders eklendi." });
      handleCloseDialog();
    },
    onError: (err) => {
      toast({ title: "Hata", description: "Ders eklenirken hata oluştu.", variant: "destructive" });
      console.error(err);
    },
  });

  // Update lesson
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("lessons")
        .update({
          title: data.title,
          type: data.type,
          sort_order: data.sort_order,
          duration_minutes: data.duration_minutes,
          is_active: data.is_active,
          content_url: data.type === "content" ? (data.content_html || data.content_url || null) : (data.content_url || null),
          exam_id: data.exam_id || null,
          scorm_package_id: data.scorm_package_id || null,
          min_live_duration_minutes: data.type === "live" ? data.min_live_duration_minutes : 0,
        } as any)
        .eq("id", data.id);
      if (error) throw error;
      // Link f2f session to this lesson
      if (data.type === "face_to_face" && data.f2f_session_id) {
        // First unlink any previous session pointing to this lesson
        await supabase.from("face_to_face_sessions").update({ lesson_id: null }).eq("lesson_id", data.id);
        // Then link the selected session
        await supabase.from("face_to_face_sessions").update({ lesson_id: data.id }).eq("id", data.f2f_session_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-f2f-sessions", courseId] });
      toast({ title: "Başarılı", description: "Ders güncellendi." });
      handleCloseDialog();
    },
    onError: (err) => {
      toast({ title: "Hata", description: "Ders güncellenirken hata oluştu.", variant: "destructive" });
      console.error(err);
    },
  });

  // Delete lesson
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      toast({ title: "Başarılı", description: "Ders silindi." });
      setDeleteDialogOpen(false);
      setSelectedLesson(null);
    },
    onError: (err) => {
      toast({ title: "Hata", description: "Ders silinirken hata oluştu.", variant: "destructive" });
      console.error(err);
    },
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("lessons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
    },
  });

  // Delete SCORM package
  const deleteScormMutation = useMutation({
    mutationFn: async (pkgId: string) => {
      const pkg = scormPackages?.find((p) => p.id === pkgId);
      const { error } = await supabase.from("scorm_packages").delete().eq("id", pkgId);
      if (error) throw error;
      await supabase.from("lessons").update({ scorm_package_id: null }).eq("scorm_package_id", pkgId);
      if (pkg?.package_url) {
        try {
          const url = new URL(pkg.package_url);
          // Try public bucket markers for both new (scorm-public) and legacy (scorm-packages)
          const buckets = ["scorm-public", "scorm-packages"];
          for (const bucket of buckets) {
            const marker = `/storage/v1/object/public/${bucket}/`;
            const idx = url.pathname.indexOf(marker);
            if (idx === -1) continue;
            const folderPath = url.pathname.slice(idx + marker.length).replace(/\/+$/, "");
            const recursiveRemove = async (folder: string) => {
              const { data: files } = await supabase.storage.from(bucket).list(folder);
              if (!files || files.length === 0) return;
              const filesToRemove: string[] = [];
              for (const f of files) {
                const fullPath = `${folder}/${f.name}`;
                if (f.id === null) {
                  await recursiveRemove(fullPath);
                } else {
                  filesToRemove.push(fullPath);
                }
              }
              if (filesToRemove.length > 0) {
                await supabase.storage.from(bucket).remove(filesToRemove);
              }
            };
            await recursiveRemove(folderPath);
            break;
          }
        } catch (e) {
          console.warn("Storage cleanup failed:", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-scorm-packages", courseId] });
      queryClient.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
      toast({ title: "Başarılı", description: "SCORM paketi silindi." });
      setDeleteScormDialogOpen(false);
      setSelectedScormPkg(null);
    },
    onError: (err) => {
      toast({ title: "Hata", description: "SCORM paketi silinirken hata oluştu.", variant: "destructive" });
      console.error(err);
    },
  });

  // Upload SCORM package - extract zip, upload files, then auto-parse manifest
  const handleScormUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const zip = await JSZip.loadAsync(file);
      const folderName = `${courseId}/${Date.now()}`;

      const allEntries = Object.keys(zip.files);
      const fileNames = allEntries.filter((name) => !zip.files[name].dir);

      // Detect single root folder wrapper
      let rootPrefix = "";
      const topLevelEntries = new Set(fileNames.map((f) => f.split("/")[0]));
      if (topLevelEntries.size === 1) {
        const [singleFolder] = [...topLevelEntries];
        if (singleFolder && fileNames.every((f) => f.startsWith(`${singleFolder}/`))) {
          rootPrefix = `${singleFolder}/`;
        }
      }

      const normalizedPaths = fileNames
        .map((f) => (rootPrefix && f.startsWith(rootPrefix) ? f.slice(rootPrefix.length) : f))
        .filter(Boolean);

      const sanitizedPaths = normalizedPaths.map((p) => sanitizeRelativePath(p));
      const entryPoint = detectScormEntryPoint(sanitizedPaths);
      const totalFiles = normalizedPaths.length;
      if (totalFiles === 0) throw new Error("Zip dosyasında yüklenecek dosya bulunamadı.");

      // 1) Request signed PUT URLs for every file from R2 edge function
      const filesPayload = normalizedPaths.map((p) => ({
        path: sanitizeRelativePath(p),
        contentType: getContentTypeByPath(p),
      }));

      const { data: signResp, error: signErr } = await supabase.functions.invoke(
        "r2-sign-upload",
        { body: { files: filesPayload, packagePrefix: folderName } },
      );
      if (signErr) throw new Error(`Signed URL alınamadı: ${signErr.message}`);
      if (!signResp?.signed) throw new Error("Geçersiz signed URL yanıtı.");

      const signedMap = new Map<string, { url: string; key: string; contentType: string }>(
        signResp.signed.map((s: { path: string; url: string; key: string; contentType: string }) => [s.path, s]),
      );

      // 2) Upload each file directly to R2 with PUT
      let uploadedCount = 0;
      const queue: Promise<void>[] = [];
      const CONCURRENCY = 6;

      const uploadOne = async (relativePath: string) => {
        const zipEntry = zip.files[relativePath];
        if (!zipEntry || zipEntry.dir) return;
        const cleanPath = rootPrefix && relativePath.startsWith(rootPrefix)
          ? relativePath.slice(rootPrefix.length)
          : relativePath;
        const sanitizedKey = sanitizeRelativePath(cleanPath);
        const meta = signedMap.get(sanitizedKey);
        if (!meta) throw new Error(`Signed URL eksik: ${sanitizedKey}`);

        const blob = await zipEntry.async("blob");
        const res = await fetch(meta.url, {
          method: "PUT",
          headers: { "Content-Type": meta.contentType },
          body: blob,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`R2 upload başarısız (${res.status}): ${cleanPath} ${text.slice(0, 200)}`);
        }
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 90));
      };

      for (const relPath of fileNames) {
        const p = uploadOne(relPath);
        queue.push(p);
        if (queue.length >= CONCURRENCY) {
          await Promise.all(queue);
          queue.length = 0;
        }
      }
      if (queue.length > 0) await Promise.all(queue);

      // 3) Build public URL from R2_PUBLIC_URL (provided to client via VITE? No — derive in function response prefix)
      const publicBase = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, "");
      if (!publicBase) {
        throw new Error("VITE_R2_PUBLIC_URL tanımlı değil. R2 public domain'i ayarlanmalı.");
      }
      const packageUrl = `${publicBase}/${signResp.prefix}`;

      // 4) Create package row
      const { data: pkg, error: pkgError } = await supabase
        .from("scorm_packages")
        .insert({
          course_id: courseId,
          package_url: packageUrl,
          entry_point: entryPoint,
          scorm_version: "1.2",
        })
        .select()
        .single();
      if (pkgError) throw pkgError;

      setUploadProgress(95);

      // 5) Parse manifest from zip directly
      try {
        const manifestEntry =
          zip.file(`${rootPrefix}imsmanifest.xml`) || zip.file("imsmanifest.xml");
        if (manifestEntry) {
          const manifestXml = await manifestEntry.async("string");
          const parsed = parseManifestXml(manifestXml);
          const update: Record<string, unknown> = { manifest_data: parsed };
          if (parsed.version) update.scorm_version = parsed.version;
          if (parsed.entryPoint) update.entry_point = sanitizeRelativePath(parsed.entryPoint);
          await supabase.from("scorm_packages").update(update).eq("id", pkg.id);

          if (parsed.scos.length > 0) {
            await supabase.from("scorm_scos").insert(
              parsed.scos.map((sco, idx) => ({
                package_id: pkg.id,
                identifier: sco.identifier,
                title: sco.title,
                launch_path: sanitizeRelativePath(sco.launchPath),
                order_index: idx,
                scorm_type: "sco",
              })),
            );
          }

          toast({
            title: "SCORM Manifest Analizi Tamamlandı",
            description: `Versiyon: ${parsed.version} | ${parsed.scos.length} SCO | Başlık: ${parsed.title || "—"}`,
          });
        } else {
          toast({
            title: "Uyarı",
            description: "imsmanifest.xml bulunamadı. Giriş noktası otomatik belirlendi.",
            variant: "destructive",
          });
        }
      } catch (manifestErr) {
        console.warn("Manifest parse warning:", manifestErr);
      }

      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["course-scorm-packages", courseId] });
      toast({ title: "Başarılı", description: `SCORM paketi R2'ye yüklendi (${totalFiles} dosya).` });
      setFormData((prev) => ({ ...prev, scorm_package_id: pkg.id }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "SCORM yüklenirken hata oluştu.";
      console.error("SCORM upload error:", err);
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedLesson(null);
    const nextOrder = (lessons?.length || 0) + 1;
    setFormData({
      title: "",
      type: "content",
      sort_order: nextOrder,
      duration_minutes: 0,
      is_active: true,
      content_url: "",
      content_html: "",
      exam_id: "",
      scorm_package_id: "",
      min_live_duration_minutes: 0,
      f2f_session_id: "",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (lesson: Lesson) => {
    setIsEditing(true);
    setSelectedLesson(lesson);
    const isHtml = lesson.content_url?.startsWith("<");
    // Set exam mode based on existing data
    if (lesson.type === "exam") {
      setExamMode(lesson.scorm_package_id ? "scorm" : "platform");
    }
    // Find linked f2f session
    const linkedSession = f2fSessions?.find((s: any) => s.lesson_id === lesson.id);
    setFormData({
      title: lesson.title,
      type: lesson.type,
      sort_order: lesson.sort_order,
      duration_minutes: lesson.duration_minutes,
      is_active: lesson.is_active,
      content_url: isHtml ? "" : (lesson.content_url || ""),
      content_html: isHtml ? (lesson.content_url || "") : "",
      exam_id: lesson.exam_id || "",
      scorm_package_id: lesson.scorm_package_id || "",
      min_live_duration_minutes: (lesson as any).min_live_duration_minutes || 0,
      f2f_session_id: linkedSession?.id || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedLesson(null);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "Hata", description: "Ders başlığı zorunludur.", variant: "destructive" });
      return;
    }
    if (isEditing && selectedLesson) {
      updateMutation.mutate({ ...formData, id: selectedLesson.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ders Yönetimi</h1>
            <p className="text-muted-foreground">{courseTitle}</p>
          </div>
        </div>
        <Button variant="accent" onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Ders
        </Button>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">SCORM paketi yükleniyor...</span>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SCORM Packages overview */}
      {scormPackages && scormPackages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                SCORM Paketleri ({scormPackages.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={reparsingAll}
                onClick={handleReparseAll}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reparsingAll ? "animate-spin" : ""}`} />
                {reparsingAll ? "Parse ediliyor..." : "Tümünü Yeniden Parse Et"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scormPackages.map((pkg) => {
                const manifest = pkg.manifest_data as any;
                const manifestTitle = manifest?.title;
                const scoCount = manifest?.scos?.length || 0;
                return (
                  <div key={pkg.id} className="text-sm p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-accent" />
                          <span className="font-medium">
                            {manifestTitle || pkg.id.slice(0, 8) + "..."}
                          </span>
                          <Badge variant="secondary">{pkg.scorm_version || "1.2"}</Badge>
                          {scoCount > 0 && (
                            <Badge variant="outline" className="text-xs">{scoCount} SCO</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">
                          Giriş: {pkg.entry_point || "index.html"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => {
                            const ep = pkg.entry_point || "index.html";
                            const preferredEntry = ep === "story.html" ? "story_html5.html" : ep;
                            window.open(`${pkg.package_url}/${preferredEntry}`, "_blank");
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Önizleme
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedScormPkg(pkg.id);
                            setDeleteScormDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <ScormScoDetails packageId={pkg.id} packageUrl={pkg.package_url} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SCO Progress Report */}
      <ScormProgressReport courseId={courseId} />

      {/* Lessons Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Dersler
            {lessons && <Badge variant="secondary" className="ml-2">{lessons.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : lessons && lessons.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Sıra</TableHead>
                  <TableHead>Ders</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead className="hidden md:table-cell">Süre</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((lesson) => {
                  const LessonIcon = lessonTypeIcons[lesson.type];
                  return (
                    <TableRow key={lesson.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{lesson.sort_order}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{lesson.title}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <LessonIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{lessonTypeLabels[lesson.type]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {lesson.duration_minutes > 0 ? `${lesson.duration_minutes} dk` : "-"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={lesson.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: lesson.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(lesson)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => { setSelectedLesson(lesson); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Henüz ders eklenmemiş. "Yeni Ders" butonuyla başlayın.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Lesson Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Ders Düzenle" : "Yeni Ders Ekle"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Ders bilgilerini güncelleyin." : "Yeni bir ders ekleyin ve içerik tipini belirleyin."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Ders Başlığı *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ders başlığını girin"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ders Tipi</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val as LessonType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scorm">SCORM Eğitim</SelectItem>
                    <SelectItem value="exam">Sınav</SelectItem>
                    <SelectItem value="live">Canlı Oturum</SelectItem>
                    <SelectItem value="content">İçerik (Video/PDF)</SelectItem>
                    <SelectItem value="face_to_face">Yüz Yüze Eğitim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sıra No</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Süre (dk)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Aktif</Label>
                </div>
              </div>
            </div>

            {/* SCORM type: upload + select */}
            {formData.type === "scorm" && (
              <div className="space-y-3">
                <Label>SCORM Paketi</Label>
                <Select
                  value={formData.scorm_package_id}
                  onValueChange={(val) => setFormData({ ...formData, scorm_package_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="SCORM paketi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {scormPackages?.map((pkg) => {
                      const manifest = pkg.manifest_data as any;
                      const label = manifest?.title || `${pkg.id.slice(0, 8)}...`;
                      return (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {label} ({pkg.scorm_version || "1.2"})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Yeni SCORM paketi yükleyin (.zip)
                  </p>
                  <input
                    type="file"
                    accept=".zip,.html"
                    className="hidden"
                    id="scorm-file-input-inline"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleScormUpload(file);
                    }}
                  />
                  <label htmlFor="scorm-file-input-inline" className="cursor-pointer">
                    <Button variant="outline" size="sm" disabled={uploading} asChild>
                      <span>
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Yükleniyor...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Dosya Seç
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            )}

            {/* Exam type - radio choice */}
            {formData.type === "exam" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Sınav Kaynağı</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setExamMode("platform");
                        setFormData(prev => ({ ...prev, scorm_package_id: "" }));
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        examMode === "platform"
                          ? "border-accent bg-accent/5 shadow-sm"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <FileQuestion className="h-6 w-6 text-accent" />
                      <span className="text-sm font-medium">Platform Sınavı</span>
                      <span className="text-xs text-muted-foreground text-center">Sistemde oluşturulmuş sınavlardan seçin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExamMode("scorm");
                        setFormData(prev => ({ ...prev, exam_id: "" }));
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        examMode === "scorm"
                          ? "border-accent bg-accent/5 shadow-sm"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <Package className="h-6 w-6 text-accent" />
                      <span className="text-sm font-medium">SCORM Sınav</span>
                      <span className="text-xs text-muted-foreground text-center">SCORM formatında sınav paketi yükleyin</span>
                    </button>
                  </div>
                </div>

                {examMode === "platform" && (
                  <div className="space-y-2">
                    <Label>Sınav Seçin</Label>
                    <Select
                      value={formData.exam_id}
                      onValueChange={(val) => setFormData({ ...formData, exam_id: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sınav seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams?.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(!exams || exams.length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        Bu kursa ait sınav yok. Sınav Yönetimi'nden oluşturun.
                      </p>
                    )}
                  </div>
                )}

                {examMode === "scorm" && (
                  <div className="space-y-3">
                    <Label>SCORM Sınav Paketi</Label>
                    <Select
                      value={formData.scorm_package_id}
                      onValueChange={(val) => setFormData({ ...formData, scorm_package_id: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="SCORM sınav paketi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {scormPackages?.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.id.slice(0, 8)}... ({pkg.scorm_version || "1.2"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground mb-2">
                        Yeni SCORM sınav paketi yükleyin (.zip)
                      </p>
                      <input
                        type="file"
                        accept=".zip"
                        className="hidden"
                        id="scorm-exam-file-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleScormUpload(file);
                        }}
                      />
                      <label htmlFor="scorm-exam-file-input" className="cursor-pointer">
                        <Button variant="outline" size="sm" disabled={uploading} asChild>
                          <span>
                            {uploading ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Yükleniyor...</>
                            ) : (
                              <><Upload className="mr-2 h-4 w-4" />SCORM Dosya Seç</>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content type: rich text editor + file upload + URL */}
            {formData.type === "content" && (
              <div className="space-y-4">
                {/* File Upload Section */}
                <div className="space-y-2">
                  <Label>Dosya Yükle (PDF, PPT, MP4, AVI)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      PDF, PPT, MP4 veya AVI dosyası yükleyin
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.ppt,.pptx,.mp4,.avi,.mov,.webm"
                      className="hidden"
                      id="content-file-input"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const ext = file.name.split('.').pop()?.toLowerCase() || '';
                          const fileName = `${courseId}/${Date.now()}_${sanitizePathSegment(file.name)}`;
                          const { error } = await supabase.storage
                            .from("lesson-content")
                            .upload(fileName, file, { upsert: true });
                          if (error) throw error;
                          const { data: { publicUrl } } = supabase.storage
                            .from("lesson-content")
                            .getPublicUrl(fileName);
                          setFormData(prev => ({ ...prev, content_url: publicUrl }));
                          toast({ title: "Başarılı", description: "Dosya yüklendi." });
                        } catch (err: any) {
                          toast({ title: "Hata", description: err.message || "Dosya yüklenemedi.", variant: "destructive" });
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                    <label htmlFor="content-file-input" className="cursor-pointer">
                      <Button variant="outline" size="sm" disabled={uploading} asChild>
                        <span>
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Yükleniyor...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Dosya Seç
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                  {formData.content_url && !formData.content_url.startsWith("<") && (
                    <div className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                      <FileText className="h-4 w-4 text-accent" />
                      <span className="truncate flex-1">{formData.content_url.split('/').pop()}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => window.open(formData.content_url, '_blank')}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Önizle
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>İçerik (Zengin Metin Editörü)</Label>
                  <RichTextEditor
                    content={formData.content_html}
                    onChange={(html) => setFormData({ ...formData, content_html: html })}
                    placeholder="Ders içeriğini buraya yazın..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Veya İçerik URL'si (Manuel)</Label>
                  <Input
                    value={formData.content_url}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    placeholder="https://example.com/video.mp4 veya .pdf"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL girilirse zengin metin yerine bu kullanılır.
                  </p>
                </div>
              </div>
            )}

            {/* Live type */}
            {formData.type === "live" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Canlı Oturum URL'si</Label>
                  <Input
                    value={formData.content_url}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    placeholder="https://bbb.example.com/room/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Katılım Süresi (dakika)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.min_live_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, min_live_duration_minutes: parseInt(e.target.value) || 0 })}
                    placeholder="0 = zorunlu değil"
                  />
                  <p className="text-xs text-muted-foreground">
                    Öğrencinin dersi tamamlanmış sayılması için gereken minimum katılım süresi. 0 ise süre kontrolü yapılmaz.
                  </p>
                </div>
              </div>
            )}

            {/* Face to face type: select existing session */}
            {formData.type === "face_to_face" && (
              <div className="space-y-3">
                <Label>Yüz Yüze Eğitim Oturumu</Label>
                {f2fSessions && f2fSessions.length > 0 ? (
                  <Select
                    value={formData.f2f_session_id}
                    onValueChange={(val) => setFormData({ ...formData, f2f_session_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Oturum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {f2fSessions.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.session_date} | {s.start_time?.slice(0,5)}-{s.end_time?.slice(0,5)} | {s.location}
                          {s.firms?.name ? ` (${s.firms.name})` : ""}
                          {s.lesson_id ? " ✓" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                    Bu kursa ait yüz yüze oturum bulunamadı. Önce "Yüz Yüze Oturumlar" modülünden oturum oluşturun.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Seçilen oturum bu derse bağlanacaktır. Öğrenciler QR kod veya ders kodu ile katılım sağlayabilir.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>İptal</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dersi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedLesson?.title}</strong> dersini silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLesson && deleteMutation.mutate(selectedLesson.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete SCORM Package Dialog */}
      <AlertDialog open={deleteScormDialogOpen} onOpenChange={setDeleteScormDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>SCORM Paketini Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu SCORM paketini silmek istediğinize emin misiniz? Bu paketi kullanan dersler etkilenecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedScormPkg && deleteScormMutation.mutate(selectedScormPkg)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteScormMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
