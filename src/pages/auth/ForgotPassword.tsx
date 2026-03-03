import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error("Şifre sıfırlama bağlantısı gönderilemedi");
      setIsLoading(false);
      return;
    }

    setIsSent(true);
    setIsLoading(false);
  };

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
          {isSent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-accent" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-foreground">
                E-posta Gönderildi
              </h1>
              <p className="text-muted-foreground text-sm">
                <strong>{email}</strong> adresine şifre sıfırlama bağlantısı
                gönderildi. Lütfen gelen kutunuzu kontrol edin.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Giriş Sayfasına Dön
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-foreground">
                  Şifrenizi mi Unuttunuz?
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  E-posta adresinizi girin, size şifre sıfırlama bağlantısı
                  gönderelim.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta Adresi</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@sirket.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      Gönderiliyor...
                    </div>
                  ) : (
                    "Sıfırlama Bağlantısı Gönder"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-sm text-accent hover:text-accent/80 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Giriş sayfasına dön
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
