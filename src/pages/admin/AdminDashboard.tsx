import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [profilesRes, firmsRes, coursesRes, certificatesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("firms").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("certificates").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalUsers: profilesRes.count || 0,
        activeFirms: firmsRes.count || 0,
        activeCourses: coursesRes.count || 0,
        totalCertificates: certificatesRes.count || 0,
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
        .slice(0, 4);
    },
  });

  const statItems = [
    {
      title: "Toplam Kullanıcı",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Aktif Firmalar",
      value: stats?.activeFirms ?? 0,
      icon: Building2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Aktif Eğitimler",
      value: stats?.activeCourses ?? 0,
      icon: BookOpen,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Verilen Sertifikalar",
      value: stats?.totalCertificates ?? 0,
      icon: Award,
      color: "text-warning",
      bgColor: "bg-warning/10",
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
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Yönetim Paneli
            </h1>
            <p className="text-muted-foreground">
              Platform istatistikleri ve son aktiviteler
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Rapor İndir
            </Button>
            <Button variant="accent" asChild>
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
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value.toLocaleString("tr-TR")}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-xs text-muted-foreground">
                        güncel veri
                      </span>
                    </div>
                  </div>
                  <div
                    className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Enrollments */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">
                  Son Kayıtlar
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/users">Tümünü Gör</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {enrollmentsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : recentEnrollments && recentEnrollments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kullanıcı</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Firma
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Eğitim
                        </TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEnrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {enrollment.profile
                                  ? `${enrollment.profile.first_name} ${enrollment.profile.last_name}`
                                  : "Bilinmiyor"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(enrollment.created_at)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {enrollment.firms?.name || "-"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                            {enrollment.courses?.title || "-"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(enrollment.status || "pending")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
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
              </CardContent>
            </Card>
          </div>

          {/* Top Companies */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  En Aktif Firmalar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {company.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {company.users} kullanıcı
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {company.certificates}
                        </p>
                        <p className="text-xs text-muted-foreground">sertifika</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Firma bulunamadı
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Hızlı İşlemler</h3>
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      Kullanıcı Yönetimi
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/admin/courses">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Kurs Yönetimi
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/admin/companies">
                      <Building2 className="mr-2 h-4 w-4" />
                      Firma Yönetimi
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/admin/exams">
                      <FileQuestion className="mr-2 h-4 w-4" />
                      Sınav Yönetimi
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
