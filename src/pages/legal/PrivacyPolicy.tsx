import { MainLayout } from "@/components/layout/MainLayout";

export default function PrivacyPolicy() {
  return (
    <MainLayout>
      <div className="container py-12 md:py-20 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Gizlilik Politikası</h1>
        <p className="text-sm text-muted-foreground mb-8">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Giriş</h2>
            <p>
              İSG Akademi Online Eğitim Platformu ("Platform") olarak, gizliliğinize önem veriyoruz. 
              Bu Gizlilik Politikası, platformumuzu kullandığınızda kişisel verilerinizin nasıl toplandığını, 
              kullanıldığını, saklandığını ve korunduğunu açıklamaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Toplanan Bilgiler</h2>
            <h3 className="text-lg font-medium text-foreground mt-4">2.1 Doğrudan Sağladığınız Bilgiler</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Hesap oluştururken verdiğiniz ad, soyad, e-posta, TC Kimlik Numarası</li>
              <li>Profil bilgileriniz (telefon, firma bilgileri)</li>
              <li>İletişim formları aracılığıyla gönderdiğiniz mesajlar</li>
            </ul>
            <h3 className="text-lg font-medium text-foreground mt-4">2.2 Otomatik Toplanan Bilgiler</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP adresi ve coğrafi konum bilgileri</li>
              <li>Tarayıcı türü, cihaz bilgileri ve işletim sistemi</li>
              <li>Platform kullanım verileri (ziyaret edilen sayfalar, tıklama verileri)</li>
              <li>Eğitim ilerleme ve SCORM etkileşim verileri</li>
              <li>Çerez ve benzeri teknolojiler aracılığıyla toplanan veriler</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Bilgilerin Kullanımı</h2>
            <p>Toplanan bilgiler aşağıdaki amaçlarla kullanılmaktadır:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Hesap yönetimi ve kimlik doğrulama</li>
              <li>Eğitim hizmetlerinin sunulması ve kişiselleştirilmesi</li>
              <li>Sertifika oluşturma, doğrulama ve raporlama</li>
              <li>Platform güvenliğinin sağlanması</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
              <li>Hizmet kalitesinin iyileştirilmesi ve analitik çalışmalar</li>
              <li>Destek taleplerinin yanıtlanması</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Bilgi Paylaşımı</h2>
            <p>Kişisel verileriniz aşağıdaki durumlar dışında üçüncü taraflarla paylaşılmaz:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Yasal zorunluluklar (mahkeme kararı, resmi kurum talebi)</li>
              <li>Firmanızın yetkilileri (firma bazlı eğitim raporları için)</li>
              <li>Teknik altyapı sağlayıcıları (veri işleyici sıfatıyla, gizlilik sözleşmesi altında)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Veri Güvenliği</h2>
            <p>
              Verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik önlemleri kullanmaktayız:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>SSL/TLS şifreleme ile veri iletimi</li>
              <li>TC Kimlik Numarası gibi hassas verilerin maskelenerek saklanması</li>
              <li>Satır Bazlı Güvenlik (RLS) ile veri erişim kontrolü</li>
              <li>Düzenli güvenlik denetimleri ve log takibi</li>
              <li>Erişim yetkisi sınırlandırması (rol tabanlı erişim kontrolü)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Veri Saklama Süresi</h2>
            <p>
              Kişisel verileriniz, işlenme amacı için gerekli olan süre boyunca saklanır. 
              Yasal zorunluluklar (İSG mevzuatı gereği sertifika kayıtları vb.) kapsamında 
              daha uzun süre saklanması gereken veriler ilgili mevzuatta belirtilen süreler boyunca muhafaza edilir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Haklarınız</h2>
            <p>
              Kişisel verileriniz üzerindeki haklarınız hakkında detaylı bilgi için 
              <a href="/kvkk" className="text-accent hover:underline ml-1">KVKK Aydınlatma Metni</a> sayfamızı 
              ziyaret edebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. İletişim</h2>
            <p>
              Gizlilik politikamız hakkında sorularınız için <strong>info@isgakademi.com</strong> adresinden 
              bizimle iletişime geçebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
