import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function buildSpeechText(question: string, options: string[] = []) {
  return `${question}. ` + options.map((o, i) => `${LETTERS[i] || i + 1} şıkkı: ${o}.`).join(" ");
}

interface Props {
  questionText: string;
  options?: string[];
  audioPath?: string | null;
  autoPlay?: boolean;
  rate?: number;
  size?: "sm" | "default";
  label?: boolean;
}

/** Plays stored AI voice if available, otherwise falls back to the browser's Turkish voice. */
export function QuestionAudioButton({ questionText, options = [], audioPath, autoPlay, rate = 1, size = "sm", label = true }: Props) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setPlaying(false);
  };

  const play = async () => {
    stop();
    if (audioPath) {
      setLoading(true);
      const { data } = await supabase.storage.from("question-audio").createSignedUrl(audioPath, 3600);
      setLoading(false);
      if (data?.signedUrl) {
        const a = new Audio(data.signedUrl);
        a.playbackRate = rate;
        a.onended = () => setPlaying(false);
        audioRef.current = a;
        setPlaying(true);
        a.play().catch(() => setPlaying(false));
        return;
      }
    }
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(buildSpeechText(questionText, options));
    u.lang = "tr-TR";
    u.rate = rate;
    const tr = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith("tr"));
    if (tr) u.voice = tr;
    u.onend = () => setPlaying(false);
    setPlaying(true);
    synth.speak(u);
  };

  useEffect(() => {
    if (autoPlay) play();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionText, audioPath, autoPlay]);

  return (
    <Button type="button" variant="outline" size={size} onClick={(e) => { e.preventDefault(); e.stopPropagation(); playing ? stop() : play(); }} aria-label={playing ? "Seslendirmeyi durdur" : "Soruyu seslendir"}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {label && <span className="ml-1">{playing ? "Durdur" : "Seslendir"}</span>}
    </Button>
  );
}

export async function generateQuestionAudio(table: "questions" | "question_bank", id: string) {
  const { data, error } = await supabase.functions.invoke("question-tts", { body: { table, id } });
  if (error) {
    let msg = error.message;
    try { const b = await (error as any).context?.json(); if (b?.error) msg = b.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data.audio_url as string;
}
