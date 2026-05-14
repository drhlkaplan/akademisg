import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { Globe, Bell, Shield, Palette, Save, Loader2 } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const { settings, isLoading, updateSection } = useSiteSettings();

  const [general, setGeneral] = useState(settings.general);
  const [notifications, setNotifications] = useState(settings.notifications);
  const [security, setSecurity] = useState(settings.security);
  const [footer, setFooter] = useState(settings.footer);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setGeneral(settings.general);
    setNotifications(settings.notifications);
    setSecurity(settings.security);
    setFooter(settings.footer);
  }, [settings]);

  const handleSave = async (section: "general" | "notifications" | "security" | "footer") => {
    setSaving(section);
    try {
      const value =
        section === "general" ? general :
        section === "notifications" ? notifications :
        section === "security" ? security : footer;
      await updateSection(section, value as any);
      toast({ title: "Kaydedildi", description: "Ayarlar veritabanına kaydedildi." });
    } catch (e: any) {
      toast({ title: "Hata", description: e.message ?? "Kaydetme başarısız", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="admin">
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Genel Ayarlar</h1>
          <p className="text-sm text-muted-foreground">Platform yapılandırmasını yönetin (kalıcı)</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="general" className="gap-2"><Globe className="h-4 w-4" /> Genel</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Bildirimler</TabsTrigger>
            <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Güvenlik</TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" /> Footer</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Genel Ayarlar</CardTitle>
                <CardDescription>Platform temel bilgileri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Site Adı</Label>
                    <Input value={general.siteName} onChange={(e) => setGeneral({ ...general, siteName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Varsayılan Dil</Label>
                    <Select value={general.defaultLanguage} onValueChange={(v) => setGeneral({ ...general, defaultLanguage: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tr">Türkçe</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Site Açıklaması</Label>
                  <Textarea value={general.siteDescription} onChange={(e) => setGeneral({ ...general, siteDescription: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>İletişim E-posta</Label>
                    <Input type="email" value={general.contactEmail} onChange={(e) => setGeneral({ ...general, contactEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>İletişim Telefon</Label>
                    <Input value={general.contactPhone} onChange={(e) => setGeneral({ ...general, contactPhone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>İletişim Adres</Label>
                    <Input value={general.contactAddress} onChange={(e) => setGeneral({ ...general, contactAddress: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-sm">Bakım Modu</p>
                    <p className="text-xs text-muted-foreground">Etkinleştirildiğinde sadece adminler erişebilir</p>
                  </div>
                  <Switch checked={general.maintenanceMode} onCheckedChange={(v) => setGeneral({ ...general, maintenanceMode: v })} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleSave("general")} disabled={saving === "general"}>
                    {saving === "general" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Bildirim Ayarları</CardTitle>
                <CardDescription>E-posta bildirim tercihlerini yönetin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "emailOnEnrollment" as const, label: "Eğitime Kayıt", desc: "Kullanıcı eğitime kaydolduğunda bildirim gönder" },
                  { key: "emailOnCertificate" as const, label: "Sertifika Oluşturma", desc: "Sertifika oluşturulduğunda kullanıcıya bildir" },
                  { key: "emailOnExamResult" as const, label: "Sınav Sonucu", desc: "Sınav sonuçlandığında kullanıcıya bildir" },
                  { key: "emailOnCourseComplete" as const, label: "Eğitim Tamamlama", desc: "Eğitim tamamlandığında bildirim gönder" },
                  { key: "adminDailyDigest" as const, label: "Günlük Özet (Admin)", desc: "Adminlere günlük aktivite özeti gönder" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })}
                    />
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button onClick={() => handleSave("notifications")} disabled={saving === "notifications"}>
                    {saving === "notifications" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Güvenlik Ayarları</CardTitle>
                <CardDescription>Kimlik doğrulama ve güvenlik politikaları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">E-posta Doğrulama Zorunlu</p>
                    <p className="text-xs text-muted-foreground">Kayıt sonrası e-posta doğrulaması iste</p>
                  </div>
                  <Switch checked={security.requireEmailVerification} onCheckedChange={(v) => setSecurity({ ...security, requireEmailVerification: v })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Maks. Giriş Denemesi</Label>
                    <Input type="number" value={security.maxLoginAttempts} onChange={(e) => setSecurity({ ...security, maxLoginAttempts: parseInt(e.target.value) || 5 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Oturum Zaman Aşımı (dk)</Label>
                    <Input type="number" value={security.sessionTimeout} onChange={(e) => setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) || 60 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Min. Şifre Uzunluğu</Label>
                    <Input type="number" value={security.passwordMinLength} onChange={(e) => setSecurity({ ...security, passwordMinLength: parseInt(e.target.value) || 8 })} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">İki Faktörlü Doğrulama</p>
                    <p className="text-xs text-muted-foreground">Admin hesapları için 2FA zorunluluğu</p>
                  </div>
                  <Switch checked={security.twoFactorEnabled} onCheckedChange={(v) => setSecurity({ ...security, twoFactorEnabled: v })} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleSave("security")} disabled={saving === "security"}>
                    {saving === "security" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Footer Ayarları</CardTitle>
                <CardDescription>Sitenin altbilgi metinleri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tagline (Marka açıklaması)</Label>
                  <Textarea value={footer.tagline} onChange={(e) => setFooter({ ...footer, tagline: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Telif metni</Label>
                  <Input value={footer.copyrightText} onChange={(e) => setFooter({ ...footer, copyrightText: e.target.value })} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleSave("footer")} disabled={saving === "footer"}>
                    {saving === "footer" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
