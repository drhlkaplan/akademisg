import jsPDF from "jspdf";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "@/lib/pdfFonts";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CERT_TOPICS, DEFAULT_LEGAL_TEXT, type CertTopicGroup } from "@/lib/certificateTopics";

export interface CertPrintData {
  certificate: {
    certificate_number: string;
    holder_name: string;
    holder_tc: string | null;
    course_title: string;
    duration_hours: number | null;
    issue_date: string | null;
  };
  holder?: { first_name?: string; last_name?: string; tc_identity?: string | null; job_title?: string | null } | null;
  enrollment?: { started_at?: string | null; completed_at?: string | null } | null;
  firm?: { name?: string; logo_url?: string | null } | null;
  template?: Record<string, any> | null;
}

const fmt = (d?: string | null) => {
  if (!d) return "-";
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, "0")}-${String(x.getMonth() + 1).padStart(2, "0")}-${x.getFullYear()}`;
};

async function toDataUrl(url?: string | null): Promise<{ data: string; w: number; h: number } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const data: string = await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((r) => {
      const img = new Image();
      img.onload = () => r({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => r({ w: 1, h: 1 });
      img.src = data;
    });
    // convert to PNG via canvas to support svg/webp
    const c = document.createElement("canvas");
    c.width = dims.w; c.height = dims.h;
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.onerror = r; img.src = data; });
    c.getContext("2d")?.drawImage(img, 0, 0);
    return { data: c.toDataURL("image/png"), w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

function drawBorder(doc: jsPDF, color: [number, number, number]) {
  const W = 297, H = 210, m = 7, s = 5;
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.3);
  doc.rect(m, m, W - 2 * m, H - 2 * m);
  doc.rect(m + s, m + s, W - 2 * (m + s), H - 2 * (m + s));
  for (let x = m + s; x < W - m - s; x += 6) {
    doc.triangle(x, m, x + 6, m, x + 3, m + s, "F");
    doc.triangle(x, H - m, x + 6, H - m, x + 3, H - m - s, "F");
  }
  for (let y = m + s; y < H - m - s; y += 6) {
    doc.triangle(m, y, m, y + 6, m + s, y + 3, "F");
    doc.triangle(W - m, y, W - m, y + 6, W - m - s, y + 3, "F");
  }
}

function hexToRgb(hex?: string | null): [number, number, number] {
  const h = (hex || "#c8561a").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function buildCertificatePdf(d: CertPrintData): Promise<jsPDF> {
  const t = d.template || {};
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  const accent = hexToRgb(t.accent_color);
  const W = 297;

  const companyName = t.company_name || "İSGAKADEMİ";
  const delivery = t.delivery_method || "Uzaktan Eğitim";
  const holderName =
    d.holder?.first_name ? `${d.holder.first_name} ${d.holder.last_name || ""}`.trim() : d.certificate.holder_name;
  const tc = d.holder?.tc_identity || d.certificate.holder_tc || "";

  // ---- PAGE 1 ----
  drawBorder(doc, accent);
  const logoUrl = t.use_firm_logo !== false && d.firm?.logo_url ? d.firm.logo_url : t.logo_url || d.firm?.logo_url;
  const logo = await toDataUrl(logoUrl);
  if (logo) {
    const h = 24, w = Math.min(70, (logo.w / logo.h) * h);
    doc.addImage(logo.data, "PNG", W / 2 - w / 2, 18, w, h);
  }
  if (d.firm?.name) {
    doc.setFont("Roboto", "bold"); doc.setFontSize(10); doc.setTextColor(60);
    doc.text(d.firm.name, W / 2, 47, { align: "center" });
  }

  doc.setTextColor(0);
  doc.setFontSize(10);
  const info: [string, string][] = [
    ["Belge No", d.certificate.certificate_number],
    ["Eğitim Tarihi", `${fmt(d.enrollment?.started_at)}  -  ${fmt(d.enrollment?.completed_at || d.certificate.issue_date)}`],
    ["Eğitim Süresi", d.certificate.duration_hours ? `${d.certificate.duration_hours} Saat` : "-"],
    ["Eğitim Şekli", delivery],
  ];
  info.forEach(([k, v], i) => {
    doc.setFont("Roboto", "bold");
    doc.text(k, 18, 54 + i * 5);
    doc.text(`: ${v}`, 42, 54 + i * 5);
  });

  doc.setFontSize(22);
  doc.text(t.header_text || "TEMEL EĞİTİM BELGESİ", W / 2, 82, { align: "center" });
  doc.setFontSize(17);
  doc.text(`Sayın  ${holderName}`, W / 2, 96, { align: "center" });
  doc.setFont("Roboto", "normal"); doc.setFontSize(11);
  doc.text(`TCKN: ${tc}`, W / 2, 103, { align: "center" });
  doc.text(`Görev Unvanı: ${d.holder?.job_title || ""}`, W / 2, 109, { align: "center" });
  doc.setFontSize(9.5);
  doc.text(d.certificate.course_title, W / 2, 115, { align: "center" });

  const legal = (t.legal_text || DEFAULT_LEGAL_TEXT)
    .replace(/{company_name}/g, companyName)
    .replace(/{delivery_method}/g, delivery)
    .replace(/{firm_name}/g, d.firm?.name || "")
    .replace(/{holder_name}/g, holderName)
    .replace(/{course_title}/g, d.certificate.course_title);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(legal, 240);
  doc.text(lines, W / 2, 124, { align: "center", lineHeightFactor: 1.5 });

  const sigY = 124 + lines.length * 6.5 + 8;
  const cols = [
    { x: 60, head: t.trainer1_name ? "Eğitmen" : "", name: t.trainer1_name, title: t.trainer1_title },
    { x: 140, head: t.trainer2_name ? "Eğitmen" : "", name: t.trainer2_name, title: t.trainer2_title },
    { x: 230, head: "", name: d.firm?.name || "", title: t.employer_title || "İşveren" },
  ];
  doc.setFontSize(9.5);
  cols.forEach((c) => {
    doc.setFont("Roboto", "bold"); if (c.head) doc.text(c.head, c.x, sigY, { align: "center" });
    doc.setFont("Roboto", "normal");
    if (c.name) doc.text(String(c.name), c.x, sigY + 7, { align: "center", maxWidth: 70 });
    if (c.title) doc.text(String(c.title), c.x, sigY + 14, { align: "center" });
  });

  doc.setFont("Roboto", "bold"); doc.setFontSize(9);
  doc.text(companyName, W / 2, 185, { align: "center" });
  if (t.company_contact) doc.text(String(t.company_contact), W / 2, 190, { align: "center" });

  // ---- PAGE 2 ----
  doc.addPage("a4", "landscape");
  drawBorder(doc, accent);
  const topics: CertTopicGroup[] = Array.isArray(t.topics) && t.topics.length ? t.topics : DEFAULT_CERT_TOPICS;
  let y = 24;
  doc.setFont("Roboto", "bold"); doc.setFontSize(11);
  doc.text("EĞİTİM KONULARI", 26, y); y += 5;
  const total = topics.reduce((s, g) => s + g.items.length + 2, 0);
  const lh = Math.min(4.6, 160 / total);
  topics.forEach((g) => {
    doc.setFont("Roboto", "bold"); doc.setFontSize(10);
    doc.text(g.group, 26, y + 1); y += lh + 0.6;
    doc.setFont("Roboto", "normal"); doc.setFontSize(9);
    g.items.forEach((it) => {
      doc.setDrawColor(0); doc.setLineWidth(0.25);
      doc.rect(26, y - 2.6, 3, 3);
      if (it.checked) { doc.line(26, y - 2.6, 29, y + 0.4); doc.line(29, y - 2.6, 26, y + 0.4); }
      doc.text(it.label, 31.5, y);
      y += lh;
    });
    y += lh * 0.6;
  });
  return doc;
}

export async function downloadCertificatePdf(certificateId: string) {
  const { data, error } = await supabase.rpc("get_certificate_print_data" as any, { _certificate_id: certificateId });
  if (error || !data) throw new Error(error?.message || "Sertifika bulunamadı");
  const d = data as unknown as CertPrintData;
  const doc = await buildCertificatePdf(d);
  doc.save(`${d.certificate.holder_name.replace(/\s+/g, "_")}_${d.certificate.certificate_number}.pdf`);
}
