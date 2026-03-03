import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type !== "recovery") {
      // Also check query params (some flows use query params)
      const queryParams = new URLSearchParams(window.location.search);
      const queryType = queryParams.get("type");
      if (queryType !== "recovery") {
        setIsValidLink(false);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Şifre güncellenirken bir hata oluştu");
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);
    toast.success("Şifreniz başarıyla güncellendi!");

    setTimeout(() => navigate("/login"), 3000);
  };

  if (!isValidLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            Geçersiz veya Süresi Dolmuş Bağlantı
          </h1>
          <p className="text-muted-foreground text-sm">
            Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
          </p>
          <Link to="/forgot-password">
            <Button variant="accent" className="mt-4">
              Yeni Bağlantı İste
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent shadow-md">
            <Shield className="h-6 w-6 text-accent-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground leading-tight">
            İSG<span className="text-accent">Akademi</span>
          </span>
        </Link>

        <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-accent" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-foreground">
                Şifre Güncellendi!
              </h1>
              <p className="text-muted-foreground text-sm">
                Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-foreground">
                  Yeni Şifre Belirleyin
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Hesabınız için yeni bir şifre oluşturun.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Yeni Şifre</Label>
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
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Şifrenizi tekrar girin"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Güncelleniyor...
                    </div>
                  ) : (
                    "Şifremi Güncelle"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
