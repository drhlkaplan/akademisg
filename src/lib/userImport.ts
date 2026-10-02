import * as XLSX from "xlsx";

export interface ImportedUser {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  tc_identity?: string;
  phone?: string;
  role?: string;
}

const norm = (h: string) =>
  String(h).trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");

const MAP: Record<string, keyof ImportedUser> = {
  ad: "first_name", isim: "first_name", first_name: "first_name",
  soyad: "last_name", soyadı: "last_name", last_name: "last_name",
  "e-posta": "email", eposta: "email", email: "email", "e-mail": "email",
  şifre: "password", sifre: "password", password: "password",
  tc: "tc_identity", "tc kimlik": "tc_identity", tckimlik: "tc_identity", "tc kimlik no": "tc_identity", tc_identity: "tc_identity",
  telefon: "phone", tel: "phone", phone: "phone",
  rol: "role", role: "role",
};

const ROLE_ALIASES: Record<string, string> = {
  öğrenci: "student", ogrenci: "student", student: "student",
  "firma yetkilisi": "company_admin", "şirket yöneticisi": "company_admin", company_admin: "company_admin",
  eğitmen: "trainer", egitmen: "trainer", trainer: "trainer",
  admin: "admin",
};

export async function parseUserFile(file: File): Promise<ImportedUser[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false });
  const out: ImportedUser[] = [];
  for (const r of rows) {
    const u: any = {};
    for (const [k, v] of Object.entries(r)) {
      const f = MAP[norm(k)];
      if (f) u[f] = String(v ?? "").trim();
    }
    if (u.role) u.role = ROLE_ALIASES[norm(u.role)] || "student";
    if (u.email && u.first_name && u.last_name) out.push(u);
  }
  return out;
}

export function downloadUserTemplate(includeRole = false) {
  const header = ["Ad", "Soyad", "E-posta", "Şifre", "TC Kimlik", "Telefon", ...(includeRole ? ["Rol"] : [])];
  const sample = ["Ahmet", "Yılmaz", "ahmet@ornek.com", "Sifre123!", "12345678901", "05551234567", ...(includeRole ? ["Öğrenci"] : [])];
  const ws = XLSX.utils.aoa_to_sheet([header, sample]);
  ws["!cols"] = header.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kullanicilar");
  XLSX.writeFile(wb, "kullanici-sablonu.xlsx");
}
