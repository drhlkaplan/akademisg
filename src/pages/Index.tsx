import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import {
  Shield,
  GraduationCap,
  Award,
  Users,
  CheckCircle,
  ArrowRight,
  Play,
  BookOpen,
  FileCheck,
  Building2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import heroImage from "@/assets/hero-bg.jpg";

const stats = [
  { label: "Aktif Kursiyer", value: "10,000+", icon: Users },
  { label: "Online Eğitim", value: "50+", icon: BookOpen },
  { label: "Verilen Sertifika", value: "25,000+", icon: Award },
  { label: "Kurumsal Firma", value: "500+", icon: Building2 },
];

const features = [
  {
    icon: Shield,
    title: "SCORM Uyumlu",
    description:
      "SCORM 1.2 ve 2004 standartlarına uygun eğitim içerikleri ile profesyonel öğrenme deneyimi.",
  },
  {
    icon: GraduationCap,
    title: "Sertifikalı Eğitim",
    description:
      "Eğitim ve sınavları başarıyla tamamlayanlara QR kodlu, doğrulanabilir sertifika.",
  },
  {
    icon: FileCheck,
    title: "Kapsamlı Sınav",
    description:
      "Ön test ve son sınav ile bilgi ölçümü, otomatik değerlendirme ve başarı takibi.",
  },
  {
    icon: Building2,
    title: "Kurumsal Çözümler",
    description:
      "Çoklu firma desteği, toplu kullanıcı yönetimi ve detaylı raporlama.",
  },
];

const dangerCategories = [
  {
    level: "Az Tehlikeli",
    badge: "dangerLow" as const,
    hours: "8 Saat",
    description: "Ofis, perakende, eğitim sektörleri",
    courses: 15,
  },
  {
    level: "Tehlikeli",
    badge: "dangerMedium" as const,
    hours: "12 Saat",
    description: "İmalat, lojistik, gıda sektörleri",
    courses: 20,
  },
  {
    level: "Çok Tehlikeli",
    badge: "dangerHigh" as const,
    hours: "16 Saat",
    description: "Maden, inşaat, kimya sektörleri",
    courses: 18,
  },
];

const Index = () => {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="İş Güvenliği"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60" />
        </div>

        {/* Content */}
        <div className="container relative z-10 py-20">
          <div className="max-w-3xl animate-slide-up">
            <Badge variant="active" className="mb-6">
              <Shield className="h-3 w-3 mr-1" />
              MEB Onaylı İSG Eğitimleri
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              İş Sağlığı ve Güvenliği
              <span className="block text-accent">Online Eğitim Platformu</span>
            </h1>

            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl">
              Tehlike sınıfına göre SCORM uyumlu eğitimler, kapsamlı sınavlar ve
              QR kodlu sertifikalar ile İSG eğitimlerinizi dijital ortama taşıyın.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">
                  Hemen Başla
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Play className="mr-2 h-5 w-5" />
                Tanıtım Videosu
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 mt-12 pt-8 border-t border-primary-foreground/20">
              {[
                "SCORM 1.2 & 2004",
                "KVKK Uyumlu",
                "7/24 Erişim",
                "Mobil Uyumlu",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-primary-foreground/70"
                >
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-secondary/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6 bg-card rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent/10 mb-4">
                  <stat.icon className="h-6 w-6 text-accent" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Danger Categories Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="info" className="mb-4">
              Tehlike Sınıfları
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Sektörünüze Uygun Eğitimler
            </h2>
            <p className="text-muted-foreground">
              İş yerinizin tehlike sınıfına göre yasal zorunlulukları karşılayan,
              kapsamlı İSG eğitim programları.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {dangerCategories.map((category) => (
              <div
                key={category.level}
                className="group relative p-6 bg-card rounded-2xl border border-border hover:border-accent/50 shadow-md hover:shadow-xl transition-all duration-300"
              >
                <Badge variant={category.badge} className="mb-4">
                  {category.level}
                </Badge>

                <h3 className="text-xl font-bold text-foreground mb-2">
                  {category.level} İşler
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {category.description}
                </p>

                <div className="flex items-center justify-between py-4 border-t border-border">
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {category.hours}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      eğitim
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-accent">
                      {category.courses}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      kurs
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4 group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-colors"
                  asChild
                >
                  <Link to={`/courses?category=${category.level}`}>
                    Eğitimleri Görüntüle
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge
              variant="active"
              className="mb-4 bg-accent/20 text-accent border-accent/30"
            >
              Platform Özellikleri
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Neden İSG Akademi?
            </h2>
            <p className="text-primary-foreground/70">
              Modern teknoloji ve pedagojik yaklaşımlarla tasarlanmış, kurumsal
              ihtiyaçlara özel çözümler.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 hover:bg-primary-foreground/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-primary-foreground/70">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-accent p-8 md:p-12 lg:p-16">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold text-accent-foreground mb-4">
                İSG Eğitimlerinizi Dijitale Taşıyın
              </h2>
              <p className="text-lg text-accent-foreground/80 mb-8">
                Hemen kayıt olun, tehlike sınıfınıza uygun eğitimlere başlayın
                ve sertifikanızı alın.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="xl"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  asChild
                >
                  <Link to="/register">
                    Ücretsiz Kayıt Ol
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10"
                  asChild
                >
                  <Link to="/contact">Kurumsal Teklif Al</Link>
                </Button>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-foreground/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent-foreground/5 rounded-full blur-2xl" />
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
