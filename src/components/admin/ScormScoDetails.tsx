import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Layers, ExternalLink } from "lucide-react";

interface ScormScoDetailsProps {
  packageId: string;
  packageUrl: string;
}

export function ScormScoDetails({ packageId, packageUrl }: ScormScoDetailsProps) {
  const [open, setOpen] = useState(false);

  const { data: scos, isLoading } = useQuery({
    queryKey: ["scorm-scos", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scorm_scos")
        .select("*")
        .eq("package_id", packageId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Layers className="h-3.5 w-3.5" />
          SCO Detayları
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-2 pl-6">Yükleniyor...</p>
        ) : scos && scos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-xs">Sıra</TableHead>
                <TableHead className="text-xs">Başlık</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Identifier</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Launch Path</TableHead>
                <TableHead className="text-xs">Tip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scos.map((sco) => (
                <TableRow key={sco.id}>
                  <TableCell className="text-xs font-mono">{sco.order_index}</TableCell>
                  <TableCell className="text-xs font-medium">{sco.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell font-mono">
                    {sco.identifier.length > 30 ? sco.identifier.slice(0, 30) + "…" : sco.identifier}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell font-mono">
                    {sco.launch_path.length > 40 ? "…" + sco.launch_path.slice(-40) : sco.launch_path}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sco.scorm_type === "sco" ? "default" : "secondary"} className="text-[10px]">
                      {sco.scorm_type?.toUpperCase() || "SCO"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-xs text-muted-foreground py-2 pl-6">
            Bu pakette kayıtlı SCO bulunamadı.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
