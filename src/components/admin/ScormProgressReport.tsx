import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Loader2, Users } from "lucide-react";

interface ScormProgressReportProps {
  courseId: string;
}

interface ScoProgress {
  scoId: string;
  scoTitle: string;
  identifier: string;
  totalUsers: number;
  completedUsers: number;
  avgScore: number | null;
  avgTimeSeconds: number;
}

export function ScormProgressReport({ courseId }: ScormProgressReportProps) {
  // Fetch SCOs via packages
  const { data: scos } = useQuery({
    queryKey: ["course-scos-report", courseId],
    queryFn: async () => {
      const { data: packages } = await supabase
        .from("scorm_packages")
        .select("id")
        .eq("course_id", courseId);
      if (!packages || packages.length === 0) return [];

      const packageIds = packages.map((p) => p.id);
      const { data, error } = await supabase
        .from("scorm_scos")
        .select("*")
        .in("package_id", packageIds)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  // Fetch runtime data for this course's enrollments
  const { data: runtimeData, isLoading } = useQuery({
    queryKey: ["sco-runtime-report", courseId],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, user_id")
        .eq("course_id", courseId);
      if (!enrollments || enrollments.length === 0) return { entries: [], enrollmentCount: 0 };

      const enrollmentIds = enrollments.map((e) => e.id);
      // Fetch in batches if needed
      const { data, error } = await supabase
        .from("scorm_runtime_data")
        .select("*")
        .in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return { entries: data || [], enrollmentCount: enrollments.length };
    },
  });

  if (!scos || scos.length === 0) return null;

  // Build per-SCO progress
  const scoProgressMap: ScoProgress[] = scos.map((sco) => {
    const entries = runtimeData?.entries || [];
    const scoEntries = entries.filter((e) => e.sco_id === sco.id);

    // Group by enrollment
    const byEnrollment = new Map<string, Record<string, string>>();
    for (const entry of scoEntries) {
      if (!byEnrollment.has(entry.enrollment_id)) {
        byEnrollment.set(entry.enrollment_id, {});
      }
      byEnrollment.get(entry.enrollment_id)![entry.cmi_key] = entry.cmi_value || "";
    }

    let completedCount = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let timeSum = 0;

    byEnrollment.forEach((cmiMap) => {
      const status = cmiMap["cmi.lesson_status"] || cmiMap["cmi.completion_status"] || "";
      if (status === "completed" || status === "passed") completedCount++;

      const rawScore = cmiMap["cmi.score.raw"];
      if (rawScore) {
        const n = parseFloat(rawScore);
        if (!isNaN(n)) { scoreSum += n; scoreCount++; }
      }

      const sessionTime = cmiMap["cmi.session_time"] || cmiMap["cmi.total_time"];
      if (sessionTime) {
        timeSum += parseTimeToSeconds(sessionTime);
      }
    });

    return {
      scoId: sco.id,
      scoTitle: sco.title,
      identifier: sco.identifier,
      totalUsers: byEnrollment.size,
      completedUsers: completedCount,
      avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      avgTimeSeconds: byEnrollment.size > 0 ? Math.round(timeSum / byEnrollment.size) : 0,
    };
  });

  const totalEnrollments = runtimeData?.enrollmentCount || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          SCO Bazlı İlerleme Raporu
          <Badge variant="secondary" className="ml-1">{scos.length} SCO</Badge>
          <Badge variant="outline" className="ml-1">
            <Users className="h-3 w-3 mr-1" />
            {totalEnrollments} kayıt
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">SCO</TableHead>
                <TableHead className="text-xs w-32">Tamamlama</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Ort. Puan</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Ort. Süre</TableHead>
                <TableHead className="text-xs">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoProgressMap.map((sp) => {
                const pct = sp.totalUsers > 0 ? Math.round((sp.completedUsers / sp.totalUsers) * 100) : 0;
                return (
                  <TableRow key={sp.scoId}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium">{sp.scoTitle}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {sp.identifier.length > 25 ? sp.identifier.slice(0, 25) + "…" : sp.identifier}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={pct} className="h-2" />
                        <span className="text-[10px] text-muted-foreground">
                          {sp.completedUsers}/{sp.totalUsers} (%{pct})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {sp.avgScore !== null ? (
                        <span className={`text-xs font-semibold ${sp.avgScore >= 70 ? "text-success" : "text-destructive"}`}>
                          {sp.avgScore}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {sp.avgTimeSeconds > 0 ? formatDisplayTime(sp.avgTimeSeconds) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={pct >= 80 ? "success" : pct >= 40 ? "warning" : "secondary"}
                        className="text-[10px]"
                      >
                        {pct >= 80 ? "İyi" : pct >= 40 ? "Orta" : "Düşük"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function parseTimeToSeconds(timeStr: string): number {
  const iso = timeStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (iso) {
    return parseInt(iso[1] || "0") * 3600 + parseInt(iso[2] || "0") * 60 + Math.round(parseFloat(iso[3] || "0"));
  }
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}

function formatDisplayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}
