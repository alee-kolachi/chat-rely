export type ShopifyActionStatus = "live" | "disabled" | "coming-soon";

export type ShopifyActionIconKey =
  | "search"
  | "package"
  | "box"
  | "refund"
  | "cart"
  | "person";

export type ShopifyActionConfigField =
  | { type: "text"; key: string; label: string; defaultValue: string; help?: string }
  | { type: "number"; key: string; label: string; defaultValue: number; min?: number; max?: number; help?: string }
  | { type: "select"; key: string; label: string; options: string[]; defaultValue: string; help?: string }
  | { type: "multi"; key: string; label: string; options: string[]; defaultValue: string[]; help?: string }
  | { type: "toggle"; key: string; label: string; defaultValue: boolean; help?: string };

export type ShopifyActionTestField = {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
};

export type ShopifyAction = {
  id: string;
  label: string;
  description: string;
  longDescription: string;
  status: ShopifyActionStatus;
  enabled: boolean;
  icon: ShopifyActionIconKey;
  scopes: { name: string; granted: boolean }[];
  triggerExamples: string[];
  triggerGuidance: string;
  configFields: ShopifyActionConfigField[];
  testFields: ShopifyActionTestField[];
  exampleInput: Record<string, unknown>;
  exampleOutput: Record<string, unknown>;
};

export const shopifyActions: ShopifyAction[] = [
  {
    id: "product-search",
    label: "Product Search",
    description: "Search the store catalog by name, tag, or SKU.",
    longDescription:
      "Lets the agent look up products in the connected Shopify store. Useful when shoppers ask whether something is available, compare options, or want a recommendation.",
    status: "live",
    enabled: true,
    icon: "search",
    scopes: [
      { name: "read_products", granted: true },
      { name: "read_product_listings", granted: true },
    ],
    triggerExamples: [
      "Do you have the navy linen shirt in medium?",
      "What running shoes are under $120?",
      "Is the SKU SH-1024 still available?",
    ],
    triggerGuidance:
      "Call when the user asks about availability, price, variants, or wants a product recommendation.",
    configFields: [
      {
        type: "multi",
        key: "searchableFields",
        label: "Searchable fields",
        options: ["title", "tags", "sku", "vendor", "product_type"],
        defaultValue: ["title", "tags", "sku"],
        help: "Fields the agent will match the customer query against.",
      },
      {
        type: "number",
        key: "maxResults",
        label: "Max results",
        defaultValue: 5,
        min: 1,
        max: 20,
        help: "Maximum number of products returned per call.",
      },
      {
        type: "select",
        key: "language",
        label: "Response language",
        options: ["Auto detect", "English", "French", "Spanish", "German"],
        defaultValue: "Auto detect",
      },
      {
        type: "toggle",
        key: "includeOutOfStock",
        label: "Include out-of-stock products",
        defaultValue: false,
      },
    ],
    testFields: [
      {
        key: "query",
        label: "Customer query",
        placeholder: "navy linen shirt size medium",
        defaultValue: "navy linen shirt",
      },
    ],
    exampleInput: { query: "navy linen shirt", maxResults: 3 },
    exampleOutput: {
      products: [
        { title: "Navy Linen Button-Up", price: "$78.00", inStock: true, sku: "SH-1024" },
        { title: "Linen Camp Shirt - Indigo", price: "$84.00", inStock: true, sku: "SH-1031" },
      ],
    },
  },
  {
    id: "order-lookup",
    label: "Order Lookup",
    description: "Track orders, view status, and surface shipment details.",
    longDescription:
      "Pulls order details by order number or customer email so the agent can answer shipping and status questions accurately.",
    status: "live",
    enabled: true,
    icon: "package",
    scopes: [
      { name: "read_orders", granted: true },
      { name: "read_fulfillments", granted: true },
    ],
    triggerExamples: [
      "Where is order #8842?",
      "Has my package shipped yet?",
      "Can you check the status of my last order?",
    ],
    triggerGuidance:
      "Call when the user asks about order status, tracking, delivery dates, or carrier info.",
    configFields: [
      {
        type: "multi",
        key: "lookupKeys",
        label: "Lookup keys",
        options: ["order_number", "email", "phone"],
        defaultValue: ["order_number", "email"],
        help: "Identifiers the agent can use to find an order.",
      },
      {
        type: "multi",
        key: "statusesToSurface",
        label: "Statuses to surface",
        options: ["paid", "fulfilled", "in_transit", "delivered", "refunded", "cancelled"],
        defaultValue: ["paid", "fulfilled", "in_transit", "delivered"],
      },
      {
        type: "toggle",
        key: "includeTrackingLink",
        label: "Include tracking link in response",
        defaultValue: true,
      },
    ],
    testFields: [
      { key: "orderNumber", label: "Order number", placeholder: "8842", defaultValue: "8842" },
    ],
    exampleInput: { orderNumber: "8842" },
    exampleOutput: {
      order: {
        number: "8842",
        status: "in_transit",
        carrier: "FedEx",
        tracking: "1ZX98...",
        eta: "Tomorrow by 5:00 PM",
      },
    },
  },
  {
    id: "inventory-check",
    label: "Inventory Check",
    description: "Real-time stock levels per variant and location.",
    longDescription:
      "Returns live inventory counts across warehouses and storefronts. Coming soon while we finalize multi-location syncing.",
    status: "coming-soon",
    enabled: false,
    icon: "box",
    scopes: [
      { name: "read_inventory", granted: false },
      { name: "read_locations", granted: false },
    ],
    triggerExamples: [
      "How many of these are left in size large?",
      "Is this in stock at your downtown store?",
    ],
    triggerGuidance:
      "Call after a product has been identified and the user wants exact stock numbers.",
    configFields: [
      {
        type: "toggle",
        key: "perLocation",
        label: "Show stock per location",
        defaultValue: true,
      },
      {
        type: "number",
        key: "lowStockThreshold",
        label: "Low stock threshold",
        defaultValue: 5,
        min: 0,
        max: 100,
      },
    ],
    testFields: [
      { key: "sku", label: "SKU", placeholder: "SH-1024" },
    ],
    exampleInput: { sku: "SH-1024" },
    exampleOutput: { sku: "SH-1024", total: 42, locations: { downtown: 12, warehouse: 30 } },
  },
  {
    id: "refund-status",
    label: "Refund and Return Status",
    description: "Surface the state of a customer's return or refund request.",
    longDescription:
      "Lets the agent answer questions about ongoing returns: whether the label was used, the item received, and the refund issued.",
    status: "live",
    enabled: false,
    icon: "refund",
    scopes: [
      { name: "read_returns", granted: true },
      { name: "read_refunds", granted: true },
    ],
    triggerExamples: [
      "Did you receive my return?",
      "When will my refund show up?",
    ],
    triggerGuidance:
      "Call when the user mentions a return, refund, or exchange that's already been initiated.",
    configFields: [
      {
        type: "select",
        key: "defaultRefundMethod",
        label: "Default refund method",
        options: ["Original payment", "Store credit"],
        defaultValue: "Original payment",
      },
      {
        type: "toggle",
        key: "includeTimeline",
        label: "Include processing timeline",
        defaultValue: true,
      },
    ],
    testFields: [
      { key: "rmaNumber", label: "RMA number", placeholder: "RMA-1188" },
    ],
    exampleInput: { rmaNumber: "RMA-1188" },
    exampleOutput: {
      rma: "RMA-1188",
      state: "received",
      refundAmount: "$78.00",
      eta: "3-5 business days",
    },
  },
  {
    id: "cart-recovery",
    label: "Abandoned Cart Recovery",
    description: "Resume the customer's last unfinished checkout.",
    longDescription:
      "Looks up the most recent abandoned cart for the current shopper and lets the agent offer a one-click resume link.",
    status: "live",
    enabled: false,
    icon: "cart",
    scopes: [
      { name: "read_checkouts", granted: true },
      { name: "read_customers", granted: true },
    ],
    triggerExamples: [
      "I had a cart yesterday, can you bring it back?",
      "What was in my last cart?",
    ],
    triggerGuidance:
      "Call when the user references a previous session, abandoned cart, or unfinished purchase.",
    configFields: [
      {
        type: "number",
        key: "maxAgeHours",
        label: "Max cart age (hours)",
        defaultValue: 72,
        min: 1,
        max: 168,
      },
      {
        type: "toggle",
        key: "includeDiscount",
        label: "Offer a recovery discount",
        defaultValue: false,
      },
    ],
    testFields: [
      { key: "email", label: "Customer email", placeholder: "shopper@example.com" },
    ],
    exampleInput: { email: "shopper@example.com" },
    exampleOutput: {
      cartId: "ck_8821",
      itemCount: 3,
      total: "$142.50",
      resumeUrl: "https://store.com/cart/ck_8821",
    },
  },
  {
    id: "customer-profile",
    label: "Customer Profile and Order History",
    description: "Fetch lifetime context for the current shopper.",
    longDescription:
      "Surfaces basics like name, total orders, lifetime value, and a short list of recent purchases so the agent can personalize replies.",
    status: "live",
    enabled: false,
    icon: "person",
    scopes: [
      { name: "read_customers", granted: true },
      { name: "read_orders", granted: true },
    ],
    triggerExamples: [
      "Can you see what I've bought before?",
      "Am I a returning customer?",
    ],
    triggerGuidance:
      "Call once at the start of an authenticated conversation, or when the user references past orders.",
    configFields: [
      {
        type: "number",
        key: "recentOrderCount",
        label: "Recent orders to include",
        defaultValue: 5,
        min: 1,
        max: 25,
      },
      {
        type: "toggle",
        key: "includeLifetimeValue",
        label: "Include lifetime value",
        defaultValue: true,
      },
    ],
    testFields: [
      { key: "email", label: "Customer email", placeholder: "shopper@example.com" },
    ],
    exampleInput: { email: "shopper@example.com" },
    exampleOutput: {
      name: "Alex H.",
      totalOrders: 12,
      lifetimeValue: "$1,840",
      lastOrder: { number: "8842", date: "2025-12-12" },
    },
  },
];

export function getShopifyAction(id: string): ShopifyAction | undefined {
  return shopifyActions.find((action) => action.id === id);
}

export function listShopifyActionIds(): string[] {
  return shopifyActions.map((action) => action.id);
}
