import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  FileCheck,
  Award,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  Bell,
  ChevronDown,
  GraduationCap,
  BarChart3,
  FileText,
  HelpCircle,
  KeyRound,
  Search,
  ChevronRight,
  Video,
  UserCog,
  ArrowRightLeft,
  Link2,
  FolderOpen,
  Briefcase,
  ClipboardCheck,
  Archive,
  Database,
  PieChart,
  UserPlus,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole?: "student" | "admin" | "company" | "superadmin";
}

const companyNavItems = [
  { icon: LayoutDashboard, label: "Gösterge Paneli", href: "/firm" },
  { icon: Users, label: "Çalışanlar", href: "/firm/employees" },
  { icon: BookOpen, label: "Eğitimler", href: "/firm/courses" },
  { icon: BarChart3, label: "Raporlar", href: "/firm/reports" },
  { icon: Award, label: "Sertifikalar", href: "/firm/certificates" },
];

const studentNavItems = [
  { icon: LayoutDashboard, label: "Gösterge Paneli", href: "/dashboard" },
  { icon: BookOpen, label: "Eğitimlerim", href: "/dashboard/courses" },
  { icon: FileCheck, label: "Sınavlarım", href: "/dashboard/exams" },
  { icon: Users, label: "Yüz Yüze Derslerim", href: "/dashboard/face-to-face" },
  { icon: Award, label: "Sertifikalarım", href: "/dashboard/certificates" },
  { icon: Settings, label: "Profil Ayarları", href: "/dashboard/profile" },
  { icon: HelpCircle, label: "Yardım", href: "/dashboard/help" },
];

const adminNavGroups = [
  {
    label: "Genel",
    items: [
      { icon: LayoutDashboard, label: "Gösterge Paneli", href: "/admin" },
    ],
  },
  {
    label: "Kullanıcı ve Kurum Yönetimi",
    items: [
      { icon: Users, label: "Kullanıcılar", href: "/admin/users" },
      { icon: Building2, label: "Firmalar", href: "/admin/companies" },
      { icon: KeyRound, label: "Gruplar", href: "/admin/groups" },
      { icon: Briefcase, label: "Sektörler", href: "/admin/sectors" },
      { icon: UserPlus, label: "Katılma Talepleri", href: "/admin/join-requests" },
    ],
  },
  {
    label: "Eğitim Yönetimi",
    items: [
      { icon: GraduationCap, label: "Eğitimler", href: "/admin/courses" },
      { icon: ImageIcon, label: "Eğitim Kapakları", href: "/admin/course-covers" },
      { icon: FolderOpen, label: "Eğitim Türleri", href: "/admin/training-types" },
      { icon: ClipboardCheck, label: "Şablon Kuralları", href: "/admin/course-template-rules" },
      { icon: FileCheck, label: "Sınavlar", href: "/admin/exams" },
    ],
  },
  {
    label: "Oturum ve İçerik",
    items: [
      { icon: Video, label: "Canlı Oturumlar", href: "/admin/live-sessions" },
      { icon: Users, label: "Yüz Yüze Oturumlar", href: "/admin/face-to-face" },
      { icon: Shield, label: "İşyeri Konuları", href: "/admin/topic4-packs" },
      { icon: Link2, label: "Firma İşyeri Konusu", href: "/admin/company-topic4" },
      { icon: FileText, label: "Blog Yazıları", href: "/admin/blog" },
      { icon: Briefcase, label: "Hizmetler", href: "/admin/services" },
    ],
  },
  {
    label: "Sertifika ve Belge",
    items: [
      { icon: Award, label: "Sertifikalar", href: "/admin/certificates" },
      { icon: FileText, label: "Sertifika Şablonları", href: "/admin/certificate-templates" },
      { icon: FileText, label: "Belge Üretimi", href: "/admin/documents" },
    ],
  },
  {
    label: "Raporlama ve Analiz",
    items: [
      { icon: PieChart, label: "Analiz Paneli", href: "/admin/analytics" },
      { icon: BarChart3, label: "Sınav Raporları", href: "/admin/reports" },
      { icon: FileText, label: "Rapor Merkezi", href: "/admin/report-center" },
      { icon: Shield, label: "Uyumluluk Raporu", href: "/admin/compliance-report" },
      { icon: ArrowRightLeft, label: "Tekrar Eğitim Vadesi", href: "/admin/recurrence-report" },
      { icon: ClipboardCheck, label: "Yüz Yüze Katılım", href: "/admin/f2f-attendance-report" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { icon: Settings, label: "Ayarlar", href: "/admin/settings" },
      { icon: Search, label: "SSS Yönetimi", href: "/admin/faq" },
      { icon: Database, label: "Migrasyon", href: "/admin/migration" },
      { icon: Archive, label: "Aktivite Logları", href: "/admin/logs" },
    ],
  },
];

// Flatten for backward compat
const adminNavItems = adminNavGroups.flatMap((g) => g.items);

export function DashboardLayout({
  children,
  userRole = "student",
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { branding } = useFirmBranding();
  const { user, profile, signOut, isFirmAdmin } = useAuth();

  const navItems = userRole === "student" ? studentNavItems
    : userRole === "company" ? companyNavItems
    : adminNavItems;

  // Helper to darken a hex color
  const adjustColor = (hex: string, amount: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  };

  const dashboardTitle = userRole === "student"
    ? (branding?.name ? `${branding.name}` : "Öğrenci Paneli")
    : userRole === "company"
    ? (branding?.name ? `${branding.name}` : "Firma Paneli")
    : "Yönetim Paneli";
  
  const showFirmBranding = userRole === "student" || userRole === "company";

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email || "Kullanıcı";
  const userEmail = user?.email || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Get current page title from nav items
  const currentPageTitle = navItems.find((item) => item.href === location.pathname)?.label || dashboardTitle;

  // Apply dynamic firm branding colors to CSS variables
  const firmStyle = showFirmBranding && branding ? {
    '--sidebar-background': branding.secondary_color,
    '--sidebar-primary': branding.primary_color,
  } as React.CSSProperties : {};

  const SidebarNav = () => (
    <div className="flex flex-col h-full bg-gradient-sidebar" style={showFirmBranding && branding ? {
      background: `linear-gradient(180deg, ${branding.secondary_color} 0%, ${adjustColor(branding.secondary_color, -20)} 100%)`,
    } : {}}>
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border/50">
        <Link to="/" className="flex items-center gap-3">
          {branding?.logo_url && showFirmBranding ? (
            <div className="flex items-center gap-3">
              <img
                src={branding.logo_url}
                alt={branding.name}
                className="h-10 max-w-[180px] object-contain"
                onError={(e) => {
                  // Fallback if logo fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-sm font-semibold text-sidebar-foreground opacity-70">{dashboardTitle === branding.name ? "" : ""}</span>
            </div>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary shadow-lg">
                <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-sidebar-foreground leading-tight tracking-tight">
                  İSG<span className="text-sidebar-primary">Akademi</span>
                </span>
                <span className="text-[10px] text-sidebar-foreground/50 leading-none font-medium">
                  {dashboardTitle}
                </span>
              </div>
            </>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {userRole === "student" || userRole === "company" ? (
          (userRole === "student" ? studentNavItems : companyNavItems).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "sidebar-nav-item",
                  isActive ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })
        ) : (
          adminNavGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "sidebar-nav-item",
                      isActive ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </nav>

      {/* Role Switcher - Admin only */}
      {(userRole === "admin" || userRole === "superadmin") && (
        <div className="px-3 pt-2 border-t border-sidebar-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-xs h-9"
              >
                <span className="flex items-center gap-2">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Rol Değiştir
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" className="w-52">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Paneli Değiştir
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/admin")}
                className={cn("cursor-pointer", location.pathname.startsWith("/admin") && "bg-accent/10 font-medium")}
              >
                <Shield className="mr-2 h-4 w-4 text-accent" />
                Yönetici Paneli
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/dashboard")}
                className={cn("cursor-pointer", location.pathname.startsWith("/dashboard") && "bg-accent/10 font-medium")}
              >
                <GraduationCap className="mr-2 h-4 w-4 text-blue-500" />
                Öğrenci Paneli
              </DropdownMenuItem>
              {isFirmAdmin && (
                <DropdownMenuItem
                  onClick={() => navigate("/firm")}
                  className={cn("cursor-pointer", location.pathname.startsWith("/firm") && "bg-accent/10 font-medium")}
                >
                  <Building2 className="mr-2 h-4 w-4 text-emerald-500" />
                  Firma Yetkilisi Paneli
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-9 w-9 border-2 border-sidebar-primary/30">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {userName}
            </p>
            <p className="text-[11px] text-sidebar-foreground/40 truncate">
              {userEmail}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 justify-start text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-xs"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
            <SidebarNav />
          </SheetContent>
        </Sheet>

        <div className="flex-1 min-w-0">
          <span className="font-semibold text-foreground text-sm truncate block">{currentPageTitle}</span>
        </div>

        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[9px] font-bold text-accent-foreground flex items-center justify-center">
            3
          </span>
        </Button>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar">
          <SidebarNav />
        </aside>

        {/* Main Content */}
        <div className="flex-1 lg:pl-[260px]">
          {/* Desktop Header */}
          <header className="hidden lg:flex sticky top-0 z-40 h-14 items-center gap-4 border-b border-border bg-card/95 backdrop-blur-sm px-6">
            {/* Breadcrumb */}
            <div className="flex-1 flex items-center gap-2 text-sm">
              <Link to={userRole === "student" ? "/dashboard" : userRole === "company" ? "/firm" : "/admin"} className="text-muted-foreground hover:text-foreground transition-colors">
                {userRole === "student" ? "Panel" : userRole === "company" ? "Firma Paneli" : "Yönetim"}
              </Link>
              {location.pathname !== "/dashboard" && location.pathname !== "/admin" && location.pathname !== "/firm" && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="font-medium text-foreground">{currentPageTitle}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[9px] font-bold text-accent-foreground flex items-center justify-center">
                      3
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="p-3 border-b border-border">
                    <h4 className="font-semibold text-sm">Bildirimler</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm">Yeni eğitim ataması yapıldı</p>
                        <p className="text-xs text-muted-foreground">2 saat önce</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm">Sertifikanız hazır</p>
                        <p className="text-xs text-muted-foreground">1 gün önce</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm">Sınav sonucunuz açıklandı</p>
                        <p className="text-xs text-muted-foreground">2 gün önce</p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="h-6 w-px bg-border mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 h-9 pl-2 pr-3">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block text-sm font-medium">{profile?.first_name || "Kullanıcı"}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Panelim
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Profil Ayarları
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/help" className="cursor-pointer">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Yardım
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
