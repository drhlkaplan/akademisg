import { MainLayout } from "@/components/layout/MainLayout";

export default function CookiePolicy() {
  return (
    <MainLayout>
      <div className="container py-12 md:py-20 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Çerez Politikası</h1>
        <p className="text-sm text-muted-foreground mb-8">Son güncelleme: {new Date().toLocaleDateString("tr-TR")}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-foreground/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Çerez Nedir?</h2>
            <p>
              Çerezler, web sitemizi ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza yerleştirilen 
              küçük metin dosyalarıdır. Bu dosyalar, web sitesinin düzgün çalışması, güvenliğin sağlanması, 
              kullanıcı deneyiminin iyileştirilmesi ve ziyaretçi istatistiklerinin analiz edilmesi amacıyla kullanılmaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Kullandığımız Çerez Türleri</h2>
            
            <h3 className="text-lg font-medium text-foreground mt-4">2.1 Zorunlu Çerezler</h3>
            <p>
              Platformun temel işlevlerinin çalışması için gereklidir. Oturum yönetimi, kimlik doğrulama 
              ve güvenlik ayarları bu çerezler aracılığıyla sağlanır. Bu çerezler devre dışı bırakılamaz.
            </p>
            <div className="bg-muted/30 rounded-lg p-4 mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-foreground">Çerez</th>
                    <th className="text-left py-2 font-medium text-foreground">Amaç</th>
                    <th className="text-left py-2 font-medium text-foreground">Süre</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2">sb-session</td>
                    <td className="py-2">Oturum yönetimi ve kimlik doğrulama</td>
                    <td className="py-2">Oturum</td>
                  </tr>
                  <tr>
                    <td className="py-2">sb-refresh-token</td>
                    <td className="py-2">Oturum yenileme</td>
                    <td className="py-2">30 gün</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-medium text-foreground mt-4">2.2 İşlevsel Çerezler</h3>
            <p>
              Dil tercihi, tema ayarları ve kullanıcı tercihlerinizi hatırlamak için kullanılır. 
              Bu çerezler olmadan bazı özellikler düzgün çalışmayabilir.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4">2.3 Analitik Çerezler</h3>
            <p>
              Platformun nasıl kullanıldığını anlamamıza yardımcı olan istatistiksel veriler toplar. 
              Bu veriler anonim olarak işlenir ve hizmet kalitemizi artırmak için kullanılır.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4">2.4 Tercih Çerezleri</h3>
            <p>
              Çerez onay tercihinizi saklamak için kullanılır.
            </p>
            <div className="bg-muted/30 rounded-lg p-4 mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-foreground">Çerez</th>
                    <th className="text-left py-2 font-medium text-foreground">Amaç</th>
                    <th className="text-left py-2 font-medium text-foreground">Süre</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">cookie-consent</td>
                    <td className="py-2">Çerez tercihlerinizi saklar</td>
                    <td className="py-2">365 gün</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Çerezleri Yönetme</h2>
            <p>
              Tarayıcı ayarlarınızdan çerezleri yönetebilir veya silebilirsiniz. Ancak zorunlu çerezlerin 
              devre dışı bırakılması platformun düzgün çalışmasını engelleyebilir.
            </p>
            <p>Popüler tarayıcılarda çerez ayarları:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Chrome:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler</li>
              <li><strong>Firefox:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler ve Site Verileri</li>
              <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezleri Yönet</li>
              <li><strong>Edge:</strong> Ayarlar → Çerezler ve Site İzinleri</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Değişiklikler</h2>
            <p>
              Çerez politikamızı zaman zaman güncelleyebiliriz. Değişiklikler bu sayfada yayımlandığı 
              anda yürürlüğe girer. Önemli değişiklikler için ek bildirim yapılabilir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. İletişim</h2>
            <p>
              Çerez politikamız hakkında sorularınız için <strong>info@isgakademi.com</strong> adresinden 
              bizimle iletişime geçebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
