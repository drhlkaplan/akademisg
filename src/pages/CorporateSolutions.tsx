import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Building2, Users, BookOpen, Shield, Award, BarChart3,
  Upload, CheckCircle, ArrowRight, Send, FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const steps = [
  { icon: Building2, title: "Firma Hesabı Oluşturun", description: "Şirketinizi platforma kaydedin ve yönetici panelinize erişin." },
  { icon: Upload, title: "Çalışanlarınızı Ekleyin", description: "CSV ile toplu yükleme veya tek tek ekleme ile çalışanlarınızı tanımlayın." },
  { icon: BookOpen, title: "Eğitim Atayın", description: "Tehlike sınıfına uygun eğitimleri çalışanlarınıza toplu olarak atayın." },
  { icon: BarChart3, title: "Takip Edin & Raporlayın", description: "İlerleme, sınav sonuçları ve sertifika durumlarını anlık izleyin." },
];

const features = [
  { icon: Users, title: "Toplu Çalışan Yönetimi", description: "CSV ile toplu kayıt, departman bazlı yönetim ve yetki dağılımı." },
  { icon: BookOpen, title: "Eğitim Atama & Takip", description: "Çalışanlara toplu eğitim atama ve tamamlanma oranlarını takip etme." },
  { icon: Award, title: "Sertifika Yönetimi", description: "QR kodlu doğrulanabilir sertifikalar, toplu sertifika indirme." },
  { icon: BarChart3, title: "Detaylı Raporlama", description: "PDF ve Excel raporları, departman bazlı analizler, uyumluluk durumu." },
  { icon: Shield, title: "Firma Markalaması", description: "Kendi logonuz, renkleriniz ve kurumsal kimliğiniz ile özelleştirilmiş panel." },
  { icon: FileSpreadsheet, title: "Mevzuat Uyumluluğu", description: "6331 sayılı kanun kapsamında zorunlu eğitim takibi ve hatırlatmalar." },
];

export default function CorporateSolutions() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: "", contactName: "", email: "", phone: "", employeeCount: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.email.trim() || !formData.contactName.trim()) {
      toast({ title: "Hata", description: "Lütfen zorunlu alanları doldurun.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Başarılı!", description: "Teklif talebiniz alınmıştır. En kısa sürede sizinle iletişime geçeceğiz." });
    setFormData({ companyName: "", contactName: "", email: "", phone: "", employeeCount: "", message: "" });
    setSubmitting(false);
  };

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent/20 py-20 md:py-28">
        <div className="container">
          <div className="max-w-3xl text-primary-foreground">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 font-display">Kurumsal Çözümler</h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8">
              Şirketinizin İSG eğitim ihtiyaçlarını tek platformdan yönetin. Çalışanlarınıza mevzuata 
              uygun eğitimler atayın, ilerlemelerini takip edin, sertifikalarını yönetin.
            </p>
            <Button variant="accent" size="lg" onClick={() => document.getElementById('teklif-form')?.scrollIntoView({ behavior: 'smooth' })}>
              Kurumsal Teklif Alın <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">Nasıl Çalışır?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center relative">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 relative">
                  <step.icon className="h-8 w-8 text-accent" />
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">{i + 1}</span>
                </div>
                <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">Kurumsal Özellikler</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <f.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="teklif-form" className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Kurumsal Teklif Alın</h2>
            <p className="text-muted-foreground">Formu doldurun, uzman ekibimiz sizinle iletişime geçsin.</p>
          </div>
          <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-8 shadow-sm space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Firma Adı *</Label>
                <Input id="companyName" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} placeholder="Şirket adı" required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Yetkili Adı *</Label>
                <Input id="contactName" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} placeholder="Ad Soyad" required maxLength={100} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="firma@example.com" required maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0 5XX XXX XX XX" maxLength={20} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeCount">Tahmini Çalışan Sayısı</Label>
              <Input id="employeeCount" value={formData.employeeCount} onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })} placeholder="Örn: 50" maxLength={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mesajınız</Label>
              <Textarea id="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Eğitim ihtiyaçlarınız hakkında bilgi verin..." rows={4} maxLength={1000} />
            </div>
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Gönderiliyor..." : "Teklif Talep Et"} <Send className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </div>
      </section>
    </MainLayout>
  );
}
