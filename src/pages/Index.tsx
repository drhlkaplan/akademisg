import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Zap,
  Globe,
  X,
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
    color: "border-success/30",
  },
  {
    level: "Tehlikeli",
    badge: "dangerMedium" as const,
    hours: "12 Saat",
    description: "İmalat, lojistik, gıda sektörleri",
    courses: 20,
    color: "border-warning/30",
  },
  {
    level: "Çok Tehlikeli",
    badge: "dangerHigh" as const,
    hours: "16 Saat",
    description: "Maden, inşaat, kimya sektörleri",
    courses: 18,
    color: "border-destructive/30",
  },
];

const trustPoints = [
  { icon: Zap, text: "SCORM 1.2 & 2004" },
  { icon: Shield, text: "KVKK Uyumlu" },
  { icon: Globe, text: "7/24 Erişim" },
  { icon: CheckCircle, text: "Mobil Uyumlu" },
];

const Index = () => {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="İş Güvenliği"
            className="w-full h-full object-cover"
            fetchPriority="high"
            width={1504}
            height={864}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
        </div>

        {/* Content */}
        <div className="container relative z-10 py-20">
          <div className="max-w-2xl animate-slide-up">
            <Badge variant="active" className="mb-6 bg-accent/20 border-accent/30 text-accent">
              <Shield className="h-3 w-3 mr-1" />
              MEB Onaylı İSG Eğitimleri
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-primary-foreground mb-6 leading-[1.1] tracking-tight">
              İş Sağlığı ve Güvenliği{" "}
              <span className="text-gradient">Online Eğitim Platformu</span>
            </h1>

            <p className="text-base md:text-lg text-primary-foreground/75 mb-8 max-w-xl leading-relaxed">
              Tehlike sınıfına göre SCORM uyumlu eğitimler, kapsamlı sınavlar ve
              QR kodlu sertifikalar ile İSG eğitimlerinizi dijital ortama taşıyın.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">
                  Hemen Başla
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="xl"
                className="border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 backdrop-blur-sm bg-transparent"
                onClick={() => setVideoOpen(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Tanıtım Videosu
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-5 mt-10 pt-8 border-t border-primary-foreground/10">
              {trustPoints.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-primary-foreground/60"
                >
                  <item.icon className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 -mt-16 relative z-20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="stat-card text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 mb-4">
                  <stat.icon className="h-6 w-6 text-accent" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Danger Categories Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="info" className="mb-4">
              Tehlike Sınıfları
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Sektörünüze Uygun Eğitimler
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              İş yerinizin tehlike sınıfına göre yasal zorunlulukları karşılayan,
              kapsamlı İSG eğitim programları.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {dangerCategories.map((category) => (
              <div
                key={category.level}
                className={`group relative p-6 bg-card rounded-2xl border-2 ${category.color} hover:border-accent/50 transition-all duration-300`}
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <Badge variant={category.badge} className="mb-4">
                  {category.level}
                </Badge>

                <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">
                  {category.level} İşler
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {category.description}
                </p>

                <div className="flex items-center justify-between py-4 border-t border-border">
                  <div>
                    <span className="text-2xl font-bold text-foreground tracking-tight">
                      {category.hours}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      eğitim
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-accent">
                      {category.courses}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
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
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge
              variant="active"
              className="mb-4 bg-accent/20 text-accent border-accent/30"
            >
              Platform Özellikleri
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Neden İSG Akademi?
            </h2>
            <p className="text-primary-foreground/60 leading-relaxed">
              Modern teknoloji ve pedagojik yaklaşımlarla tasarlanmış, kurumsal
              ihtiyaçlara özel çözümler.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 hover:bg-primary-foreground/10 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition-colors">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-sm text-primary-foreground/60 leading-relaxed">
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
              <h2 className="text-3xl md:text-4xl font-bold text-accent-foreground mb-4 tracking-tight">
                İSG Eğitimlerinizi Dijitale Taşıyın
              </h2>
              <p className="text-base text-accent-foreground/80 mb-8 leading-relaxed">
                Hemen kayıt olun, tehlike sınıfınıza uygun eğitimlere başlayın
                ve sertifikanızı alın.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
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
            <div className="absolute top-0 right-0 w-72 h-72 bg-accent-foreground/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent-foreground/5 rounded-full blur-2xl" />
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
