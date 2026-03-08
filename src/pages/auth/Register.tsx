import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Shield, Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2, Phone, Loader2, CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { toast } from "sonner";
import { validateTcKimlik } from "@/lib/tcKimlikValidation";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tcKimlik, setTcKimlik] = useState("");
  const [tcError, setTcError] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [firmCode, setFirmCodeLocal] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { signUp } = useAuth();
  const { setFirmCode, branding } = useFirmBranding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const codeFromUrl = searchParams.get("firma") || searchParams.get("code");
    if (codeFromUrl) {
      setFirmCodeLocal(codeFromUrl);
      setFirmCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleTcChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setTcKimlik(cleaned);
    if (cleaned.length === 11) {
      if (!validateTcKimlik(cleaned)) {
        setTcError("Geçersiz TC Kimlik numarası");
      } else {
        setTcError("");
      }
    } else if (cleaned.length > 0) {
      setTcError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error("Lütfen kullanım koşullarını kabul edin");
      return;
    }

    if (!tcKimlik || tcKimlik.length !== 11) {
      toast.error("TC Kimlik numarası zorunludur (11 haneli)");
      setTcError("TC Kimlik numarası zorunludur");
      return;
    }

    if (!validateTcKimlik(tcKimlik)) {
      toast.error("Geçerli bir TC Kimlik numarası giriniz");
      setTcError("Geçersiz TC Kimlik numarası");
      return;
    }

    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır");
      return;
    }

    // Save firm code
    if (firmCode.trim()) {
      setFirmCode(firmCode.trim());
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      tc_identity: tcKimlik,
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Bu e-posta adresi zaten kayıtlı");
      } else {
        toast.error("Kayıt sırasında bir hata oluştu");
      }
      setIsLoading(false);
      return;
    }

    toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
    navigate(firmCode ? `/login?firma=${firmCode}` : "/login");
  };

  const logoUrl = branding?.logo_url;
  const firmName = branding?.name;

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Info */}
      <div
        className="hidden lg:flex lg:flex-1 relative overflow-hidden"
        style={{
          backgroundColor: branding?.secondary_color || undefined,
          backgroundImage: branding?.login_bg_url ? `url(${branding.login_bg_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!branding?.login_bg_url && <div className="absolute inset-0 bg-gradient-hero" />}
        {branding?.login_bg_url && <div className="absolute inset-0 bg-black/40" />}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-primary-foreground mb-6">
              Binlerce Profesyonel
              <span className="text-accent block">Bize Güveniyor</span>
            </h2>
            <p className="text-primary-foreground/80 mb-8">
              500+ kurumsal firma ve 10.000+ bireysel kullanıcı ile Türkiye'nin
              önde gelen İSG eğitim platformu.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Aktif Kullanıcı", value: "10,000+" },
                { label: "Verilen Sertifika", value: "25,000+" },
                { label: "Online Eğitim", value: "50+" },
                { label: "Kurumsal Firma", value: "500+" },
              ].map((stat) => (
                <div key={stat.label} className="bg-primary-foreground/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-accent">{stat.value}</div>
                  <div className="text-sm text-primary-foreground/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-background py-12">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={firmName || "Logo"} className="h-12 max-w-[200px] object-contain" />
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent shadow-md">
                  <Shield className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-foreground leading-tight">
                    İSG<span className="text-accent">Akademi</span>
                  </span>
                </div>
              </>
            )}
          </Link>

          {firmName && (
            <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-sm font-medium text-accent">{firmName}</p>
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Ücretsiz Hesap Oluşturun</h1>
            <p className="mt-2 text-muted-foreground">İSG eğitimlerinize hemen başlayın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Firma Kodu */}
            <div className="space-y-2">
              <Label htmlFor="firmCode">Firma Kodu <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firmCode"
                  placeholder="Firmanızın size verdiği kodu giriniz"
                  className="pl-10"
                  value={firmCode}
                  onChange={(e) => {
                    setFirmCodeLocal(e.target.value);
                    if (e.target.value.trim()) setFirmCode(e.target.value.trim());
                  }}
                  required
                />
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="firstName" placeholder="Adınız" className="pl-10" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad <span className="text-destructive">*</span></Label>
                <Input id="lastName" placeholder="Soyadınız" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            {/* TC Kimlik */}
            <div className="space-y-2">
              <Label htmlFor="tcKimlik">TC Kimlik No <span className="text-destructive">*</span></Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tcKimlik"
                  placeholder="11 haneli TC Kimlik numaranız"
                  className={`pl-10 ${tcError ? "border-destructive" : ""}`}
                  value={tcKimlik}
                  onChange={(e) => handleTcChange(e.target.value)}
                  maxLength={11}
                  inputMode="numeric"
                  required
                />
              </div>
              {tcError && <p className="text-xs text-destructive">{tcError}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-posta Adresi <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="ornek@sirket.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="0555 555 55 55" className="pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Şifre <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="En az 6 karakter"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" className="mt-1" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} />
              <Label htmlFor="terms" className="text-sm font-normal leading-5">
                <Link to="/terms" className="text-accent hover:underline">Kullanım Koşulları</Link>'nı ve{" "}
                <Link to="/privacy" className="text-accent hover:underline">KVKK Aydınlatma Metni</Link>'ni okudum, kabul ediyorum.
              </Label>
            </div>

            {/* Submit */}
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kayıt yapılıyor...
                </div>
              ) : (
                <>
                  Kayıt Ol
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Zaten hesabınız var mı?{" "}
            <Link to={firmCode ? `/login?firma=${firmCode}` : "/login"} className="font-semibold text-accent hover:text-accent/80">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
