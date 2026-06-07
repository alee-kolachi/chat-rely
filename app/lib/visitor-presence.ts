export function visitorPresenceLabel(online: boolean): string {
  return online ? "Visitor online" : "Visitor offline";
}

export function conversationActivityLabel(active: boolean, status?: string): string {
  if (!active) {
    if (status === "resolved") return "Resolved";
    if (status === "idle_closed") return "Closed";
    return "Inactive";
  }
  return "Active";
}
