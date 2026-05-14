## Hedef

`/admin/topic4-packs` sayfasındaki "İşe ve İşyerine Özgü Konular" paketlerine içerik (SCORM / HTML / PDF / PPTX) ekleyebilen, ders formatı tanımlayıp temel ve tekrar eğitimlere otomatik bağlayan bir sistem kurmak; ayrıca tüm LMS'te 1 ders = 45 dk standardına geçmek.

## 1) Veritabanı (migration)

`topic4_pack_lessons` adında yeni tablo (paket içi ders şablonları):

```text
id, topic4_pack_id (FK -> topic4_sector_packs)
title, sort_order, lesson_type ('scorm' | 'content')
content_type ('scorm' | 'html' | 'pdf' | 'pptx' | 'video')
content_url (storage URL), scorm_package_id (nullable)
duration_lessons (integer, default 1)  -- 1 birim = 45 dk
is_active, created_at, updated_at
```

`topic4_sector_packs` tablosuna eklenecek:
- `lesson_count` (integer) — paketteki toplam ders adedi (45 dk birimi)
- `default_delivery_method` ('scorm' | 'mixed')

RLS:
- Admin: tam erişim
- Authenticated: aktif paket derslerini okuyabilir (kayıtlı kullanıcı kontrolü `lessons` üzerinden zaten var)

Mevcut bağlama akışı: `company_topic4_assignments` üzerinden firma → pack zaten var. Temel/tekrar kurslarındaki Topic 4 (`topic_group=4`) dersleri firmanın atanmış paketinden içerik çekecek. Kurs tarafına ek FK gerekmiyor; pack ders içerikleri runtime'da firma ataması ile çözülecek.

## 2) Storage

Yeni bucket: `topic4-content` (private). RLS:
- Admin upload/delete
- Authenticated read (sadece atanmış firma kullanıcıları için signed URL ile servis — şimdilik authenticated read yeterli, ileride sıkılaştırılabilir)

## 3) UI: `/admin/topic4-packs`

Mevcut paket satırına "Ders İçerikleri" butonu eklenir → `/admin/topic4-packs/:packId/lessons` sayfası açılır:
- Ders listesi (drag-sort, sort_order)
- Yeni ders ekle dialog: başlık, tip (SCORM / HTML / PDF / PPTX / Video), dosya yükleme (FileUploadField), süre (45 dk birimi olarak adet)
- SCORM seçilirse mevcut SCORM paketleri arasından seçim veya .zip yükleme (mevcut SCORM yükleme akışı yeniden kullanılır)
- Düzenle / Sil / Aktif-pasif

Pack listesi tablosunda yeni kolon: "Ders sayısı" (toplam 45 dk birimi).

## 4) Kurs entegrasyonu (Topic 4 dersleri)

`CourseLearning` / `LessonContent` akışı: `lesson.topic_group === 4` ve kullanıcının firmasının atanmış pack'i varsa, o pack'in `topic4_pack_lessons` kayıtları alt-ders olarak gösterilir. SCORM tipi `ScormPlayer`, HTML `HtmlContentViewer`, PDF/PPTX iframe ile sunulur. Bu sayede aynı temel/tekrar kursu farklı firmalarda farklı pack içeriği gösterir.

Minimum değişiklik: yeni `Topic4PackContent` bileşeni `LessonContent.tsx` içine `face_to_face` dışı topic 4 dersleri için entegre edilir.

## 5) 45 dk = 1 ders standardı

Tüm LMS'te süre gösterimi `duration_minutes / 45` ile "ders" cinsine çevrilir. Etkilenen yerler:
- `Topic4PacksManagement` tablo "Süre" kolonu: `Math.round(p.duration_minutes / 45)` ders
- Pack form: "Süre (dakika)" yerine "Ders sayısı (45 dk)" inputu — kayıtta `duration_minutes = lesson_count * 45`
- `Courses.tsx`, `CourseDetail.tsx`, `MyCourses.tsx`, dashboard ve admin kurs listeleri: saat gösterimi yerine "X ders (Y saat Z dk)" formatı (`formatLessonDuration` util eklenir → `src/lib/lessonDuration.ts`)
- Lesson formlarında süre alanı 45 dk birimi

ISG mevzuat saat zorunlulukları (`min_total_hours`, `min_topic4_hours`, recurrence kuralları) **değişmez** — yalnızca sunum birimi 45 dk ders olur. Örn: 8 saatlik temel eğitim = 8×60/45 ≈ 11 ders olarak gösterilir; mevzuat hesabı dakika cinsinden devam eder.

## 6) Teknik detaylar

- Yeni dosyalar: `src/pages/admin/Topic4PackLessons.tsx`, `src/components/admin/Topic4LessonDialog.tsx`, `src/lib/lessonDuration.ts`, `src/components/course/Topic4PackContent.tsx`
- Route: `App.tsx` içine `/admin/topic4-packs/:packId/lessons` eklenir
- Storage upload mevcut `FileUploadField` ile, SCORM için mevcut zip-extract pipeline'ı (yeni edge function gerekmiyor; SCORM paketleri zaten `scorm_packages` tablosunda yönetiliyor — pack'e mevcut bir `scorm_package_id` referansı verilir)

## Onay

Bu plan üzerinden ilerleyeyim mi? Özellikle "1 ders = 45 dk" güncellemesi LMS'in birçok ekranını etkiler (sadece görüntü, mevzuat hesabı bozulmaz). Onay verirsen migration ile başlarım.
