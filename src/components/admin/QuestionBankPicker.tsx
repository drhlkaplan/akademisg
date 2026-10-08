import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { QuestionAudioButton, generateQuestionAudio } from "@/components/exam/QuestionAudioButton";

interface BankQuestion {
  id: string;
  main_category: string;
  category: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  exam_hint: string | null;
  audio_url: string | null;
}

const HINT_LABEL: Record<string, string> = { pre: "Ön değ.", final: "Final", both: "Ön + Final" };

export function QuestionBankPicker({ examId, onDone }: { examId: string; onDone?: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [main, setMain] = useState("all");
  const [cat, setCat] = useState("all");
  const [hint, setHint] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [voicing, setVoicing] = useState<Set<string>>(new Set());

  const { data: bank = [], isLoading } = useQuery({
    queryKey: ["question-bank"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("question_bank")
        .select("id, main_category, category, question_text, options, correct_answer, exam_hint, audio_url")
        .order("main_category")
        .order("category");
      if (error) throw error;
      return data as BankQuestion[];
    },
  });

  const mains = useMemo(() => [...new Set(bank.map((q) => q.main_category))], [bank]);
  const cats = useMemo(
    () => [...new Set(bank.filter((q) => main === "all" || q.main_category === main).map((q) => q.category))],
    [bank, main]
  );
  const filtered = bank.filter(
    (q) =>
      (main === "all" || q.main_category === main) &&
      (cat === "all" || q.category === cat) &&
      (hint === "all" || q.exam_hint === hint || q.exam_hint === "both") &&
      (!search || q.question_text.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")))
  );
  const allSelected = filtered.length > 0 && filtered.every((q) => selected.has(q.id));

  const toggleAll = () => {
    const next = new Set(selected);
    filtered.forEach((q) => (allSelected ? next.delete(q.id) : next.add(q.id)));
    setSelected(next);
  };

  const voice = async (ids: string[]) => {
    let ok = 0;
    for (const id of ids) {
      setVoicing((s) => new Set(s).add(id));
      try {
        await generateQuestionAudio("question_bank", id);
        ok++;
      } catch (e: any) {
        toast({ title: "Seslendirme hatası", description: e.message, variant: "destructive" });
        setVoicing(new Set());
        break;
      }
      setVoicing((s) => { const n = new Set(s); n.delete(id); return n; });
    }
    if (ok) toast({ title: "Seslendirildi", description: `${ok} soru seslendirildi.` });
    qc.invalidateQueries({ queryKey: ["question-bank"] });
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("questions").select("question_text").eq("exam_id", examId);
      const have = new Set((existing || []).map((q) => q.question_text.trim()));
      const rows = bank
        .filter((q) => selected.has(q.id) && !have.has(q.question_text.trim()))
        .map((q) => ({
          exam_id: examId,
          question_text: q.question_text,
          question_type: "multiple_choice" as const,
          options: q.options,
          correct_answer: q.correct_answer,
          points: 1,
          audio_url: q.audio_url,
        }));
      if (rows.length) {
        const { error } = await supabase.from("questions").insert(rows);
        if (error) throw error;
      }
      const skipped = selected.size - rows.length;
      toast({
        title: "Sorular eklendi",
        description: `${rows.length} soru eklendi${skipped ? `, ${skipped} soru zaten sınavda vardı` : ""}. Puanlar toplam 100 olacak şekilde eşit dağıtıldı.`,
      });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["exam-questions"] });
      onDone?.();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message || "Sorular eklenemedi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Kategorili Soru Bankası</Label>
        <span className="text-xs text-muted-foreground">{bank.length} soru</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={main} onValueChange={(v) => { setMain(v); setCat("all"); }}>
          <SelectTrigger><SelectValue placeholder="Ana konu" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm ana konular</SelectItem>
            {mains.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger><SelectValue placeholder="Konu" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm konular</SelectItem>
            {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={hint} onValueChange={setHint}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm sınav türleri</SelectItem>
            <SelectItem value="pre">Ön değerlendirme</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input placeholder="Soru ara..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">{filtered.length} soru listeleniyor • {selected.size} seçili</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!selected.size || voicing.size > 0} onClick={() => voice([...selected])}>
                {voicing.size ? `Seslendiriliyor (${voicing.size})...` : "Seçilenleri Seslendir"}
              </Button>
              <Button size="sm" variant="ghost" onClick={toggleAll} disabled={!filtered.length}>
                {allSelected ? "Listedekileri Kaldır" : "Listedekileri Seç"}
              </Button>
            </div>
          </div>
          <div className="max-h-[35vh] divide-y overflow-y-auto rounded-md border border-border">
            {filtered.map((q) => (
              <label key={q.id} className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={selected.has(q.id)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    e.target.checked ? next.add(q.id) : next.delete(q.id);
                    setSelected(next);
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{q.question_text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.main_category} • {q.category}
                    {q.exam_hint ? ` • ${HINT_LABEL[q.exam_hint]}` : ""} • Cevap: {q.correct_answer}
                    {q.audio_url ? " • 🔊 Seslendirilmiş" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <QuestionAudioButton questionText={q.question_text} options={q.options} audioPath={q.audio_url} label={false} />
                  <Button type="button" size="sm" variant="ghost" disabled={voicing.has(q.id)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); voice([q.id]); }}>
                    {voicing.has(q.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : q.audio_url ? "Yenile" : "Seslendir"}
                  </Button>
                </div>
              </label>
            ))}
            {!filtered.length && <p className="py-4 text-center text-sm text-muted-foreground">Soru bulunamadı</p>}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={!selected.size || saving}>
              {saving ? "Ekleniyor..." : `${selected.size} Soruyu Sınava Ekle`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
