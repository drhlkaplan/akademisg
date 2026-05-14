/**
 * 1 ders = 45 dakika standardı.
 * LMS'te tüm süre gösterimleri bu utility üzerinden ders cinsine çevrilir.
 * Mevzuat hesapları (min_total_hours vs.) dakika cinsinden korunur.
 */

export const MINUTES_PER_LESSON = 45;

export function minutesToLessons(minutes: number): number {
  if (!minutes || minutes <= 0) return 0;
  return Math.round(minutes / MINUTES_PER_LESSON);
}

export function lessonsToMinutes(lessons: number): number {
  return Math.max(0, lessons) * MINUTES_PER_LESSON;
}

/** "11 ders (8s 15dk)" gibi kısa label */
export function formatLessonDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 ders";
  const lessons = minutesToLessons(minutes);
  const totalMin = lessons * MINUTES_PER_LESSON;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const time = h > 0 ? (m > 0 ? `${h}s ${m}dk` : `${h}s`) : `${m}dk`;
  return `${lessons} ders (${time})`;
}

export function formatLessonsShort(minutes: number): string {
  return `${minutesToLessons(minutes)} ders`;
}
