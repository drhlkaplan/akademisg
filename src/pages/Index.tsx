import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  HardHat,
  Factory,
  Briefcase,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { JoinRequestButton } from "@/components/courses/JoinRequestButton";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-bg.jpg";

type HazardKey = "az_tehlikeli" | "tehlikeli" | "cok_tehlikeli";
interface CategoryCourse {
  id: string;
  title: string;
  training_type: "temel" | "tekrar" | string;
  duration_minutes: number;
}
interface CategoryConfig {
  key: HazardKey;
  level: string;
  hours: string;
  description: string;
  icon: typeof Briefcase;
  badge: "dangerLow" | "dangerMedium" | "dangerHigh";
  accent: string;
  ring: string;
}
const dangerCategoryConfig: CategoryConfig[] = [
  {
    key: "az_tehlikeli",
    level: "Az Tehlikeli",
    hours: "8 Saat",
    description: "Ofis, perakende, eğitim, sağlık (idari) gibi sektörler",
    icon: Briefcase,
    badge: "dangerLow",
    accent: "bg-success/10 text-success",
    ring: "border-success/30 hover:border-success/60",
  },
  {
    key: "tehlikeli",
    level: "Tehlikeli",
    hours: "12 Saat",
    description: "İmalat, lojistik, gıda üretimi, atölye işleri",
    icon: Factory,
    badge: "dangerMedium",
    accent: "bg-warning/10 text-warning",
    ring: "border-warning/30 hover:border-warning/60",
  },
  {
    key: "cok_tehlikeli",
    level: "Çok Tehlikeli",
    hours: "16 Saat",
    description: "Maden, inşaat, kimya, metal ve enerji sektörleri",
    icon: HardHat,
    badge: "dangerHigh",
    accent: "bg-destructive/10 text-destructive",
    ring: "border-destructive/30 hover:border-destructive/60",
  },
];

const stats = [
  { label: "Aktif Kursiyer", value: "10,000+", icon: Users },
  { label: "Online Eğitim", value: "50+", icon: BookOpen },
  { label: "Verilen Sertifika", value: "25,000+", icon: Award },
  { label: "Kurumsal Firma", value: "500+", icon: Building2 },
];

const features = [
  {
    icon: Shield,
    title: "Yönetmeliğe Uyumlu",
    description: "Yeni İSG eğitim yönetmeliğine tam uyumlu: 7 eğitim türü, tehlike sınıfına göre süre ve yöntem kontrolü.",
  },
  {
    icon: GraduationCap,
    title: "Hibrit Eğitim Modeli",
    description: "SCORM, canlı ders ve yüz yüze oturumları tek kursta birleştirin. İşe ve İşyerine Özgü Konular yüz yüze zorunluluğu otomatik uygulanır.",
  },
  {
    icon: FileCheck,
    title: "Denetime Hazır Belgeler",
    description: "Katılım tutanağı, faaliyet raporu ve sertifika otomatik üretilir. QR kodlu doğrulama ile şeffaf belgelendirme.",
  },
  {
    icon: Building2,
    title: "Sektöre Özel İşyeri Konuları",
    description: "Her firma ve sektör için işyerine özgü risk eğitimlerini otomatik atayın. Firma izolasyonlu multi-tenant yapı.",
  },
];

const dangerCategories = dangerCategoryConfig;

const trustPoints = [
  { icon: Zap, text: "SCORM 1.2 & 2004" },
  { icon: Shield, text: "KVKK Uyumlu" },
  { icon: Globe, text: "7/24 Erişim" },
  { icon: CheckCircle, text: "Mobil Uyumlu" },
];

const Index = () => {
  const [videoOpen, setVideoOpen] = useState(false);
  const [coursesByHazard, setCoursesByHazard] = useState<Record<HazardKey, CategoryCourse[]>>({
    az_tehlikeli: [], tehlikeli: [], cok_tehlikeli: [],
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, training_type, duration_minutes, hazard_class_new")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("training_type", ["temel", "tekrar"]);
      const grouped: Record<HazardKey, CategoryCourse[]> = { az_tehlikeli: [], tehlikeli: [], cok_tehlikeli: [] };
      (data || []).forEach((c: any) => {
        const k = c.hazard_class_new as HazardKey;
        if (grouped[k]) grouped[k].push(c);
      });
      // temel önce, tekrar sonra
      (Object.keys(grouped) as HazardKey[]).forEach((k) =>
        grouped[k].sort((a, b) => (a.training_type === "temel" ? -1 : 1))
      );
      setCoursesByHazard(grouped);
    })();
  }, []);


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
              Yeni Yönetmeliğe Tam Uyumlu
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-primary-foreground mb-6 leading-[1.1] tracking-tight">
              Yeni Yönetmeliğe Uyumlu <span className="text-gradient">İSG Eğitim Platformu</span>
            </h1>

            <p className="text-base md:text-lg text-primary-foreground/75 mb-8 max-w-xl leading-relaxed">
              Online, canlı ve yüz yüze eğitimleri tek platformda yönetin. Sektöre özel içerikler, ölçülebilir katılım ve denetime hazır belgeler.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">
                  Ücretsiz Demo Talep Edin
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="xl"
                className="border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 backdrop-blur-sm bg-transparent"
                asChild
              >
                <Link to="/regulation">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Yönetmelik Değişikliklerini İnceleyin
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-5 mt-10 pt-8 border-t border-primary-foreground/10">
              {trustPoints.map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-primary-foreground/60">
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
              <div key={stat.label} className="stat-card text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 mb-4">
                  <stat.icon className="h-6 w-6 text-accent" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1 tracking-tight">{stat.value}</div>
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
              İş yerinizin tehlike sınıfına göre yasal zorunlulukları karşılayan, kapsamlı İSG eğitim programları.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {dangerCategories.map((category) => {
              const Icon = category.icon;
              const list = coursesByHazard[category.key] || [];
              return (
                <div
                  key={category.level}
                  className={`group relative p-6 bg-card rounded-2xl border-2 ${category.ring} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col`}
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${category.accent} flex items-center justify-center`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant={category.badge}>{category.hours}</Badge>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1 tracking-tight">{category.level} İşler</h3>
                  <p className="text-sm text-muted-foreground mb-5">{category.description}</p>
                  <div className="space-y-2 mb-4 flex-1">
                    {list.length === 0 && (
                      <div className="text-xs text-muted-foreground italic py-3">Eğitim hazırlanıyor...</div>
                    )}
                    {list.map((c) => (
                      <Link
                        key={c.id}
                        to={`/courses?hazard=${category.key}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-secondary/40 hover:bg-accent/10 hover:border-accent/40 transition-colors group/item"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {c.training_type === "temel" ? (
                            <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
                          ) : (
                            <RefreshCw className="h-4 w-4 text-info flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                              {c.training_type === "temel" ? "Temel Eğitim" : "Tekrar Eğitimi"}
                            </div>
                            <div className="text-sm font-medium text-foreground truncate">
                              {Math.round(c.duration_minutes / 60)} saat
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/item:text-accent group-hover/item:translate-x-0.5 transition-all flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/courses?hazard=${category.key}`}>
                      Tüm Eğitimleri Gör
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="active" className="mb-4 bg-accent/20 text-accent border-accent/30">
              Platform Özellikleri
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Neden İSG Akademi?</h2>
            <p className="text-primary-foreground/60 leading-relaxed">
              Modern teknoloji ve pedagojik yaklaşımlarla tasarlanmış, kurumsal ihtiyaçlara özel çözümler.
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
                <p className="text-sm text-primary-foreground/60 leading-relaxed">{feature.description}</p>
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
                Hemen kayıt olun, tehlike sınıfınıza uygun eğitimlere başlayın ve sertifikanızı alın.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="xl" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link to="/register">
                    Ücretsiz Kayıt Ol
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
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

      {/* Video Dialog */}
      <Dialog open={videoOpen} onOpenChange={(open) => {
        setVideoOpen(open);
      }}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black border-none">
          <DialogHeader className="absolute top-2 right-2 z-20 p-0 m-0">
            <DialogTitle className="sr-only">Tanıtım Videosu</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-video">
            {videoOpen && (
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/9Iq5yELYnLE?autoplay=1&rel=0"
                title="İSG Eğitim Platformu Tanıtım"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Index;
