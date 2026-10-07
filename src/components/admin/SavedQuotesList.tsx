import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const HZL: Record<string, string> = { az_tehlikeli: "Az Tehlikeli", tehlikeli: "Tehlikeli", cok_tehlikeli: "Çok Tehlikeli" };
const STATUS: Record<string, string> = { sent: "Gönderildi", accepted: "Kabul Edildi", rejected: "Reddedildi", expired: "Süresi Doldu" };
const usd = (n: number) => `$${Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tl = (n: number) => `₺${Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function openQuotePrint(quoteNo: string, html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><meta charset="utf-8"><title>${quoteNo}</title><style>
    body{font-family:Arial,sans-serif;color:#111;margin:32px;font-size:12px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;text-align:left}img{max-height:60px}
  </style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

export default function SavedQuotesList() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["firm-quotes"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("firm_quotes").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
  });
  const rows = data.filter((r: any) => !q || `${r.firm_name} ${r.quote_no}`.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("firm_quotes").update({ status }).eq("id", id);
    if (error) return toast({ title: "Güncellenemedi", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["firm-quotes"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Teklif silinsin mi?")) return;
    await (supabase as any).from("firm_quotes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["firm-quotes"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">Verilen Teklifler ({rows.length})</CardTitle>
        <Input className="max-w-xs" placeholder="Firma veya teklif no ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Teklif No</TableHead><TableHead>Tarih</TableHead><TableHead>Firma</TableHead><TableHead>Sınıf / Kullanım</TableHead>
            <TableHead className="text-right">Çalışan</TableHead><TableHead>Para Birimi</TableHead><TableHead className="text-right">Toplam ($)</TableHead><TableHead className="text-right">Toplam (₺)</TableHead>
            <TableHead>Geçerlilik</TableHead><TableHead>Durum</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Henüz kayıtlı teklif yok.</TableCell></TableRow>}
            {rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.quote_no}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString("tr-TR")}</TableCell>
                <TableCell>{r.firm_name}</TableCell>
                <TableCell>{HZL[r.hazard_class] || r.hazard_class} · {r.usage_type === "yearly" ? "Yıllık" : "Tek Seferlik"}</TableCell>
                <TableCell className="text-right">{r.employees}</TableCell>
                <TableCell>{r.currency || "USD"}{r.currency && r.currency !== "TRY" && r.exchange_rate ? ` · ${Number(r.exchange_rate).toFixed(2)}` : ""}</TableCell>
                <TableCell className="text-right">{usd(r.total_usd)}</TableCell>
                <TableCell className="text-right">{tl(r.total_try)}</TableCell>
                <TableCell>{r.valid_until ? new Date(r.valid_until).toLocaleDateString("tr-TR") : "-"}</TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(STATUS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.html && <Button size="icon" variant="ghost" onClick={() => openQuotePrint(r.quote_no, r.html)}><Printer className="h-4 w-4" /></Button>}
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
