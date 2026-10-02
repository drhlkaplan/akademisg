import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FirmBranding {
  firm_id: string;
  firm_code: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  bg_color: string;
  welcome_message: string;
  login_bg_url: string | null;
  footer_text: string | null;
  custom_css: string | null;
  favicon_url: string | null;
}

interface FirmBrandingContextType {
  branding: FirmBranding | null;
  firmCode: string | null;
  setFirmCode: (code: string | null) => void;
  isLoading: boolean;
  clearBranding: () => void;
}

const FirmBrandingContext = createContext<FirmBrandingContextType | undefined>(undefined);

const FIRM_CODE_KEY = "isg_firm_code";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toBranding = (data: any): FirmBranding => ({
  firm_id: data.id,
  firm_code: data.firm_code || "",
  name: data.name,
  logo_url: data.logo_url,
  primary_color: data.primary_color || "#f97316",
  secondary_color: data.secondary_color || "#1a2744",
  bg_color: data.bg_color || "#f8fafc",
  welcome_message: data.welcome_message || "Eğitimlerinize hoş geldiniz",
  login_bg_url: data.login_bg_url,
  footer_text: data.footer_text,
  custom_css: data.custom_css,
  favicon_url: data.favicon_url,
});

export function FirmBrandingProvider({ children }: { children: ReactNode }) {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [firmCode, setFirmCodeState] = useState<string | null>(() => localStorage.getItem(FIRM_CODE_KEY));
  const [branding, setBranding] = useState<FirmBranding | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setFirmCode = (code: string | null) => {
    const c = code?.trim() || null;
    setFirmCodeState(c);
    if (c) localStorage.setItem(FIRM_CODE_KEY, c);
    else localStorage.removeItem(FIRM_CODE_KEY);
  };

  const clearBranding = () => {
    setBranding(null);
    setFirmCode(null);
  };

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    // Signed-in: theme always comes from the user's own firm (never a stored code)
    if (user) {
      if (!profile) return;
      if (!profile.firm_id) {
        setBranding(null);
        setFirmCode(null);
        return;
      }
      setIsLoading(true);
      (async () => {
        const { data } = await supabase.rpc("get_my_firm_branding" as never);
        if (cancelled) return;
        const rows = data as unknown as unknown[] | null; const row = Array.isArray(rows) ? rows[0] : null;
        if (row) {
          const b = toBranding(row);
          setBranding(b);
          setFirmCode(b.firm_code || null);
        } else {
          setBranding(null);
        }
        setIsLoading(false);
      })();
      return () => { cancelled = true; };
    }

    // Signed-out: theme only from an entered firm code
    if (!firmCode) {
      setBranding(null);
      return;
    }
    setIsLoading(true);
    (async () => {
      const { data } = await supabase.rpc("get_firm_branding_by_code" as never, { _code: firmCode } as never);
      if (cancelled) return;
      const rows = data as unknown as unknown[] | null; const row = Array.isArray(rows) ? rows[0] : null;
      setBranding(row ? toBranding(row) : null);
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, profile?.firm_id, profile, firmCode, authLoading]);

  // Apply custom CSS and favicon when branding changes
  useEffect(() => {
    if (branding?.custom_css) {
      let style = document.getElementById("firm-custom-css") as HTMLStyleElement;
      if (!style) {
        style = document.createElement("style");
        style.id = "firm-custom-css";
        document.head.appendChild(style);
      }
      style.textContent = branding.custom_css;
    } else {
      document.getElementById("firm-custom-css")?.remove();
    }

    if (branding?.favicon_url) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
    }
  }, [branding]);

  return (
    <FirmBrandingContext.Provider value={{ branding, firmCode, setFirmCode, isLoading, clearBranding }}>
      {children}
    </FirmBrandingContext.Provider>
  );
}

export function useFirmBranding() {
  const ctx = useContext(FirmBrandingContext);
  if (!ctx) throw new Error("useFirmBranding must be used within FirmBrandingProvider");
  return ctx;
}
