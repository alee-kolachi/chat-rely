export type ApiActionCatalogEntry = {
  provider: string;
  action_key: string;
  label: string;
  description: string;
  status: "live" | "coming_soon" | "blocked_by_plan";
  required_scopes: string[];
  connection_scopes: string[];
  scopes_satisfied: boolean;
  enabled: boolean;
  config: Record<string, unknown>;
  safety_policy: Record<string, unknown>;
};

export type ApiActionCatalogResponse = {
  entries: ApiActionCatalogEntry[];
};
