import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Search, CheckCircle, XCircle, Shield, QrCode } from "lucide-react";

export default function CertificateVerify() {
  const [certificateCode, setCertificateCode] = useState("");
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    data?: {
      name: string;
      tcNo: string;
      course: string;
      category: string;
      duration: string;
      date: string;
      code: string;
    };
  } | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Simüle edilmiş doğrulama
    if (certificateCode.toUpperCase() === "ISG-2024-00125") {
      setSearchResult({
        found: true,
        data: {
          name: "Ahmet Kaya",
          tcNo: "123*****89",
          course: "Temel İş Sağlığı ve Güvenliği Eğitimi",
          category: "Az Tehlikeli",
          duration: "8 Saat",
          date: "15 Ocak 2024",
          code: "ISG-2024-00125",
        },
      });
    } else {
      setSearchResult({ found: false });
    }
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
                <Button type="submit" variant="accent" size="lg" className="w-full">
                  Doğrula
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
                        {searchResult.data.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TC Kimlik No</span>
                      <span className="font-medium text-foreground">
                        {searchResult.data.tcNo}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eğitim</span>
                      <span className="font-medium text-foreground text-right max-w-[200px]">
                        {searchResult.data.course}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Tehlike Sınıfı
                      </span>
                      <Badge variant="dangerLow">
                        {searchResult.data.category}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eğitim Süresi</span>
                      <span className="font-medium text-foreground">
                        {searchResult.data.duration}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Düzenlenme Tarihi
                      </span>
                      <span className="font-medium text-foreground">
                        {searchResult.data.date}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Sertifika Numarası
                      </span>
                      <span className="font-mono text-accent font-semibold">
                        {searchResult.data.code}
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
