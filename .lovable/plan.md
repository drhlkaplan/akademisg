# ISG Eğitim Platformu - Mevcut Durum Analizi ve Eksiklik Planı

## Mevcut Durumda Yapılmış Olanlar


| Modül                     | Durum | Detay                                                               |
| ------------------------- | ----- | ------------------------------------------------------------------- |
| Auth / Giriş-Kayıt        | Kısmi | Email+şifre giriş/kayıt var, şifre sıfırlama yok                    |
| Rol Tabanlı Yetkilendirme | Tamam | user_roles tablosu, has_role/is_admin fonksiyonları, ProtectedRoute |
| Profil Yönetimi           | Kısmi | profiles tablosu var, profil düzenleme sayfası yok                  |
| Firma Yönetimi            | Tamam | CRUD, aktif/pasif, çalışan atama                                    |
| Kurs Yönetimi             | Kısmi | Kurs CRUD var, ders (lesson) kavramı yok - kurs = tek SCORM paketi  |
| SCORM Entegrasyonu        | Kısmi | ScormPlayer, useScormApi, scorm_packages tablosu var                |
| Sınav Sistemi             | Tamam | Sınav CRUD, soru ekleme, sınav çözme, otomatik değerlendirme        |
| Sertifika                 | Kısmi | Tablo ve doğrulama sayfası var, otomatik üretim/PDF yok             |
| Raporlama                 | Kısmi | Sınav raporları var, firma/kullanıcı/kurs raporları yok             |
| Öğrenci Paneli            | Kısmi | Dashboard, eğitim listesi, sınav girişi var                         |
| Admin Paneli              | Kısmi | Dashboard, kullanıcı/firma/kurs/sınav yönetimi var                  |
| Loglama                   | Kısmi | activity_logs tablosu var, log görüntüleme sayfası yok              |
| Canlı Ders (BBB)          | Yok   | Hiç uygulanmamış                                                    |


---

## Eksikler ve Uygulama Planı (Adım Adım)

### FAZA 1: Veritabanı Yeniden Yapılandırma (Ders/Lesson Katmanı)

Mevcut sistemde "lesson" (ders) kavramı yok. Kurslar doğrudan SCORM paketlerine bağlı. Prompt, her kursun birden fazla derse sahip olmasını ve derslerin farklı türlerde (SCORM, Sınav, Canlı Oturum, İçerik) olmasını gerektiriyor.

**1.1 - `lessons` tablosu oluştur**

- id, course_id, title, type (enum: scorm, exam, live, content), sort_order, duration_minutes, is_active, scorm_package_id (nullable), exam_id (nullable), content_url (nullable), created_at, updated_at

**1.2 - `groups` tablosu oluştur (Grup Anahtarı)**

- id, name, group_key (unique), firm_id, is_active, created_at

**1.3 - `users_to_groups` tablosu oluştur**

- id, user_id, group_id, created_at

**1.4 - `group_courses` tablosu oluştur**

- id, group_id, course_id, created_at

**1.5 - `live_sessions` tablosu oluştur (BBB Canlı Ders)**

- id, lesson_id, room_url, room_key, is_active, created_at, updated_at

**1.6 - `live_session_tracking` tablosu oluştur**

- id, live_session_id, user_id, joined_at, left_at, duration_seconds, created_at

**1.7 - RLS politikaları ekle** (tüm yeni tablolar için)

**1.8 - Mevcut scorm_packages ve exams tablolarına lesson ilişkisi kur**

---

### FAZA 2: Seed Verileri (Kurs ve Ders Yapıları)

Prompt'ta belirtilen 5 kurs ve alt derslerini otomatik oluşturacak bir migration veya seed scripti:

- A) Az Tehlikeli (8 saat, 6 ders)
- B) Az Tehlikeli Canlı ISG Kurs (8 saat, 3 ders)
- C) Çok Tehlikeli (16 saat, 7 ders)
- D) Çok Tehlikeli Canlı ISG Kurs-1 (8 saat, 3 ders)
- E) Çok Tehlikeli Canlı ISG Kurs-2 (8 saat, 3 ders)
- F) Tehlikeli (12 saat, 7 ders)
- G) Tehlikeli Canlı ISG Kurs-1 (8 saat, 3 ders)
- H) Tehlikeli Canlı ISG Kurs-2 (4 saat, 3 ders)

Her ders, uygun türde (SCORM/Sınav/Canlı) oluşturulacak.

---

### FAZA 3: Auth ve Kullanıcı Yönetimi Eksikleri

**3.1 - Şifre sıfırlama akışı**

- Forgot Password bileşeni + `/reset-password` sayfası

**3.2 - TC Kimlik No ile kayıt zorunluluğu**

- Kayıt formuna TC Kimlik alanı ekle, basit algoritma doğrulaması (11 hane, Luhn benzeri TC algoritması)
- IdentityVerificationProvider arayüzü (soyutlama)

**3.3 - Toplu kullanıcı ekleme (Excel/CSV import)**

- Admin paneline CSV yükleme, doğrulama ve hata raporu özelliği

**3.4 - Firma Yetkilisi rolü**

- firm_admin rolünü app_role enum'a ekle
- Firma yetkilisi sadece kendi firmasını görecek şekilde RLS ve UI

---

### FAZA 4: Ders (Lesson) Bazlı Eğitim Akışı

**4.1 - CourseLearning sayfasını yeniden tasarla**

- Sol panel: ders listesi (sıralı)
- Sağ panel: seçili dersin içeriği (SCORM Player / Sınav / BBB iframe / İçerik)
- Ders tamamlama ve ilerleme takibi lesson_progress tablosunda

**4.2 - Admin kurs detay sayfası**

- Kursa ders ekleme/düzenleme/sıralama
- Ders türü seçimi ve ilgili içerik bağlama (SCORM paketi, sınav, BBB odası, URL)

---

### FAZA 5: Canlı Ders (BBB) Entegrasyonu

**5.1 - Admin paneline canlı ders yönetimi**

- Oda linki ve ders anahtarı tanımlama, anlık değiştirme
- Kullanıcı/grup bazlı anahtar paylaşımı

**5.2 - Öğrenci tarafında canlı ders sayfası**

- Ders anahtarı girişi, iframe ile BBB odası gömme
- Katılım takibi (giriş/çıkış zamanı, süre)

---

### FAZA 6: Sertifika Modülü Tamamlama

**6.1 - Otomatik sertifika üretimi**

- Eğitimi + sınavı tamamlayan kullanıcıya otomatik sertifika oluşturan trigger veya edge function

**6.2 - PDF sertifika üretimi**

- Edge function ile PDF oluşturma (jsPDF veya benzeri)
- Sertifika şablonu: logo, metin alanları admin tarafından düzenlenebilir

**6.3 - QR kodlu doğrulama**

- Sertifikaya QR kod ekleme, public doğrulama sayfası (zaten kısmen var)

**6.4 - Sertifika iptal/yenileme**

- Admin panelinde sertifika yönetimi sayfası (listeleme, iptal, yenileme)

---

### FAZA 7: Grup Anahtarı Sistemi

**7.1 - Admin panelinde grup yönetimi**

- Grup oluştur, anahtar üret, kullanıcı ve kurs ata

**7.2 - Öğrenci panelinde grup anahtarı girişi**

- Profil sayfasında grup anahtarı girme
- Otomatik gruba atama ve eğitimleri etkinleştirme (enrollment oluşturma)

---

### FAZA 8: Raporlama ve Loglama

**8.1 - Firma bazlı raporlar**
**8.2 - Kullanıcı bazlı raporlar**
**8.3 - Kurs/ders raporları**
**8.4 - Log görüntüleme sayfası** (admin/logs)
**8.5 - Excel ve PDF rapor export** (edge function)
**8.6 - Anlık aktif kullanıcı izleme** (Realtime)

---

### FAZA 9: Admin Paneli Eksik Sayfalar

**9.1 - Sertifika yönetimi sayfası** (`/admin/certificates`)
**9.2 - Log görüntüleme sayfası** (`/admin/logs`)
**9.3 - Ayarlar sayfası** (`/admin/settings`) - bakım modu, yedekleme
**9.4 - Grup yönetimi sayfası** (`/admin/groups`)

---

### FAZA 10: Öğrenci Paneli Eksik Sayfalar

**10.1 - Profil sayfası** - bilgi düzenleme, şifre değiştirme, grup anahtarı girme
**10.2 - Eğitim geçmişi sayfası**
**10.3 - Sertifika listeleme ve indirme sayfası**
**10.4 - Sınavlarım sayfası**

---

### FAZA 11: Güvenlik ve KVKK

**11.1 - TC Kimlik No maskeleme/şifreleme** - veritabanı seviyesinde
**11.2 - Soft delete** - ilgili tablolara deleted_at kolonu
**11.3 - Rate limiting** - login ve API için edge function bazlı
**11.4 - SCORM izleme detaylandırma** - cmi.core.* alanlarını lesson_progress'e ekleme
**11.5 - Loglarda hassas veri temizleme**

---

### FAZA 12: Storage ve Dosya Yönetimi

**12.1 - SCORM paketleri için storage bucket**
**12.2 - Sertifika PDF'leri için storage bucket**
**12.3 - SCORM paket yükleme UI'ı** (admin panelinde)

---

## Teknik Detaylar

### Yeni Veritabanı Tabloları

```text
lessons
├── id (uuid, PK)
├── course_id (uuid, FK → courses)
├── title (text)
├── type (enum: scorm, exam, live, content)
├── sort_order (int)
├── duration_minutes (int)
├── is_active (bool)
├── scorm_package_id (uuid, nullable, FK → scorm_packages)
├── exam_id (uuid, nullable, FK → exams)
├── content_url (text, nullable)
├── created_at / updated_at

groups
├── id (uuid, PK)
├── name (text)
├── group_key (text, unique)
├── firm_id (uuid, nullable, FK → firms)
├── is_active (bool)
├── created_at

live_sessions
├── id (uuid, PK)
├── lesson_id (uuid, FK → lessons)
├── room_url (text)
├── room_key (text)
├── is_active (bool)
├── created_at / updated_at

live_session_tracking
├── id (uuid, PK)
├── live_session_id (uuid, FK)
├── user_id (uuid)
├── joined_at / left_at (timestamptz)
├── duration_seconds (int)
```

### Mevcut Tablo Değişiklikleri

- `lesson_progress`: lesson_id kolonu eklenmeli (nullable, mevcut verilerle uyum)
- `app_role` enum'a `firm_admin` eklenmeli
- Yeni enum: `lesson_type` (scorm, exam, live, content)

### Yeni Sayfalar / Route'lar

- `/reset-password`
- `/admin/certificates`
- `/admin/logs`
- `/admin/settings`
- `/admin/groups`
- `/dashboard/profile`
- `/dashboard/courses` (detaylı liste)
- `/dashboard/exams`
- `/dashboard/certificates`

---

## Uygulama Sırası Özeti


| Adım | Faz                                                   | Tahmini Karmaşıklık |
| ---- | ----------------------------------------------------- | ------------------- |
| 1    | Veritabanı - lessons, groups, live_sessions tabloları | Yüksek              |
| 2    | Seed - 8 kurs ve dersleri                             | Orta                |
| 3    | Auth - şifre sıfırlama, TC doğrulama                  | Orta                |
| 4    | Ders bazlı eğitim akışı (UI)                          | Yüksek              |
| 5    | Canlı ders (BBB) entegrasyonu                         | Orta                |
| 6    | Sertifika PDF üretimi ve yönetimi                     | Yüksek              |
| 7    | Grup anahtarı sistemi                                 | Orta                |
| 8    | Raporlama ve loglama                                  | Yüksek              |
| 9    | Admin eksik sayfalar                                  | Orta                |
| 10   | Öğrenci eksik sayfalar                                | Orta                |
| 11   | Güvenlik ve KVKK                                      | Orta                |
| 12   | Storage ve dosya yönetimi                             | Düşük               |


Bu plan oldukça kapsamlı. Her fazı ayrı ayrı, adım adım uygulayacağız. Onayınızla Faz 1'den (veritabanı yeniden yapılandırma) başlayabiliriz.