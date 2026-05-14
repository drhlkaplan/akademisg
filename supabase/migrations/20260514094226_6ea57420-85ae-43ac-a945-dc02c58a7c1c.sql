
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  category text,
  cover_image_url text,
  read_time text,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category) WHERE deleted_at IS NULL;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published blog posts"
ON public.blog_posts FOR SELECT
USING (published = true AND deleted_at IS NULL);

CREATE POLICY "Admins can read all blog posts"
ON public.blog_posts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert blog posts"
ON public.blog_posts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blog posts"
ON public.blog_posts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blog posts"
ON public.blog_posts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial posts
INSERT INTO public.blog_posts (slug, title, excerpt, category, read_time, content, published_at) VALUES
('isg-egitimi-zorunlu-mu', 'İSG Eğitimi Zorunlu mu? 2024 Güncel Mevzuat Rehberi',
 '6331 sayılı İş Sağlığı ve Güvenliği Kanunu kapsamında hangi işyerlerinin eğitim yükümlülükleri var? Güncel mevzuat bilgileri.',
 'Mevzuat', '5 dk',
 E'## İSG Eğitimi Zorunluluğu\n\n6331 sayılı İş Sağlığı ve Güvenliği Kanunu''na göre, tüm işverenler çalışanlarına iş sağlığı ve güvenliği eğitimi vermekle yükümlüdür.\n\n### Kimler İSG Eğitimi Almak Zorundadır?\n\n- **Tüm çalışanlar:** İşe başlamadan önce ve düzenli aralıklarla\n- **Yeni işe başlayanlar:** İşe giriş eğitimi zorunludur\n- **İş değişikliği yapanlar:** Yeni görevlerine uygun eğitim almalıdır\n\n### Tehlike Sınıflarına Göre Eğitim Süreleri\n\n- Az Tehlikeli: En az 8 saat / 3 yılda bir\n- Tehlikeli: En az 12 saat / 2 yılda bir\n- Çok Tehlikeli: En az 16 saat / Yılda bir\n\n### Online ISG Eğitimi Geçerli mi?\n\nÇalışma ve Sosyal Güvenlik Bakanlığı düzenlemelerine göre uzaktan eğitim belirli koşullar altında geçerlidir.',
 '2024-12-15'::timestamptz),
('tehlike-siniflari-nelerdir', 'Tehlike Sınıfları Nelerdir? Az Tehlikeli, Tehlikeli, Çok Tehlikeli',
 'İşyerlerinizin tehlike sınıfını nasıl belirlersiniz? Her sınıf için gerekli eğitim süreleri ve yükümlülükler.',
 'Eğitim Rehberi', '7 dk',
 E'## Tehlike Sınıfları\n\nİşyerleri faaliyet alanına göre üç tehlike sınıfına ayrılır.\n\n### Az Tehlikeli\nOfis, mağaza, bilgi işlem gibi düşük riskli işyerleri.\n\n### Tehlikeli\nGıda, tekstil, perakende gibi orta riskli sektörler.\n\n### Çok Tehlikeli\nİnşaat, maden, kimya gibi yüksek riskli sektörler.',
 '2024-12-10'::timestamptz),
('is-kazalarini-onleme', 'İş Kazalarını Önlemenin 10 Altın Kuralı',
 'İşyerinde güvenli çalışma ortamı oluşturmak için uygulanması gereken temel kurallar ve önlemler.',
 'İş Güvenliği', '6 dk',
 E'## İş Kazalarını Önlemenin 10 Altın Kuralı\n\n1. Risk değerlendirmesi yapın\n2. Kişisel koruyucu donanım kullanın\n3. Düzenli eğitim alın\n4. Acil durum planı hazırlayın\n5. Ekipman bakımını ihmal etmeyin',
 '2024-12-05'::timestamptz),
('ofis-ergonomisi', 'Ofis Ergonomisi: Sağlıklı Çalışma Ortamı Nasıl Oluşturulur?',
 'Masa başı çalışanlar için ergonomik düzenlemeler, doğru oturuş pozisyonu ve göz sağlığı önerileri.',
 'Sağlık', '4 dk',
 E'## Ofis Ergonomisi\n\nDoğru sandalye yüksekliği, monitör mesafesi ve klavye konumu uzun vadeli sağlık için kritiktir.',
 '2024-11-28'::timestamptz),
('yangin-guvenligi-temel-bilgiler', 'Yangın Güvenliği: Her Çalışanın Bilmesi Gerekenler',
 'Yangın türleri, söndürücü kullanımı, tahliye prosedürleri ve yangın tatbikatı planlama rehberi.',
 'İş Güvenliği', '8 dk',
 E'## Yangın Güvenliği\n\nYangın türlerini bilmek, doğru söndürücüyü seçmenin ilk adımıdır.',
 '2024-11-20'::timestamptz),
('kisisel-koruyucu-donanim', 'Kişisel Koruyucu Donanım (KKD) Kullanım Rehberi',
 'Hangi sektörde hangi KKD zorunlu? Doğru kullanım, bakım ve saklama koşulları hakkında kapsamlı rehber.',
 'Eğitim Rehberi', '6 dk',
 E'## KKD Kullanım Rehberi\n\nKişisel koruyucu donanımlar son savunma hattıdır; doğru kullanım hayat kurtarır.',
 '2024-11-15'::timestamptz)
ON CONFLICT (slug) DO NOTHING;
