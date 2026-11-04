import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface LeadPayload {
  source: "contact" | "corporate";
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  company_name?: string;
  employee_count?: string;
  message?: string;
  /** Hidden honeypot field — must stay empty for real visitors. */
  website?: string;
}

export type SubmitLeadResult = { ok: true } | { ok: false; message: string };

const FALLBACK_MESSAGE = "Talebiniz gönderilemedi. Lütfen tekrar deneyin veya bizi telefonla arayın.";

/** Sends a contact / corporate quote request; the server stores it and e-mails the owner. */
export async function submitLead(payload: LeadPayload): Promise<SubmitLeadResult> {
  try {
    const { error } = await supabase.functions.invoke("submit-lead", { body: payload });
    if (!error) return { ok: true };

    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      console.error("submit-lead failed:", error.context.status, details);
      if (details && typeof details.error === "string") return { ok: false, message: details.error };
    } else {
      console.error("submit-lead failed:", error.message);
    }
    return { ok: false, message: FALLBACK_MESSAGE };
  } catch (e) {
    console.error("submit-lead failed:", e);
    return { ok: false, message: FALLBACK_MESSAGE };
  }
}
