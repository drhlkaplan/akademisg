## Yüz Yüze Eğitim Modülü Planı

### Mevcut Altyapı ✅
- `face_to_face_sessions` tablosu (attendance_code mevcut)
- `face_to_face_attendance` tablosu
- Admin oturum yönetimi ve yoklama sayfaları
- Öğrenci MyFaceToFaceSessions sayfası

### Yapılacaklar

#### 1. Veritabanı Güncellemeleri
- `face_to_face_attendance` tablosuna `join_method` (qr/code/admin), `ip_address`, `user_agent` kolonları ekleme
- `face_to_face_sessions` tablosuna `qr_token` (güvenli UUID token) kolonu ekleme

#### 2. Öğrenci Katılım Sayfası (`/attend/:token`)
- QR kod tarandığında otomatik katılım
- Manuel ders kodu girişi
- Oturum durumu göstergesi (henüz başlamadı / devam ediyor / sona erdi)
- Zaman tabanlı kurallar: başlamadan önce giriş engeli, bittikten sonra yeni giriş engeli
- Katılım onay ekranı

#### 3. Admin QR Kod & Canlı İzleme
- Oturum detay sayfasında QR kod görüntüleme (qrcode kütüphanesi)
- Ders kodunu gösterme
- Canlı katılım tablosu (anlık güncelleme)
- Katılım istatistikleri

#### 4. Edge Function: `attend-session`
- QR token doğrulama
- Ders kodu doğrulama
- Zaman kontrolü (oturum aktif mi?)
- Duplicate katılım engelleme
- IP ve user-agent kaydetme

#### 5. PDF Yoklama Tutanağı
- Firma bilgileri, oturum detayları
- Katılımcı listesi, imza sütunları
- QR doğrulama kodu
- Baskıya hazır resmi format
- jsPDF ile oluşturma

#### 6. Eğitim Sonrası Soru
- Tamamlama sonrası 1 zorunlu çoktan seçmeli soru
- Doğru/yanlış geri bildirimi
- Cevaptan bağımsız olarak eğitim tamamlanır
