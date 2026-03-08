import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Shield, HardHat, Flame, AlertTriangle, HeartPulse, Building2, 
  Factory, Monitor, ArrowRight, CheckCircle, BookOpen, Award
} from "lucide-react";

const services = [
  {
    icon: HardHat,
    title: "Temel İSG Eğitimi",
    description: "6331 sayılı İş Sağlığı ve Güvenliği Kanunu kapsamında tüm çalışanlar için zorunlu temel eğitim.",
    features: ["Mevzuat bilgisi", "Tehlike ve risk kavramları", "Kişisel koruyucu donanımlar", "Acil durum prosedürleri"],
    dangerClass: "Tüm Sınıflar",
  },
  {
    icon: Monitor,
    title: "Ofis Çalışanları İSG Eğitimi",
    description: "Az tehlikeli sınıf kapsamında ofis ortamında çalışanlar için özel hazırlanmış 8 saatlik eğitim programı.",
    features: ["Ergonomi", "Ekranlı araçlarla çalışma", "Ofis güvenliği", "Stres yönetimi"],
    dangerClass: "Az Tehlikeli",
  },
  {
    icon: Factory,
    title: "Sanayi İSG Eğitimi",
    description: "Tehlikeli ve çok tehlikeli sınıf işyerlerindeki çalışanlar için kapsamlı İSG eğitim programı.",
    features: ["Makine güvenliği", "Kimyasal risk yönetimi", "Yüksekte çalışma", "İş ekipmanları kullanımı"],
    dangerClass: "Tehlikeli / Çok Tehlikeli",
  },
  {
    icon: Flame,
    title: "Yangın Güvenliği Eğitimi",
    description: "Yangın önleme, müdahale ve tahliye prosedürleri hakkında kapsamlı eğitim.",
    features: ["Yangın türleri", "Söndürücü kullanımı", "Tahliye planları", "Tatbikat organizasyonu"],
    dangerClass: "Tüm Sınıflar",
  },
  {
    icon: AlertTriangle,
    title: "Acil Durum Eğitimi",
    description: "Deprem, sel, patlama gibi acil durumlarda alınacak önlemler ve müdahale yöntemleri.",
    features: ["Acil durum planı", "Tahliye prosedürleri", "İletişim protokolleri", "Tatbikat planlaması"],
    dangerClass: "Tüm Sınıflar",
  },
  {
    icon: HeartPulse,
    title: "İlk Yardım Farkındalık Eğitimi",
    description: "Temel ilk yardım bilgileri ve iş yerinde yaralanmalara ilk müdahale yaklaşımları.",
    features: ["Temel yaşam desteği", "Kanamalarda müdahale", "Kırık ve burkulma", "Zehirlenme vakaları"],
    dangerClass: "Tüm Sınıflar",
  },
];

const corporateFeatures = [
  { icon: Building2, title: "Toplu Eğitim Atama", description: "Tüm çalışanlarınıza tek seferde eğitim atayın." },
  { icon: BookOpen, title: "İlerleme Takibi", description: "Çalışanlarınızın eğitim ilerlemelerini anlık takip edin." },
  { icon: Award, title: "Sertifika Yönetimi", description: "Tüm sertifikaları tek panelden görüntüleyin ve indirin." },
  { icon: Shield, title: "Detaylı Raporlama", description: "Departman bazlı raporlar ile uyumluluk durumunuzu izleyin." },
];

export default function Services() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent/20 py-20 md:py-28">
        <div className="container text-center text-primary-foreground">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 font-display">Hizmetlerimiz</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Mevzuata uygun, SCORM destekli online İSG eğitimleri ile çalışanlarınızın güvenliğini sağlayın.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.title} className="group rounded-xl border bg-card p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <service.icon className="h-6 w-6 text-accent" />
                </div>
                <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">{service.dangerClass}</span>
                <h3 className="font-bold text-foreground text-lg mt-3 mb-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                <ul className="space-y-2 mb-4">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/courses">
                  <Button variant="ghost" size="sm" className="group-hover:text-accent">
                    Eğitimleri İncele <ArrowRight className="h-4 w-4 ml-1" />
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Kurumsal Çözümler</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Şirketinize özel eğitim yönetimi ve raporlama altyapısı</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {corporateFeatures.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 text-center shadow-sm">
                <f.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/corporate">
              <Button variant="accent" size="lg">Kurumsal Teklif Alın <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
