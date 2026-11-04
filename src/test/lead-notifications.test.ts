import { describe, expect, it } from "vitest";
import { resolveLeadRecipient, validateLead } from "../../supabase/functions/_shared/lead-validation";

describe("form request validation", () => {
  it("accepts a contact message and normalises the e-mail", () => {
    const r = validateLead({ source: "contact", name: " Ayşe Yılmaz ", email: "Ayse@Firma.COM", message: "Merhaba", subject: "genel" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lead.email).toBe("ayse@firma.com");
      expect(r.lead.name).toBe("Ayşe Yılmaz");
      expect(r.lead.subject).toBe("genel");
    }
  });

  it("requires a message on the contact form", () => {
    const r = validateLead({ source: "contact", name: "Ayşe", email: "a@b.com", message: "  " });
    expect(r).toMatchObject({ ok: false, field: "message" });
  });

  it("requires a company name on the corporate quote form", () => {
    const r = validateLead({ source: "corporate", name: "Ayşe", email: "a@b.com" });
    expect(r).toMatchObject({ ok: false, field: "company_name" });
  });

  it("rejects an invalid e-mail address", () => {
    const r = validateLead({ source: "corporate", name: "Ayşe", email: "not-an-email", company_name: "Firma" });
    expect(r).toMatchObject({ ok: false, field: "email" });
  });

  it("rejects messages longer than 1000 characters", () => {
    const r = validateLead({ source: "contact", name: "Ayşe", email: "a@b.com", message: "x".repeat(1001) });
    expect(r).toMatchObject({ ok: false, field: "message" });
  });

  it("rejects unknown form types and subjects", () => {
    expect(validateLead({ source: "newsletter", name: "Ayşe", email: "a@b.com", message: "x" })).toMatchObject({ ok: false, field: "source" });
    expect(validateLead({ source: "contact", name: "Ayşe", email: "a@b.com", message: "x", subject: "promo" })).toMatchObject({ ok: false, field: "subject" });
  });

  it("strips line breaks from names so they cannot alter the e-mail subject", () => {
    const r = validateLead({ source: "corporate", name: "Ayşe\r\nBcc: x@y.com", email: "a@b.com", company_name: "Firma\nA.Ş." });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lead.name).not.toMatch(/[\r\n]/);
      expect(r.lead.company_name).toBe("Firma A.Ş.");
    }
  });
});

describe("owner notification recipient", () => {
  it("uses the address set in admin notification settings", () => {
    expect(
      resolveLeadRecipient({
        notifications: { emailOnLeadSubmission: true, leadNotificationEmail: "Talep@Firma.com" },
        quote_company: { email: "sirket@firma.com" },
      }),
    ).toEqual({ status: "ok", email: "talep@firma.com" });
  });

  it("falls back to the company e-mail used on quotes when no address is set", () => {
    expect(
      resolveLeadRecipient({ notifications: { leadNotificationEmail: "" }, quote_company: { email: "sirket@firma.com" } }),
    ).toEqual({ status: "ok", email: "sirket@firma.com" });
  });

  it("sends nothing when the admin turns notifications off", () => {
    expect(
      resolveLeadRecipient({
        notifications: { emailOnLeadSubmission: false, leadNotificationEmail: "talep@firma.com" },
        quote_company: { email: "sirket@firma.com" },
      }),
    ).toEqual({ status: "disabled" });
  });

  it("reports a missing recipient instead of guessing one", () => {
    expect(resolveLeadRecipient({ notifications: null, quote_company: { email: "" } })).toEqual({ status: "no_recipient" });
  });
});
