import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NOTIFICATION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "E-posta gönderildi", variant: "secondary" },
  failed: { label: "E-posta gönderilemedi", variant: "destructive" },
  suppressed: { label: "Adres engelli", variant: "destructive" },
  no_recipient: { label: "Alıcı adresi yok", variant: "destructive" },
  disabled: { label: "Bildirim kapalı", variant: "outline" },
};

export default function LeadSubmissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["lead_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const markDone = async (id: string, status: string) => {
    const { error } = await supabase.from("lead_submissions").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Güncellenemedi", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["lead_submissions"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gelen Talepler</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Yenile
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>İletişim ve kurumsal teklif formları</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : data.length === 0 ? (
            <p className="text-muted-foreground">Henüz talep yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Kişi / Firma</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Mesaj</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(l.created_at), "d MMM yyyy HH:mm", { locale: tr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.source === "corporate" ? "default" : "secondary"}>
                        {l.source === "corporate" ? "Kurumsal teklif" : "İletişim"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{l.name}</div>
                      {l.company_name && <div className="text-sm text-muted-foreground">{l.company_name}</div>}
                      {l.employee_count && <div className="text-xs text-muted-foreground">{l.employee_count} çalışan</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      <a href={`mailto:${l.email}`} className="text-primary underline">{l.email}</a>
                      {l.phone && <div>{l.phone}</div>}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm whitespace-pre-wrap">
                      {l.subject && <div className="text-xs text-muted-foreground">{l.subject}</div>}
                      {l.message}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={l.status === "new" ? "default" : "outline"}
                        onClick={() => markDone(l.id, l.status === "new" ? "contacted" : "new")}
                      >
                        {l.status === "new" ? "Yeni → Dönüldü" : "Dönüldü"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
