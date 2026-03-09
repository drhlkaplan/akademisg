import { MainLayout } from "@/components/layout/MainLayout";

export default function KVKK() {
  return (
    <MainLayout>
      <div className="container py-12 md:py-20 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">KVKK Aydınlatma Metni</h1>
        <p className="text-sm text-muted-foreground mb-8">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Veri Sorumlusu</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla
              İSG Akademi Online Eğitim Platformu ("Platform") tarafından aşağıda açıklanan kapsamda işlenebilecektir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Kişisel Verilerin İşlenme Amacı</h2>
            <p>Toplanan kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Üyelik işlemlerinin gerçekleştirilmesi ve hesap yönetimi</li>
              <li>Eğitim hizmetlerinin sunulması ve eğitim süreçlerinin takibi</li>
              <li>Sertifika oluşturma ve doğrulama işlemleri</li>
              <li>İş sağlığı ve güvenliği mevzuatı kapsamında yasal yükümlülüklerin yerine getirilmesi</li>
              <li>Sınav süreçlerinin yönetilmesi ve sonuçların raporlanması</li>
              <li>Firma ve kurumsal müşteri yönetimi</li>
              <li>İletişim faaliyetlerinin yürütülmesi</li>
              <li>Platform güvenliğinin sağlanması ve hukuki uyuşmazlıkların çözümü</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. İşlenen Kişisel Veriler</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, TC Kimlik Numarası (maskelenmiş olarak saklanır)</li>
              <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası</li>
              <li><strong>Eğitim Bilgileri:</strong> Katıldığınız eğitimler, sınav sonuçları, sertifika bilgileri, ders ilerleme durumu</li>
              <li><strong>İşlem Güvenliği Bilgileri:</strong> IP adresi, tarayıcı bilgileri, giriş/çıkış kayıtları</li>
              <li><strong>Firma Bilgileri:</strong> Çalıştığınız firma adı ve firma ile ilişkilendirme bilgileri</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Kişisel Verilerin Aktarılması</h2>
            <p>
              Kişisel verileriniz; yasal yükümlülükler kapsamında yetkili kamu kurum ve kuruluşlarına, 
              iş ortaklarımıza (eğitim içerik sağlayıcıları), hizmet aldığımız üçüncü taraf teknoloji sağlayıcılara 
              ve firmanızın yetkili temsilcilerine aktarılabilecektir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
            <p>
              Kişisel verileriniz; web sitesi üzerinden yapılan kayıt işlemleri, eğitim süreçleri ve 
              çerezler aracılığıyla otomatik veya otomatik olmayan yollarla toplanmaktadır.
              İşleme faaliyetleri; KVKK'nın 5. ve 6. maddelerinde belirtilen sözleşmenin ifası, 
              yasal yükümlülük, meşru menfaat ve açık rıza hukuki sebeplerine dayanmaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Veri Sahibinin Hakları</h2>
            <p>KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
              <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
              <li>Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme</li>
              <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme</li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
              <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Başvuru</h2>
            <p>
              Yukarıdaki haklarınızı kullanmak için <strong>info@isgakademi.com</strong> adresine 
              kimliğinizi tespit edici belgeler ile birlikte yazılı olarak başvurabilirsiniz.
              Başvurularınız en geç 30 gün içinde ücretsiz olarak sonuçlandırılacaktır.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
