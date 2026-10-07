import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Award, BookOpen, CalendarDays, CheckCircle, FileQuestion } from "lucide-react";
import { tr } from "date-fns/locale";

type Kind = "lesson" | "exam" | "cert";
interface Ev { date: Date; kind: Kind; title: string; detail?: string }

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function StudentActivityCalendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Ev[]>([]);
  const [completed, setCompleted] = useState<{ id: string; title: string; progress: number; date: string | null }[]>([]);
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: enr } = await supabase.from("enrollments")
        .select("id, status, progress_percent, completed_at, courses(title)")
        .eq("user_id", user.id).is("deleted_at", null);
      const enrIds = (enr || []).map((e) => e.id);
      const [lp, ex, ce] = await Promise.all([
        enrIds.length ? supabase.from("lesson_progress").select("updated_at, lesson_status, lessons(title)").in("enrollment_id", enrIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("exam_results").select("completed_at, created_at, score, status, exams(title)").eq("user_id", user.id),
        supabase.from("certificates").select("issue_date, course_title, certificate_number").eq("user_id", user.id).is("deleted_at", null),
      ]);
      const evs: Ev[] = [];
      (lp.data || []).forEach((l: any) => l.updated_at && evs.push({
        date: new Date(l.updated_at), kind: "lesson", title: l.lessons?.title || "Ders",
        detail: ["completed", "passed"].includes(l.lesson_status) ? "Tamamlandı" : "İzlendi",
      }));
      (ex.data || []).forEach((r: any) => { const d = r.completed_at || r.created_at; d && evs.push({
        date: new Date(d), kind: "exam", title: r.exams?.title || "Sınav",
        detail: `${Math.round(Number(r.score))} puan · ${r.status === "passed" ? "Geçti" : r.status === "failed" ? "Kaldı" : "Tamamlandı"}`,
      }); });
      (ce.data || []).forEach((c: any) => c.issue_date && evs.push({ date: new Date(c.issue_date), kind: "cert", title: c.course_title, detail: c.certificate_number }));
      setEvents(evs);
      setCompleted((enr || []).filter((e) => e.status === "completed" || (e.progress_percent || 0) >= 100)
        .map((e: any) => ({ id: e.id, title: e.courses?.title || "-", progress: e.progress_percent ?? 100, date: e.completed_at })));
    })();
  }, [user]);

  const byKind = useMemo(() => {
    const m: Record<Kind, Date[]> = { lesson: [], exam: [], cert: [] };
    events.forEach((e) => m[e.kind].push(e.date));
    return m;
  }, [events]);

  const dayEvents = selected ? events.filter((e) => dayKey(e.date) === dayKey(selected)) : [];
  const icon = { lesson: BookOpen, exam: FileQuestion, cert: Award };
  const color = { lesson: "text-success", exam: "text-primary", cert: "text-accent" };

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5" />Öğrenim Takvimim</CardTitle></CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <Calendar mode="single" selected={selected} onSelect={setSelected} locale={tr}
            modifiers={{ lesson: byKind.lesson, exam: byKind.exam, cert: byKind.cert }}
            modifiersClassNames={{
              lesson: "after:absolute after:bottom-1 after:left-[30%] after:h-1.5 after:w-1.5 after:rounded-full after:bg-success relative",
              exam: "before:absolute before:bottom-1 before:left-[45%] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary relative",
              cert: "ring-2 ring-accent rounded-md",
            }}
            className="rounded-md border pointer-events-auto" />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />Ders</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Sınav</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm ring-2 ring-accent" />Sertifika</span>
            </div>
            <p className="text-sm font-medium">{selected?.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</p>
            {dayEvents.length ? dayEvents.map((e, i) => { const I = icon[e.kind]; return (
              <div key={i} className="flex gap-2 text-sm border rounded-md p-2">
                <I className={`h-4 w-4 mt-0.5 shrink-0 ${color[e.kind]}`} />
                <div><p className="font-medium leading-tight">{e.title}</p>{e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}</div>
              </div>); }) : <p className="text-sm text-muted-foreground">Bu gün için kayıt yok.</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" />Tamamlanan Eğitimler</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {completed.length ? completed.map((c) => (
            <div key={c.id}>
              <div className="flex justify-between text-sm mb-1"><span className="font-medium">{c.title}</span><span className="text-muted-foreground">%{c.progress}{c.date ? ` · ${new Date(c.date).toLocaleDateString("tr-TR")}` : ""}</span></div>
              <Progress value={c.progress} className="h-2" />
            </div>
          )) : <p className="text-sm text-muted-foreground">Henüz tamamlanan eğitim yok.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
