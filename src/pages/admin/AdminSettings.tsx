import { useState } from "react";
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
import {
  Settings, Globe, Bell, Shield, Palette, Mail, Save,
} from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();

  const [generalSettings, setGeneralSettings] = useState({
    siteName: "İSG Akademi",
    siteDescription: "İş Sağlığı ve Güvenliği Eğitim Platformu",
    contactEmail: "info@isgakademi.com",
    contactPhone: "+90 212 000 00 00",
    maintenanceMode: false,
    defaultLanguage: "tr",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailOnEnrollment: true,
    emailOnCertificate: true,
    emailOnExamResult: true,
    emailOnCourseComplete: true,
    adminDailyDigest: false,
  });

  const [securitySettings, setSecuritySettings] = useState({
    requireEmailVerification: true,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    passwordMinLength: 8,
    twoFactorEnabled: false,
  });

  const handleSave = (section: string) => {
    toast({
      title: "Kaydedildi",
      description: `${section} ayarları başarıyla güncellendi.`,
    });
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Genel Ayarlar</h1>
          <p className="text-sm text-muted-foreground">Platform yapılandırmasını yönetin</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" /> Genel
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> Bildirimler
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" /> Güvenlik
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" /> Görünüm
            </TabsTrigger>
          </TabsList>

          {/* General */}
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
                    <Input value={generalSettings.siteName} onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Varsayılan Dil</Label>
                    <Select value={generalSettings.defaultLanguage} onValueChange={(v) => setGeneralSettings({ ...generalSettings, defaultLanguage: v })}>
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
                  <Textarea value={generalSettings.siteDescription} onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>İletişim E-posta</Label>
                    <Input type="email" value={generalSettings.contactEmail} onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>İletişim Telefon</Label>
                    <Input value={generalSettings.contactPhone} onChange={(e) => setGeneralSettings({ ...generalSettings, contactPhone: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium text-sm">Bakım Modu</p>
                    <p className="text-xs text-muted-foreground">Etkinleştirildiğinde sadece adminler erişebilir</p>
                  </div>
                  <Switch checked={generalSettings.maintenanceMode} onCheckedChange={(v) => setGeneralSettings({ ...generalSettings, maintenanceMode: v })} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleSave("Genel")}><Save className="mr-2 h-4 w-4" /> Kaydet</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
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
                      checked={notificationSettings[item.key]}
                      onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, [item.key]: v })}
                    />
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button onClick={() => handleSave("Bildirim")}><Save className="mr-2 h-4 w-4" /> Kaydet</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
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
                  <Switch checked={securitySettings.requireEmailVerification} onCheckedChange={(v) => setSecuritySettings({ ...securitySettings, requireEmailVerification: v })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Maks. Giriş Denemesi</Label>
                    <Input type="number" value={securitySettings.maxLoginAttempts} onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) || 5 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Oturum Zaman Aşımı (dk)</Label>
                    <Input type="number" value={securitySettings.sessionTimeout} onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 60 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Min. Şifre Uzunluğu</Label>
                    <Input type="number" value={securitySettings.passwordMinLength} onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) || 8 })} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">İki Faktörlü Doğrulama</p>
                    <p className="text-xs text-muted-foreground">Admin hesapları için 2FA zorunluluğu</p>
                  </div>
                  <Switch checked={securitySettings.twoFactorEnabled} onCheckedChange={(v) => setSecuritySettings({ ...securitySettings, twoFactorEnabled: v })} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleSave("Güvenlik")}><Save className="mr-2 h-4 w-4" /> Kaydet</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Görünüm Ayarları</CardTitle>
                <CardDescription>Platform tema ve görsel ayarları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Firma bazlı tema özelleştirmeleri <strong>Firma Yönetimi</strong> sayfasından yapılabilir.
                  Genel platform teması varsayılan olarak koyu tema (dark mode) kullanmaktadır.
                </p>
                <div className="flex justify-end">
                  <Button onClick={() => handleSave("Görünüm")}><Save className="mr-2 h-4 w-4" /> Kaydet</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
