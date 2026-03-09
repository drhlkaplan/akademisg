import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="container max-w-4xl">
        <div className="relative rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-5 md:p-6">
          <button
            onClick={handleReject}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Cookie className="h-5 w-5 text-accent" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium mb-1">Çerez Kullanımı</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Platformumuzda deneyiminizi iyileştirmek, güvenliğinizi sağlamak ve hizmetlerimizi geliştirmek 
                amacıyla çerezler kullanmaktayız. Detaylı bilgi için{" "}
                <Link to="/cookies" className="text-accent hover:underline">Çerez Politikamızı</Link> ve{" "}
                <Link to="/kvkk" className="text-accent hover:underline">KVKK Aydınlatma Metni</Link>'ni 
                inceleyebilirsiniz.
              </p>
            </div>

            <div className="flex gap-2 shrink-0 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none text-xs"
                onClick={handleReject}
              >
                Reddet
              </Button>
              <Button
                size="sm"
                className="flex-1 md:flex-none text-xs"
                onClick={handleAccept}
              >
                Kabul Et
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
