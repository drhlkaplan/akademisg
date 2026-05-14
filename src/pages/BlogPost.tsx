import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogPost() {
  const { slug } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-16">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

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

  const lines = (post.content ?? "").split("\n");

  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-primary via-primary to-accent/20 py-16 md:py-24">
        <div className="container max-w-3xl text-primary-foreground">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Blog'a Dön
          </Link>
          {post.category && (
            <span className="text-xs font-medium bg-accent/20 text-accent-foreground px-2 py-1 rounded-full">{post.category}</span>
          )}
          <h1 className="text-2xl md:text-4xl font-bold mt-3 mb-4 font-display">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(post.published_at).toLocaleDateString('tr-TR')}</span>
            {post.read_time && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {post.read_time}</span>}
          </div>
        </div>
      </section>

      {post.cover_image_url && (
        <div className="container max-w-3xl -mt-8 mb-8">
          <img src={post.cover_image_url} alt={post.title} className="w-full rounded-xl shadow-lg" />
        </div>
      )}

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          <article className="prose prose-lg max-w-none">
            {lines.map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-foreground mt-8 mb-4">{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-foreground mt-6 mb-3">{line.replace('### ', '')}</h3>;
              if (line.startsWith('- ')) return <li key={i} className="text-muted-foreground ml-4 mb-1">{line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
              if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-accent pl-4 py-2 my-4 bg-accent/5 rounded-r-lg text-sm text-muted-foreground">{line.replace('> ', '')}</blockquote>;
              if (/^\d+\.\s/.test(line)) return <li key={i} className="text-muted-foreground ml-4 mb-1 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
              if (line.trim() === '') return null;
              return <p key={i} className="text-muted-foreground mb-3 leading-relaxed">{line}</p>;
            })}
          </article>

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
