import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Tag, Share2 } from "lucide-react";

// Static blog content - will be replaced with CMS/DB content later
const blogContent: Record<string, { title: string; category: string; date: string; readTime: string; content: string }> = {
  "isg-egitimi-zorunlu-mu": {
    title: "İSG Eğitimi Zorunlu mu? 2024 Güncel Mevzuat Rehberi",
    category: "Mevzuat",
    date: "2024-12-15",
    readTime: "5 dk",
    content: `
## İSG Eğitimi Zorunluluğu

6331 sayılı İş Sağlığı ve Güvenliği Kanunu'na göre, tüm işverenler çalışanlarına iş sağlığı ve güvenliği eğitimi vermekle yükümlüdür.

### Kimler İSG Eğitimi Almak Zorundadır?

- **Tüm çalışanlar:** İşe başlamadan önce ve düzenli aralıklarla
- **Yeni işe başlayanlar:** İşe giriş eğitimi zorunludur
- **İş değişikliği yapanlar:** Yeni görevlerine uygun eğitim almalıdır

### Tehlike Sınıflarına Göre Eğitim Süreleri

| Tehlike Sınıfı | Eğitim Süresi | Yenileme Periyodu |
|---|---|---|
| Az Tehlikeli | En az 8 saat | 3 yılda bir |
| Tehlikeli | En az 12 saat | 2 yılda bir |
| Çok Tehlikeli | En az 16 saat | Yılda bir |

### Eğitim Vermemenin Yaptırımları

İSG eğitimi vermeyen işverenler, her çalışan için idari para cezası ile karşı karşıya kalabilir. 2024 yılında bu cezalar güncellenmiştir.

### Online ISG Eğitimi Geçerli mi?

Çalışma ve Sosyal Güvenlik Bakanlığı'nın düzenlemelerine göre, uzaktan eğitim yöntemi ile verilen İSG eğitimleri belirli koşullar altında geçerli kabul edilmektedir.

> **Önemli:** Bu yazı bilgilendirme amaçlıdır. Güncel mevzuat için resmi kaynakları kontrol ediniz.
    `,
  },
};

export default function BlogPost() {
  const { slug } = useParams();
  const post = slug ? blogContent[slug] : null;

  if (!post) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Yazı Bulunamadı</h2>
            <p className="text-muted-foreground mb-4">Aradığınız blog yazısı mevcut değil.</p>
            <Link to="/blog"><Button>Blog'a Dön</Button></Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-to-br from-primary via-primary to-accent/20 py-16 md:py-24">
        <div className="container max-w-3xl text-primary-foreground">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Blog'a Dön
          </Link>
          <span className="text-xs font-medium bg-accent/20 text-accent-foreground px-2 py-1 rounded-full">{post.category}</span>
          <h1 className="text-2xl md:text-4xl font-bold mt-3 mb-4 font-display">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(post.date).toLocaleDateString('tr-TR')}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {post.readTime}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          <article className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-accent">
            {/* Simple markdown-like rendering */}
            {post.content.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-foreground mt-8 mb-4">{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-foreground mt-6 mb-3">{line.replace('### ', '')}</h3>;
              if (line.startsWith('- ')) return <li key={i} className="text-muted-foreground ml-4 mb-1">{line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
              if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-accent pl-4 py-2 my-4 bg-accent/5 rounded-r-lg text-sm text-muted-foreground">{line.replace('> ', '')}</blockquote>;
              if (line.startsWith('|')) return null; // Skip table rows for simplicity
              if (line.trim() === '') return null;
              return <p key={i} className="text-muted-foreground mb-3 leading-relaxed">{line}</p>;
            })}
          </article>

          {/* CTA */}
          <div className="mt-12 rounded-xl border bg-accent/5 p-8 text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">İSG Eğitiminizi Online Tamamlayın</h3>
            <p className="text-muted-foreground mb-4">Mevzuata uygun, sertifikalı İSG eğitimlerimizi keşfedin.</p>
            <Link to="/courses"><Button variant="accent" size="lg">Eğitimleri İncele</Button></Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
