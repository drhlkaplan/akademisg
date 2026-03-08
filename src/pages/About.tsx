import { MainLayout } from "@/components/layout/MainLayout";
import { Shield, Target, Eye, Users, Award, CheckCircle, BookOpen, Building2 } from "lucide-react";

const values = [
  { icon: Shield, title: "Güvenlik Önceliğimiz", description: "İş sağlığı ve güvenliği alanında en güncel mevzuata uygun, kaliteli eğitim içerikleri sunuyoruz." },
  { icon: Target, title: "Sonuç Odaklılık", description: "Eğitimlerimiz iş kazalarını azaltmak ve güvenli çalışma bilincini artırmak üzerine kurgulanmıştır." },
  { icon: Eye, title: "Şeffaflık", description: "Eğitim süreçleri, sınav sonuçları ve sertifika bilgileri tamamen şeffaf ve izlenebilirdir." },
  { icon: Users, title: "Erişilebilirlik", description: "Her yerden, her cihazdan erişilebilen eğitim altyapısı ile zaman ve mekân bağımsız öğrenme." },
];

const stats = [
  { value: "10,000+", label: "Eğitim Tamamlayan" },
  { value: "500+", label: "Kurumsal Firma" },
  { value: "50+", label: "Online Eğitim" },
  { value: "25,000+", label: "Verilen Sertifika" },
];

const team = [
  { name: "İSG Uzman Kadrosu", role: "Eğitim İçerik Geliştirme", description: "A sınıfı iş güvenliği uzmanları tarafından hazırlanan müfredat ve içerikler." },
  { name: "Teknik Ekip", role: "Platform Geliştirme", description: "SCORM uyumlu, modern ve güvenli eğitim altyapısı geliştiren yazılım ekibi." },
  { name: "Kurumsal İlişkiler", role: "Firma Çözümleri", description: "Şirketlerin eğitim ihtiyaçlarına özel çözümler sunan danışmanlık ekibi." },
];

export default function About() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent/20 py-20 md:py-28">
        <div className="container text-center text-primary-foreground">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 font-display">Hakkımızda</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            İSG Akademi olarak, Türkiye'nin her yerinden erişilebilen profesyonel iş sağlığı ve güvenliği eğitimleri sunuyoruz.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Misyonumuz</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                İş kazalarını ve meslek hastalıklarını önlemek için çalışanların bilinç düzeyini artırmak, 
                mevzuata uygun ve erişilebilir eğitim çözümleri sunmaktır. Her çalışanın güvenli bir 
                iş ortamında çalışma hakkını savunuyoruz.
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Vizyonumuz</h2>
              <p className="text-muted-foreground leading-relaxed">
                Türkiye'nin lider online İSG eğitim platformu olarak, teknoloji ile güvenliği birleştirip 
                her sektörden çalışanın kolayca erişebileceği, kaliteli ve ölçeklenebilir bir eğitim 
                ekosistemi oluşturmak.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border bg-card p-6 text-center shadow-sm">
                  <div className="text-3xl font-bold text-accent mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">Değerlerimiz</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <v.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">Ekibimiz</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member) => (
              <div key={member.name} className="rounded-xl border bg-card p-8 text-center shadow-sm">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-1">{member.name}</h3>
                <p className="text-sm text-accent font-medium mb-3">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Neden İSG Akademi?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              "Mevzuata uygun eğitim içerikleri",
              "SCORM 1.2 ve 2004 uyumlu altyapı",
              "QR kodlu doğrulanabilir sertifikalar",
              "7/24 online erişim",
              "Kurumsal raporlama ve takip",
              "Mobil uyumlu eğitim deneyimi",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-left">
                <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
