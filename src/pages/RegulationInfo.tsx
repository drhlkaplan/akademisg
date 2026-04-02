import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, BookOpen, Clock, AlertTriangle, Users, FileText,
  CheckCircle, Monitor, Video, MapPin,
} from "lucide-react";

const trainingMatrix = [
  { type: "Temel Eğitim", az: "8 saat", teh: "12 saat", cok: "16 saat" },
  { type: "Tekrar Eğitim", az: "8 saat", teh: "8 saat", cok: "8 saat" },
  { type: "İşe Başlama", az: "2 saat", teh: "2 saat", cok: "2 saat" },
  { type: "Konu 4 Min.", az: "2 saat", teh: "3 saat", cok: "4 saat" },
  { type: "Tekrar Periyodu", az: "3 yıl", teh: "2 yıl", cok: "1 yıl" },
];

const methodMatrix = [
  { topic: "1. Genel Konular", az: "Online ✓", teh: "Online ✓", cok: "Online ✓" },
  { topic: "2. Sağlık Konuları", az: "Online ✓", teh: "Online ✓", cok: "Online ✓" },
  { topic: "3. Teknik Konular", az: "Online ✓", teh: "Online ✓", cok: "Online ✓" },
  { topic: "4. İşyerine Özgü Riskler", az: "Online ✓", teh: "Yüz Yüze ⚠️", cok: "Yüz Yüze ⚠️" },
];

export default function RegulationInfo() {
  const { data: faqs = [] } = useQuery({
    queryKey: ["public-faqs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("faq_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Yeni Yönetmelik</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            İSG Eğitim Yönetmeliği Bilgilendirme
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Yeni İş Sağlığı ve Güvenliği Eğitim Yönetmeliği kapsamında eğitim türleri, süreler, yöntemler ve belgeler hakkında bilgi edinin.
          </p>
        </div>

        {/* Training Types */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Eğitim Türleri
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Users, title: "İşe Başlama Eğitimi", desc: "Çalışanın işe başlamadan önce aldığı 2 saatlik yüz yüze ve pratik eğitim." },
              { icon: BookOpen, title: "Temel Eğitim", desc: "Tehlike sınıfına göre 8-16 saat süren kapsamlı İSG eğitimi. 4 konu grubundan oluşur." },
              { icon: Clock, title: "Tekrar Temel Eğitim", desc: "Periyodik olarak yenilenen 8 saatlik eğitim. Tehlike sınıfına göre 1-3 yılda bir tekrarlanır." },
              { icon: AlertTriangle, title: "Bilgi Yenileme Eğitimi", desc: "İşyeri değişikliği veya 6 aydan uzun devamsızlık sonrası Konu 4 odaklı eğitim." },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex gap-3">
                    <item.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Duration Matrix */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Süre ve Periyot Matrisi
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Eğitim Türü</th>
                    <th className="p-3 font-semibold text-center">
                      <Badge variant="secondary">Az Tehlikeli</Badge>
                    </th>
                    <th className="p-3 font-semibold text-center">
                      <Badge>Tehlikeli</Badge>
                    </th>
                    <th className="p-3 font-semibold text-center">
                      <Badge variant="destructive">Çok Tehlikeli</Badge>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trainingMatrix.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.type}</td>
                      <td className="p-3 text-center">{row.az}</td>
                      <td className="p-3 text-center">{row.teh}</td>
                      <td className="p-3 text-center">{row.cok}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* Method Matrix */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Monitor className="h-6 w-6 text-primary" />
            Ders Yöntemi Matrisi
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Konu Grubu</th>
                    <th className="p-3 font-semibold text-center">Az Tehlikeli</th>
                    <th className="p-3 font-semibold text-center">Tehlikeli</th>
                    <th className="p-3 font-semibold text-center">Çok Tehlikeli</th>
                  </tr>
                </thead>
                <tbody>
                  {methodMatrix.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.topic}</td>
                      <td className="p-3 text-center">{row.az}</td>
                      <td className="p-3 text-center">{row.teh}</td>
                      <td className="p-3 text-center">{row.cok}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Tehlikeli ve çok tehlikeli işyerlerinde 4. Konu Başlığı (İşe ve İşyerine Özgü Riskler) yüz yüze verilmek zorundadır.
          </p>
        </section>

        {/* Delivery Methods */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Entegre Ders Yöntemleri
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <Monitor className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">Online (SCORM)</h3>
                <p className="text-sm text-muted-foreground mt-1">Kendi hızınızda, ölçülebilir ve raporlanabilir uzaktan eğitim</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <Video className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">Canlı Ders (BBB)</h3>
                <p className="text-sm text-muted-foreground mt-1">Eğitmenli canlı oturumlar, katılım takibi ve etkileşim</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold">Yüz Yüze</h3>
                <p className="text-sm text-muted-foreground mt-1">Sınıf ortamında yoklamalı, eğitmen onaylı eğitim</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Sık Sorulan Sorular
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq: any, i: number) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
