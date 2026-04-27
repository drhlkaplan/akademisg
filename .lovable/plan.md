# SCORM Yapısını Sıfırdan Kurma — Rustici scormdriver.js + Public Bucket

## Hedef

1 aydır çözülemeyen SCORM render/MIME sorununu **proxy katmanını tamamen kaldırarak** ve dosyaları doğrudan public CDN URL'inden iframe'e yükleyerek kalıcı olarak çözmek. SCORM API tarafında ise senin Replit projesinde kullandığın **Rustici scormdriver.js (v7.12)** dosyasını LMS-side adapter olarak kullanmak.

## Strateji Özeti

```text
ESKİ (proxy ile, sürekli MIME hatası):
  iframe → /functions/v1/scorm-proxy/_wrapper_/<token>/... → Storage signed URL

YENİ (proxy YOK):
  ┌─ ScormPlayer (parent window) ──────────────────────────┐
  │  - scormdriver.js yüklü (window.API + window.API_1484_11)
  │  - Initialize/Commit/Terminate çağrılarını yakalar
  │  - cmiData'yı RPC ile Supabase'e kaydeder
  │  - iframe src = public CDN URL (Apache/nginx serve eder)
  │     ↓
  │  iframe → https://<proj>.supabase.co/storage/v1/object/public/scorm-public/<courseId>/<entryFile>
  │           Tarayıcı doğru MIME tipini Storage CDN'den alır
  │           Content window.parent.API'yi bulur ve kullanır
  └────────────────────────────────────────────────────────┘
```

Böylece: HTML/JS/CSS/MP4/font dosyalarının **tamamı** Supabase Storage CDN tarafından doğru MIME ile servis edilir. Edge function devreden çıkar.

## Yapılacaklar

### 1. Eski SCORM yapısını tamamen sil

**Dosyalar (silinecek):**
- `src/components/scorm/ScormPlayer.tsx`
- `src/components/scorm/ScormApiAdapter.ts`
- `src/components/scorm/ScormProgressService.ts`
- `src/components/scorm/ScormManifestParser.ts`
- `src/components/scorm/ScormControls.tsx`
- `src/components/scorm/ScormDebugPanel.tsx`
- `supabase/functions/scorm-proxy/index.ts` (+ deploy'dan delete)
- `supabase/config.toml` içindeki `[functions.scorm-proxy]` bloğu

**Storage temizliği (migration ile):**
- `scorm-packages` (private) bucket'ındaki TÜM objeleri sil, bucket'ı drop et
- `scorm-public` bucket'ını koru (public, CORS açık)
- `scorm_runtime_data`, `scorm_scos`, `scorm_packages`, `lesson_progress` tablolarındaki tüm kayıtları **TRUNCATE** et (kullanıcı "tüm SCORM verilerini temizle" istedi)

### 2. Yeni SCORM altyapısı

**Public asset:**
- `public/scorm/scormdriver.js` ← yüklediğin Rustici dosyası (34386 satır) buraya kopyalanır. `<script src="/scorm/scormdriver.js">` ile yüklenir.

**Yeni component'ler:**
- `src/components/scorm/ScormPlayerV2.tsx` — Tek dosya, ~250 satır:
  - `<iframe src={publicCdnUrl}>` (sandbox: `allow-scripts allow-same-origin allow-forms`)
  - `useEffect` ile parent window'a `window.API` (1.2) ve `window.API_1484_11` (2004) shim API'lerini enjekte eder
  - SCORM içeriği `window.parent`'a tırmandığında API'yi bulur (standart davranış)
  - Initialize/SetValue/Commit/Terminate çağrıldığında `cmiData`'yı `save_scorm_runtime_data` ve `record_lesson_progress` RPC'lerine yazar
  - Auto-save 30sn, debounced commit 2sn
  - Resume için açılışta `loadScormProgress` ile lesson_status, lesson_location, suspend_data, score_raw çeker
- `src/components/scorm/ScormControlsV2.tsx` — top/bottom bar (ders adı, ilerleme, prev/next)
- `src/components/scorm/scormApiShim.ts` — `window.API` ve `window.API_1484_11` üreticisi (mevcut `ScormApiAdapter.ts`'in postMessage'siz, doğrudan callback'li yeniden yazımı; çünkü artık aynı origin)

**RPC'ler (mevcutlar yeterli, migration gerekmiyor):**
- `save_scorm_runtime_data(_enrollment_id, _lesson_id, _sco_id, _cmi_data jsonb)` — var
- `record_lesson_progress(...)` — var
- `update_enrollment_progress(...)` — var

### 3. Upload akışı (LessonManagement)

`src/components/admin/LessonManagement.tsx` içindeki SCORM upload:
- ZIP'i JSZip ile aç
- **Tüm dosyaları `scorm-public` bucket'a** yükle: `<courseId>/<packageId>/<relativePath>`
- Manifest'i parse et, `entry_point`'u tespit et
- `scorm_packages` tablosuna `package_url = <public CDN folder URL>` ile insert
- Eski `scorm-packages` private bucket'ına asla yazma

### 4. Player entegrasyonu

`src/components/course/LessonContent.tsx`:
- `import { ScormPlayer }` → `import { ScormPlayerV2 as ScormPlayer }`
- Props imzası aynı kalır (drop-in replacement)

### 5. Diğer dokunulan dosyalar

- `src/components/admin/ScormScoDetails.tsx` — manifest parse referansı varsa basitleştir
- `src/components/admin/ScormProgressReport.tsx` — sorgular `scorm_runtime_data` üzerinden (değişmez)
- `index.html` — `<script src="/scorm/scormdriver.js" defer></script>` eklenir (parent window'a yüklenir, böylece SCORM içeriği `window.parent.API`'yi kolayca bulur)

## Teknik Notlar

- **Public bucket güvenliği:** SCORM içeriği zaten "kayıtlı kullanıcılara açık" mantığında. Public CDN URL biliniyorsa erişilebilir; URL'ler UUID tabanlı (`<courseId>/<packageId>`), tahmin edilemez. Kayıt zorunluluğu zaten enrollment + RLS ile sağlanıyor (paket URL'i sadece enroll olmuş kullanıcıya servisleniyor).
- **CORS:** `scorm-public` bucket zaten public, Supabase Storage `Access-Control-Allow-Origin: *` döner. iframe'den fetch sorunsuz.
- **Rustici scormdriver.js**: 34k satırlık dosya CONTENT tarafında çalışır (LMS'e mesaj gönderen taraf değil — TAM TERSİ — content paketinin içine gömülü olur). Bizim ihtiyacımız LMS-side `window.API` shim. Bu yüzden scormdriver.js'i parent window'a yüklemek gereksiz; **ama** kullanıcı bu dosyanın çalıştığını biliyor, içindeki sabitler (LESSON_STATUS, EXIT_TYPE vs.) ile uyumlu CMI data formatı üreteceğiz. Dosyayı `public/scorm/scormdriver.js` altında saklayacağız ki gerekirse SCO'lar referans alabilsin.
- **Enrollment verification:** SCORM içeriği yüklenmeden önce client-side'da `scorm_packages` SELECT RLS zaten enrollment kontrolü yapıyor — yetkisiz kullanıcı `package_url`'i alamaz.
- **Veri temizliği geri alınamaz:** Migration TRUNCATE içerecek; mevcut tüm SCORM ilerlemeleri ve paketleri silinecek (kullanıcının açık talebi).

## Dosya değişikliği özeti

**Silinen:** 6 component + 1 edge function + scorm-packages bucket + 3 tablonun verisi
**Yeni:** 3 component + 1 public asset + index.html script tag
**Düzenlenen:** LessonManagement.tsx (upload), LessonContent.tsx (import), config.toml (proxy bloğu kaldır)

Onayladığında önce eski yapıyı sileceğim, scormdriver.js'i `public/`'a kopyalayacağım, yeni player'ı yazacağım, upload akışını public bucket'a yönlendireceğim, sonunda veri temizliği migration'ını çalıştıracağım.
