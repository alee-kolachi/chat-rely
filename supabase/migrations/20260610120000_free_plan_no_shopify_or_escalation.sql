-- Free tier: no Shopify connect or human escalation (Hobby and above).

update public.plans
set
  features = features
    || jsonb_build_object(
      'shopify_enabled', false,
      'human_escalation_enabled', false,
      'max_enabled_actions_per_agent', 0
    ),
  updated_at = now()
where slug = 'free';
