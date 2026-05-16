import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Trash2, Info } from "lucide-react";

export default function GroupTopic4Rules() {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [packId, setPackId] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: groups = [] } = useQuery({
    queryKey: ["groups-with-firm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, group_key, firm_id, firms(name)")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: packs = [] } = useQuery({
    queryKey: ["topic4-packs-for-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topic4_sector_packs")
        .select("id, name, hazard_class, sectors(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["group-topic4-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_topic4_assignments" as any)
        .select("*, groups(name, group_key, firms(name)), topic4_sector_packs(name, hazard_class, sectors(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!groupId || !packId) throw new Error("Grup ve paket seçin");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("group_topic4_assignments" as any).insert({
        group_id: groupId,
        topic4_pack_id: packId,
        notes: notes || null,
        assigned_by: u.user?.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Kural eklendi" });
      qc.invalidateQueries({ queryKey: ["group-topic4-rules"] });
      setOpen(false);
      setGroupId(""); setPackId(""); setNotes("");
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("group_topic4_assignments" as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-topic4-rules"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_topic4_assignments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Kural silindi" });
      qc.invalidateQueries({ queryKey: ["group-topic4-rules"] });
    },
  });

  return (
    <>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Grup → İşyeri Konusu Kuralları</h1>
            <p className="text-sm text-muted-foreground">Grup anahtarına göre otomatik atanacak işe ve işyerine özgü konu paketlerini yönetin.</p>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Yeni Kural</Button>
        </div>

        <Card className="bg-muted/40">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <Info className="h-4 w-4 mt-0.5 text-primary" />
            <div>
              Çözümleme önceliği: <b>Grup kuralı</b> → Firma ataması → Dersin varsayılan paketi.
              Kullanıcı bir grup anahtarı kullandığında veya bir gruba dahil olduğunda, o grubun aktif kuralı topic 4 derslerinde kullanılır.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Aktif Kurallar</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grup</TableHead>
                  <TableHead>Anahtar</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Tehlike</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7}>Yükleniyor...</TableCell></TableRow>}
                {!isLoading && rules.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Kural yok</TableCell></TableRow>
                )}
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.groups?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.groups?.group_key}</TableCell>
                    <TableCell>{r.groups?.firms?.name || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{r.topic4_sector_packs?.name} <span className="text-xs text-muted-foreground">({r.topic4_sector_packs?.sectors?.name})</span></TableCell>
                    <TableCell><Badge variant="outline">{r.topic4_sector_packs?.hazard_class}</Badge></TableCell>
                    <TableCell>
                      <Switch checked={r.is_active} onCheckedChange={(v) => toggleMut.mutate({ id: r.id, is_active: v })} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Grup Kuralı</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Grup</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger><SelectValue placeholder="Grup seçin" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} {g.firms?.name ? `· ${g.firms.name}` : ""} ({g.group_key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Topic 4 Paketi</Label>
                <Select value={packId} onValueChange={setPackId}>
                  <SelectTrigger><SelectValue placeholder="Paket seçin" /></SelectTrigger>
                  <SelectContent>
                    {packs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.sectors?.name} · {p.hazard_class}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Not (opsiyonel)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
