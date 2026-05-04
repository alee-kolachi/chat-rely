"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { backendFetch } from "@/lib/backend-api";

export type MeProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  email_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
};

type UserProfileContextValue = {
  profile: MeProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await backendFetch<MeProfile>("/api/v1/me/profile");
      setProfile(data);
      setError(null);
    } catch (e) {
      setProfile(null);
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Mount-time profile load; setState runs after await inside refresh, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client fetch for account menu + profile page
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ profile, loading, error, refresh }),
    [profile, loading, error, refresh]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return ctx;
}
