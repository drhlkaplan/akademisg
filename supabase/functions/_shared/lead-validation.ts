// Pure validation + recipient rules for the public contact / corporate quote forms.
// Shared by the submit-lead edge function and the unit tests (no Deno or Node APIs here).

export type LeadSource = "contact" | "corporate";

export const CONTACT_SUBJECTS: Record<string, string> = {
  genel: "Genel Bilgi",
  kurumsal: "Kurumsal Teklif",
  teknik: "Teknik Destek",
  sertifika: "Sertifika Sorgulama",
  diger: "Diğer",
};

export interface LeadInput {
  source: LeadSource;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  company_name: string | null;
  employee_count: string | null;
  message: string | null;
}

export type LeadValidationResult =
  | { ok: true; lead: LeadInput }
  | { ok: false; error: string; field: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d\s().-]{7,20}$/;

// Single-line fields: drop every control character (incl. CR/LF) so values are safe in email subjects.
function singleLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

// Multi-line fields: keep line breaks and tabs, drop other control characters.
function multiLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function fail(field: string, error: string): LeadValidationResult {
  return { ok: false, field, error };
}

export function validateLead(raw: unknown): LeadValidationResult {
  if (!raw || typeof raw !== "object") return fail("body", "Geçersiz istek.");
  const body = raw as Record<string, unknown>;

  const source = body.source;
  if (source !== "contact" && source !== "corporate") return fail("source", "Geçersiz form türü.");

  const name = singleLine(body.name);
  if (name.length < 2) return fail("name", "Lütfen adınızı ve soyadınızı yazın.");
  if (name.length > 100) return fail("name", "Ad soyad en fazla 100 karakter olabilir.");

  const email = singleLine(body.email).toLowerCase();
  if (!email) return fail("email", "Lütfen e-posta adresinizi yazın.");
  if (email.length > 255 || !EMAIL_RE.test(email)) return fail("email", "Lütfen geçerli bir e-posta adresi yazın.");

  const phone = singleLine(body.phone);
  if (phone && !PHONE_RE.test(phone)) return fail("phone", "Lütfen geçerli bir telefon numarası yazın.");

  const message = multiLine(body.message);
  if (message.length > 1000) return fail("message", "Mesaj en fazla 1000 karakter olabilir.");

  let subject: string | null = null;
  let company_name: string | null = null;
  let employee_count: string | null = null;

  if (source === "contact") {
    if (!message) return fail("message", "Lütfen mesajınızı yazın.");
    const rawSubject = singleLine(body.subject);
    if (rawSubject) {
      if (!(rawSubject in CONTACT_SUBJECTS)) return fail("subject", "Geçersiz konu seçimi.");
      subject = rawSubject;
    }
  } else {
    company_name = singleLine(body.company_name);
    if (company_name.length < 2) return fail("company_name", "Lütfen firma adını yazın.");
    if (company_name.length > 100) return fail("company_name", "Firma adı en fazla 100 karakter olabilir.");
    const count = singleLine(body.employee_count);
    if (count.length > 10) return fail("employee_count", "Çalışan sayısı en fazla 10 karakter olabilir.");
    employee_count = count || null;
  }

  return {
    ok: true,
    lead: {
      source,
      name,
      email,
      phone: phone || null,
      subject,
      company_name: company_name || null,
      employee_count,
      message: message || null,
    },
  };
}

export interface LeadRecipientSettings {
  notifications?: { emailOnLeadSubmission?: boolean; leadNotificationEmail?: string } | null;
  quote_company?: { email?: string } | null;
}

export type LeadRecipient =
  | { status: "ok"; email: string }
  | { status: "disabled" }
  | { status: "no_recipient" };

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 255 && EMAIL_RE.test(value.trim());
}

// Who gets the owner notification: the address set under Admin → Ayarlar → Bildirimler,
// otherwise the company e-mail used on quotes. Turning the switch off stops the e-mails.
export function resolveLeadRecipient(settings: LeadRecipientSettings): LeadRecipient {
  if (settings.notifications?.emailOnLeadSubmission === false) return { status: "disabled" };
  const custom = settings.notifications?.leadNotificationEmail?.trim();
  if (isValidEmail(custom)) return { status: "ok", email: custom.toLowerCase() };
  const company = settings.quote_company?.email?.trim();
  if (isValidEmail(company)) return { status: "ok", email: company.toLowerCase() };
  return { status: "no_recipient" };
}
