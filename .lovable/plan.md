# ISG Eğitim Platformu - Mevcut Durum Analizi ve Eksiklik Planı

## Mevcut Durumda Yapılmış Olanlar (Güncel: 2026-03-19)

| Modül                     | Durum  | Detay                                                                |
| ------------------------- | ------ | -------------------------------------------------------------------- |
| Auth / Giriş-Kayıt        | ✅ Tamam | Email+şifre, TC ile giriş, şifre sıfırlama, profil ayarları         |
| Rol Tabanlı Yetkilendirme | ✅ Tamam | user_roles, has_role/is_admin, ProtectedRoute, firm_admin            |
| Profil Yönetimi           | ✅ Tamam | profiles tablosu, profil düzenleme + şifre değiştirme sayfası        |
| Firma Yönetimi            | ✅ Tamam | CRUD, branding, dosya yükleme, çalışan atama, firma bazlı tema      |
| Kurs Yönetimi             | ✅ Tamam | Kurs CRUD, ders (lesson) katmanı, SCORM/Sınav/Canlı/İçerik türleri  |
| SCORM Entegrasyonu        | ✅ Tamam | Profesyonel ScormPlayer, srcDoc yaklaşımı, ilerleme takibi           |
| Sınav Sistemi             | ✅ Tamam | CRUD, soru ekleme, AI ile soru üretimi, sınav çözme, değerlendirme   |
| Sertifika                 | ✅ Tamam | Şablonlar, PDF üretimi, QR kod, doğrulama, yönetim sayfası          |
| Raporlama                 | ✅ Tamam | Rapor Merkezi, PDF+Excel export, firma raporları, manuel tamamlama   |
| Öğrenci Paneli            | ✅ Tamam | Dashboard, eğitim listesi, sınav, sertifika, profil, yardım         |
| Admin Paneli              | ✅ Tamam | Dashboard, kullanıcı/firma/kurs/sınav/sertifika/grup/analitik       |
| Firma Admin Paneli        | ✅ Tamam | Dashboard, çalışanlar, eğitimler, raporlar, sertifikalar             |
| Grup Anahtarı Sistemi     | ✅ Tamam | Grup CRUD, anahtar üretimi, öğrenci katılımı, otomatik enrollment   |
| AI Entegrasyonu           | ✅ Tamam | AI içerik üretimi, sınav sorusu üretimi, ders özeti                  |
| Loglama                   | ✅ Tamam | activity_logs tablosu, log görüntüleme sayfası (/admin/logs)         |
| Canlı Ders (BBB)          | ✅ Tamam | Admin yönetimi UI, öğrenci katılımı, süre takibi, popup/sekme        |

---

## Tamamlanan Öncelikler

### Öncelik 1: Canlı Ders (BBB) Entegrasyonu ✅
- ✅ Admin paneline canlı ders yönetimi UI'ı (oda linki, ders anahtarı)
- ✅ Öğrenci tarafında canlı ders sayfası (popup ile BBB, katılım takibi)

### Öncelik 2: Güvenlik ve KVKK ✅
- ✅ KVKK, Gizlilik Politikası, Çerez Bildirimi, Kullanım Şartları sayfaları
- ✅ Çerez onay banner'ı
- ✅ TC Kimlik No maskeleme fonksiyonu (mask_tc_identity)
- ✅ Soft delete (profiles, courses, enrollments, firms, exams, certificates, lessons, groups)
- ✅ Soft delete RLS politikaları (silinen kayıtlar normal kullanıcılara gizli)

### Öncelik 3: Eksik Admin Sayfaları ✅
- ✅ Log görüntüleme sayfası (/admin/logs)
- ✅ Ayarlar sayfası (/admin/settings)

### Öncelik 4: Seed Verileri
- 8 kurs ve alt dersleri (Az Tehlikeli, Tehlikeli, Çok Tehlikeli kategorileri)

### Öncelik 5: İyileştirmeler ✅
- ✅ Eğitim geçmişi detay sayfası (/dashboard/courses/:enrollmentId)
- ✅ Anlık aktif kullanıcı izleme (Realtime + activity_logs)
- ✅ Rate limiting (login için client-side)
