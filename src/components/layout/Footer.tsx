import { Link } from "react-router-dom";
import { Shield, Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
  platform: [
    { name: "Eğitimler", href: "/courses" },
    { name: "Sertifika Doğrula", href: "/verify" },
    { name: "Hakkımızda", href: "/about" },
    { name: "İletişim", href: "/contact" },
  ],
  legal: [
    { name: "Gizlilik Politikası", href: "/privacy" },
    { name: "KVKK Aydınlatma", href: "/kvkk" },
    { name: "Kullanım Koşulları", href: "/terms" },
    { name: "Çerez Politikası", href: "/cookies" },
  ],
  education: [
    { name: "Az Tehlikeli Sınıf", href: "/courses?category=low" },
    { name: "Tehlikeli Sınıf", href: "/courses?category=medium" },
    { name: "Çok Tehlikeli Sınıf", href: "/courses?category=high" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shadow-md">
                <Shield className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-tight">
                  İSG<span className="text-accent">Akademi</span>
                </span>
                <span className="text-[10px] text-primary-foreground/70 leading-none">
                  Online Eğitim Platformu
                </span>
              </div>
            </Link>
            <p className="text-sm text-primary-foreground/70 max-w-xs">
              İş Sağlığı ve Güvenliği eğitimlerinde güvenilir çözüm ortağınız.
              SCORM uyumlu, sertifikalı online eğitimler.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold text-accent mb-4">Platform</h4>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Education Links */}
          <div>
            <h4 className="font-semibold text-accent mb-4">Eğitimler</h4>
            <ul className="space-y-2">
              {footerLinks.education.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-accent mb-4">İletişim</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Mail className="h-4 w-4 text-accent" />
                <span>info@isgakademi.com</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Phone className="h-4 w-4 text-accent" />
                <span>+90 (212) 555 00 00</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <span>İstanbul, Türkiye</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/50">
              © {new Date().getFullYear()} İSG Akademi. Tüm hakları saklıdır.
            </p>
            <div className="flex gap-4">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-xs text-primary-foreground/50 hover:text-accent transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
