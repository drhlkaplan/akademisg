export interface CertTopicGroup {
  group: string;
  items: { label: string; checked: boolean }[];
}

const mk = (labels: string[], checked = true) => labels.map((label) => ({ label, checked }));

export const DEFAULT_CERT_TOPICS: CertTopicGroup[] = [
  {
    group: "Genel Konular",
    items: mk([
      "Çalışma Mevzuatı İle İlgili Bilgiler",
      "Çalışanların Yasal Hak Ve Sorumlulukları",
      "İşyeri Temizliği Ve Düzeni",
      "İş Kazası Ve Meslek Hastalığından Doğan Hukuki Sonuçlar",
    ]),
  },
  {
    group: "Teknik Konular",
    items: mk([
      "Kimyasal, Fiziksel Ve Ergonomik Risk Etmenleri",
      "Elle Kaldırma Ve Taşıma",
      "Parlama, Patlama, Yangın Ve Yangından Korunma",
      "İş Ekipmanlarının Güvenli Kullanımı",
      "Ekranlı Araçlarla Çalışma",
      "Elektrik, Tehlikeleri, Riskleri Ve Önlemleri",
      "İş Kazalarının Sebepleri Ve Korunma Prensipleri İle Tekniklerinin Uygulanması",
      "Güvenlik Ve Sağlık İşaretleri",
      "Kişisel Koruyucu Donanım Kullanımı",
      "İş Sağlığı Ve Güvenliği Genel Kuralları Ve Güvenlik Kültürü",
      "Tahliye Ve Kurtarma",
    ]),
  },
  {
    group: "Sağlık Konuları",
    items: mk([
      "Meslek Hastalıklarının Sebepleri",
      "Hastalıktan Korunma Prensipleri Ve Korunma Tekniklerinin Uygulanması",
      "Biyolojik Ve Psikososyal Risk Etmenleri",
      "İlkyardım",
      "Tütün Ürünlerinin Zararları Ve Pasif Etkilenim",
    ]),
  },
  {
    group: "Diğer Konular",
    items: [
      ...mk([
        "Yüksekte Çalışma (tehlikeler, riskler, kontrol tedbirleri ve güvenli çalışma yöntemleri)",
        "Covid-19 Eğitimi",
      ]),
      ...mk(
        [
          "İş Hijyeni",
          "Kapalı Ortamda Çalışma",
          "Radyasyon Riskinin Olduğu Ortamlarda Çalışma",
          "Kaynakla Çalışma",
          "Kanserojen Maddelerin Yol Açtığı Olası Sağlık Riskleri",
          "Özel Risk Taşıyan Ekipman İle Çalışma",
        ],
        false,
      ),
    ],
  },
];

export const DEFAULT_LEGAL_TEXT =
  "15 Mayıs 2013 Tarihli ve 28648 Sayılı Resmi Gazete'de Yayımlanan \"Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik\" (Değişik: RG-24.05.2018-30430) Madde 12 – (7) fıkrası kapsamında; {company_name} tarafından verilen İş Sağlığı ve Güvenliği {delivery_method}ine katılmış ve eğitim sonu sınavını başarıyla tamamlayarak bu eğitim belgesini almaya hak kazanmıştır.";
