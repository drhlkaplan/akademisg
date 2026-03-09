import { MainLayout } from "@/components/layout/MainLayout";

export default function TermsOfService() {
  return (
    <MainLayout>
      <div className="container py-12 md:py-20 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Kullanım Koşulları</h1>
        <p className="text-sm text-muted-foreground mb-8">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Genel Hükümler</h2>
            <p>
              Bu Kullanım Koşulları, İSG Akademi Online Eğitim Platformu'nu ("Platform") kullanan 
              tüm kullanıcılar için geçerlidir. Platforma kayıt olarak veya platformu kullanarak 
              bu koşulları kabul etmiş sayılırsınız.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Hizmet Tanımı</h2>
            <p>Platform, aşağıdaki hizmetleri sunmaktadır:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>İş Sağlığı ve Güvenliği kapsamında online eğitim içerikleri</li>
              <li>SCORM uyumlu interaktif eğitim modülleri</li>
              <li>Online sınav ve değerlendirme sistemi</li>
              <li>Dijital sertifika oluşturma ve doğrulama</li>
              <li>Canlı eğitim oturumları (BigBlueButton entegrasyonu)</li>
              <li>Firma bazlı eğitim yönetimi ve raporlama</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Kullanıcı Yükümlülükleri</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Kayıt sırasında doğru ve güncel bilgiler vermekle yükümlüsünüz</li>
              <li>Hesap bilgilerinizin gizliliğinden siz sorumlusunuz</li>
              <li>Platform içeriklerini izinsiz kopyalama, dağıtma veya ticari amaçla kullanma yasaktır</li>
              <li>Sınav süreçlerinde dürüstlük kurallarına uymakla yükümlüsünüz</li>
              <li>Platformun güvenliğini tehlikeye atacak faaliyetlerde bulunmak yasaktır</li>
              <li>Diğer kullanıcıların haklarına saygı göstermek zorunludur</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Fikri Mülkiyet Hakları</h2>
            <p>
              Platform üzerindeki tüm içerikler (eğitim materyalleri, videolar, görseller, yazılım, tasarım) 
              İSG Akademi'nin veya lisans verenlerin fikri mülkiyetindedir. Bu içeriklerin izinsiz kullanımı, 
              çoğaltılması veya dağıtılması yasaktır ve yasal işlem başlatılabilir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Sertifikalar</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sertifikalar, ilgili eğitimin başarıyla tamamlanması halinde otomatik olarak oluşturulur</li>
              <li>Sertifika geçerlilik süreleri ilgili mevzuata tabidir</li>
              <li>Sahte veya manipüle edilmiş sertifika kullanımı yasal sorumluluk doğurur</li>
              <li>Sertifika doğrulama hizmeti kamuya açıktır</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Ödeme ve İptal</h2>
            <p>
              Ücretli hizmetlere ilişkin ödeme koşulları satın alma sırasında belirtilir. 
              İptal ve iade koşulları, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve 
              ilgili yönetmelikler çerçevesinde uygulanır. Dijital içerik hizmetlerinde, 
              içeriğe erişim sağlandıktan sonra cayma hakkı kullanılamaz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Sorumluluk Sınırlaması</h2>
            <p>
              Platform, eğitim içeriklerinin doğruluğu ve güncelliği konusunda azami özeni gösterir. 
              Ancak teknik arızalar, kesintiler veya üçüncü taraf kaynaklı sorunlardan dolayı 
              doğabilecek zararlardan sorumlu tutulamaz. Platform, önceden bildirimde bulunarak 
              hizmet koşullarında değişiklik yapma hakkını saklı tutar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Hesap Askıya Alma ve Fesih</h2>
            <p>
              Kullanım koşullarının ihlali halinde, platformun hesabınızı askıya alma veya 
              feshetme hakkı bulunmaktadır. Hesap feshi durumunda yasal saklama yükümlülükleri 
              kapsamındaki verileriniz ilgili süre boyunca muhafaza edilir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Uygulanacak Hukuk ve Yetkili Mahkeme</h2>
            <p>
              Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. 
              Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. İletişim</h2>
            <p>
              Kullanım koşulları hakkında sorularınız için <strong>info@isgakademi.com</strong> adresinden 
              bizimle iletişime geçebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
