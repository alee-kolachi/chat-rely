# Realtime updates (roadmap)

Today the dashboard uses HTTP polling for freshness:

- Conversations (~5s)
- Notifications (~25s)
- Playground thread sync (~4s)

**Future:** subscribe to Supabase Realtime or server-sent events on conversation/message tables for lower latency and less traffic.
