# Deferred integrations (catalog stubs)

The action catalog in `backend/src/app/domains/actions/catalog_definitions.py` includes entries with `code_ready=False`:

- Email bridge (Mailjet send is implemented; full “email action” product path is not)
- Zendesk, Calendly (placeholders)
- Shopify `refund_status`, `cart_recovery` (placeholders)

These appear as **Coming soon** in the dashboard until implemented. Removing them from the catalog would hide cards entirely—keeping them documents the roadmap.
