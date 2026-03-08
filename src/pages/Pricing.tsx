import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Building2, User, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const individualPlans = [
  {
    name: "Tekil Eğitim",
    price: "Eğitime Göre",
    description: "İhtiyacınız olan eğitimi seçin, hemen başlayın.",
    features: [
      "Tek eğitim erişimi",
      "Online sınav hakkı",
      "QR kodlu sertifika",
      "Mobil erişim",
      "1 yıl erişim süresi",
    ],
    popular: false,
    cta: "Eğitimleri İncele",
    href: "/courses",
  },
  {
    name: "Tam Paket",
    price: "İletişime Geçin",
    description: "Tüm eğitimlere sınırsız erişim ile eksiksiz hazırlık.",
    features: [
      "Tüm eğitimlere erişim",
      "Sınırsız sınav hakkı",
      "Tüm sertifikalar dahil",
      "Öncelikli destek",
      "2 yıl erişim süresi",
    ],
    popular: true,
    cta: "Teklif Alın",
    href: "/contact",
  },
];

const corporatePlans = [
  {
    name: "Başlangıç",
    range: "1-25 Çalışan",
    description: "Küçük işletmeler için uygun fiyatlı İSG eğitim paketi.",
    features: [
      "25 çalışana kadar",
      "Temel İSG eğitimleri",
      "Firma yönetici paneli",
      "İlerleme raporları",
      "E-posta desteği",
    ],
  },
  {
    name: "Profesyonel",
    range: "26-100 Çalışan",
    description: "Orta ölçekli şirketler için kapsamlı eğitim çözümü.",
    features: [
      "100 çalışana kadar",
      "Tüm eğitimlere erişim",
      "CSV toplu yükleme",
      "Detaylı raporlama",
      "Öncelikli destek",
      "Özel firma markalaması",
    ],
    popular: true,
  },
  {
    name: "Kurumsal",
    range: "100+ Çalışan",
    description: "Büyük kuruluşlar için tam özelleştirilebilir çözüm.",
    features: [
      "Sınırsız çalışan",
      "Özel eğitim içerikleri",
      "API entegrasyonu",
      "Departman bazlı yönetim",
      "Özel hesap yöneticisi",
      "SLA garantisi",
    ],
  },
];

const faqs = [
  { q: "Eğitim ücretleri neye göre belirlenir?", a: "Eğitim ücretleri tehlike sınıfına, eğitim süresine ve katılımcı sayısına göre değişmektedir. Kurumsal müşterilerimize özel fiyatlandırma sunuyoruz." },
  { q: "Kurumsal fatura kesebilir misiniz?", a: "Evet, tüm kurumsal satışlarımızda fatura düzenliyoruz. Havale/EFT ile ödeme de kabul ediyoruz." },
  { q: "İndirim veya kampanya var mı?", a: "Toplu kayıtlarda ve kurumsal anlaşmalarda özel indirimler sunuyoruz. Detaylı bilgi için bizimle iletişime geçin." },
  { q: "Ödeme yöntemleri nelerdir?", a: "Kredi kartı, banka havalesi/EFT ile ödeme yapabilirsiniz. Kurumsal müşteriler için vadeli ödeme seçenekleri mevcuttur." },
];

export default function Pricing() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent/20 py-20 md:py-28">
        <div className="container text-center text-primary-foreground">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 font-display">Fiyatlandırma</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Bireysel veya kurumsal ihtiyaçlarınıza uygun esnek fiyatlandırma seçenekleri.
          </p>
        </div>
      </section>

      {/* Individual */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <User className="h-5 w-5 text-accent" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Bireysel Paketler</h2>
            </div>
            <p className="text-muted-foreground">Kendi eğitim ihtiyaçlarınız için uygun seçenekler</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {individualPlans.map((plan) => (
              <div key={plan.name} className={`rounded-xl border p-8 shadow-sm relative ${plan.popular ? 'border-accent ring-2 ring-accent/20' : 'bg-card'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3" /> Önerilen
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-2xl font-bold text-accent mt-2">{plan.price}</p>
                <p className="text-sm text-muted-foreground mt-2 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.href}>
                  <Button variant={plan.popular ? "accent" : "outline"} className="w-full" size="lg">
                    {plan.cta} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Kurumsal Paketler</h2>
            </div>
            <p className="text-muted-foreground">Şirketinizin büyüklüğüne uygun çözümler</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {corporatePlans.map((plan) => (
              <div key={plan.name} className={`rounded-xl border bg-card p-8 shadow-sm relative ${plan.popular ? 'border-accent ring-2 ring-accent/20' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3" /> Popüler
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-lg font-semibold text-accent mt-1">{plan.range}</p>
                <p className="text-sm text-muted-foreground mt-2 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/contact">
                  <Button variant="outline" className="w-full" size="lg">Teklif Alın</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container max-w-2xl">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">Sık Sorulan Sorular</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
                <button className="flex items-center justify-between w-full p-4 text-left" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <span className="font-medium text-foreground text-sm">{faq.q}</span>
                  {faqOpen === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {faqOpen === i && <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Özel Teklif Almak İster misiniz?</h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">İhtiyaçlarınıza göre özel fiyatlandırma için uzman ekibimizle iletişime geçin.</p>
          <Link to="/contact">
            <Button variant="accent" size="lg">Bizimle İletişime Geçin <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
