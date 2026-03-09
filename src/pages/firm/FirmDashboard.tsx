import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Progress } from "@/components/ui/progress";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Building2,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

export default function FirmDashboard() {
  const { branding } = useFirmBranding();
  const { profile } = useAuth();
  const firmId = profile?.firm_id;

  // Fetch firm employees
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["firm-employees", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  // Fetch enrollments for firm employees
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["firm-enrollments", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title, duration_minutes)")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  // Fetch certificates for firm employees
  const { data: certificates } = useQuery({
    queryKey: ["firm-certificates", firmId],
    queryFn: async () => {
      if (!firmId || !employees) return [];
      const userIds = employees.map((e) => e.user_id);
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId && !!employees && employees.length > 0,
  });

  const totalEmployees = employees?.length || 0;
  const activeEnrollments = enrollments?.filter((e) => e.status === "active").length || 0;
  const completedEnrollments = enrollments?.filter((e) => e.status === "completed").length || 0;
  const totalCertificates = certificates?.length || 0;
  const completionRate = enrollments && enrollments.length > 0
    ? Math.round((completedEnrollments / enrollments.length) * 100)
    : 0;

  const isLoading = loadingEmployees || loadingEnrollments;

  const stats = [
    { label: "Toplam Çalışan", value: totalEmployees, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Aktif Eğitim", value: activeEnrollments, icon: BookOpen, color: "text-accent", bg: "bg-accent/10" },
    { label: "Tamamlanan", value: completedEnrollments, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Sertifika", value: totalCertificates, icon: Award, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <DashboardLayout userRole="company">
      <div className="space-y-6">
        {/* Firm Header with Branding */}
        <div className="flex items-center gap-4">
          {branding?.logo_url && (
            <img
              src={branding.logo_url}
              alt={branding.name}
              className="h-14 max-w-[200px] object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {branding?.name || "Firma Paneli"}
            </h1>
            <p className="text-muted-foreground">
              {branding?.welcome_message || "Firma yönetim paneline hoş geldiniz"}
            </p>
          </div>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="stat-card">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Completion Rate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Eğitim Tamamlama Oranı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Progress value={completionRate} className="flex-1 h-3" />
                  <span className="text-2xl font-bold text-foreground min-w-[60px] text-right">
                    %{completionRate}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {completedEnrollments} / {enrollments?.length || 0} eğitim tamamlandı
                </p>
              </CardContent>
            </Card>

            {/* Employees Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Çalışanlar ({totalEmployees})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employees && employees.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Ad Soyad</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">TC Kimlik</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Eğitimler</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => {
                          const empEnrollments = enrollments?.filter((e) => e.user_id === emp.user_id) || [];
                          const completed = empEnrollments.filter((e) => e.status === "completed").length;
                          const active = empEnrollments.filter((e) => e.status === "active").length;
                          const pending = empEnrollments.filter((e) => e.status === "pending").length;

                          return (
                            <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-3 px-2">
                                <div>
                                  <p className="font-medium text-foreground">
                                    {emp.first_name} {emp.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{emp.phone || "-"}</p>
                                </div>
                              </td>
                              <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">
                                {emp.tc_identity ? `${emp.tc_identity.slice(0, 3)}***${emp.tc_identity.slice(-2)}` : "-"}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex gap-1 flex-wrap">
                                  {completed > 0 && (
                                    <Badge variant="success" className="text-xs">{completed} tamamlandı</Badge>
                                  )}
                                  {active > 0 && (
                                    <Badge variant="info" className="text-xs">{active} devam</Badge>
                                  )}
                                  {pending > 0 && (
                                    <Badge variant="warning" className="text-xs">{pending} bekliyor</Badge>
                                  )}
                                  {empEnrollments.length === 0 && (
                                    <span className="text-xs text-muted-foreground">Eğitim yok</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                {empEnrollments.length > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <Progress
                                      value={empEnrollments.length > 0 ? (completed / empEnrollments.length) * 100 : 0}
                                      className="w-16 h-2"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      %{empEnrollments.length > 0 ? Math.round((completed / empEnrollments.length) * 100) : 0}
                                    </span>
                                  </div>
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>Firmaya bağlı çalışan bulunamadı</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}