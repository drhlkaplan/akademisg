import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  cover_image_url: string | null;
  read_time: string | null;
  published: boolean;
  published_at: string;
  deleted_at: string | null;
};

const empty: Partial<BlogPost> = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  category: "",
  cover_image_url: "",
  read_time: "",
  published: true,
};

export default function AdminBlog() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [open, setOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const generateWithAi = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "İstem girin", description: "Blog yazısı için bir konu/istem yazın.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content", {
        body: { action: "generate_blog_post", context: { prompt: aiPrompt, category: editing?.category || "" } },
      });
      if (error) throw error;
      let content = (data?.content || "").trim();
      content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(content);
      setEditing((prev) => ({
        ...(prev || {}),
        title: parsed.title || prev?.title || "",
        slug: parsed.slug || prev?.slug || "",
        excerpt: parsed.excerpt || prev?.excerpt || "",
        category: parsed.category || prev?.category || "",
        read_time: parsed.read_time || prev?.read_time || "",
        content: parsed.content || prev?.content || "",
        published: prev?.published ?? true,
      }));
      toast({ title: "Blog yazısı oluşturuldu", description: "İçeriği kontrol edip kaydedebilirsiniz." });
    } catch (e) {
      toast({ title: "AI hatası", description: e instanceof Error ? e.message : "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .is("deleted_at", null)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPost[];
    },
  });

  const save = useMutation({
    mutationFn: async (post: Partial<BlogPost>) => {
      if (!post.slug || !post.title) throw new Error("Slug ve başlık zorunlu");
      if (post.id) {
        const { error } = await supabase
          .from("blog_posts")
          .update({
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt || null,
            content: post.content || "",
            category: post.category || null,
            cover_image_url: post.cover_image_url || null,
            read_time: post.read_time || null,
            published: post.published ?? true,
          })
          .eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert({
          slug: post.slug!,
          title: post.title!,
          excerpt: post.excerpt || null,
          content: post.content || "",
          category: post.category || null,
          cover_image_url: post.cover_image_url || null,
          read_time: post.read_time || null,
          published: post.published ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Kaydedildi" });
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Silindi" });
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
  });

  const openCreate = () => { setEditing({ ...empty }); setOpen(true); };
  const openEdit = (p: BlogPost) => { setEditing(p); setOpen(true); };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Blog Yazıları</h1>
            <p className="text-muted-foreground text-sm">Blog içeriklerini buradan yönetin.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Yeni Yazı</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing?.id ? "Yazıyı Düzenle" : "Yeni Yazı"}</DialogTitle>
              </DialogHeader>
              {editing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Başlık *</Label>
                      <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Slug *</Label>
                      <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="ornek-yazi-slug" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Kategori</Label>
                      <Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                    </div>
                    <div>
                      <Label>Okuma Süresi</Label>
                      <Input value={editing.read_time ?? ""} onChange={(e) => setEditing({ ...editing, read_time: e.target.value })} placeholder="5 dk" />
                    </div>
                    <div className="flex items-end gap-2 pb-2">
                      <Switch checked={editing.published ?? true} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
                      <Label>Yayında</Label>
                    </div>
                  </div>
                  <div>
                    <Label>Kapak Görseli URL</Label>
                    <Input value={editing.cover_image_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} />
                  </div>
                  <div>
                    <Label>Özet</Label>
                    <Textarea value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} rows={2} />
                  </div>
                  <div>
                    <Label>İçerik (Markdown)</Label>
                    <Textarea value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={12} className="font-mono text-sm" />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
                  {save.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Yayın Tarihi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Yükleniyor...</TableCell></TableRow>
              ) : (posts ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Henüz yazı yok.</TableCell></TableRow>
              ) : (
                (posts ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}<div className="text-xs text-muted-foreground">/{p.slug}</div></TableCell>
                    <TableCell>{p.category ?? "-"}</TableCell>
                    <TableCell>{new Date(p.published_at).toLocaleDateString("tr-TR")}</TableCell>
                    <TableCell>
                      <Badge variant={p.published ? "default" : "secondary"}>{p.published ? "Yayında" : "Taslak"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Yazıyı sil?</AlertDialogTitle>
                            <AlertDialogDescription>"{p.title}" yazısı silinecek. Bu işlem geri alınamaz.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(p.id)}>Sil</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
