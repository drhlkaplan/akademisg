import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Clock, Users, Award, BookOpen, CheckCircle, ArrowRight,
  Play, FileText, Loader2, ChevronDown, ChevronUp, Shield
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { JoinRequestButton } from "@/components/courses/JoinRequestButton";

type DangerClass = Database["public"]["Enums"]["danger_class"];

const dangerClassBadge: Record<DangerClass, "dangerLow" | "dangerMedium" | "dangerHigh"> = {
  low: "dangerLow", medium: "dangerMedium", high: "dangerHigh",
};
const dangerClassLabel: Record<DangerClass, string> = {
  low: "Az Tehlikeli", medium: "Tehlikeli", high: "Çok Tehlikeli",
};

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId) return;
      const { data: courseData } = await supabase
        .from("courses")
        .select("*, course_categories(*)")
        .eq("id", courseId)
        .single();

      const { data: lessonData } = await supabase
        .from("lessons")
        .select("id, title, type, duration_minutes, sort_order")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .order("sort_order");

      setCourse(courseData);
      setLessons(lessonData || []);
      setLoading(false);
    }
    fetchCourse();
  }, [courseId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Eğitim Bulunamadı</h2>
            <p className="text-muted-foreground mb-4">Aradığınız eğitim mevcut değil veya kaldırılmış olabilir.</p>
            <Link to="/courses"><Button>Eğitimlere Dön</Button></Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const category = course.course_categories;
  const totalMinutes = lessons.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const faqs = [
    { q: "Eğitimi tamamlamak ne kadar sürer?", a: `Bu eğitim toplam ${hours > 0 ? hours + ' saat ' : ''}${mins > 0 ? mins + ' dakika' : ''} sürmektedir. Kendi hızınızda tamamlayabilirsiniz.` },
    { q: "Sertifika alabilir miyim?", a: "Evet, eğitimi ve sınavı başarıyla tamamladığınızda QR kodlu, doğrulanabilir dijital sertifikanız otomatik olarak oluşturulur." },
    { q: "Eğitime hangi cihazlardan erişebilirim?", a: "Bilgisayar, tablet ve akıllı telefon dahil tüm cihazlardan erişebilirsiniz." },
    { q: "Sınavda başarısız olursam ne olur?", a: "Belirlenen deneme hakkı dahilinde sınava tekrar girebilirsiniz." },
  ];

  return (
    <MainLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-accent/20 py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl text-primary-foreground">
            <div className="flex items-center gap-2 mb-4">
              {category && (
                <Badge variant={dangerClassBadge[category.danger_class as DangerClass]}>
                  {dangerClassLabel[category.danger_class as DangerClass]}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 font-display">{course.title}</h1>
            <p className="text-lg text-primary-foreground/80 mb-6">{course.description}</p>
            <div className="flex flex-wrap gap-6 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {hours > 0 ? `${hours} saat ` : ''}{mins > 0 ? `${mins} dk` : ''}</span>
              <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {lessons.length} Ders</span>
              <span className="flex items-center gap-1.5"><Award className="h-4 w-4" /> Sertifikalı</span>
            </div>
            <div className="mt-8">
              <JoinRequestButton courseId={courseId!} size="lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              {/* Learning Outcomes */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Bu Eğitimde Neler Öğreneceksiniz?</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    "İş güvenliği temel kavramları",
                    "Risk değerlendirme yöntemleri",
                    "Kişisel koruyucu donanım kullanımı",
                    "Acil durum prosedürleri",
                    "Yasal hak ve sorumluluklar",
                    "Güvenli çalışma kültürü",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lessons */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Eğitim İçeriği</h2>
                <div className="space-y-2">
                  {lessons.map((lesson, i) => (
                    <div key={lesson.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{lesson.type === 'exam' ? 'Sınav' : lesson.type === 'scorm' ? 'SCORM' : lesson.type === 'live' ? 'Canlı Ders' : 'İçerik'}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{lesson.duration_minutes} dk</span>
                    </div>
                  ))}
                  {lessons.length === 0 && (
                    <p className="text-muted-foreground text-sm">Henüz ders içeriği eklenmemiş.</p>
                  )}
                </div>
              </div>

              {/* FAQ */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Sık Sorulan Sorular</h2>
                <div className="space-y-2">
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-lg border bg-card overflow-hidden">
                      <button
                        className="flex items-center justify-between w-full p-4 text-left"
                        onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      >
                        <span className="font-medium text-foreground text-sm">{faq.q}</span>
                        {faqOpen === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {faqOpen === i && <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="sticky top-24 rounded-xl border bg-card p-6 shadow-sm space-y-6">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-accent mx-auto mb-3" />
                  <h3 className="font-bold text-foreground text-lg">Hemen Başlayın</h3>
                  <p className="text-sm text-muted-foreground mt-1">Eğitimi tamamlayın, sertifikanızı alın.</p>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    `${lessons.length} ders modülü`,
                    `${hours > 0 ? hours + ' saat ' : ''}${mins > 0 ? mins + ' dk' : ''} toplam süre`,
                    "Online sınav",
                    "QR kodlu sertifika",
                    "Mobil uyumlu",
                    "7/24 erişim",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <JoinRequestButton courseId={courseId!} fullWidth />
                <Link to="/corporate" className="block">
                  <Button variant="outline" className="w-full">Kurumsal Teklif Alın</Button>
                </Link>
                <Link to="/corporate" className="block">
                  <Button variant="outline" className="w-full">Kurumsal Teklif Alın</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
