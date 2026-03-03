import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import {
  Award,
  Download,
  ExternalLink,
  Loader2,
  Calendar,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DangerClass = Database["public"]["Enums"]["danger_class"];

interface CertificateRow {
  id: string;
  certificate_number: string;
  course_title: string;
  danger_class: DangerClass | null;
  duration_hours: number | null;
  issue_date: string | null;
  expiry_date: string | null;
  is_valid: boolean | null;
  holder_name: string;
  qr_code: string | null;
}

const dangerClassBadge: Record<DangerClass, "dangerLow" | "dangerMedium" | "dangerHigh"> = {
  low: "dangerLow",
  medium: "dangerMedium",
  high: "dangerHigh",
};

const dangerClassLabel: Record<DangerClass, string> = {
  low: "Az Tehlikeli",
  medium: "Tehlikeli",
  high: "Çok Tehlikeli",
};

export default function MyCertificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchCertificates();
  }, [user]);

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select(
          "id, certificate_number, course_title, danger_class, duration_hours, issue_date, expiry_date, is_valid, holder_name, qr_code"
        )
        .eq("user_id", user!.id)
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (err) {
      console.error("Error fetching certificates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="student">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sertifikalarım</h1>
          <p className="text-muted-foreground">
            Tamamladığınız eğitimlerin sertifikaları burada listelenir.
          </p>
        </div>

        {certificates.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Henüz sertifikanız bulunmuyor
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Eğitimlerinizi tamamladığınızda sertifikalarınız otomatik olarak
                oluşturulacaktır.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {certificates.map((cert) => {
              const expired = isExpired(cert.expiry_date);
              return (
                <Card
                  key={cert.id}
                  className={expired ? "border-destructive/30 opacity-75" : "border-accent/30"}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Award className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-mono text-sm text-accent font-semibold">
                            {cert.certificate_number}
                          </p>
                          {cert.danger_class && (
                            <Badge
                              variant={dangerClassBadge[cert.danger_class]}
                              className="mt-1"
                            >
                              {dangerClassLabel[cert.danger_class]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {expired ? (
                        <Badge variant="destructive">Süresi Dolmuş</Badge>
                      ) : cert.is_valid ? (
                        <Badge variant="success">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Geçerli
                        </Badge>
                      ) : (
                        <Badge variant="destructive">İptal Edilmiş</Badge>
                      )}
                    </div>

                    <h3 className="font-semibold text-foreground mb-3">
                      {cert.course_title}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {cert.issue_date
                            ? new Date(cert.issue_date).toLocaleDateString("tr-TR")
                            : "-"}
                        </span>
                      </div>
                      {cert.duration_hours && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{cert.duration_hours} Saat</span>
                        </div>
                      )}
                      {cert.expiry_date && (
                        <div className="flex items-center gap-1 col-span-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Son Geçerlilik:{" "}
                            {new Date(cert.expiry_date).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="accent"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          window.open(`/verify?code=${cert.certificate_number}`, "_blank")
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Doğrula
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
