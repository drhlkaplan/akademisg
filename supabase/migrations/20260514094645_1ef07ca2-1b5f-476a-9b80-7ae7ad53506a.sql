
CREATE TABLE IF NOT EXISTS public.site_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL DEFAULT 0,
  icon_name text NOT NULL DEFAULT 'Shield',
  title text NOT NULL,
  description text,
  danger_class text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  link_url text DEFAULT '/courses',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_site_services_active ON public.site_services(sort_order) WHERE is_active = true AND deleted_at IS NULL;

ALTER TABLE public.site_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active services"
ON public.site_services FOR SELECT
USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Admins can manage services - select"
ON public.site_services FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage services - insert"
ON public.site_services FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage services - update"
ON public.site_services FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage services - delete"
ON public.site_services FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_services_updated_at
BEFORE UPDATE ON public.site_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_services (sort_order, icon_name, title, description, danger_class, features) VALUES
(10, 'HardHat', 'Temel İSG Eğitimi', '6331 sayılı İş Sağlığı ve Güvenliği Kanunu kapsamında tüm çalışanlar için zorunlu temel eğitim.', 'Tüm Sınıflar',
  '["Mevzuat bilgisi","Tehlike ve risk kavramları","Kişisel koruyucu donanımlar","Acil durum prosedürleri"]'::jsonb),
(20, 'Monitor', 'Ofis Çalışanları İSG Eğitimi', 'Az tehlikeli sınıf kapsamında ofis ortamında çalışanlar için özel hazırlanmış 8 saatlik eğitim programı.', 'Az Tehlikeli',
  '["Ergonomi","Ekranlı araçlarla çalışma","Ofis güvenliği","Stres yönetimi"]'::jsonb),
(30, 'Factory', 'Sanayi İSG Eğitimi', 'Tehlikeli ve çok tehlikeli sınıf işyerlerindeki çalışanlar için kapsamlı İSG eğitim programı.', 'Tehlikeli / Çok Tehlikeli',
  '["Makine güvenliği","Kimyasal risk yönetimi","Yüksekte çalışma","İş ekipmanları kullanımı"]'::jsonb),
(40, 'Flame', 'Yangın Güvenliği Eğitimi', 'Yangın önleme, müdahale ve tahliye prosedürleri hakkında kapsamlı eğitim.', 'Tüm Sınıflar',
  '["Yangın türleri","Söndürücü kullanımı","Tahliye planları","Tatbikat organizasyonu"]'::jsonb),
(50, 'AlertTriangle', 'Acil Durum Eğitimi', 'Deprem, sel, patlama gibi acil durumlarda alınacak önlemler ve müdahale yöntemleri.', 'Tüm Sınıflar',
  '["Acil durum planı","Tahliye prosedürleri","İletişim protokolleri","Tatbikat planlaması"]'::jsonb),
(60, 'HeartPulse', 'İlk Yardım Farkındalık Eğitimi', 'Temel ilk yardım bilgileri ve iş yerinde yaralanmalara ilk müdahale yaklaşımları.', 'Tüm Sınıflar',
  '["Temel yaşam desteği","Kanamalarda müdahale","Kırık ve burkulma","Zehirlenme vakaları"]'::jsonb)
ON CONFLICT DO NOTHING;
