import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Search, Loader2, UserCircle } from "lucide-react";

export default function FirmEmployees() {
  const { branding } = useFirmBranding();
  const { profile } = useAuth();
  const firmId = profile?.firm_id;
  const [search, setSearch] = useState("");

  const { data: employees, isLoading } = useQuery({
    queryKey: ["firm-employees", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .eq("firm_id", firmId)
        .order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  const { data: enrollments } = useQuery({
    queryKey: ["firm-enrollments", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title)")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  const filtered = employees?.filter((e) => {
    const name = `${e.first_name} ${e.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase()) || e.tc_identity?.includes(search);
  });

  return (
    <DashboardLayout userRole="company">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Çalışanlar</h1>
            <p className="text-muted-foreground">
              {branding?.name || "Firma"} çalışan listesi
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" style={{ color: branding?.primary_color }} />
                Çalışanlar ({filtered?.length || 0})
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered && filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead className="hidden md:table-cell">TC Kimlik</TableHead>
                    <TableHead className="hidden md:table-cell">Telefon</TableHead>
                    <TableHead>Eğitim Durumu</TableHead>
                    <TableHead>İlerleme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => {
                    const empEnrollments = enrollments?.filter((e) => e.user_id === emp.user_id) || [];
                    const completed = empEnrollments.filter((e) => e.status === "completed").length;
                    const total = empEnrollments.length;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(emp as any).user_roles?.map((r: any) => r.role).join(", ") || "student"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {emp.tc_identity ? `${emp.tc_identity.slice(0, 3)}***${emp.tc_identity.slice(-2)}` : "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {emp.phone || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {completed > 0 && <Badge variant="success" className="text-xs">{completed} tamamlandı</Badge>}
                            {total - completed > 0 && <Badge variant="info" className="text-xs">{total - completed} devam</Badge>}
                            {total === 0 && <span className="text-xs text-muted-foreground">Eğitim yok</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={pct} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">%{pct}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Çalışan bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
