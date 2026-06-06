import { Globe } from "lucide-react";

export type WelcomeSocialPlatform =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "x"
  | "pinterest"
  | "generic";

export function detectWelcomeSocialPlatform(label: string, url: string): WelcomeSocialPlatform {
  const haystack = `${label} ${url}`.toLowerCase();
  if (haystack.includes("instagram")) return "instagram";
  if (haystack.includes("tiktok")) return "tiktok";
  if (haystack.includes("facebook") || haystack.includes("fb.com")) return "facebook";
  if (haystack.includes("youtube") || haystack.includes("youtu.be")) return "youtube";
  if (haystack.includes("linkedin")) return "linkedin";
  if (haystack.includes("twitter") || haystack.includes("x.com")) return "x";
  if (haystack.includes("pinterest")) return "pinterest";
  return "generic";
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.5 4.5c.4 2.2 1.8 3.9 3.9 4.2v3.1c-1.4 0-2.7-.4-3.9-1.1v6.8c0 3.4-2.8 5.8-6.1 5.3-2.5-.4-4.4-2.5-4.7-5-.4-3.2 1.9-5.9 5-5.9.4 0 .8 0 1.2.1v3.3c-.3-.1-.6-.1-.9-.1-1.2 0-2.2 1-2.1 2.3.1 1.1 1.1 1.9 2.2 1.9 1.3 0 2.3-1 2.3-2.4V4.5h3.1z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14 8.5V6.8c0-.7.5-1.1 1.2-1.1h1.6V3h-2.2c-2.5 0-3.9 1.5-3.9 4v1.5H8v2.7h2.7V21h3.3v-9.8H17l.4-2.7h-3.4z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C6 18.9 12 19 12 19s6 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.5 8.8h2.8V19H6.5V8.8zm1.4-4.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zM10.2 8.8H13v1.4h.1c.4-.8 1.5-1.6 3.1-1.6 3.3 0 3.9 2.2 3.9 5v5.4h-2.9v-4.8c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5V19h-2.8V8.8z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="m4 4 7.2 9.6L4.3 20h2.5l4.8-6.3L15.8 20H20l-7.5-9.9L19.1 4h-2.5l-4.4 5.8L8.2 4H4z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 3a9 9 0 0 0-3.2 17.4c-.1-.8-.1-2 .2-3l1.4-5.8s-.4-.8-.4-1.9c0-1.8 1-3.1 2.3-3.1 1.1 0 1.6.8 1.6 1.8 0 1.1-.7 2.7-1.1 4.2-.3 1.3.7 2.3 1.9 2.3 2.3 0 3.9-2.9 3.9-6.4 0-2.7-1.8-4.7-5.1-4.7-3.8 0-6.1 2.8-6.1 6 0 1.2.4 2 .9 2.4.1.1.1.1.1 0l.3-1.3c0-.1 0-.2-.1-.3-.3-.4-.5-1-.5-1.8 0-2.3 1.5-4.4 4.4-4.4 2.4 0 3.9 1.6 3.9 3.9 0 2.6-1.1 4.8-2.9 4.8-.9 0-1.6-.8-1.4-1.7.3-1.1.8-2.3 1.1-3.5.3-1.2-.2-2.5-1.4-2.5-1.1 0-2 1.1-2 2.7 0 1 .3 1.7.3 1.7l-1.2 5.1c-.4 1.5-.1 3.4 0 4.5A9 9 0 1 0 12 3z" />
    </svg>
  );
}

export function WelcomeSocialPlatformIcon({
  platform,
  className,
}: {
  platform: WelcomeSocialPlatform;
  className?: string;
}) {
  switch (platform) {
    case "instagram":
      return <InstagramIcon className={className} />;
    case "tiktok":
      return <TikTokIcon className={className} />;
    case "facebook":
      return <FacebookIcon className={className} />;
    case "youtube":
      return <YouTubeIcon className={className} />;
    case "linkedin":
      return <LinkedInIcon className={className} />;
    case "x":
      return <XIcon className={className} />;
    case "pinterest":
      return <PinterestIcon className={className} />;
    default:
      return <Globe className={className} strokeWidth={2} aria-hidden />;
  }
}
