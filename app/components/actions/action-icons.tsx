import type { ReactNode } from "react";
import type { ShopifyActionIconKey } from "./shopify-actions-data";

function IconBase({
  className,
  children,
  fill = "none",
  strokeWidth = "1.8",
}: {
  className?: string;
  children: ReactNode;
  fill?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconShopifyBag({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 8h12l-1 11H7L6 8Z" />
      <path d="M9 9V7a3 3 0 1 1 6 0v2" />
    </IconBase>
  );
}

export function IconSearch({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function IconPackage({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </IconBase>
  );
}

export function IconBox({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 8h16v12H4z" />
      <path d="M4 8 6 4h12l2 4M9 12h6" />
    </IconBase>
  );
}

export function IconRefund({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 12a7 7 0 1 1 2.5 5.4" />
      <path d="M5 5v5h5" />
      <path d="M11 14h2.5a1.5 1.5 0 0 0 0-3H10" />
    </IconBase>
  );
}

export function IconCart({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 4h2l2 12h12l2-9H7" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </IconBase>
  );
}

export function IconPerson({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
    </IconBase>
  );
}

export function IconChevronRight({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

export function IconCheck({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m5 12 5 5 9-11" />
    </IconBase>
  );
}

export function IconWarning({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v5M12 17.5h.01" />
    </IconBase>
  );
}

export function IconPlay({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m8 5 11 7-11 7V5Z" />
    </IconBase>
  );
}

export function IconClock({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function IconShield({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
    </IconBase>
  );
}

export function IconArrowLeft({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </IconBase>
  );
}

export function IconAction({
  iconKey,
  className,
}: {
  iconKey: ShopifyActionIconKey;
  className?: string;
}) {
  switch (iconKey) {
    case "search":
      return <IconSearch className={className} />;
    case "package":
      return <IconPackage className={className} />;
    case "box":
      return <IconBox className={className} />;
    case "refund":
      return <IconRefund className={className} />;
    case "cart":
      return <IconCart className={className} />;
    case "person":
      return <IconPerson className={className} />;
    default:
      return <IconShopifyBag className={className} />;
  }
}
