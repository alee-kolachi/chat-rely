"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearChatrelyClientAccountCaches } from "@/lib/clear-client-account-caches";
import { CHATRELY_AUTH_SHORT_LIVED_COOKIE } from "@/lib/auth-session-preference";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    document.cookie = `${CHATRELY_AUTH_SHORT_LIVED_COOKIE}=; Path=/; Max-Age=0`;
    clearChatrelyClientAccountCaches();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={cn(
        "touch-manipulation cursor-pointer disabled:cursor-wait [-webkit-tap-highlight-color:transparent]",
        className
      )}
    >
      {isLoading ? "Logging out..." : "Log out"}
    </button>
  );
}
