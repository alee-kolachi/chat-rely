import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Package,
  Play,
  RefreshCcw,
  Search,
  Shield,
  ShoppingBag,
  ShoppingCart,
  TriangleAlert,
  UserRound,
  Warehouse,
} from "lucide-react";
import type { ShopifyActionIconKey } from "./shopify-actions-data";

export function IconShopifyBag({ className }: { className?: string }) {
  return <ShoppingBag className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconSearch({ className }: { className?: string }) {
  return <Search className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconPackage({ className }: { className?: string }) {
  return <Package className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconBox({ className }: { className?: string }) {
  return <Warehouse className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconRefund({ className }: { className?: string }) {
  return <RefreshCcw className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconCart({ className }: { className?: string }) {
  return <ShoppingCart className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconPerson({ className }: { className?: string }) {
  return <UserRound className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconChevronRight({ className }: { className?: string }) {
  return <ChevronRight className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconCheck({ className }: { className?: string }) {
  return <Check className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconWarning({ className }: { className?: string }) {
  return <TriangleAlert className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconPlay({ className }: { className?: string }) {
  return <Play className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconClock({ className }: { className?: string }) {
  return <Clock3 className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconShield({ className }: { className?: string }) {
  return <Shield className={className} strokeWidth={1.8} aria-hidden />;
}

export function IconArrowLeft({ className }: { className?: string }) {
  return <ArrowLeft className={className} strokeWidth={1.8} aria-hidden />;
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
