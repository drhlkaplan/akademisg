import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useCertificateGeneration() {
  const generateCertificate = useCallback(async (enrollmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { enrollment_id: enrollmentId },
      });

      if (error) {
        console.error("Certificate generation error:", error);
        toast({
          title: "Sertifika Hatası",
          description: "Sertifika oluşturulurken bir hata oluştu.",
          variant: "destructive",
        });
        return null;
      }

      if (data?.certificate) {
        toast({
          title: "🎉 Sertifika Oluşturuldu!",
          description: `Sertifika numaranız: ${data.certificate.certificate_number}`,
        });
        return data.certificate;
      }

      return data;
    } catch (err) {
      console.error("Certificate generation failed:", err);
      return null;
    }
  }, []);

  return { generateCertificate };
}
