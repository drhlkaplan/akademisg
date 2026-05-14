import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Clock, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  read_time: string | null;
  published_at: string;
};

export default function Blog() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tümü");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, category, cover_image_url, read_time, published_at")
        .eq("published", true)
        .is("deleted_at", null)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });

  const categories = ["Tümü", ...Array.from(new Set((posts ?? []).map((p) => p.category).filter(Boolean) as string[]))];

  const filtered = (posts ?? []).filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      (post.excerpt ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Tümü" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
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

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <article className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 h-full flex flex-col">
                    <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
                      {post.cover_image_url ? (
                        <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Tag className="h-12 w-12 text-accent/40" />
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      {post.category && (
                        <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full w-fit mb-3">{post.category}</span>
                      )}
                      <h3 className="font-bold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">{post.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(post.published_at).toLocaleDateString('tr-TR')}</span>
                        {post.read_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.read_time}</span>}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aramanıza uygun yazı bulunamadı.</p>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
