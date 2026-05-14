import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

export default function Contact() {
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const { contactPhone, contactEmail, contactAddress } = settings.general;

  const phoneHref = `tel:${contactPhone.replace(/[^+\d]/g, "")}`;
  const waNumber = contactPhone.replace(/[^\d]/g, "");
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent("Merhaba, İSG eğitimleri hakkında bilgi almak istiyorum.")}`;

  const contactInfo = [
    { icon: Phone, label: "Telefon", value: contactPhone, href: phoneHref },
    { icon: Mail, label: "E-posta", value: contactEmail, href: `mailto:${contactEmail}` },
    { icon: MapPin, label: "Adres", value: contactAddress, href: "#" },
    { icon: Clock, label: "Mesai Saatleri", value: "Pzt-Cuma 09:00 - 18:00", href: "#" },
  ];

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", subject: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({ title: "Hata", description: "Lütfen zorunlu alanları doldurun.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: "Mesajınız Alındı!", description: "En kısa sürede sizinle iletişime geçeceğiz." });
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    setSubmitting(false);
  };

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent/20 py-20 md:py-28">
        <div className="container text-center text-primary-foreground">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 font-display">İletişim</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Sorularınız, önerileriniz veya kurumsal talepleriniz için bize ulaşın.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-6">İletişim Bilgileri</h2>
                <div className="space-y-5">
                  {contactInfo.map((info) => (
                    <a key={info.label} href={info.href} className="flex items-start gap-3 group">
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                        <info.icon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{info.label}</p>
                        <p className="text-sm text-muted-foreground">{info.value}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* WhatsApp */}
              <Button asChild variant="success" size="lg" className="w-full" disabled={!waNumber}>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5 mr-2" /> WhatsApp ile Yazın
                </a>
              </Button>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-8 shadow-sm space-y-5">
                <h2 className="text-xl font-bold text-foreground mb-2">Bize Yazın</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Adınız Soyadınız" required maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ornek@email.com" required maxLength={255} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0 5XX XXX XX XX" maxLength={20} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Konu</Label>
                    <Select value={formData.subject} onValueChange={(v) => setFormData({ ...formData, subject: v })}>
                      <SelectTrigger><SelectValue placeholder="Konu seçin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="genel">Genel Bilgi</SelectItem>
                        <SelectItem value="kurumsal">Kurumsal Teklif</SelectItem>
                        <SelectItem value="teknik">Teknik Destek</SelectItem>
                        <SelectItem value="sertifika">Sertifika Sorgulama</SelectItem>
                        <SelectItem value="diger">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mesajınız *</Label>
                  <Textarea id="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Mesajınızı yazın..." rows={5} required maxLength={1000} />
                </div>
                <Button type="submit" variant="accent" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? "Gönderiliyor..." : "Mesaj Gönder"} <Send className="h-4 w-4 ml-1" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
