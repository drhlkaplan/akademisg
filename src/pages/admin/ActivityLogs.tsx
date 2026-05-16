import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, Search, RefreshCw, ChevronLeft, ChevronRight,
  User, BookOpen, Building2, Award, FileCheck, Shield, Clock,
} from "lucide-react";

const PAGE_SIZE = 25;

const actionColors: Record<string, string> = {
  login: "bg-info/10 text-info",
  logout: "bg-muted text-muted-foreground",
  create: "bg-success/10 text-success",
  update: "bg-warning/10 text-warning",
  delete: "bg-destructive/10 text-destructive",
};

const entityIcons: Record<string, typeof Activity> = {
  user: User,
  course: BookOpen,
  firm: Building2,
  certificate: Award,
  exam: FileCheck,
  enrollment: Shield,
};

export default function ActivityLogs() {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["activity-logs", page, entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }
      if (actionFilter !== "all") {
        query = query.ilike("action", `%${actionFilter}%`);
      }

      const { data: logs, error, count } = await query;
      if (error) throw error;

      // Fetch profiles for user_ids
      const userIds = [...new Set(logs?.map((l) => l.user_id).filter(Boolean) as string[])];
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", userIds);
        profiles?.forEach((p) => {
          profileMap.set(p.user_id, `${p.first_name} ${p.last_name}`);
        });
      }

      return {
        logs: logs?.map((l) => ({ ...l, userName: l.user_id ? profileMap.get(l.user_id) || "—" : "Sistem" })) || [],
        total: count || 0,
      };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const filteredLogs = data?.logs.filter((l) =>
    searchTerm === "" ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.entity_type || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aktivite Logları</h1>
            <p className="text-sm text-muted-foreground">Sistemdeki tüm işlemlerin kayıtları</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Yenile
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Arama..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Varlık Türü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="course">Eğitim</SelectItem>
                  <SelectItem value="firm">Firma</SelectItem>
                  <SelectItem value="exam">Sınav</SelectItem>
                  <SelectItem value="certificate">Sertifika</SelectItem>
                  <SelectItem value="enrollment">Kayıt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="İşlem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="create">Oluşturma</SelectItem>
                  <SelectItem value="update">Güncelleme</SelectItem>
                  <SelectItem value="delete">Silme</SelectItem>
                  <SelectItem value="login">Giriş</SelectItem>
                  <SelectItem value="logout">Çıkış</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Tarih</TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>İşlem</TableHead>
                    <TableHead className="hidden md:table-cell">Varlık</TableHead>
                    <TableHead className="hidden lg:table-cell">Detay</TableHead>
                    <TableHead className="hidden lg:table-cell">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        Log kaydı bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => {
                      const IconComp = entityIcons[log.entity_type || ""] || Activity;
                      const colorClass = Object.entries(actionColors).find(([k]) => log.action.toLowerCase().includes(k))?.[1] || "bg-muted text-muted-foreground";
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(log.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{log.userName}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colorClass}`}>
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {log.entity_type && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <IconComp className="h-3.5 w-3.5" />
                                {log.entity_type}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[200px]">
                            <span className="text-xs text-muted-foreground truncate block">
                              {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {log.ip_address || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Toplam {data?.total} kayıt, Sayfa {page + 1}/{totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
