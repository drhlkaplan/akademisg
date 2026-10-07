import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { downloadCertificatePdf } from "@/lib/certificatePdf";
import { toast } from "@/hooks/use-toast";

export function CertificatePdfButton({ certificateId, label, variant = "outline", size = "sm" }: {
  certificateId: string; label?: string; variant?: any; size?: any;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      disabled={busy}
      title="Sertifika PDF indir"
      onClick={async () => {
        setBusy(true);
        try { await downloadCertificatePdf(certificateId); }
        catch (e: any) { toast({ title: "PDF oluşturulamadı", description: e.message, variant: "destructive" }); }
        finally { setBusy(false); }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {label && <span className="ml-1">{label}</span>}
    </Button>
  );
}
