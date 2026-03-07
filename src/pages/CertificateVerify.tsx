import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Search, CheckCircle, XCircle, QrCode, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DangerClass = Database["public"]["Enums"]["danger_class"];

interface CertificateData {
  holder_name_short: string;
  holder_tc_masked: string | null;
  course_title: string;
  danger_class: DangerClass | null;
  duration_hours: number | null;
  issue_date: string | null;
  certificate_number: string;
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

export default function CertificateVerify() {
  const [certificateCode, setCertificateCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    data?: CertificateData;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!certificateCode.trim()) return;
    
    setIsLoading(true);
    setSearchResult(null);

    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("holder_name, holder_tc, course_title, danger_class, duration_hours, issue_date, certificate_number")
        .eq("certificate_number", certificateCode.trim().toUpperCase())
        .eq("is_valid", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSearchResult({
          found: true,
          data: {
            ...data,
            holder_tc: data.holder_tc ? maskTcNo(data.holder_tc) : null,
          },
        });
      } else {
        setSearchResult({ found: false });
      }
    } catch (error) {
      console.error("Error verifying certificate:", error);
      setSearchResult({ found: false });
    } finally {
      setIsLoading(false);
    }
  };

  const maskTcNo = (tc: string) => {
    if (tc.length < 6) return tc;
    return tc.substring(0, 3) + "*****" + tc.substring(tc.length - 2);
  };

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-primary py-16">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-6">
              <QrCode className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Sertifika Doğrulama
            </h1>
            <p className="text-primary-foreground/70">
              Sertifika numarası veya QR kod ile sertifikanın geçerliliğini
              doğrulayın.
            </p>
          </div>
        </div>
      </section>

      {/* Search Form */}
      <section className="py-12">
        <div className="container max-w-xl">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Sertifika numarasını giriniz (örn: ISG-2024-00125)"
                    value={certificateCode}
                    onChange={(e) => setCertificateCode(e.target.value)}
                    className="pl-12 h-12 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Doğrulanıyor...
                    </div>
                  ) : (
                    "Doğrula"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Result */}
      {searchResult && (
        <section className="pb-20">
          <div className="container max-w-xl">
            {searchResult.found && searchResult.data ? (
              <Card className="border-success/50 shadow-lg animate-scale-in">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Sertifika Geçerli
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Bu sertifika sistemimizde kayıtlıdır.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ad Soyad</span>
                      <span className="font-medium text-foreground">
                        {searchResult.data.holder_name}
                      </span>
                    </div>
                    {searchResult.data.holder_tc && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TC Kimlik No</span>
                        <span className="font-medium text-foreground">
                          {searchResult.data.holder_tc}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eğitim</span>
                      <span className="font-medium text-foreground text-right max-w-[200px]">
                        {searchResult.data.course_title}
                      </span>
                    </div>
                    {searchResult.data.danger_class && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          Tehlike Sınıfı
                        </span>
                        <Badge variant={dangerClassBadge[searchResult.data.danger_class]}>
                          {dangerClassLabel[searchResult.data.danger_class]}
                        </Badge>
                      </div>
                    )}
                    {searchResult.data.duration_hours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Eğitim Süresi</span>
                        <span className="font-medium text-foreground">
                          {searchResult.data.duration_hours} Saat
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Düzenlenme Tarihi
                      </span>
                      <span className="font-medium text-foreground">
                        {searchResult.data.issue_date
                          ? new Date(searchResult.data.issue_date).toLocaleDateString("tr-TR")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Sertifika Numarası
                      </span>
                      <span className="font-mono text-accent font-semibold">
                        {searchResult.data.certificate_number}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/50 shadow-lg animate-scale-in">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Sertifika Bulunamadı
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Girilen numara ile eşleşen bir sertifika bulunamadı.
                        Lütfen numarayı kontrol edin.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}
    </MainLayout>
  );
}
