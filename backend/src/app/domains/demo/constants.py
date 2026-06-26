"""Fixed demo outreach constants (not env-configured)."""

from uuid import UUID

DEMO_PUBLIC_BASE_URL = "https://chatrely.com"
DEMO_SHOPIFY_INSTALL_URL = "https://apps.shopify.com/chatrely"

DEMO_SYSTEM_USER_EMAIL = "demo-outreach@chatrely.internal"
DEMO_SYSTEM_USER_ID = UUID("a0000000-0000-4000-8000-000000000001")

DEMO_PER_VISITOR_MESSAGE_CAP = 10
DEMO_LIFETIME_MESSAGE_CAP = 100
DEMO_QA_SCORE_THRESHOLD = 0.75
DEMO_TTL_DAYS = 30
DEMO_MIN_PRODUCT_COUNT = 3
# Full catalog fetched when the demo page loads (not at outreach provision).
DEMO_MAX_PRODUCTS = 2500
DEMO_PRODUCTS_JSON_MAX_PAGES = 12
# Lines sent to the per-turn catalog selection LLM.
DEMO_CATALOG_SELECT_LIMIT = 5
# Essential non-product pages at provision (one combined embedding job).
DEMO_MAX_SITE_PAGES = 7
