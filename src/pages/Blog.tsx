import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, ArrowRight, Clock, Tag } from "lucide-react";

const categories = ["Tümü", "Mevzuat", "Eğitim Rehberi", "İş Güvenliği", "Sağlık", "Haberler"];

const blogPosts = [
  {
    id: "isg-egitimi-zorunlu-mu",
    title: "İSG Eğitimi Zorunlu mu? 2024 Güncel Mevzuat Rehberi",
    excerpt: "6331 sayılı İş Sağlığı ve Güvenliği Kanunu kapsamında hangi işyerlerinin eğitim yükümlülükleri var? Güncel mevzuat bilgileri.",
    category: "Mevzuat",
    date: "2024-12-15",
    readTime: "5 dk",
  },
  {
    id: "tehlike-siniflari-nelerdir",
    title: "Tehlike Sınıfları Nelerdir? Az Tehlikeli, Tehlikeli, Çok Tehlikeli",
    excerpt: "İşyerlerinizin tehlike sınıfını nasıl belirlersiniz? Her sınıf için gerekli eğitim süreleri ve yükümlülükler.",
    category: "Eğitim Rehberi",
    readTime: "7 dk",
    date: "2024-12-10",
  },
  {
    id: "is-kazalarini-onleme",
    title: "İş Kazalarını Önlemenin 10 Altın Kuralı",
    excerpt: "İşyerinde güvenli çalışma ortamı oluşturmak için uygulanması gereken temel kurallar ve önlemler.",
    category: "İş Güvenliği",
    readTime: "6 dk",
    date: "2024-12-05",
  },
  {
    id: "ofis-ergonomisi",
    title: "Ofis Ergonomisi: Sağlıklı Çalışma Ortamı Nasıl Oluşturulur?",
    excerpt: "Masa başı çalışanlar için ergonomik düzenlemeler, doğru oturuş pozisyonu ve göz sağlığı önerileri.",
    category: "Sağlık",
    readTime: "4 dk",
    date: "2024-11-28",
  },
  {
    id: "yangin-guvenligi-temel-bilgiler",
    title: "Yangın Güvenliği: Her Çalışanın Bilmesi Gerekenler",
    excerpt: "Yangın türleri, söndürücü kullanımı, tahliye prosedürleri ve yangın tatbikatı planlama rehberi.",
    category: "İş Güvenliği",
    readTime: "8 dk",
    date: "2024-11-20",
  },
  {
    id: "kisisel-koruyucu-donanim",
    title: "Kişisel Koruyucu Donanım (KKD) Kullanım Rehberi",
    excerpt: "Hangi sektörde hangi KKD zorunlu? Doğru kullanım, bakım ve saklama koşulları hakkında kapsamlı rehber.",
    category: "Eğitim Rehberi",
    readTime: "6 dk",
    date: "2024-11-15",
  },
];

export default function Blog() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tümü");

  const filtered = blogPosts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) || post.excerpt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Tümü" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent/20 py-20 md:py-28">
        <div className="container text-center text-primary-foreground">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 font-display">Blog & Mevzuat</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            İş sağlığı ve güvenliği alanındaki güncel bilgiler, mevzuat değişiklikleri ve eğitim rehberleri.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Yazı ara..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(cat)}>
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <Link key={post.id} to={`/blog/${post.id}`} className="group">
                <article className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 h-full flex flex-col">
                  <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <Tag className="h-12 w-12 text-accent/40" />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full w-fit mb-3">{post.category}</span>
                    <h3 className="font-bold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(post.date).toLocaleDateString('tr-TR')}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aramanıza uygun yazı bulunamadı.</p>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
