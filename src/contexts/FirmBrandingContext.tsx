import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function FirmBrandingProvider({ children }: { children: ReactNode }) {
  const [firmCode, setFirmCodeState] = useState<string | null>(() => {
    return localStorage.getItem(FIRM_CODE_KEY);
  });
  const [branding, setBranding] = useState<FirmBranding | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setFirmCode = (code: string | null) => {
    setFirmCodeState(code);
    if (code) {
      localStorage.setItem(FIRM_CODE_KEY, code);
    } else {
      localStorage.removeItem(FIRM_CODE_KEY);
    }
  };

  const clearBranding = () => {
    setBranding(null);
    setFirmCode(null);
  };

  useEffect(() => {
    if (!firmCode) {
      setBranding(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("firms")
        .select("id, firm_code, name, logo_url, primary_color, secondary_color, bg_color, welcome_message, login_bg_url, footer_text, custom_css, favicon_url")
        .eq("firm_code", firmCode)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (data && !error) {
        setBranding({
          firm_id: data.id,
          firm_code: data.firm_code || firmCode,
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
      } else {
        setBranding(null);
      }
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [firmCode]);

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
