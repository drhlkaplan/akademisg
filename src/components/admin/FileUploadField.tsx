import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Link as LinkIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  accept?: string;
  placeholder?: string;
}

export function FileUploadField({
  label,
  value,
  onChange,
  bucket = "firm-assets",
  folder = "",
  accept = "image/*",
  placeholder = "https://...",
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"url" | "upload">(value ? "url" : "url");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
      toast.error("Dosya boyutu 200MB'dan küçük olmalıdır");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = folder
        ? `${folder}/${Date.now()}.${ext}`
        : `${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      onChange(urlData.publicUrl);
      toast.success("Dosya yüklendi");
    } catch (err: any) {
      toast.error("Yükleme hatası: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={mode === "url" ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setMode("url")}
          >
            <LinkIcon className="h-3 w-3 mr-1" /> URL
          </Button>
          <Button
            type="button"
            variant={mode === "upload" ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setMode("upload")}
          >
            <Upload className="h-3 w-3 mr-1" /> Yükle
          </Button>
        </div>
      </div>

      {mode === "url" ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Yükleniyor...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Dosya Seç</>
            )}
          </Button>
        </div>
      )}

      {value && (
        <div className="flex items-center gap-2">
          {accept?.includes("image") && (
            <img src={value} alt="" className="h-8 w-8 rounded object-contain border" />
          )}
          <span className="text-xs text-muted-foreground truncate flex-1">{value.split("/").pop()}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
