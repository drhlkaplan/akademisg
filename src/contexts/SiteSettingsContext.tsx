import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  maintenanceMode: boolean;
  defaultLanguage: string;
}

export interface NotificationSettings {
  emailOnEnrollment: boolean;
  emailOnCertificate: boolean;
  emailOnExamResult: boolean;
  emailOnCourseComplete: boolean;
  adminDailyDigest: boolean;
}

export interface SecuritySettings {
  requireEmailVerification: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  passwordMinLength: number;
  twoFactorEnabled: boolean;
}

export interface FooterSettings {
  copyrightText: string;
  tagline: string;
}

export interface SiteSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  footer: FooterSettings;
}

const DEFAULTS: SiteSettings = {
  general: {
    siteName: "İSG Akademi",
    siteDescription: "İş Sağlığı ve Güvenliği Eğitim Platformu",
    contactEmail: "info@isgakademi.com",
    contactPhone: "+90 (212) 555 00 00",
    contactAddress: "İstanbul, Türkiye",
    maintenanceMode: false,
    defaultLanguage: "tr",
  },
  notifications: {
    emailOnEnrollment: true,
    emailOnCertificate: true,
    emailOnExamResult: true,
    emailOnCourseComplete: true,
    adminDailyDigest: false,
  },
  security: {
    requireEmailVerification: true,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    passwordMinLength: 8,
    twoFactorEnabled: false,
  },
  footer: {
    copyrightText: "© İSG Akademi. Tüm hakları saklıdır.",
    tagline: "İş Sağlığı ve Güvenliği eğitimlerinde güvenilir çözüm ortağınız. SCORM uyumlu, sertifikalı online eğitimler.",
  },
};

interface SiteSettingsContextValue {
  settings: SiteSettings;
  isLoading: boolean;
  refresh: () => Promise<void>;
  updateSection: <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await (supabase as any).from("site_settings").select("key, value");
    if (!error && data) {
      const next = { ...DEFAULTS };
      for (const row of data as Array<{ key: keyof SiteSettings; value: any }>) {
        if (row.key in next) {
          (next as any)[row.key] = { ...(next as any)[row.key], ...row.value };
        }
      }
      setSettings(next);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateSection = useCallback<SiteSettingsContextValue["updateSection"]>(async (key, value) => {
    const { error } = await (supabase as any)
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, isLoading, refresh, updateSection }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  return ctx;
}
