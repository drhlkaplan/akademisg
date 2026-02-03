import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Building2,
  Phone,
} from "lucide-react";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"individual" | "corporate">(
    "individual"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Info */}
      <div className="hidden lg:flex lg:flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
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
                <div
                  key={stat.label}
                  className="bg-primary-foreground/10 rounded-lg p-4"
                >
                  <div className="text-2xl font-bold text-accent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-primary-foreground/70">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-background py-12">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent shadow-md">
              <Shield className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground leading-tight">
                İSG<span className="text-accent">Akademi</span>
              </span>
            </div>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Ücretsiz Hesap Oluşturun
            </h1>
            <p className="mt-2 text-muted-foreground">
              İSG eğitimlerinize hemen başlayın
            </p>
          </div>

          {/* User Type Toggle */}
          <div className="flex gap-2 p-1 bg-secondary rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setUserType("individual")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                userType === "individual"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bireysel
            </button>
            <button
              type="button"
              onClick={() => setUserType("corporate")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                userType === "corporate"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kurumsal
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="Adınız"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input id="lastName" placeholder="Soyadınız" required />
              </div>
            </div>

            {/* Corporate Fields */}
            {userType === "corporate" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company">Firma Adı</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Firma adını giriniz"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sector">Sektör</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sektör seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">İnşaat</SelectItem>
                      <SelectItem value="manufacturing">İmalat</SelectItem>
                      <SelectItem value="mining">Madencilik</SelectItem>
                      <SelectItem value="logistics">Lojistik</SelectItem>
                      <SelectItem value="food">Gıda</SelectItem>
                      <SelectItem value="healthcare">Sağlık</SelectItem>
                      <SelectItem value="education">Eğitim</SelectItem>
                      <SelectItem value="retail">Perakende</SelectItem>
                      <SelectItem value="other">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-posta Adresi</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@sirket.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0555 555 55 55"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="En az 8 karakter"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" className="mt-1" />
              <Label htmlFor="terms" className="text-sm font-normal leading-5">
                <Link to="/terms" className="text-accent hover:underline">
                  Kullanım Koşulları
                </Link>
                'nı ve{" "}
                <Link to="/privacy" className="text-accent hover:underline">
                  KVKK Aydınlatma Metni
                </Link>
                'ni okudum, kabul ediyorum.
              </Label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
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

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Zaten hesabınız var mı?{" "}
            <Link
              to="/login"
              className="font-semibold text-accent hover:text-accent/80"
            >
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
