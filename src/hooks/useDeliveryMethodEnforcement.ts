import { useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type HazardClass = Database["public"]["Enums"]["hazard_class_enum"];
type DeliveryMethod = Database["public"]["Enums"]["lesson_delivery_method"];

interface LessonEnforcementInput {
  lessonId: string;
  topicGroup: number | null;
  deliveryMethod: DeliveryMethod | null;
  type: string;
}

interface EnforcementResult {
  isBlocked: boolean;
  reason: string | null;
  requiredMethod: DeliveryMethod | null;
  badgeLabel: string | null;
}

/**
 * Determines if a lesson's SCORM completion should be blocked
 * based on hazard class and topic group rules.
 * 
 * Rule: Topic 4 in tehlikeli/cok_tehlikeli must be face-to-face only.
 */
export function useDeliveryMethodEnforcement(
  hazardClass: HazardClass | null | undefined,
  lessons: LessonEnforcementInput[]
): Record<string, EnforcementResult> {
  return useMemo(() => {
    const results: Record<string, EnforcementResult> = {};

    for (const lesson of lessons) {
      const isTopic4 = lesson.topicGroup === 4;
      const isHazardous = hazardClass === "tehlikeli" || hazardClass === "cok_tehlikeli";
      const mustBeFaceToFace = isTopic4 && isHazardous;

      if (mustBeFaceToFace && lesson.type === "scorm") {
        results[lesson.lessonId] = {
          isBlocked: true,
          reason:
            hazardClass === "cok_tehlikeli"
              ? "Çok tehlikeli sınıfta Konu 4 dersleri yalnızca yüz yüze tamamlanabilir."
              : "Tehlikeli sınıfta Konu 4 dersleri yalnızca yüz yüze tamamlanabilir.",
          requiredMethod: "face_to_face",
          badgeLabel: "Yüz Yüze Zorunlu",
        };
      } else {
        let badgeLabel: string | null = null;
        if (lesson.deliveryMethod === "face_to_face") badgeLabel = "Yüz Yüze";
        else if (lesson.deliveryMethod === "bbb_live") badgeLabel = "Canlı Ders";
        else if (lesson.deliveryMethod === "hybrid") badgeLabel = "Hibrit";

        results[lesson.lessonId] = {
          isBlocked: false,
          reason: null,
          requiredMethod: mustBeFaceToFace ? "face_to_face" : null,
          badgeLabel,
        };
      }
    }

    return results;
  }, [hazardClass, lessons]);
}

/**
 * Returns the topic group label in Turkish.
 */
export function getTopicGroupLabel(group: number | null): string | null {
  switch (group) {
    case 1: return "Genel Konular";
    case 2: return "Sağlık Konuları";
    case 3: return "Teknik Konular";
    case 4: return "İşe ve İşyerine Özgü Riskler";
    default: return null;
  }
}
