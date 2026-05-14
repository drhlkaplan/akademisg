import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, CheckCircle, Loader2, Send } from "lucide-react";

type Status = "loading" | "guest" | "none" | "pending" | "rejected" | "enrolled";

interface Props {
  courseId: string;
  size?: "default" | "sm" | "lg";
  className?: string;
  variant?: "accent" | "outline" | "default";
  fullWidth?: boolean;
  /** Always show the "Katılma Talebi Gönder" action even if the user is already enrolled. */
  alwaysRequest?: boolean;
}

/**
 * Tek bir butonda kullanıcının bu kursla ilişkisine göre doğru aksiyonu gösterir:
 * - Giriş yapmamış → /register
 * - Onaylı kayıtlı → /learn/:id
 * - Bekleyen talep → "Talebiniz inceleniyor" (disabled)
 * - Reddedilmiş veya yok → "Katılma Talebi Gönder"
 */
export function JoinRequestButton({ courseId, size = "lg", className, variant = "accent", fullWidth, alwaysRequest = false }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    if (!user) {
      setStatus("guest");
      return;
    }
    setStatus("loading");

    const { data: enr } = await supabase
      .from("enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .is("deleted_at", null)
      .maybeSingle();

    if (enr && ["pending", "active", "completed"].includes(enr.status as string)) {
      if (!alwaysRequest) {
        setStatus("enrolled");
        return;
      }
    }

    const { data: req } = await (supabase as any)
      .from("course_join_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (req?.status === "pending") setStatus("pending");
    else if (req?.status === "rejected") setStatus("rejected");
    else setStatus("none");
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, courseId]);

  const handleRequest = async () => {
    if (!user) {
      navigate("/register");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from("course_join_requests").insert({
      user_id: user.id,
      course_id: courseId,
      firm_id: profile?.firm_id ?? null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Talep gönderilemedi", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Talebiniz alındı", description: "Yöneticiniz onayladığında eğitime erişebileceksiniz." });
    setStatus("pending");
  };

  const w = fullWidth ? "w-full" : "";

  if (status === "loading") {
    return (
      <Button size={size} variant={variant} className={`${w} ${className ?? ""}`} disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Yükleniyor
      </Button>
    );
  }

  if (status === "enrolled") {
    return (
      <Button size={size} variant={variant} className={`${w} ${className ?? ""}`}
        onClick={() => navigate(`/learn/${courseId}`)}>
        Eğitime Başla <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    );
  }

  if (status === "pending") {
    return (
      <Button size={size} variant="outline" className={`${w} ${className ?? ""}`} disabled>
        <Clock className="h-4 w-4 mr-2" /> Talebiniz İnceleniyor
      </Button>
    );
  }

  if (status === "rejected") {
    return (
      <Button size={size} variant={variant} className={`${w} ${className ?? ""}`} onClick={handleRequest} disabled={submitting}>
        <Send className="h-4 w-4 mr-2" /> Tekrar Talep Gönder
      </Button>
    );
  }

  if (status === "guest") {
    return (
      <Button size={size} variant={variant} className={`${w} ${className ?? ""}`} onClick={() => navigate("/register")}>
        Kayıt Ol ve Talep Gönder <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    );
  }

  // none
  return (
    <Button size={size} variant={variant} className={`${w} ${className ?? ""}`} onClick={handleRequest} disabled={submitting}>
      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
      Katılma Talebi Gönder
    </Button>
  );
}
