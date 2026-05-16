import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Building2,
  BookOpen,
  Award,
  TrendingUp,
  Plus,
  MoreHorizontal,
  Download,
  FileQuestion,
  ArrowUpRight,
  Activity,
  Shield,
  Clock,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ActiveUsersMonitor } from "@/components/admin/ActiveUsersMonitor";
export default function AdminDashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [profilesRes, firmsRes, coursesRes, certificatesRes, enrollmentsActiveRes, enrollmentsCompletedRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("firms").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("certificates").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "completed"),
      ]);

      return {
        totalUsers: profilesRes.count || 0,
        activeFirms: firmsRes.count || 0,
        activeCourses: coursesRes.count || 0,
        totalCertificates: certificatesRes.count || 0,
        activeEnrollments: enrollmentsActiveRes.count || 0,
        completedEnrollments: enrollmentsCompletedRes.count || 0,
      };
    },
  });

  // Fetch recent enrollments with user and course info
  const { data: recentEnrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["admin-recent-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id,
          status,
          created_at,
          user_id,
          course_id,
          firm_id,
          courses (title),
          firms (name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = data.map(e => e.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return data.map(enrollment => ({
        ...enrollment,
        profile: profileMap.get(enrollment.user_id),
      }));
    },
  });

  // Fetch top companies by employee count
  const { data: topCompanies, isLoading: companiesLoading } = useQuery({
    queryKey: ["admin-top-companies"],
    queryFn: async () => {
      const { data: firms, error: firmsError } = await supabase
        .from("firms")
        .select("id, name")
        .eq("is_active", true);

      if (firmsError) throw firmsError;

      // Count employees per firm
      const { data: profiles } = await supabase
        .from("profiles")
        .select("firm_id");

      // Count certificates per firm
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("firm_id")
        .eq("status", "completed");

      const employeeCounts: Record<string, number> = {};
      const certificateCounts: Record<string, number> = {};

      profiles?.forEach(p => {
        if (p.firm_id) {
          employeeCounts[p.firm_id] = (employeeCounts[p.firm_id] || 0) + 1;
        }
      });

      enrollments?.forEach(e => {
        if (e.firm_id) {
          certificateCounts[e.firm_id] = (certificateCounts[e.firm_id] || 0) + 1;
        }
      });

      return firms
        .map(firm => ({
          name: firm.name,
          users: employeeCounts[firm.id] || 0,
          certificates: certificateCounts[firm.id] || 0,
        }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 5);
    },
  });

  const statItems = [
    {
      title: "Toplam Kullanıcı",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
      href: "/admin/users",
    },
    {
      title: "Aktif Firmalar",
      value: stats?.activeFirms ?? 0,
      icon: Building2,
      color: "text-success",
      bgColor: "bg-success/10",
      href: "/admin/companies",
    },
    {
      title: "Aktif Eğitimler",
      value: stats?.activeCourses ?? 0,
      icon: BookOpen,
      color: "text-accent",
      bgColor: "bg-accent/10",
      href: "/admin/courses",
    },
    {
      title: "Verilen Sertifikalar",
      value: stats?.totalCertificates ?? 0,
      icon: Award,
      color: "text-warning",
      bgColor: "bg-warning/10",
      href: "/admin/certificates",
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Tamamlandı</Badge>;
      case "active":
        return <Badge variant="active">Devam Ediyor</Badge>;
      case "pending":
        return <Badge variant="pending">Beklemede</Badge>;
      case "failed":
        return <Badge variant="destructive">Başarısız</Badge>;
      case "expired":
        return <Badge variant="secondary">Süresi Doldu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Gösterge Paneli
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Platform istatistikleri ve son aktiviteler
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Rapor İndir
            </Button>
            <Button variant="accent" size="sm" asChild>
              <Link to="/admin/courses">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Eğitim
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((stat) => (
            <Link key={stat.title} to={stat.href} className="stat-card group cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 truncate">
                    {stat.title}
                  </p>
                  {statsLoading ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground tracking-tight leading-none">
                      {stat.value.toLocaleString("tr-TR")}
                    </p>
                  )}
                </div>
                <div
                  className={`h-12 w-12 shrink-0 rounded-2xl ${stat.bgColor} ring-1 ring-inset ring-border/40 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/50">
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-accent transition-colors">
                  Detaylı görüntüle
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-info/10 ring-1 ring-inset ring-info/20 flex items-center justify-center shadow-sm">
                <Activity className="h-6 w-6 text-info" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Aktif Kayıtlar</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground leading-none mt-1">{stats?.activeEnrollments ?? 0}</p>
                )}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-success/10 ring-1 ring-inset ring-success/20 flex items-center justify-center shadow-sm">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tamamlanan Kayıtlar</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground leading-none mt-1">{stats?.completedEnrollments ?? 0}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Users Monitor */}
        <ActiveUsersMonitor />

        {/* Quick Access - Compliance & Reports */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: "/admin/compliance-report", icon: Shield, iconClass: "text-success", bgClass: "bg-success/10 ring-success/20", title: "Uyumluluk Raporu", sub: "Firma bazlı durum" },
            { to: "/admin/recurrence-report", icon: Clock, iconClass: "text-warning", bgClass: "bg-warning/10 ring-warning/20", title: "Tekrar Eğitim Vadesi", sub: "Yaklaşan vadeler" },
            { to: "/admin/f2f-attendance-report", icon: Users, iconClass: "text-info", bgClass: "bg-info/10 ring-info/20", title: "Yüz Yüze Katılım", sub: "Oturum istatistikleri" },
            { to: "/admin/documents", icon: FileText, iconClass: "text-accent", bgClass: "bg-accent/10 ring-accent/20", title: "Belge Üretimi", sub: "Tutanak ve raporlar" },
          ].map((q) => (
            <Link key={q.to} to={q.to} className="stat-card group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 shrink-0 rounded-xl ${q.bgClass} ring-1 ring-inset flex items-center justify-center shadow-sm transition-transform group-hover:scale-110`}>
                  <q.icon className={`h-5 w-5 ${q.iconClass}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{q.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{q.sub}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Enrollments */}
          <div className="lg:col-span-2">
            <div className="dashboard-card">
              <div className="flex items-center justify-between p-5 pb-0">
                <h3 className="text-base font-semibold text-foreground">Son Kayıtlar</h3>
                <Button variant="ghost" size="sm" className="text-xs" asChild>
                  <Link to="/admin/users">Tümünü Gör</Link>
                </Button>
              </div>
              <div className="p-5 px-0 py-0">
                {enrollmentsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : recentEnrollments && recentEnrollments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kullanıcı</TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">Firma</TableHead>
                        <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eğitim</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEnrollments.map((enrollment) => (
                        <TableRow key={enrollment.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                                  {enrollment.profile
                                    ? `${enrollment.profile.first_name?.[0] || ''}${enrollment.profile.last_name?.[0] || ''}`
                                    : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground text-sm">
                                  {enrollment.profile
                                    ? `${enrollment.profile.first_name} ${enrollment.profile.last_name}`
                                    : "Bilinmiyor"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {formatDate(enrollment.created_at)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{enrollment.firms?.name || "-"}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[200px]">
                            <span className="text-sm text-muted-foreground truncate block">{enrollment.courses?.title || "-"}</span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(enrollment.status || "pending")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz kayıt bulunmuyor
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Top Companies */}
            <div className="dashboard-card">
              <div className="p-5 pb-3">
                <h3 className="text-base font-semibold text-foreground">En Aktif Firmalar</h3>
              </div>
              <div className="px-5 pb-5 space-y-3">
                {companiesLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : topCompanies && topCompanies.length > 0 ? (
                  topCompanies.map((company, index) => (
                    <div
                      key={company.name}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {company.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {company.users} kullanıcı
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {company.certificates}
                        </p>
                        <p className="text-[11px] text-muted-foreground">sertifika</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Firma bulunamadı
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-card bg-primary text-primary-foreground mx-[10px] my-[10px] px-[10px] py-[10px]">
              <div className="p-5 px-0 py-0">
                <h3 className="font-semibold text-sm mb-3 text-black py-0 my-0 mx-0 px-0">Hızlı İşlemler</h3>
                <div className="space-y-1.5 text-center mx-[10px] my-[10px] px-[10px] py-[10px]">
                  {[
                    { icon: Users, label: "Kullanıcı Yönetimi", href: "/admin/users" },
                    { icon: BookOpen, label: "Kurs Yönetimi", href: "/admin/courses" },
                    { icon: Building2, label: "Firma Yönetimi", href: "/admin/companies" },
                    { icon: FileQuestion, label: "Sınav Yönetimi", href: "/admin/exams" },
                    { icon: Award, label: "Sertifika Yönetimi", href: "/admin/certificates" },
                  ].map((action) => (
                    <Button
                      key={action.href}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start h-9 text-xs"
                      asChild
                    >
                      <Link to={action.href}>
                        <action.icon className="mr-2 h-3.5 w-3.5" />
                        {action.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
