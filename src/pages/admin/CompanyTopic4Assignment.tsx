import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Package, Link2, AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const hazardLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  az_tehlikeli: { label: "Az Tehlikeli", variant: "secondary" },
  tehlikeli: { label: "Tehlikeli", variant: "default" },
  cok_tehlikeli: { label: "Çok Tehlikeli", variant: "destructive" },
};

export default function CompanyTopic4Assignment() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFirmId, setSelectedFirmId] = useState("");
  const [selectedPackId, setSelectedPackId] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [filterFirm, setFilterFirm] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: firms = [] } = useQuery({
    queryKey: ["firms-for-topic4"],
    queryFn: async () => {
      const { data, error } = await supabase.from("firms").select("id, name, sector_id, hazard_class_new").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: packs = [] } = useQuery({
    queryKey: ["topic4-packs-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topic4_sector_packs").select("*, sectors(name)").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["company-topic4-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_topic4_assignments")
        .select("*, firms(name, hazard_class_new, sector_id), topic4_sector_packs(name, hazard_class, sectors(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createAssignment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("company_topic4_assignments").insert({
        firm_id: selectedFirmId,
        topic4_pack_id: selectedPackId,
        custom_risk_data: customNotes ? { notes: customNotes } : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-topic4-assignments"] });
      setDialogOpen(false);
      setSelectedFirmId("");
      setSelectedPackId("");
      setCustomNotes("");
      toast({ title: "İşyeri konusu paketi firmaya atandı" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("company_topic4_assignments").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-topic4-assignments"] }),
  });

  // Auto-suggest pack when firm is selected
  const handleFirmChange = (firmId: string) => {
    setSelectedFirmId(firmId);
    const firm = firms.find((f: any) => f.id === firmId);
    if (firm) {
      // Find matching pack by sector_id and hazard_class
      const match = packs.find((p: any) =>
        p.sector_id === firm.sector_id && p.hazard_class === firm.hazard_class_new
      );
      if (match) setSelectedPackId(match.id);
    }
  };

  const filtered = assignments.filter((a: any) =>
    !filterFirm || a.firms?.name?.toLowerCase().includes(filterFirm.toLowerCase())
  );

  // Check for firms without assignments
  const assignedFirmIds = new Set(assignments.filter((a: any) => a.is_active).map((a: any) => a.firm_id));
  const unassignedFirms = firms.filter((f: any) => !assignedFirmIds.has(f.id));

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Firma İşyeri Konusu Atama</h1>
            <p className="text-muted-foreground">Firmalara sektöre özel İşe ve İşyerine Özgü Riskler eğitim paketlerini atayın</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Yeni Atama
          </Button>
        </div>

        {unassignedFirms.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{unassignedFirms.length} firma İşyeri Konusu paketi atanmamış</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {unassignedFirms.slice(0, 5).map((f: any) => f.name).join(", ")}
                    {unassignedFirms.length > 5 && ` ve ${unassignedFirms.length - 5} firma daha...`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Firma ara..." value={filterFirm} onChange={e => setFilterFirm(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>İşyeri Konusu Paketi</TableHead>
                  <TableHead>Sektör</TableHead>
                  <TableHead>Tehlike Sınıfı</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Atama bulunamadı</TableCell></TableRow>
                ) : filtered.map((a: any) => {
                  const hc = hazardLabels[a.topic4_sector_packs?.hazard_class] || hazardLabels.az_tehlikeli;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{a.firms?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span>{a.topic4_sector_packs?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.topic4_sector_packs?.sectors?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={hc.variant}>{hc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={a.is_active} onCheckedChange={v => toggleActive.mutate({ id: a.id, is_active: v })} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Firma Konu 4 Paketi Ata</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Firma</Label>
                <Select value={selectedFirmId} onValueChange={handleFirmChange}>
                  <SelectTrigger><SelectValue placeholder="Firma seçin..." /></SelectTrigger>
                  <SelectContent>
                    {firms.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} — {hazardLabels[f.hazard_class_new]?.label || "Az Tehlikeli"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Konu 4 Paketi</Label>
                <Select value={selectedPackId} onValueChange={setSelectedPackId}>
                  <SelectTrigger><SelectValue placeholder="Paket seçin..." /></SelectTrigger>
                  <SelectContent>
                    {packs.map((p: any) => {
                      const hc = hazardLabels[p.hazard_class] || hazardLabels.az_tehlikeli;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({hc.label})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedPackId && selectedFirmId && (() => {
                  const firm = firms.find((f: any) => f.id === selectedFirmId);
                  const pack = packs.find((p: any) => p.id === selectedPackId);
                  if (firm && pack && firm.hazard_class_new !== pack.hazard_class) {
                    return (
                      <p className="text-xs text-warning mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Firma tehlike sınıfı ({hazardLabels[firm.hazard_class_new]?.label}) ile paket uyuşmuyor
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div>
                <Label>Ek Notlar (Opsiyonel)</Label>
                <Textarea value={customNotes} onChange={e => setCustomNotes(e.target.value)} placeholder="Firma özel risk bilgileri..." />
              </div>
              <Button
                className="w-full"
                disabled={!selectedFirmId || !selectedPackId || createAssignment.isPending}
                onClick={() => createAssignment.mutate()}
              >
                {createAssignment.isPending ? "Atanıyor..." : "Atamayı Kaydet"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
