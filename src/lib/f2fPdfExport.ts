import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "./pdfFonts";

function setupTurkishFont(doc: jsPDF) {
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto");
}

const statusLabels: Record<string, string> = {
  attended: "Katıldı",
  absent: "Katılmadı",
  late: "Geç Katıldı",
  partially_attended: "Kısmi Katılım",
  pending: "Beklemede",
};

export function generateF2FAttendancePDF(session: any, attendance: any[]) {
  const doc = new jsPDF("p", "mm", "a4");
  setupTurkishFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont("Roboto", "bold");
  doc.text("YÜZ YÜZE EĞİTİM YOKLAMA TUTANAĞI", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("Roboto", "normal");
  doc.text("İş Sağlığı ve Güvenliği Eğitimi", pageWidth / 2, 27, { align: "center" });

  // Separator line
  doc.setLineWidth(0.5);
  doc.line(margin, 32, pageWidth - margin, 32);

  // Session Info Table
  const firmName = session.firms?.name || "Belirtilmemiş";
  const courseName = session.courses?.title || "Belirtilmemiş";
  const lessonName = session.lessons?.title || "";

  const infoData = [
    ["Firma", firmName, "Tarih", session.session_date],
    ["Eğitim", courseName, "Saat", `${session.start_time?.toString().slice(0, 5)} - ${session.end_time?.toString().slice(0, 5)}`],
    ["Ders", lessonName || "—", "Mekan", session.location],
    ["Kapasite", String(session.capacity || "—"), "Durum", session.status === "completed" ? "Tamamlandı" : "Devam Ediyor"],
  ];

  autoTable(doc, {
    startY: 36,
    body: infoData,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2, font: "Roboto" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", cellWidth: 30 },
      3: { cellWidth: 55 },
    },
    margin: { left: margin, right: margin },
  });

  // Attendance Table
  const tableStartY = (doc as any).lastAutoTable?.finalY + 8 || 70;

  doc.setFontSize(11);
  doc.setFont("Roboto", "bold");
  doc.text("KATILIMCI LİSTESİ", margin, tableStartY);

  const attendanceData = attendance.map((a: any, idx: number) => {
    const name = `${a.profiles?.first_name || ""} ${a.profiles?.last_name || ""}`.trim();
    const tc = a.profiles?.tc_identity
      ? `${a.profiles.tc_identity.slice(0, 3)}*****${a.profiles.tc_identity.slice(-2)}`
      : "—";
    const status = statusLabels[a.status] || a.status;
    const time = a.check_in_time
      ? new Date(a.check_in_time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      : "—";
    const method = a.join_method === "qr" ? "QR" : a.join_method === "code" ? "Kod" : "Admin";
    return [String(idx + 1), name, tc, status, time, method, ""];
  });

  // Add empty rows if less than 5 attendees
  const minRows = Math.max(5, attendanceData.length);
  while (attendanceData.length < minRows) {
    attendanceData.push([String(attendanceData.length + 1), "", "", "", "", "", ""]);
  }

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [["#", "Ad Soyad", "TC Kimlik", "Durum", "Giriş Saati", "Yöntem", "İmza"]],
    body: attendanceData,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, font: "Roboto" },
    headStyles: { fillColor: [26, 39, 68], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18 },
      6: { cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
  });

  // Footer - Signatures
  const finalY = (doc as any).lastAutoTable?.finalY + 15 || 200;

  if (finalY < 260) {
    doc.setFontSize(9);
    doc.setFont("Roboto", "bold");

    // Trainer signature
    doc.text("Eğitmen", margin + 10, finalY);
    doc.line(margin, finalY + 15, margin + 60, finalY + 15);
    doc.setFont("Roboto", "normal");
    doc.text("Ad Soyad / İmza", margin + 10, finalY + 20);

    // Admin signature
    doc.setFont("Roboto", "bold");
    doc.text("İşveren / Vekili", pageWidth - margin - 50, finalY);
    doc.line(pageWidth - margin - 60, finalY + 15, pageWidth - margin, finalY + 15);
    doc.setFont("Roboto", "normal");
    doc.text("Ad Soyad / İmza / Kaşe", pageWidth - margin - 50, finalY + 20);
  }

  // Page footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text(
    `Bu belge ${new Date().toLocaleDateString("tr-TR")} tarihinde otomatik olarak oluşturulmuştur.`,
    pageWidth / 2, pageHeight - 10,
    { align: "center" }
  );
  doc.text(
    `Oturum ID: ${session.id?.slice(0, 8) || "—"}`,
    pageWidth / 2, pageHeight - 6,
    { align: "center" }
  );

  // Save
  const fileName = `yoklama_tutanagi_${session.session_date}_${session.id?.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
