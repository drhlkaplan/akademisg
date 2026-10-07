import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Printer, RefreshCw, Save } from "lucide-react";

type Hz = "az_tehlikeli" | "tehlikeli" | "cok_tehlikeli";
type Usage = "once" | "yearly";
const HZ: Record<Hz, { label: string; info: string }> = {
  az_tehlikeli: { label: "Az Tehlikeli", info: "8 saat · 3 yılda bir" },
  tehlikeli: { label: "Tehlikeli", info: "12 saat · 2 yılda bir" },
  cok_tehlikeli: { label: "Çok Tehlikeli", info: "16 saat · her yıl" },
};
type Pricing = Record<Hz, Record<Usage, number>> & { vat: number };
const DEFAULT_PRICING: Pricing = {
  az_tehlikeli: { once: 8, yearly: 12 }, tehlikeli: { once: 12, yearly: 16 }, cok_tehlikeli: { once: 16, yearly: 24 }, vat: 20,
};
interface Company { name: string; logo: string; address: string; taxOffice: string; taxNo: string; phone: string; email: string; iban: string; bank: string; web: string }
const DEFAULT_COMPANY: Company = {
  name: "İSGAKADEMİ", logo: "", address: "", taxOffice: "", taxNo: "", phone: "", email: "", iban: "", bank: "", web: "www.gratisakademi.com",
};

const usd = (n: number) => `$${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tl = (n: number) => `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function loadSetting<T>(key: string, def: T): Promise<T> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ? { ...def, ...(data.value as any) } : def;
}
async function saveSetting(key: string, value: any) {
  const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export default function FirmQuotes() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [company, setCompany] = useState<Company>(DEFAULT_COMPANY);
  const [firmId, setFirmId] = useState("");
  const [hz, setHz] = useState<Hz>("az_tehlikeli");
  const [usage, setUsage] = useState<Usage>("once");
  const [employees, setEmployees] = useState(1);
  const [unit, setUnit] = useState(8);
  const [discount, setDiscount] = useState(0);
  const [rate, setRate] = useState(0);
  const [rateLoading, setRateLoading] = useState(false);
  const [validDays, setValidDays] = useState(15);
  const [notes, setNotes] = useState("Fiyatlara KDV dahil değildir. TL tutarları teklif tarihindeki kur üzerinden hesaplanmıştır; ödeme günündeki kur esas alınır.");
  const [quoteNo] = useState(() => `TKL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`);

  const { data: firms = [] } = useQuery({
    queryKey: ["quote-firms"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name, tax_number, address, phone, email, sector, hazard_class_new, sectors(name)").is("deleted_at", null).order("name");
      return data || [];
    },
  });
  const { data: empCounts = {} } = useQuery({
    queryKey: ["quote-emp-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("firm_id").not("firm_id", "is", null).is("deleted_at", null);
      const m: Record<string, number> = {};
      (data || []).forEach((p) => { m[p.firm_id!] = (m[p.firm_id!] || 0) + 1; });
      return m;
    },
  });
  const firm: any = firms.find((f: any) => f.id === firmId);

  const fetchRate = async () => {
    setRateLoading(true);
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD");
      const j = await r.json();
      if (j?.rates?.TRY) setRate(Number(j.rates.TRY.toFixed(4)));
    } catch { toast({ title: "Kur alınamadı", description: "Kuru elle girebilirsiniz.", variant: "destructive" }); }
    setRateLoading(false);
  };

  useEffect(() => {
    loadSetting("quote_pricing", DEFAULT_PRICING).then(setPricing);
    loadSetting("quote_company", DEFAULT_COMPANY).then(setCompany);
    fetchRate();
  }, []);

  useEffect(() => { setUnit(pricing[hz][usage]); }, [hz, usage, pricing]);
  useEffect(() => {
    if (!firm) return;
    if (firm.hazard_class_new) setHz(firm.hazard_class_new);
    setEmployees(Math.max(1, empCounts[firm.id] || 1));
  }, [firmId]);

  const calc = useMemo(() => {
    const gross = unit * employees;
    const disc = gross * (discount / 100);
    const net = gross - disc;
    const vat = net * (pricing.vat / 100);
    return { gross, disc, net, vat, total: net + vat };
  }, [unit, employees, discount, pricing.vat]);

  const savePricing = async () => {
    try { await saveSetting("quote_pricing", pricing); toast({ title: "Fiyatlar kaydedildi" }); }
    catch (e: any) { toast({ title: "Kaydedilemedi", description: e.message, variant: "destructive" }); }
  };
  const saveCompany = async () => {
    try { await saveSetting("quote_company", company); toast({ title: "Şirket bilgileri kaydedildi" }); }
    catch (e: any) { toast({ title: "Kaydedilemedi", description: e.message, variant: "destructive" }); }
  };

  const print = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><meta charset="utf-8"><title>${quoteNo}</title><style>
      body{font-family:Arial,sans-serif;color:#111;margin:32px;font-size:12px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;text-align:left}
      th{background:#f1f5f9}.r{text-align:right}.hd{display:flex;justify-content:space-between;border-bottom:3px solid #f97316;padding-bottom:12px;margin-bottom:16px}
      .muted{color:#555}.tot td{font-weight:bold}img{max-height:60px}h1{margin:0;font-size:20px}.grid{display:flex;gap:24px;margin-bottom:16px}.grid>div{flex:1}
      .sign{margin-top:48px;display:flex;justify-content:space-between}</style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  const today = new Date();
  const validUntil = new Date(today.getTime() + validDays * 86400000);
  const usageLabel = usage === "once" ? "Tek Seferlik Kullanım" : "Yıllık Kullanım";
  const num = (v: string) => Number(v.replace(",", ".")) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Firma Teklif & Proforma Fatura</h1>
        <p className="text-muted-foreground">Tehlike sınıfı ve çalışan sayısına göre dolar ve TL bazlı teklif hazırlayın.</p>
      </div>
      <Tabs defaultValue="quote">
        <TabsList>
          <TabsTrigger value="quote">Teklif Hazırla</TabsTrigger>
          <TabsTrigger value="pricing">Fiyat Listesi</TabsTrigger>
          <TabsTrigger value="company">Antet / Şirket Bilgileri</TabsTrigger>
        </TabsList>

        <TabsContent value="quote" className="grid lg:grid-cols-[380px_1fr] gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Teklif Bilgileri</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Firma</Label>
                <Select value={firmId || "none"} onValueChange={(v) => setFirmId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Firma seçin" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Firma seçin</SelectItem>
                    {firms.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {firm && <p className="text-xs text-muted-foreground">İş kolu: {firm.sectors?.name || firm.sector || "-"} · Kayıtlı çalışan: {empCounts[firm.id] || 0}</p>}
              <div><Label>Tehlike Sınıfı</Label>
                <Select value={hz} onValueChange={(v) => setHz(v as Hz)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(HZ) as Hz[]).map((k) => <SelectItem key={k} value={k}>{HZ[k].label} ({HZ[k].info})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Kullanım Şekli</Label>
                <Select value={usage} onValueChange={(v) => setUsage(v as Usage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="once">Tek Seferlik</SelectItem><SelectItem value="yearly">Yıllık</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Çalışan Sayısı</Label><Input type="number" min={1} value={employees} onChange={(e) => setEmployees(Math.max(1, num(e.target.value)))} /></div>
                <div><Label>Kişi Başı ($)</Label><Input type="number" step="0.01" value={unit} onChange={(e) => setUnit(num(e.target.value))} /></div>
                <div><Label>İskonto (%)</Label><Input type="number" value={discount} onChange={(e) => setDiscount(num(e.target.value))} /></div>
                <div><Label>Geçerlilik (gün)</Label><Input type="number" value={validDays} onChange={(e) => setValidDays(num(e.target.value))} /></div>
              </div>
              <div><Label>USD/TRY Kuru</Label>
                <div className="flex gap-2"><Input type="number" step="0.0001" value={rate} onChange={(e) => setRate(num(e.target.value))} />
                  <Button variant="outline" size="icon" onClick={fetchRate} disabled={rateLoading}><RefreshCw className={`h-4 w-4 ${rateLoading ? "animate-spin" : ""}`} /></Button></div>
              </div>
              <div><Label>Notlar</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <Button className="w-full" onClick={print} disabled={!firm}><Printer className="mr-2 h-4 w-4" />Yazdır / PDF Kaydet</Button>
            </CardContent>
          </Card>

          <Card className="overflow-x-auto">
            <CardContent className="p-6 bg-card">
              <div ref={printRef}>
                <div className="hd" style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid hsl(var(--accent))", paddingBottom: 12, marginBottom: 16 }}>
                  <div>
                    {company.logo && <img src={company.logo} alt="logo" style={{ maxHeight: 60 }} />}
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{company.name}</h1>
                    <div className="muted" style={{ fontSize: 11, color: "#555" }}>
                      {company.address}<br />{company.phone} {company.email && `· ${company.email}`} {company.web && `· ${company.web}`}<br />
                      {company.taxOffice && `V.D.: ${company.taxOffice}`} {company.taxNo && `· V.No: ${company.taxNo}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>PROFORMA FATURA / TEKLİF</h1>
                    <div style={{ fontSize: 12 }}>No: <b>{quoteNo}</b><br />Tarih: {today.toLocaleDateString("tr-TR")}<br />Geçerlilik: {validUntil.toLocaleDateString("tr-TR")}<br />Kur (USD/TRY): {rate.toFixed(4)}</div>
                  </div>
                </div>
                <div className="grid" style={{ display: "flex", gap: 24, marginBottom: 16, fontSize: 12 }}>
                  <div style={{ flex: 1 }}><b>SAYIN</b><br />{firm?.name || "—"}<br />{firm?.address}<br />{firm?.phone} {firm?.email && `· ${firm.email}`}<br />{firm?.tax_number && `V.No: ${firm.tax_number}`}</div>
                  <div style={{ flex: 1 }}><b>FİRMA ÖZELLİKLERİ</b><br />İş kolu: {firm?.sectors?.name || firm?.sector || "-"}<br />Tehlike sınıfı: {HZ[hz].label} ({HZ[hz].info})<br />Çalışan sayısı: {employees}<br />Kullanım: {usageLabel}</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{["Açıklama", "Miktar", "Birim ($)", "Tutar ($)", "Tutar (₺)"].map((h, i) => <th key={h} style={{ border: "1px solid #ccc", padding: 6, textAlign: i ? "right" : "left", background: "hsl(var(--muted))" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[
                      [`${HZ[hz].label} İSG Eğitimi — ${usageLabel} (online platform, sınav, sertifika)`, `${employees} kişi`, usd(unit), usd(calc.gross), tl(calc.gross * rate)],
                      ...(discount ? [[`İskonto (%${discount})`, "", "", `-${usd(calc.disc)}`, `-${tl(calc.disc * rate)}`]] : []),
                      ["Ara Toplam", "", "", usd(calc.net), tl(calc.net * rate)],
                      [`KDV (%${pricing.vat})`, "", "", usd(calc.vat), tl(calc.vat * rate)],
                      ["GENEL TOPLAM", "", "", usd(calc.total), tl(calc.total * rate)],
                    ].map((row, i, arr) => (
                      <tr key={i} style={{ fontWeight: i >= arr.length - 1 ? 700 : 400 }}>
                        {row.map((c, j) => <td key={j} style={{ border: "1px solid #ccc", padding: 6, textAlign: j ? "right" : "left" }}>{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(company.bank || company.iban) && <p style={{ fontSize: 12, marginTop: 12 }}><b>Banka:</b> {company.bank} {company.iban && `· IBAN: ${company.iban}`}</p>}
                <p style={{ fontSize: 11, color: "#555", marginTop: 8, whiteSpace: "pre-wrap" }}>{notes}</p>
                <div style={{ marginTop: 48, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <div>Teklifi Veren<br /><b>{company.name}</b><br /><br />Kaşe / İmza</div>
                  <div style={{ textAlign: "right" }}>Onaylayan<br /><b>{firm?.name || ""}</b><br /><br />Kaşe / İmza</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader><CardTitle className="text-lg">Kişi Başı Fiyatlar (USD, KDV hariç)</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              {(Object.keys(HZ) as Hz[]).map((k) => (
                <div key={k} className="grid grid-cols-3 gap-3 items-end">
                  <div><p className="font-medium">{HZ[k].label}</p><p className="text-xs text-muted-foreground">{HZ[k].info}</p></div>
                  <div><Label>Tek Seferlik ($)</Label><Input type="number" step="0.01" value={pricing[k].once} onChange={(e) => setPricing({ ...pricing, [k]: { ...pricing[k], once: num(e.target.value) } })} /></div>
                  <div><Label>Yıllık ($)</Label><Input type="number" step="0.01" value={pricing[k].yearly} onChange={(e) => setPricing({ ...pricing, [k]: { ...pricing[k], yearly: num(e.target.value) } })} /></div>
                </div>
              ))}
              <div className="w-40"><Label>KDV (%)</Label><Input type="number" value={pricing.vat} onChange={(e) => setPricing({ ...pricing, vat: num(e.target.value) })} /></div>
              <Button onClick={savePricing}><Save className="mr-2 h-4 w-4" />Fiyatları Kaydet</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle className="text-lg">Teklif Anteti — Şirket Bilgileri</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3 max-w-3xl">
              {([
                ["name", "Şirket Unvanı"], ["logo", "Logo URL"], ["address", "Adres"], ["phone", "Telefon"], ["email", "E-posta"],
                ["web", "Web"], ["taxOffice", "Vergi Dairesi"], ["taxNo", "Vergi No"], ["bank", "Banka"], ["iban", "IBAN"],
              ] as [keyof Company, string][]).map(([k, l]) => (
                <div key={k}><Label>{l}</Label><Input value={company[k]} onChange={(e) => setCompany({ ...company, [k]: e.target.value })} /></div>
              ))}
              <div className="md:col-span-2"><Button onClick={saveCompany}><Save className="mr-2 h-4 w-4" />Kaydet</Button></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
