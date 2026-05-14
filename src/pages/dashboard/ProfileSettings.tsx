import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Loader2, CheckCircle, Eye, EyeOff, Building2, Mail, Phone, CreditCard, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ProfileSettings() {
  const { profile, user, roles, refreshProfile, isFirmAdmin } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [firmName, setFirmName] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.firm_id) {
      supabase.from("firms").select("name").eq("id", profile.firm_id).maybeSingle()
        .then(({ data }) => setFirmName(data?.name || null));
    }
  }, [profile?.firm_id]);

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return "U";
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      super_admin: "Süper Admin",
      admin: "Admin",
      firm_admin: "Firma Yetkilisi",
      instructor: "Eğitmen",
      student: "Öğrenci",
    };
    return map[role] || role;
  };

  const handleSaveProfile = async () => {
    if (!profile || !user) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Ad ve soyad boş bırakılamaz");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Profil bilgileri güncellendi");
    } catch {
      toast.error("Profil güncellenirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Yeni şifre en az 6 karakter olmalıdır");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }

    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Mevcut şifre yanlış");
        setChangingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Şifre başarıyla değiştirildi");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Şifre değiştirilirken hata oluştu");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <DashboardLayout userRole="student">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profil Ayarları</h1>
          <p className="text-muted-foreground text-sm">Kişisel bilgilerinizi ve şifrenizi yönetin</p>
        </div>

        {/* Profile Summary Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-accent text-accent-foreground text-xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleLabel(role)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            {firmName && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Firma: <span className="font-medium text-foreground">{firmName}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" /> Kişisel Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Adınız" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Soyadınız" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> E-posta
                </div>
              </Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">E-posta adresi değiştirilemez</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> TC Kimlik No
                </div>
              </Label>
              <Input id="tc" value={profile?.tc_identity || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">TC Kimlik numarası değiştirilemez</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefon
                </div>
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XX XXX XX XX"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kaydediliyor...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" /> Kaydet</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" /> Şifre Değiştir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mevcut Şifre</Label>
              <div className="relative">
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mevcut şifreniz"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label>Yeni Şifre Tekrar</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar girin"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword}
              variant="accent"
            >
              {changingPassword ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Değiştiriliyor...</>
              ) : (
                "Şifreyi Değiştir"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
