import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { parseUserFile, downloadUserTemplate, ImportedUser } from "@/lib/userImport";

async function invoke(body: any) {
  const { data, error } = await supabase.functions.invoke("manage-firm-employees", { body });
  if (error) {
    let msg = error.message;
    try { const b = await (error as any).context?.json?.(); if (b?.error) msg = b.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function AddUsersDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { toast } = useToast();
  const empty = { first_name: "", last_name: "", email: "", password: "", tc_identity: "", phone: "" };
  const [form, setForm] = useState(empty);
  const [firmId, setFirmId] = useState("none");
  const [role, setRole] = useState("student");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ImportedUser[]>([]);
  const [results, setResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null);

  const { data: firms } = useQuery({
    queryKey: ["firms-select"],
    queryFn: async () => {
      const { data } = await supabase.from("firms").select("id, name").is("deleted_at", null).order("name");
      return data || [];
    },
    enabled: open,
  });

  const submitSingle = async () => {
    if (!form.first_name || !form.last_name || !form.email || form.password.length < 6) {
      toast({ title: "Eksik bilgi", description: "Ad, soyad, e-posta ve en az 6 karakterli şifre zorunlu.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await invoke({ action: "add_employee", ...form, firm_id: firmId, role });
      toast({ title: "Kullanıcı eklendi" });
      setForm(empty);
      onDone();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const parsed = await parseUserFile(f);
      setResults(null);
      setRows(parsed);
      if (!parsed.length) toast({ title: "Geçerli satır yok", description: "Ad, Soyad, E-posta sütunları zorunlu.", variant: "destructive" });
    } catch {
      toast({ title: "Dosya okunamadı", variant: "destructive" });
    }
  };

  const submitBulk = async () => {
    setBusy(true);
    try {
      const data = await invoke({ action: "bulk_add", employees: rows.map((r) => ({ role, ...r })), firm_id: firmId });
      setResults(data.results);
      const ok = data.results.filter((r: any) => r.success).length;
      toast({ title: "Toplu yükleme tamamlandı", description: `${ok}/${data.results.length} kullanıcı eklendi.` });
      setRows([]);
      onDone();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const firmRole = (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Firma</Label>
        <Select value={firmId} onValueChange={setFirmId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Firma yok</SelectItem>
            {firms?.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Rol</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Öğrenci</SelectItem>
            <SelectItem value="company_admin">Firma Yetkilisi</SelectItem>
            <SelectItem value="trainer">Eğitmen</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kullanıcı Ekle</DialogTitle>
          <DialogDescription>Tek tek ekleyin veya Excel dosyasıyla toplu yükleyin.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="single">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="single">Tek Kullanıcı</TabsTrigger>
            <TabsTrigger value="bulk">Toplu (Excel)</TabsTrigger>
          </TabsList>
          <TabsContent value="single" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              {([
                ["first_name", "Ad *"], ["last_name", "Soyad *"], ["email", "E-posta *"], ["password", "Şifre *"],
                ["tc_identity", "TC Kimlik"], ["phone", "Telefon"],
              ] as const).map(([k, l]) => (
                <div key={k} className="space-y-1.5">
                  <Label>{l}</Label>
                  <Input type={k === "password" ? "password" : k === "email" ? "email" : "text"} value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            {firmRole}
            <Button className="w-full" onClick={submitSingle} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kullanıcıyı Ekle
            </Button>
          </TabsContent>
          <TabsContent value="bulk" className="space-y-3 pt-3">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => downloadUserTemplate(true)}><Download className="mr-2 h-4 w-4" />Örnek Şablon</Button>
              <Button variant="outline" asChild>
                <label className="cursor-pointer"><FileSpreadsheet className="mr-2 h-4 w-4" />Excel / CSV Seç
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
                </label>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Sütunlar: Ad, Soyad, E-posta (zorunlu), Şifre, TC Kimlik, Telefon, Rol. Şifre boşsa otomatik üretilir. Rol boşsa aşağıdaki rol kullanılır.</p>
            {firmRole}
            {rows.length > 0 && (
              <div className="max-h-48 overflow-auto rounded border text-sm">
                {rows.map((r, i) => <div key={i} className="px-3 py-1.5 border-b last:border-0">{r.first_name} {r.last_name} — {r.email}</div>)}
              </div>
            )}
            {results && (
              <div className="max-h-48 overflow-auto rounded border text-sm">
                {results.map((r, i) => (
                  <div key={i} className="px-3 py-1.5 border-b last:border-0 flex items-center gap-2">
                    {r.success ? <CheckCircle className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                    {r.email} {r.error && <span className="text-destructive">({r.error})</span>}
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full" onClick={submitBulk} disabled={busy || !rows.length}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{rows.length} Kullanıcıyı Yükle
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
