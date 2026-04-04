
# ISG Akademi — Yeni Yönetmelik Uyumlu LMS Dönüşüm Master Planı

---

## 1. Yönetici Özeti

Mevcut ISG Akademi platformu, yeni İş Sağlığı ve Güvenliği eğitim yönetmeliğine tam uyumlu hale getirilecektir. Bu dönüşüm:

- **7 eğitim türünü** (İşe Başlama, Temel, Tekrar, Bilgi Yenileme, İlave, Özel Grup, Destek Elemanı) ayrı ayrı yönetir
- **3 tehlike sınıfına** göre süre, yöntem ve içerik kurallarını otomatik uygular
- **4. Konu Başlığını** (İşe ve İşyerine Özgü Riskler) firma/sektör/işyeri bazında dinamik atar
- **SCORM + BBB + Yüz Yüze** entegre ders yöntemlerini tek platformda sunar
- **Yoklama, katılım kanıtı, denetim izi** ve belge üretimini tam otomatik sağlar
- **Çok kiracılı (multi-tenant)** yapıda firma izolasyonlu çalışır

---

## 2. Yeni Sistem Mimarisi

### Katmanlar
```
┌─────────────────────────────────────────────┐
│  UI Layer (React + Tailwind)                │
│  - Öğrenci Paneli                           │
│  - Admin/Eğitmen Paneli                     │
│  - Firma Yetkilisi Paneli                   │
│  - Kurumsal Web Sitesi                      │
├─────────────────────────────────────────────┤
│  Business Logic Layer                       │
│  - Uyumluluk Kuralları Motoru               │
│  - Tamamlama Motoru                         │
│  - Atama Motoru                             │
│  - Belge Üretim Motoru                      │
│  - Tekrar Eğitim Zamanlayıcı               │
├─────────────────────────────────────────────┤
│  Integration Layer                          │
│  - SCORM 1.2/2004 Runtime                   │
│  - BBB Canlı Ders API                       │
│  - Yüz Yüze Oturum Yönetimi               │
│  - xAPI/LRS                                 │
├─────────────────────────────────────────────┤
│  Data Layer (Supabase/PostgreSQL)           │
│  - RLS + Multi-tenant isolation             │
│  - Audit trail                              │
│  - Soft delete                              │
└─────────────────────────────────────────────┘
```

---

## 3. Eğitim Türleri Matrisi

| Eğitim Türü | Enum | Min Süre | Tekrar | Yöntem | Sınav |
|---|---|---|---|---|---|
| İşe Başlama Eğitimi | `ise_baslama` | 2 saat | Her işe başlamada | Yüz yüze + pratik | Opsiyonel |
| Temel Eğitim | `temel` | 8/12/16 saat | - | Online/Canlı/Yüz yüze | Ön + Final (min %60) |
| Tekrar Temel Eğitim | `tekrar` | 8 saat (tüm sınıflar) | 1/2/3 yıl | Online/Canlı/Yüz yüze | Final (min %60) |
| Bilgi Yenileme | `bilgi_yenileme` | Değişken | İhtiyaç halinde | Esnek | Opsiyonel |
| İlave Eğitim | `ilave` | Değişken | İhtiyaç halinde | Esnek | Opsiyonel |
| Özel Grup Eğitimi | `ozel_grup` | Değişken | İhtiyaç halinde | Esnek | Opsiyonel |
| Destek Elemanı/Temsilci | `destek_elemani` | Değişken | İhtiyaç halinde | Esnek | Opsiyonel |

---

## 4. Tehlike Sınıfına Göre Süre ve Yöntem Matrisi

### Temel Eğitim Süreleri
| Tehlike Sınıfı | Toplam Min Süre | Konu 1-3 Min | Konu 4 Min | Konu 4 Yöntemi | Tekrar Periyodu |
|---|---|---|---|---|---|
| Az Tehlikeli | 8 ders saati | 6 saat | 2 saat | Online/Yüz yüze/Hibrit | 3 yılda 1 |
| Tehlikeli | 12 ders saati | 9 saat | 3 saat | **Sadece Yüz Yüze** | 2 yılda 1 |
| Çok Tehlikeli | 16 ders saati | 12 saat | 4 saat | **Sadece Yüz Yüze** | Yılda 1 |

### Tekrar Eğitim Süreleri
| Tehlike Sınıfı | Toplam Min Süre | Konu 4 Min | Konu 4 Yöntemi |
|---|---|---|---|
| Tüm sınıflar | 8 ders saati | Orantılı | Tehlike sınıfına göre |

### Ders Yöntemi Kuralları
| Konu Grubu | Az Tehlikeli | Tehlikeli | Çok Tehlikeli |
|---|---|---|---|
| 1. Genel Konular | Online/Canlı/Yüz yüze | Online/Canlı/Yüz yüze | Online/Canlı/Yüz yüze |
| 2. Sağlık Konuları | Online/Canlı/Yüz yüze | Online/Canlı/Yüz yüze | Online/Canlı/Yüz yüze |
| 3. Teknik Konular | Online/Canlı/Yüz yüze | Online/Canlı/Yüz yüze | Online/Canlı/Yüz yüze |
| 4. İşyerine Özgü Riskler | Online/Canlı/Yüz yüze | **Sadece Yüz Yüze** | **Sadece Yüz Yüze** |

---

## 5. Yeni Kurs Şablonları

### A. Temel Eğitim Şablonları

**Az Tehlikeli Temel Eğitim (8 saat)**
1. Ön Değerlendirme Sınavı (exam, 30dk)
2. Genel Konular (scorm/online, 2 saat)
3. Sağlık Konuları (scorm/online, 2 saat)
4. Teknik Konular (scorm/online, 2 saat)
5. İşe ve İşyerine Özgü Riskler (scorm/online/yüz yüze, 2 saat)
6. Final Sınavı (exam, 45dk)

**Tehlikeli Temel Eğitim (12 saat)**
1. Ön Değerlendirme Sınavı (exam, 30dk)
2. Genel Konular (scorm/canlı, 3 saat)
3. Sağlık Konuları (scorm/canlı, 3 saat)
4. Teknik Konular (scorm/canlı, 3 saat)
5. İşe ve İşyerine Özgü Riskler (**yüz yüze zorunlu**, 3 saat)
6. Final Sınavı (exam, 45dk)

**Çok Tehlikeli Temel Eğitim (16 saat)**
1. Ön Değerlendirme Sınavı (exam, 30dk)
2. Genel Konular (scorm/canlı, 4 saat)
3. Sağlık Konuları (scorm/canlı, 4 saat)
4. Teknik Konular (scorm/canlı, 4 saat)
5. İşe ve İşyerine Özgü Riskler (**yüz yüze zorunlu**, 4 saat)
6. Final Sınavı (exam, 45dk)

### B. Tekrar Eğitim Şablonları (tüm sınıflar 8 saat)

1. Genel Konular Güncelleme (2 saat)
2. Sağlık Konuları Güncelleme (2 saat)
3. Teknik Konular Güncelleme (2 saat)
4. İşe ve İşyerine Özgü Riskler Güncelleme (2 saat, tehlike sınıfına göre yöntem)
5. Değerlendirme Sınavı (45dk)

### C. Diğer Eğitim Şablonları

**İşe Başlama Eğitimi (2 saat)**
- Yüz yüze + pratik zorunlu
- İşyeri tanıtımı, acil durum, KKD, temel kurallar
- Belge: İşe Başlama Eğitimi Tutanağı

**Bilgi Yenileme Eğitimi**
- Konu 4 odaklı (işyeri değişikliği / uzun devamsızlık sonrası)
- Süre: minimum 2 saat

---

## 6. Konu 1-2-3-4 Yapısının Yeni Tasarımı

### Konu Grubu 1: Genel Konular
- İSG mevzuatı ve yasal çerçeve
- Çalışan hak ve sorumlulukları
- İşveren yükümlülükleri
- İSG organizasyonu
- Risk değerlendirmesi temelleri

### Konu Grubu 2: Sağlık Konuları
- Meslek hastalıkları
- Ergonomi ve çalışma ortamı
- İlk yardım temelleri
- Biyolojik ve kimyasal risk faktörleri
- Psikososyal riskler

### Konu Grubu 3: Teknik Konular
- İş kazaları ve önleme
- Yangın güvenliği ve acil durum
- Elektrik güvenliği
- Makine ve ekipman güvenliği
- KKD kullanımı

### Konu Grubu 4: İşe ve İşyerine Özgü Riskler (Dinamik)
- Sektöre özel tehlikeler
- İşyeri risk değerlendirmesi sonuçları
- Acil durum planı (işyerine özel)
- Ekipman riskleri (işyerine özel)
- Çevresel maruziyetler
- İşletmeye özel güvenlik kuralları
- Örnek kaza senaryoları
- Korunma tedbirleri
- **İçerik firma/sektör/işyeri bazında dinamik atanır**

---

## 7. 4. Konu Başlığı — Sektör/Firma Bazlı Dinamik Yapı

### Mimari
```
sectors → sector_topic4_packs → company_topic4_assignments
                                        ↓
                              course_template_lessons (topic_group=4)
                                        ↓
                              learner gets assigned content
```

### Varsayılan Sektör Paketleri
Her paket SCORM veya HTML içerik olarak yüklenebilir:

| # | Sektör | Tehlike Sınıfı | Anahtar Riskler |
|---|--------|----------------|-----------------|
| 1 | Ofis / Büro | Az Tehlikeli | Ergonomi, göz sağlığı, elektrik, yangın |
| 2 | Satış / Perakende | Az Tehlikeli | Müşteri güvenliği, raf düzeni, kaldırma |
| 3 | Depo / Lojistik | Tehlikeli | Forklift, istifleme, düşme, yük kaldırma |
| 4 | İnşaat | Çok Tehlikeli | Yüksekte çalışma, kazı, iskele, vinç |
| 5 | Elektrik İşleri | Çok Tehlikeli | Elektrik çarpması, ark, topraklama |
| 6 | Üretim / İmalat | Tehlikeli | Makine güvenliği, gürültü, kimyasal |
| 7 | Lojistik / Nakliye | Tehlikeli | Araç güvenliği, yükleme, trafik |
| 8 | Sağlık / Hastane | Tehlikeli | Biyolojik risk, iğne batması, radyasyon |
| 9 | Eğitim / Okul | Az Tehlikeli | Laboratuvar, yangın, deprem |
| 10 | Gıda Üretimi | Tehlikeli | Hijyen, soğuk zincir, makine |
| 11 | Otel / Turizm | Az Tehlikeli | Mutfak, temizlik kimyasalları, yangın |
| 12 | Temizlik Hizmetleri | Tehlikeli | Kimyasal, kayma, yüksekte cam |
| 13 | Güvenlik Hizmetleri | Tehlikeli | Fiziksel risk, gece çalışma |
| 14 | Teknik Servis | Tehlikeli | Elektrik, yükseklik, el aletleri |
| 15 | Çağrı Merkezi | Az Tehlikeli | Ergonomi, ses, stres |
| 16 | Tekstil | Tehlikeli | Makine, toz, yangın |
| 17 | Metal / Makine | Çok Tehlikeli | Kaynak, talaş, gürültü, kimyasal |
| 18 | Kimya Sanayi | Çok Tehlikeli | Kimyasal maruz kalma, patlama, MSDS |
| 19 | Belediye / Saha | Tehlikeli | Trafik, kazı, ağır ekipman |
| 20 | Tarım / Sera | Tehlikeli | Tarım ilacı, makine, hayvan |

### Firma Bazlı Özelleştirme
- Admin, firmaya sektör paketi atar
- Firma yetkilisi ek içerik yükleyebilir (risk değerlendirmesi, acil durum planı)
- Sistem, firma+sektör eşleşmesine göre Konu 4 dersini otomatik oluşturur

---

## 8. Öğrenci Tamamlama Motoru Mantığı

### SCORM Dersler
```
1. Ders başlatıldı mı? → lesson_launched = true
2. Minimum süre geçirildi mi? → total_time >= min_duration
3. İlerleme %100 mü? → progress_measure = 1.0
4. Etkileşim noktaları geçildi mi? → interaction checkpoints
5. Hızlı ileri sarma engeli → anti-fast-forward logic
6. Sekme değiştirme takibi → tab_switch_count logged
7. lesson_status = completed/passed
```

### BBB Canlı Dersler
```
1. Oturuma katıldı mı? → join_time logged
2. Minimum süre sağlandı mı? → duration >= min_live_duration
3. Katılım durumu türetildi → attended/partial/absent
4. Eğitmen onayı (opsiyonel) → trainer_verified
5. Oturum sonu doğrulama sorusu (opsiyonel)
```

### Yüz Yüze Dersler
```
1. Oturum planlandı → date, time, location, trainer
2. Yoklama alındı → attendance logged (trainer/admin)
3. Süre kaydedildi → duration logged
4. Öğrenci sınıf içi onay → classroom_confirmation
5. Oturum sonu kısa soru/kabul → end_of_session_ack
6. Eğitmen nihai onay → trainer_approval
7. Ders tamamlandı → lesson completed
```

### Sınav Motoru
```
- Ön değerlendirme: Puan ne olursa olsun geçer (mevcut mantık korunur)
- Final sınavı: Minimum %60 geçer not
- 3 deneme hakkı (1 asıl + 2 tekrar)
- Tüm denemelerde başarısız → ilgili eğitimi yeniden al
- Sorular rastgele seçilir (mevcut mantık korunur)
```

### Kurs Tamamlama
```
1. Tüm zorunlu dersler tamamlandı mı?
2. Minimum toplam süre sağlandı mı?
3. Konu 4 yöntem kuralı sağlandı mı? (tehlikeli/çok tehlikeli → yüz yüze)
4. Final sınavı geçildi mi?
5. → Kurs tamamlandı, sertifika üretilebilir
```

---

## 9. Admin ve Eğitmen İş Akışları

### Admin İş Akışları
1. **Firma Yönetimi**: Oluştur/düzenle, sektör ata, tehlike sınıfı belirle
2. **Sektör Eşleme**: Firma → sektör → Konu 4 paketi ata
3. **Kurs Şablonu**: Eğitim türü + tehlike sınıfına göre şablon oluştur
4. **Yüz Yüze Sınıf**: Tarih, saat, mekan, eğitmen, kapasite
5. **Yoklama**: Sınıf bazlı yoklama al, onayla
6. **Tamamlama Onayı**: Hibrit/yüz yüze dersleri onayla
7. **Uyumluluk Raporu**: Firma bazlı eksik eğitim raporu
8. **Belge Üretimi**: Sertifika, tutanak, faaliyet raporu
9. **Tekrar Eğitim**: Vadesi gelen eğitimleri ata
10. **İşyeri Değişikliği**: Yeni Konu 4 + İşe Başlama ata

### Eğitmen İş Akışları
1. Sınıf listesini görüntüle
2. Yoklama al (katıldı/katılmadı/geç/kısmi)
3. Katılım onayla
4. Ders sonu doğrulama sorusu uygula
5. Oturumu tamamla ve kaydet

---

## 10. Kullanıcı Kayıt / Profil / Firma Seçim Akışı

### Kayıt Akışı
```
1. E-posta + Şifre + Ad Soyad + TC Kimlik
2. Firma seçimi:
   a) Firma kodu gir (grup anahtarı)
   b) Firma listesinden seç (aranabilir dropdown)
   c) "Firmam listede yok" → talep oluştur
3. Profil tamamlama:
   - Firma → otomatik sektör
   - Sektör → otomatik tehlike sınıfı
   - Tehlike sınıfı → otomatik kurs şablonu
4. Otomatik atama:
   - Uygun temel eğitim kursu atanır
   - Konu 4 paketi firma/sektöre göre yüklenir
   - Öğrenciye neden bu kursun atandığı gösterilir
```

### Firma/İşyeri Değişikliği
```
1. Profilde firma güncelle
2. Sistem eski kayıtları korur
3. Yeni işyerine göre:
   - Konu 4 güncelleme eğitimi ata
   - İşe başlama eğitimi ata
   - Eski ve yeni kayıtları bağla
```

---

## 11. Supabase Veri Tabanı Şeması

### YENİ TABLOLAR

```sql
-- Eğitim türleri
CREATE TABLE training_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- enum: ise_baslama, temel, tekrar, etc.
  name TEXT NOT NULL,
  description TEXT,
  min_duration_hours NUMERIC,
  requires_exam BOOLEAN DEFAULT false,
  requires_face_to_face BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sektörler
CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  default_hazard_class TEXT, -- az_tehlikeli, tehlikeli, cok_tehlikeli
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alt sektörler
CREATE TABLE sub_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES sectors(id),
  name TEXT NOT NULL,
  hazard_class_override TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- İşyeri türleri
CREATE TABLE workplace_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector_id UUID REFERENCES sectors(id),
  hazard_class TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Firma profil genişletme (mevcut firms tablosuna ek alanlar)
-- firms tablosuna eklenecek: sector_id, hazard_class, workplace_type_id

-- Konu 4 sektör paketleri
CREATE TABLE topic4_sector_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES sectors(id),
  hazard_class TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content_url TEXT, -- SCORM veya HTML
  scorm_package_id UUID REFERENCES scorm_packages(id),
  duration_minutes INTEGER DEFAULT 120,
  key_hazards JSONB, -- ["ergonomi", "elektrik", ...]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Firma bazlı Konu 4 ataması
CREATE TABLE company_topic4_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  topic4_pack_id UUID REFERENCES topic4_sector_packs(id),
  custom_content_url TEXT,
  custom_risk_data JSONB,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kurs şablon kuralları
CREATE TABLE course_template_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  training_type TEXT NOT NULL, -- enum
  hazard_class TEXT NOT NULL, -- enum
  min_total_hours NUMERIC NOT NULL,
  min_topic4_hours NUMERIC NOT NULL,
  topic4_method TEXT NOT NULL, -- online, face_to_face, hybrid
  recurrence_months INTEGER, -- null = no recurrence
  passing_score INTEGER DEFAULT 60,
  max_exam_attempts INTEGER DEFAULT 3,
  requires_pre_assessment BOOLEAN DEFAULT true,
  requires_final_assessment BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ders yöntemi kuralları
CREATE TABLE lesson_method_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id),
  allowed_methods TEXT[] NOT NULL, -- ['scorm', 'bbb_live', 'face_to_face']
  required_method TEXT, -- null = any allowed, 'face_to_face' = zorunlu
  topic_group INTEGER, -- 1, 2, 3, 4
  min_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Yüz yüze oturumlar
CREATE TABLE face_to_face_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id),
  course_id UUID REFERENCES courses(id),
  trainer_id UUID, -- user_id of trainer
  firm_id UUID REFERENCES firms(id),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER DEFAULT 30,
  attendance_code TEXT, -- optional classroom code
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Yüz yüze yoklama
CREATE TABLE face_to_face_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES face_to_face_sessions(id),
  user_id UUID NOT NULL,
  enrollment_id UUID REFERENCES enrollments(id),
  status TEXT DEFAULT 'pending', -- pending, attended, absent, late, partially_attended
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  trainer_verified BOOLEAN DEFAULT false,
  admin_verified BOOLEAN DEFAULT false,
  end_of_session_ack BOOLEAN DEFAULT false,
  verification_method TEXT, -- manual, qr, attendance_code
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Tekrar eğitim kuralları
CREATE TABLE recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES enrollments(id),
  user_id UUID NOT NULL,
  course_id UUID REFERENCES courses(id),
  hazard_class TEXT NOT NULL,
  training_type TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ NOT NULL,
  recurrence_months INTEGER NOT NULL,
  status TEXT DEFAULT 'active', -- active, due, overdue, renewed
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- İşyeri değişikliği kayıtları
CREATE TABLE workplace_change_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  previous_firm_id UUID REFERENCES firms(id),
  new_firm_id UUID REFERENCES firms(id),
  previous_sector_id UUID REFERENCES sectors(id),
  new_sector_id UUID REFERENCES sectors(id),
  previous_hazard_class TEXT,
  new_hazard_class TEXT,
  change_date DATE NOT NULL,
  requires_topic4_update BOOLEAN DEFAULT true,
  requires_ise_baslama BOOLEAN DEFAULT true,
  assigned_courses JSONB, -- IDs of newly assigned courses
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Uzun devamsızlık kayıtları
CREATE TABLE absence_renewal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  firm_id UUID REFERENCES firms(id),
  absence_start DATE NOT NULL,
  absence_end DATE NOT NULL,
  absence_days INTEGER,
  reason TEXT,
  requires_bilgi_yenileme BOOLEAN DEFAULT true,
  assigned_course_id UUID REFERENCES courses(id),
  status TEXT DEFAULT 'pending', -- pending, training_assigned, completed
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SSS / Bilgilendirme
CREATE TABLE faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT, -- genel, yonetmelik, egitim_turleri, belgeler
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ana sayfa içerik blokları
CREATE TABLE homepage_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_type TEXT NOT NULL, -- hero, feature, cta, info, faq
  title TEXT,
  subtitle TEXT,
  content TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Uyumluluk raporları
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  report_type TEXT NOT NULL, -- company_status, overdue, transcript
  generated_by UUID,
  report_data JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Belge şablonları (genişletilmiş)
-- Mevcut certificate_templates korunur, ek belge türleri eklenir
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL, -- temel_egitim_belgesi, ise_baslama_kaydi, etc.
  name TEXT NOT NULL,
  template_html TEXT,
  variables JSONB, -- kullanılabilir değişkenler
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Üretilen belgeler
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  template_id UUID REFERENCES document_templates(id),
  user_id UUID NOT NULL,
  enrollment_id UUID REFERENCES enrollments(id),
  firm_id UUID REFERENCES firms(id),
  document_data JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### MEVCUT TABLOLARA EKLEMELER

```sql
-- firms tablosuna
ALTER TABLE firms ADD COLUMN sector_id UUID REFERENCES sectors(id);
ALTER TABLE firms ADD COLUMN hazard_class TEXT DEFAULT 'az_tehlikeli';
ALTER TABLE firms ADD COLUMN workplace_type_id UUID REFERENCES workplace_types(id);
ALTER TABLE firms ADD COLUMN risk_profile JSONB;

-- lessons tablosuna
ALTER TABLE lessons ADD COLUMN topic_group INTEGER; -- 1, 2, 3, 4
ALTER TABLE lessons ADD COLUMN delivery_method TEXT DEFAULT 'scorm'; -- scorm, bbb_live, face_to_face, hybrid

-- courses tablosuna
ALTER TABLE courses ADD COLUMN training_type TEXT DEFAULT 'temel';
ALTER TABLE courses ADD COLUMN hazard_class TEXT;
ALTER TABLE courses ADD COLUMN min_total_hours NUMERIC;
ALTER TABLE courses ADD COLUMN is_template BOOLEAN DEFAULT false;

-- enrollments tablosuna
ALTER TABLE enrollments ADD COLUMN training_type TEXT;
ALTER TABLE enrollments ADD COLUMN recurrence_due_at TIMESTAMPTZ;
```

---

## 12. Rol ve Yetki Matrisi

| Yetki | super_admin | admin | firm_admin | trainer | learner |
|---|---|---|---|---|---|
| Kiracı yönetimi | ✅ | ❌ | ❌ | ❌ | ❌ |
| Firma yönetimi | ✅ | ✅ | Kendi firması | ❌ | ❌ |
| Sektör eşleme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kurs şablonu yönetimi | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kurs atama | ✅ | ✅ | Kendi firması | ❌ | ❌ |
| Yüz yüze oturum oluştur | ✅ | ✅ | ✅ | ✅ | ❌ |
| Yoklama al | ✅ | ✅ | ❌ | ✅ | ❌ |
| Tamamlama onayla | ✅ | ✅ | ❌ | ✅ | ❌ |
| Rapor görüntüle | ✅ | ✅ | Kendi firması | Kendi sınıfları | Kendi |
| Rapor dışa aktar | ✅ | ✅ | ✅ | ❌ | ❌ |
| Belge üret | ✅ | ✅ | ✅ | ❌ | ❌ |
| SSS yönet | ✅ | ✅ | ❌ | ❌ | ❌ |
| Sertifika yönet | ✅ | ✅ | ❌ | ❌ | ❌ |
| Denetim kaydı | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eğitim al | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 13. SCORM + BBB + Yüz Yüze Loglama ve Audit Tasarımı

### SCORM Loglama (mevcut sistem korunur + genişletilir)
- `lesson_progress`: status, score, time, location, suspend_data
- `scorm_runtime_data`: granüler CMI verileri
- `xapi_statements`: launched, progressed, completed, terminated
- **YENİ**: `tab_switch_count`, `idle_time`, `fast_forward_detected` xAPI context'e eklenir

### BBB Loglama (mevcut sistem korunur)
- `live_session_tracking`: join_at, left_at, duration_seconds
- `live_sessions`: room_url, is_active

### Yüz Yüze Loglama (YENİ)
- `face_to_face_sessions`: oturum planı
- `face_to_face_attendance`: yoklama kaydı
- `activity_logs`: tüm admin/eğitmen işlemleri
- `xapi_statements`: yüz yüze katılım verb'leri

### Audit Trail
Tüm kritik işlemler `activity_logs` + `xapi_statements` üzerinden izlenir:
- Eğitim başlatma/tamamlama
- Yoklama alma/onaylama
- Sınav girişi/sonucu
- Belge üretimi
- Profil/firma değişikliği
- Tamamlama onayı

---

## 14. Raporlama Altyapısı

### Rapor Türleri
1. **Öğrenci Eğitim Transkripti**: Tüm eğitimler, dersler, yöntemler, süreler, puanlar
2. **Firma Uyumluluk Durum Raporu**: Firma bazlı eksik/tamamlanan eğitimler
3. **Yaklaşan Tekrar Eğitim Raporu**: Vadesi gelen eğitimler
4. **Gecikmiş Eğitim Raporu**: Süresi geçmiş eğitimler
5. **Kurs Katılım Özeti**: Kurs bazlı katılım istatistikleri
6. **SCORM Aktivite Raporu**: Detaylı SCORM izleme verileri
7. **BBB Katılım Raporu**: Canlı ders katılım süreleri
8. **Yüz Yüze Katılım Raporu**: Yoklama kayıtları
9. **Sınav Performans Raporu**: Puan dağılımı, başarı oranları
10. **Sertifika Üretim Logu**: Üretilen sertifikalar

### Dışa Aktarma Formatları
- PDF (jsPDF + autotable)
- XLSX/CSV (xlsx kütüphanesi)
- Yazdırılabilir yoklama formu
- Personel dosyasına uygun özet

---

## 15. Sertifika ve Belge Üretim Yapısı

### Belge Türleri
| Belge | Enum | Otomatik/Manuel | İçerik |
|---|---|---|---|
| Temel Eğitim Belgesi | `temel_egitim_belgesi` | Otomatik | Ad, firma, tehlike sınıfı, süre, ders dökümü |
| Tekrar Eğitim Belgesi | `tekrar_egitim_belgesi` | Otomatik | Ad, firma, önceki belge ref, yeni süre |
| İşe Başlama Kaydı | `ise_baslama_kaydi` | Manuel onay | Ad, firma, tarih, eğitmen, içerik |
| Bilgi Yenileme Kaydı | `bilgi_yenileme_kaydi` | Otomatik | Ad, firma, neden, içerik |
| Yüz Yüze Katılım Tutanağı | `yuz_yuze_katilim_tutanagi` | Eğitmen onayı | Tarih, mekan, eğitmen, katılımcılar, süreler |
| Faaliyet Raporu | `faaliyet_raporu` | Manuel | Detaylı eğitim aktivitesi |
| Sınav Sonuç Belgesi | `sinav_sonuc_belgesi` | Otomatik | Puan, tarih, deneme sayısı |

---

## 16. Ana Sayfa Hero ve Tanıtım Metinleri (Türkçe)

### Hero Bölümü
**Başlık**: Yeni Yönetmeliğe Tam Uyumlu İSG Eğitim Platformu
**Alt Başlık**: Online, canlı ve yüz yüze eğitimleri tek platformda yönetin. Sektöre özel içerikler, ölçülebilir katılım ve denetime hazır belgeler.

### Öne Çıkan Özellikler
1. **Yönetmeliğe Uyumlu Eğitim Modeli** — Temel, tekrar, işe başlama ve bilgi yenileme eğitimlerini yasal gerekliliklere uygun şekilde sunun.
2. **Sektöre Özel 4. Konu Başlığı** — Her firma ve sektör için işyerine özgü risk eğitimlerini otomatik atayın.
3. **Entegre Ders Yöntemleri** — SCORM, canlı ders (BBB) ve yüz yüze oturumları tek kursta birleştirin.
4. **Yoklama ve Katılım Kanıtı** — Yüz yüze eğitimlerde yoklama, onay ve doğrulama sistemi.
5. **Ölçülebilir ve Raporlanabilir** — Her öğrencinin login/logout, süre, ilerleme ve sınav verilerini kaydedin.
6. **Denetime Hazır Belgeler** — Sertifika, tutanak ve faaliyet raporlarını otomatik üretin.

### CTA
**Birincil**: Ücretsiz Demo Talep Edin
**İkincil**: Yönetmelik Değişikliklerini İnceleyin

---

## 17. Yeni Yönetmelik Bilgilendirme Alanı İçeriği (Türkçe)

### Yönetmeliğin Kısa Özeti
Yeni İş Sağlığı ve Güvenliği Eğitim Yönetmeliği, çalışanlara verilecek İSG eğitimlerinin kapsamını, süresini, yöntemini ve belgelendirmesini yeniden düzenlemiştir. Bu düzenleme ile eğitimler; tehlike sınıfına göre farklılaşan sürelerde, denetlenebilir formatlarda ve işyerine özgü içeriklerle sunulmak zorundadır.

### Eski Sisteme Göre Değişen Noktalar
- Eğitim türleri ayrıştırıldı (7 farklı tür)
- 4. konu başlığı işyerine özel hale geldi
- Tehlikeli ve çok tehlikeli sınıflarda Konu 4 yüz yüze zorunlu
- Tekrar eğitim süreleri netleştirildi (tüm sınıflar 8 saat)
- Uzaktan eğitimde katılım kanıtı zorunluluğu getirildi
- Sınav geçme barajı %60 olarak belirlendi

---

## 18. Sık Sorulan Sorular (Türkçe)

1. **Temel eğitim nedir?** — Çalışanların iş sağlığı ve güvenliği konusunda aldığı ilk kapsamlı eğitimdir. Tehlike sınıfına göre 8-16 saat sürer.

2. **Tekrar eğitim ne zaman gerekir?** — Az tehlikeli işyerlerinde 3 yılda bir, tehlikeli işyerlerinde 2 yılda bir, çok tehlikeli işyerlerinde her yıl tekrarlanır.

3. **4. konu başlığı nedir?** — İşyerine, sektöre ve çalışma ortamına özgü riskleri kapsayan eğitim modülüdür. Her firma için farklı içerik atanır.

4. **Neden bazı dersler yüz yüze zorunludur?** — Tehlikeli ve çok tehlikeli işyerlerinde 4. konu başlığı, işyerine özgü risklerin pratik olarak aktarılması gerektiğinden yüz yüze yapılmak zorundadır.

5. **Online eğitim yeterli mi?** — Az tehlikeli işyerleri için tüm konular online sunulabilir. Tehlikeli ve çok tehlikeli işyerlerinde Konu 1-3 online, Konu 4 yüz yüze olmalıdır.

6. **Sınavda kaç deneme hakkım var?** — İlk deneme dahil toplam 3 hak verilir. Tüm denemelerde başarısız olunursa ilgili eğitim yeniden alınmalıdır.

7. **İşyeri değiştirirsem ne olur?** — Önceki eğitim kayıtlarınız korunur. Yeni işyerine göre Konu 4 güncelleme eğitimi ve işe başlama eğitimi atanır.

8. **Hangi belgeler üretilir?** — Temel/tekrar eğitim belgesi, işe başlama kaydı, yüz yüze katılım tutanağı, sınav sonuç belgesi ve faaliyet raporu otomatik üretilir.

---

## 19. Menü Yapısı ve Türkçe UI Label Önerileri

### Öğrenci Menüsü
- Panel (Dashboard)
- Eğitimlerim
- Sınavlarım
- Sertifikalarım
- Eğitim Geçmişim
- Yüz Yüze Derslerim
- Profil Ayarları
- Yardım

### Admin Menüsü
- **Yönetim**: Kullanıcılar, Firmalar, Sektörler, Gruplar
- **Eğitim**: Kurslar, Dersler, Sınav Yönetimi, Konu 4 Paketleri, Kurs Şablonları
- **Yüz Yüze**: Oturum Planlama, Yoklama, Eğitmen Atama
- **Raporlama**: Rapor Merkezi, Analitik Dashboard, Uyumluluk Raporu
- **Belgelendirme**: Sertifikalar, Belge Şablonları, Üretilen Belgeler
- **Sistem**: Ayarlar, Aktivite Günlükleri, SSS Yönetimi, Ana Sayfa İçerikleri

### Eğitmen Menüsü
- Sınıflarım
- Yoklama Al
- Katılım Onayla
- Oturum Geçmişi

---

## 20. Varsayılan Sektör Paketleri ve Örnek Ders Başlıkları

Her sektör paketi için Konu 4 alt başlıkları:

**Ofis / Büro İşleri**
- Ofis Ortamında Ergonomik Riskler
- Bilgisayar Başında Uzun Süreli Çalışma
- Ofis Yangın Güvenliği ve Tahliye
- Elektrik Güvenliği (Prizler, Uzatma Kabloları)
- Deprem Anında Davranış Kuralları

**İnşaat**
- Yüksekte Çalışma Riskleri ve Güvenlik Önlemleri
- İskele Güvenliği
- Kazı Çalışmalarında İSG
- Vinç ve Kaldırma Ekipmanları Güvenliği
- Düşen Cisim ve Başlık Kullanımı
- İnşaat Sahasında Trafik Düzeni

**Sağlık / Hastane**
- Biyolojik Risk Faktörleri ve Korunma
- Kesici-Delici Alet Yaralanmaları
- Radyasyon Güvenliği
- Hasta Taşıma ve Ergonomi
- Enfeksiyon Kontrolü ve KKD

---

## 21. Seed Data Önerileri

### Tehlike Sınıfları
```
az_tehlikeli → Az Tehlikeli (Düşük Risk)
tehlikeli → Tehlikeli (Orta Risk)
cok_tehlikeli → Çok Tehlikeli (Yüksek Risk)
```

### Eğitim Türleri
```
ise_baslama → İşe Başlama Eğitimi
temel → Temel Eğitim
tekrar → Tekrar Temel Eğitim
bilgi_yenileme → Bilgi Yenileme Eğitimi
ilave → İlave Eğitim
ozel_grup → Özel Politika Gerektiren Gruplar İçin Eğitim
destek_elemani → Destek Elemanı / Çalışan Temsilcisi Eğitimi
```

### Örnek Firmalar
| Firma | Sektör | Tehlike Sınıfı | Konu 4 Paketi |
|---|---|---|---|
| ABC Danışmanlık | Ofis | Az Tehlikeli | Ofis Riskleri |
| XYZ Market Zinciri | Perakende | Az Tehlikeli | Satış/Perakende |
| Mega Depo A.Ş. | Depo | Tehlikeli | Depo/Lojistik |
| Yapı İnşaat | İnşaat | Çok Tehlikeli | İnşaat |
| Elektrik Bakım Ltd. | Elektrik | Çok Tehlikeli | Elektrik İşleri |

---

## 22. Eski Sistemden Yeni Sisteme Geçiş / Migrasyon Planı

### Adım 1: Veri Koruma
- Mevcut tüm öğrenci kayıtları, ders ilerlemeleri ve sertifikalar korunur
- Mevcut kurslar `legacy_regulation = true` etiketi alır

### Adım 2: Yapısal Eşleme
- Eski "Seçmeli Konular" → Yeni "Konu 4: İşe ve İşyerine Özgü Riskler"
- Eski kurs kategorileri → Yeni training_type + hazard_class kombinasyonları
- Mevcut SCORM paketleri korunur, yeni konu grubu etiketi atanır

### Adım 3: Yeni Şablonlar
- Yeni kurs şablonları eski kursları silmeden oluşturulur
- UI'da "Eski Yönetmelik" / "Yeni Yönetmelik" uyumluluk etiketleri gösterilir
- Yeni kayıtlar yeni şablonlara yönlendirilir

### Adım 4: Raporlama Sürekliliği
- Eski raporlama verileri yeni sisteme taşınır
- xAPI verileri geriye dönük uyumlu kalır

---

## 23. Aşamalı Geliştirme Yol Haritası

### Faz 1: Veritabanı Altyapısı (1. Sprint)
- Yeni tabloları oluştur (sectors, training_types, topic4_packs, etc.)
- Mevcut tablolara yeni alanlar ekle
- RLS politikalarını güncelle
- Enum'ları tanımla

### Faz 2: Eğitim Türleri ve Kurs Şablonları (2. Sprint)
- Training type yönetim modülü
- Kurs şablon kuralları motoru
- Ders yöntemi kuralları
- Tehlike sınıfı-süre-yöntem matrisi

### Faz 3: Sektör ve Konu 4 Dinamik Yapısı (3. Sprint)
- Sektör yönetimi
- Konu 4 paket yönetimi
- Firma-sektör eşleme
- Otomatik Konu 4 atama motoru

### Faz 4: Yüz Yüze Oturum Yönetimi (4. Sprint) ✅ TAMAMLANDI
- ✅ Oturum planlama (eğitmen atama, yoklama kodu otomatik üretimi)
- ✅ Yoklama alma ekranı (/admin/attendance/:sessionId)
- ✅ Eğitmen/admin onay akışı (trainer_verified, toplu onay)
- ✅ Katılım kanıtı sistemi (durum: katıldı/katılmadı/geç/kısmi)
- ✅ Öğrenci yüz yüze ders görünümü (/dashboard/face-to-face)
- ✅ Trainer rolü sisteme eklendi (app_role enum)

### Faz 5: Tamamlama Motoru Güncelleme (5. Sprint) ✅ TAMAMLANDI
- ✅ Hibrit tamamlama kuralları (useCompletionEngine hook)
- ✅ Konu 4 yüz yüze katılım doğrulama (check_topic4_f2f_completion DB fonksiyonu)
- ✅ Sınav tekrar deneme mantığı (complete_enrollment'da final sınav kontrolü)
- ✅ Tekrar eğitim zamanlayıcı (recurrence-scheduler edge function)
- ✅ Otomatik recurrence_rules kaydı oluşturma (tamamlama sonrası)
- ✅ CourseLearning sayfası useCompletionEngine ile entegre edildi

### Faz 6: Raporlama ve Belge (6. Sprint) ✅ TAMAMLANDI
- ✅ Uyumluluk durum raporu (/admin/compliance-report) — firma bazlı kapsam, tamamlanma, vadesi geçmiş analizi
- ✅ Tekrar eğitim vadesi raporu (/admin/recurrence-report) — yaklaşan/geçmiş vade takibi
- ✅ Yüz yüze katılım raporu (/admin/f2f-attendance-report) — oturum bazlı katılım istatistikleri
- ✅ Belge üretim modülü (/admin/documents) — katılım tutanağı, faaliyet raporu PDF üretimi
- ✅ Tüm raporlar PDF ve Excel dışa aktarma desteği
- ✅ Admin navigasyonuna Raporlama grubuna 4 yeni menü eklendi

### Faz 7: UI/UX Güncellemeleri (7. Sprint) ✅ TAMAMLANDI
- ✅ Ana sayfa hero bölümü yeni yönetmelik vurgusuyla güncellendi
- ✅ Ana sayfa CTA: "Yönetmelik Değişikliklerini İnceleyin" butonu eklendi
- ✅ Platform özellikleri yönetmelik uyumu odaklı güncellendi (hibrit model, sektöre özel Konu 4, denetime hazır belgeler)
- ✅ Öğrenci paneline "Yaklaşan Tekrar Eğitimler" bölümü eklendi (90 gün içi vade uyarıları)
- ✅ Admin dashboard'a uyumluluk hızlı erişim kartları eklendi (4 yeni rapor/modül bağlantısı)

### Faz 8: Migrasyon ve Test (8. Sprint) ✅ TAMAMLANDI
- ✅ Legacy veri migrasyon edge function oluşturuldu (analyze, migrate_courses, migrate_enrollments)
- ✅ Uyumluluk etiketleme sistemi: ComplianceBadge, HazardBadge, TrainingTypeBadge bileşenleri
- ✅ Entegrasyon testleri: 13 test (tekrar kuralları, Konu 4 F2F zorunluluğu, minimum saat gereksinimleri)
- ✅ Canlıya geçiş kontrol sayfası: /admin/migration (analiz, migrasyon aksiyonları, uyumluluk skoru, checklist)

---

## 24. Lovable İçinde Modül Modül Üretim Planı

1. **Veritabanı migration'ları** → supabase migration tool
2. **Sektör yönetim sayfası** → /admin/sectors
3. **Eğitim türü yönetimi** → /admin/training-types
4. **Konu 4 paket yönetimi** → /admin/topic4-packs
5. **Kurs şablon kuralları** → /admin/course-templates (genişletme)
6. **Yüz yüze oturum yönetimi** → /admin/face-to-face-sessions
7. **Yoklama ekranı** → /admin/attendance/:sessionId
8. **Firma sektör eşleme** → /admin/firms (genişletme)
9. **Ders yöntemi kuralları** → /admin/courses/:id/lessons (genişletme)
10. **Tamamlama motoru** → hooks/useCompletionEngine
11. **Tekrar eğitim zamanlayıcı** → Edge Function
12. **Uyumluluk raporu** → /admin/compliance-report
13. **Belge üretim modülü** → /admin/documents
14. **SSS yönetimi** → /admin/faq
15. **Ana sayfa güncellemesi** → /pages/Index.tsx
16. **Bilgilendirme sayfası** → /pages/RegulationInfo.tsx
17. **Öğrenci yüz yüze ders görünümü** → LessonContent genişletme
18. **İşyeri değişikliği akışı** → /admin/workplace-change
19. **Migrasyon script'leri** → Edge Function

---

## 25. Öncelik Sırasıyla Üretilecek Bileşenler

### P0 — Kritik Altyapı (İlk yapılacak)
1. Veritabanı şeması (tüm yeni tablolar + mevcut tablo güncellemeleri)
2. RLS politikaları
3. Eğitim türü ve tehlike sınıfı enum/seed
4. Sektör tablosu ve seed verileri
5. `course_template_rules` tablosu ve mantığı

### P1 — Temel İş Akışları
6. Yüz yüze oturum yönetimi (CRUD + yoklama)
7. `face_to_face_attendance` yoklama akışı
8. `lesson_method_rules` — ders bazlı yöntem zorlama
9. Tamamlama motoru güncellemesi (hibrit + yüz yüze doğrulama)
10. Konu 4 dinamik atama motoru

### P2 — Admin Ekranları
11. Sektör yönetim sayfası
12. Konu 4 paket yönetimi
13. Yüz yüze oturum planlama ekranı
14. Yoklama alma ekranı
15. Firma-sektör eşleme ekranı

### P3 — Raporlama ve Belge
16. Uyumluluk durum raporu
17. Tekrar eğitim vadesi raporu
18. Yüz yüze katılım raporu
19. Belge şablonları ve üretimi
20. Dışa aktarma (PDF/XLSX)

### P4 — Öğrenci ve Kullanıcı Deneyimi
21. Öğrenci paneli güncellemeleri (eğitim türü, yöntem, tehlike sınıfı gösterimi)
22. Kayıt akışında firma/sektör seçimi
23. Ana sayfa hero ve tanıtım güncelleme
24. SSS ve bilgilendirme sayfası
25. Tekrar eğitim bildirimi

### P5 — Migrasyon ve İleri Seviye
26. Eski kurs verilerinin yeni yapıya eşlenmesi
27. İşyeri değişikliği akışı
28. Uzun devamsızlık akışı
29. Eğitmen paneli
30. Uyumluluk etiketleri ve legacy uyarıları
