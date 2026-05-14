import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, HardHat, Flame, AlertTriangle, HeartPulse, Building2,
  Factory, Monitor, ArrowRight, CheckCircle, BookOpen, Award,
  type LucideIcon
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Shield, HardHat, Flame, AlertTriangle, HeartPulse, Building2, Factory, Monitor, BookOpen, Award,
};

type Service = {
  id: string;
  icon_name: string;
  title: string;
  description: string | null;
  danger_class: string | null;
  features: string[];
  link_url: string | null;
};

const corporateFeatures = [
  { icon: Building2, title: "Toplu Eğitim Atama", description: "Tüm çalışanlarınıza tek seferde eğitim atayın." },
  { icon: BookOpen, title: "İlerleme Takibi", description: "Çalışanlarınızın eğitim ilerlemelerini anlık takip edin." },
  { icon: Award, title: "Sertifika Yönetimi", description: "Tüm sertifikaları tek panelden görüntüleyin ve indirin." },
  { icon: Shield, title: "Detaylı Raporlama", description: "Departman bazlı raporlar ile uyumluluk durumunuzu izleyin." },
];

export default function Services() {
  const { data: services, isLoading } = useQuery({
    queryKey: ["site-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_services")
        .select("id, icon_name, title, description, danger_class, features, link_url")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        features: Array.isArray(s.features) ? (s.features as string[]) : [],
      })) as Service[];
    },
  });

  return (
    <MainLayout>
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent/20 py-20 md:py-28">
        <div className="container text-center text-primary-foreground">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 font-display">Hizmetlerimiz</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Mevzuata uygun, SCORM destekli online İSG eğitimleri ile çalışanlarınızın güvenliğini sağlayın.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(services ?? []).map((service) => {
                const Icon = iconMap[service.icon_name] ?? Shield;
                return (
                  <div key={service.id} className="group rounded-xl border bg-card p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                    <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    {service.danger_class && (
                      <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">{service.danger_class}</span>
                    )}
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
                    <Link to={service.link_url || "/courses"}>
                      <Button variant="ghost" size="sm" className="group-hover:text-accent">
                        Eğitimleri İncele <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
