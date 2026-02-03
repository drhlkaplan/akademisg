import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield, X } from "lucide-react";

const navigation = [
  { name: "Ana Sayfa", href: "/" },
  { name: "Eğitimler", href: "/courses" },
  { name: "Hakkımızda", href: "/about" },
  { name: "İletişim", href: "/contact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent shadow-md group-hover:shadow-glow transition-shadow">
            <Shield className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground leading-tight">
              İSG<span className="text-accent">Akademi</span>
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">
              Online Eğitim Platformu
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`text-sm font-medium transition-colors hover:text-accent ${
                location.pathname === item.href
                  ? "text-accent"
                  : "text-muted-foreground"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Giriş Yap</Link>
          </Button>
          <Button variant="accent" size="sm" asChild>
            <Link to="/register">Kayıt Ol</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menüyü aç</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col gap-6 mt-6">
              <nav className="flex flex-col gap-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`text-lg font-medium transition-colors hover:text-accent ${
                      location.pathname === item.href
                        ? "text-accent"
                        : "text-foreground"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Button variant="outline" asChild>
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    Giriş Yap
                  </Link>
                </Button>
                <Button variant="accent" asChild>
                  <Link to="/register" onClick={() => setIsOpen(false)}>
                    Kayıt Ol
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
