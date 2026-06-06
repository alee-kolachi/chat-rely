-- Use per-agent inactivity_timeout_minutes from agent_reliability_settings when closing idle threads.

create or replace function public.close_idle_conversations(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  closed_count integer := 0;
  conv_id uuid;
begin
  for conv_id in
    with updated as (
      update public.conversations c
         set status = 'idle_closed',
             closed_at = p_now,
             updated_at = p_now
        from public.agents a
        left join public.agent_reliability_settings rs
          on rs.agent_id = a.id and rs.user_id = a.user_id
       where c.agent_id = a.id
         and c.status = 'open'
         and c.last_activity_at <= p_now - (
           coalesce(rs.inactivity_timeout_minutes, 30) * interval '1 minute'
         )
      returning c.id
    )
    select id from updated
  loop
    closed_count := closed_count + 1;
    perform public.mark_conversation_counts_toward_plan(conv_id);
  end loop;

  return closed_count;
end;
$$;

comment on function public.close_idle_conversations(timestamptz)
  is 'Marks open conversations idle_closed after each agent''s configured inactivity timeout (default 30m), then evaluates plan counting.';
