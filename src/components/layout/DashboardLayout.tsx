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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole?: "student" | "admin" | "company" | "superadmin";
}

const studentNavItems = [
  { icon: LayoutDashboard, label: "Gösterge Paneli", href: "/dashboard" },
  { icon: BookOpen, label: "Eğitimlerim", href: "/dashboard/courses" },
  { icon: FileCheck, label: "Sınavlarım", href: "/dashboard/exams" },
  { icon: Award, label: "Sertifikalarım", href: "/dashboard/certificates" },
  { icon: HelpCircle, label: "Yardım", href: "/dashboard/help" },
];

const adminNavItems = [
  { icon: LayoutDashboard, label: "Gösterge Paneli", href: "/admin" },
  { icon: Users, label: "Kullanıcılar", href: "/admin/users" },
  { icon: Building2, label: "Firmalar", href: "/admin/companies" },
  { icon: GraduationCap, label: "Eğitimler", href: "/admin/courses" },
  { icon: FileCheck, label: "Sınavlar", href: "/admin/exams" },
  { icon: KeyRound, label: "Gruplar", href: "/admin/groups" },
  { icon: Award, label: "Sertifikalar", href: "/admin/certificates" },
  { icon: FileText, label: "Şablonlar", href: "/admin/certificate-templates" },
  { icon: BarChart3, label: "Sınav Raporları", href: "/admin/reports" },
  { icon: BarChart3, label: "Analiz", href: "/admin/analytics" },
  { icon: FileText, label: "Rapor Merkezi", href: "/admin/report-center" },
  { icon: FileText, label: "Loglar", href: "/admin/logs" },
  { icon: Settings, label: "Ayarlar", href: "/admin/settings" },
];

export function DashboardLayout({
  children,
  userRole = "student",
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = userRole === "student" ? studentNavItems : adminNavItems;
  const dashboardTitle = userRole === "student" ? "Öğrenci Paneli" : "Yönetim Paneli";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary shadow-md">
            <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-foreground leading-tight">
              İSG<span className="text-sidebar-primary">Akademi</span>
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 leading-none">
              {dashboardTitle}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => navigate("/login")}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-card px-4">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <div className="flex-1">
          <span className="font-semibold text-foreground">{dashboardTitle}</span>
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">
            3
          </span>
        </Button>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <div className="flex-1 lg:pl-64">
          {/* Desktop Header */}
          <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-6">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">
                {dashboardTitle}
              </h1>
            </div>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      AK
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block">Ahmet Kaya</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Profil Ayarları
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Yardım
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => navigate("/login")}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Page Content */}
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
