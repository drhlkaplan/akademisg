import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadField } from "@/components/admin/FileUploadField";
import { Loader2, Palette, Save } from "lucide-react";
import { toast } from "sonner";

export default function FirmSettings() {
  const { branding } = useFirmBranding();
  const { profile } = useAuth();
  const firmId = profile?.firm_id || "";
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    logo_url: "", primary_color: "#f97316", secondary_color: "#1a2744", bg_color: "#f8fafc",
    welcome_message: "", footer_text: "", login_bg_url: "", favicon_url: "",
  });

  useEffect(() => {
    if (!branding) return;
    setF({
      logo_url: branding.logo_url || "", primary_color: branding.primary_color, secondary_color: branding.secondary_color,
      bg_color: branding.bg_color, welcome_message: branding.welcome_message || "", footer_text: branding.footer_text || "",
      login_bg_url: branding.login_bg_url || "", favicon_url: branding.favicon_url || "",
    });
  }, [branding]);

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.rpc as any)("update_my_firm_branding", {
      _logo_url: f.logo_url || null, _primary_color: f.primary_color, _secondary_color: f.secondary_color,
      _bg_color: f.bg_color, _welcome_message: f.welcome_message, _footer_text: f.footer_text || null,
      _login_bg_url: f.login_bg_url || null, _favicon_url: f.favicon_url || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Firma teması kaydedildi");
    setTimeout(() => window.location.reload(), 600);
  };

  const ColorField = ({ k, label }: { k: "primary_color" | "secondary_color" | "bg_color"; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input type="color" value={f[k]} onChange={(e) => set(k)(e.target.value)} className="w-14 h-10 p-1" />
        <Input value={f[k]} onChange={(e) => set(k)(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Firma Teması ve Ayarları</h1>
        <p className="text-muted-foreground">{branding?.name} için logo, renk, slogan ve alt bilgi düzenleyin.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" />Görünüm</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <FileUploadField label="Logo" value={f.logo_url} onChange={set("logo_url")} folder={firmId} />
            <FileUploadField label="Favicon" value={f.favicon_url} onChange={set("favicon_url")} folder={firmId} />
          </div>
          <FileUploadField label="Giriş Sayfası Arka Plan Görseli" value={f.login_bg_url} onChange={set("login_bg_url")} folder={firmId} />
          <div className="grid md:grid-cols-3 gap-4">
            <ColorField k="primary_color" label="Ana Renk" />
            <ColorField k="secondary_color" label="İkincil Renk" />
            <ColorField k="bg_color" label="Arka Plan Rengi" />
          </div>
          <div className="space-y-2">
            <Label>Firma Sloganı / Karşılama Mesajı</Label>
            <Textarea value={f.welcome_message} onChange={(e) => set("welcome_message")(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Alt Bilgi (Footer) Metni</Label>
            <Textarea value={f.footer_text} onChange={(e) => set("footer_text")(e.target.value)} rows={2} />
          </div>

          <div className="rounded-lg border p-4 flex items-center gap-4" style={{ background: f.bg_color }}>
            {f.logo_url && <img src={f.logo_url} alt="Logo" className="h-12 w-auto object-contain" />}
            <div>
              <p className="font-semibold" style={{ color: f.secondary_color }}>{branding?.name}</p>
              <p className="text-sm" style={{ color: f.primary_color }}>{f.welcome_message || "Slogan önizlemesi"}</p>
            </div>
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Kaydet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
