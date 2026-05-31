export type VisitorContactFields = {
  name: string;
  email: string;
};

export function readContactCaptureRequired(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload) return false;
  if (payload.contact_capture_required === true) return true;
  const escalation = payload.escalation;
  if (escalation && typeof escalation === "object" && !Array.isArray(escalation)) {
    return (escalation as Record<string, unknown>).contact_capture_required === true;
  }
  return false;
}

export function readVisitorContactFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): VisitorContactFields | null {
  if (!metadata || typeof metadata !== "object") return null;
  const name = typeof metadata.visitor_name === "string" ? metadata.visitor_name.trim() : "";
  const email = typeof metadata.visitor_email === "string" ? metadata.visitor_email.trim() : "";
  if (!name && !email) return null;
  return { name, email };
}

export function formatVisitorContactLabel(contact: VisitorContactFields | null): string | null {
  if (!contact) return null;
  const name = contact.name.trim();
  const email = contact.email.trim();
  if (name && email) return `${name} · ${email}`;
  return name || email || null;
}

export function readTicketCustomerName(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const name = typeof metadata.customer_name === "string" ? metadata.customer_name.trim() : "";
  return name || null;
}
