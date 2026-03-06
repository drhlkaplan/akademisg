import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, BookOpen, FileQuestion, Award, KeyRound, Mail } from "lucide-react";

const faqItems = [
  {
    q: "Eğitimlerime nasıl başlarım?",
    a: "Gösterge panelindeki 'Eğitimlerim' bölümünden aktif eğitimlerinize erişebilir, 'Devam Et' butonuna tıklayarak kaldığınız yerden devam edebilirsiniz.",
  },
  {
    q: "Grup anahtarı nedir ve nasıl kullanırım?",
    a: "Grup anahtarı, yöneticiniz tarafından size verilen özel bir koddur. Gösterge panelindeki 'Grup Anahtarı ile Eğitime Katıl' alanına bu kodu girerek, gruba atanmış tüm eğitimlere otomatik olarak kaydolursunuz.",
  },
  {
    q: "Sınavlarda kaç deneme hakkım var?",
    a: "Her sınavın belirli bir deneme hakkı vardır (genellikle 3). Deneme haklarınızı 'Sınavlarım' sayfasından takip edebilirsiniz.",
  },
  {
    q: "Sertifikamı nasıl alırım?",
    a: "Bir eğitimdeki tüm dersleri ve sınavları başarıyla tamamladığınızda sertifikanız otomatik olarak oluşturulur ve 'Sertifikalarım' sayfasında görüntülenir.",
  },
  {
    q: "Sertifikamın geçerlilik süresi ne kadardır?",
    a: "İSG sertifikalarının geçerlilik süresi tehlike sınıfına göre değişir. Az tehlikeli işyerleri için 8 yıl, tehlikeli işyerleri için 6 yıl, çok tehlikeli işyerleri için 4 yıldır.",
  },
  {
    q: "Eğitim içeriği yüklenmiyor, ne yapmalıyım?",
    a: "Tarayıcınızın güncel olduğundan emin olun. Sayfayı yenileyin veya farklı bir tarayıcı deneyin. Sorun devam ederse yöneticinizle iletişime geçin.",
  },
];

const helpSections = [
  { icon: BookOpen, title: "Eğitimler", desc: "Eğitimleri izleyin ve ilerlemenizi takip edin" },
  { icon: FileQuestion, title: "Sınavlar", desc: "Sınavlara girin ve sonuçlarınızı görün" },
  { icon: Award, title: "Sertifikalar", desc: "Sertifikalarınızı indirin ve doğrulayın" },
  { icon: KeyRound, title: "Grup Anahtarı", desc: "Anahtarla eğitimlere hızlıca kaydolun" },
];

export default function Help() {
  return (
    <DashboardLayout userRole="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yardım</h1>
          <p className="text-muted-foreground">Sıkça sorulan sorular ve rehber</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {helpSections.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-accent" />
              Sıkça Sorulan Sorular
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Başka bir sorunuz mu var?</h3>
            <p className="text-sm text-muted-foreground">
              Yöneticinizle veya İSG uzmanınızla iletişime geçin.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
