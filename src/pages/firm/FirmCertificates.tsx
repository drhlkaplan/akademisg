import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Award, Search, Loader2, Download, ExternalLink } from "lucide-react";
import { formatDateTR } from "@/lib/reportExport";

export default function FirmCertificates() {
  const { branding } = useFirmBranding();
  const { profile } = useAuth();
  const firmId = profile?.firm_id;
  const [search, setSearch] = useState("");

  const { data: employees } = useQuery({
    queryKey: ["firm-cert-employees", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  const { data: certificates, isLoading } = useQuery({
    queryKey: ["firm-certificates-list", firmId, employees],
    queryFn: async () => {
      if (!firmId || !employees) return [];
      const userIds = employees.map((e) => e.user_id);
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .in("user_id", userIds)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!firmId && !!employees && employees.length > 0,
  });

  const filtered = certificates?.filter((cert) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return cert.holder_name.toLowerCase().includes(s) ||
      cert.course_title.toLowerCase().includes(s) ||
      cert.certificate_number.toLowerCase().includes(s);
  });

  const validCount = certificates?.filter((c) => c.is_valid).length || 0;
  const expiredCount = certificates?.filter((c) => !c.is_valid).length || 0;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sertifikalar</h1>
          <p className="text-muted-foreground">
            {branding?.name || "Firma"} çalışan sertifikaları
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{certificates?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Toplam Sertifika</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-success">{validCount}</p>
              <p className="text-xs text-muted-foreground">Geçerli</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
              <p className="text-xs text-muted-foreground">Süresi Dolmuş</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5" style={{ color: branding?.primary_color }} />
                Sertifika Listesi
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
                    <TableHead>Sertifika No</TableHead>
                    <TableHead>Kişi</TableHead>
                    <TableHead>Eğitim</TableHead>
                    <TableHead className="hidden md:table-cell">Verilme Tarihi</TableHead>
                    <TableHead className="hidden md:table-cell">Geçerlilik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-mono text-xs">{cert.certificate_number}</TableCell>
                      <TableCell className="font-medium">{cert.holder_name}</TableCell>
                      <TableCell>{cert.course_title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {formatDateTR(cert.issue_date)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {cert.expiry_date ? formatDateTR(cert.expiry_date) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cert.is_valid ? "success" : "destructive"} className="text-xs">
                          {cert.is_valid ? "Geçerli" : "Süresi Dolmuş"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cert.pdf_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Sertifika bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
