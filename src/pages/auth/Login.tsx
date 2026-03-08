import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Building2, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [firmCode, setFirmCodeLocal] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();
  const { setFirmCode, branding } = useFirmBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from = (location.state as { from?: Location })?.from?.pathname || "/dashboard";

  // Pre-fill firm code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("firma") || searchParams.get("code");
    if (codeFromUrl) {
      setFirmCodeLocal(codeFromUrl);
      setFirmCode(codeFromUrl);
    }
  }, [searchParams]);

  const isTcKimlik = (value: string) => /^\d{11}$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Save firm code
    if (firmCode.trim()) {
      setFirmCode(firmCode.trim());
    }

    let email = identifier;

    // If identifier is TC Kimlik, look up email
    if (isTcKimlik(identifier)) {
      try {
        const { data, error } = await supabase.functions.invoke("lookup-tc", {
          body: { tc_identity: identifier },
        });
        if (error || !data?.email) {
          toast.error("Bu TC Kimlik numarasına ait hesap bulunamadı");
          setIsLoading(false);
          return;
        }
        email = data.email;
      } catch {
        toast.error("TC Kimlik sorgusu sırasında bir hata oluştu");
        setIsLoading(false);
        return;
      }
    }

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Geçersiz kimlik bilgileri veya şifre");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Lütfen e-posta adresinizi doğrulayın");
      } else {
        toast.error("Giriş yapılırken bir hata oluştu");
      }
      setIsLoading(false);
      return;
    }

    toast.success("Başarıyla giriş yapıldı!");
    navigate(from, { replace: true });
  };

  const logoUrl = branding?.logo_url;
  const firmName = branding?.name;

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-background">
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

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Hesabınıza Giriş Yapın
            </h1>
            <p className="mt-2 text-muted-foreground">
              {branding?.welcome_message || "Eğitimlerinize kaldığınız yerden devam edin"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Firma Kodu */}
            <div className="space-y-2">
              <Label htmlFor="firmCode">Firma Kodu</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firmCode"
                  placeholder="Firma kodunu giriniz (opsiyonel)"
                  className="pl-10"
                  value={firmCode}
                  onChange={(e) => {
                    setFirmCodeLocal(e.target.value);
                    if (e.target.value.trim()) setFirmCode(e.target.value.trim());
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Admin kullanıcılar firma kodsuz girebilir</p>
            </div>

            {/* Email or TC */}
            <div className="space-y-2">
              <Label htmlFor="identifier">E-posta veya TC Kimlik No</Label>
              <div className="relative">
                {isTcKimlik(identifier) ? (
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  id="identifier"
                  placeholder="ornek@sirket.com veya TC Kimlik No"
                  className="pl-10"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
                <Link to="/forgot-password" className="text-sm text-accent hover:text-accent/80">
                  Şifremi Unuttum
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal">Beni hatırla</Label>
            </div>

            {/* Submit */}
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </div>
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">veya</span>
            </div>
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link to={firmCode ? `/register?firma=${firmCode}` : "/register"} className="font-semibold text-accent hover:text-accent/80">
              Ücretsiz Kayıt Olun
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image/Info */}
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
              İş Güvenliği Eğitiminizi
              <span className="text-accent block">Online Tamamlayın</span>
            </h2>
            <ul className="space-y-4">
              {["7/24 erişim imkanı", "SCORM uyumlu eğitimler", "QR kodlu sertifikalar", "Detaylı ilerleme takibi"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-primary-foreground/80">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
