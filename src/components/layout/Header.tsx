import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Shield, User, LogOut, LayoutDashboard, Settings, HelpCircle } from "lucide-react";

const navigation = [
  { name: "Ana Sayfa", href: "/" },
  { name: "Eğitimler", href: "/courses" },
  { name: "Hizmetler", href: "/services" },
  { name: "Fiyatlandırma", href: "/pricing" },
  { name: "Kurumsal", href: "/corporate" },
  { name: "Blog", href: "/blog" },
  { name: "Hakkımızda", href: "/about" },
  { name: "İletişim", href: "/contact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent shadow-md group-hover:shadow-glow transition-shadow">
            <Shield className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-foreground leading-tight tracking-tight">
              İSG<span className="text-accent">Akademi</span>
            </span>
            <span className="text-[9px] text-muted-foreground leading-none font-medium">
              Online Eğitim Platformu
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === item.href
                  ? "text-accent bg-accent/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {item.name}
            </Link>
          ))}
          {/* Admin Link */}
          {isAdmin && (
            <Link
              to="/admin"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                location.pathname.startsWith("/admin")
                  ? "text-accent bg-accent/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Yönetim
            </Link>
          )}
        </nav>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Panelim</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profil Ayarları</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/help" className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Yardım</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Paneli</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="text-sm">
                <Link to="/login">Giriş Yap</Link>
              </Button>
              <Button variant="accent" size="sm" asChild className="text-sm">
                <Link to="/register">Kayıt Ol</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menüyü aç</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[360px]">
            <div className="flex flex-col gap-6 mt-6">
              {/* User info in mobile */}
              {user && (
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                      location.pathname === item.href
                        ? "text-accent bg-accent/5"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                {user && (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                      location.pathname === "/dashboard"
                        ? "text-accent bg-accent/5"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    Panelim
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-2.5 rounded-lg text-base font-medium transition-colors flex items-center gap-2 ${
                      location.pathname.startsWith("/admin")
                        ? "text-accent bg-accent/5"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    Yönetim Paneli
                  </Link>
                )}
              </nav>

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {user ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </Button>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
