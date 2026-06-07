"""Execute Shopify-backed tool logic (called from LangChain tools)."""

from __future__ import annotations

import json
import re

import structlog

from app.domains.integrations.shopify.admin_client import compact_json, shopify_graphql

log = structlog.get_logger("runtime.shopify.tool_runners")


def _product_edges(data: dict[str, object]) -> list[object]:
    products = data.get("products")
    if not isinstance(products, dict):
        return []
    edges = products.get("edges")
    return list(edges) if isinstance(edges, list) else []


def _variant_inventory_quantity(variant_node: object) -> int:
    if not isinstance(variant_node, dict):
        return 0
    raw = variant_node.get("inventoryQuantity")
    try:
        return int(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0


def _product_node_has_stock(node: object) -> bool:
    if not isinstance(node, dict):
        return False
    variants = node.get("variants")
    if not isinstance(variants, dict):
        return True
    edges = variants.get("edges")
    if not isinstance(edges, list) or not edges:
        return True
    saw_inventory = False
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        variant_node = edge.get("node")
        if not isinstance(variant_node, dict):
            continue
        if "inventoryQuantity" not in variant_node:
            continue
        saw_inventory = True
        if _variant_inventory_quantity(variant_node) > 0:
            return True
    return not saw_inventory


def _filter_product_data_by_stock(
    data: dict[str, object], *, include_out_of_stock: bool
) -> dict[str, object]:
    if include_out_of_stock:
        return data
    products = data.get("products")
    if not isinstance(products, dict):
        return data
    edges = products.get("edges")
    if not isinstance(edges, list):
        return data
    kept: list[object] = []
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        node = edge.get("node")
        if _product_node_has_stock(node):
            kept.append(edge)
    return {**data, "products": {**products, "edges": kept}}


def _strip_customer_lifetime_value(data: dict[str, object]) -> dict[str, object]:
    customers = data.get("customers")
    if not isinstance(customers, dict):
        return data
    edges = customers.get("edges")
    if not isinstance(edges, list):
        return data
    next_edges: list[object] = []
    for edge in edges:
        if not isinstance(edge, dict):
            next_edges.append(edge)
            continue
        node = edge.get("node")
        if not isinstance(node, dict):
            next_edges.append(edge)
            continue
        trimmed = {k: v for k, v in node.items() if k != "amountSpent"}
        next_edges.append({**edge, "node": trimmed})
    return {**data, "customers": {**customers, "edges": next_edges}}


_PRODUCT_SEARCH_NODE_FIELDS = """
            title
            handle
            productType
            tags
            status
            onlineStoreUrl
            featuredImage {
              url
              altText
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 20) {
              edges {
                node {
                  sku
                  title
                  price
                  inventoryQuantity
                }
              }
            }
"""


def _format_display_price(amount: str | None, currency_code: str | None) -> str | None:
    raw = (amount or "").strip()
    if not raw:
        return None
    code = (currency_code or "USD").strip().upper() or "USD"
    try:
        value = float(raw)
    except ValueError:
        return f"{raw} {code}"
    if code == "USD":
        return f"${value:,.2f}"
    return f"{value:,.2f} {code}"


def _product_store_url(*, shop_domain: str, handle: str, online_store_url: str | None) -> str:
    direct = (online_store_url or "").strip()
    if direct:
        return direct
    safe_handle = (handle or "").strip()
    domain = (shop_domain or "").strip()
    return f"https://{domain}/products/{safe_handle}"


def _price_from_node(node: dict[str, object]) -> str | None:
    price_range = node.get("priceRangeV2")
    if not isinstance(price_range, dict):
        return None
    min_price = price_range.get("minVariantPrice")
    if not isinstance(min_price, dict):
        return None
    return _format_display_price(
        str(min_price.get("amount") or ""),
        str(min_price.get("currencyCode") or ""),
    )


def _featured_image_url(node: dict[str, object]) -> str | None:
    featured = node.get("featuredImage")
    if not isinstance(featured, dict):
        return None
    url = str(featured.get("url") or "").strip()
    return url or None


def _node_to_product_card(node: dict[str, object], *, shop_domain: str) -> dict[str, str] | None:
    handle = str(node.get("handle") or "").strip()
    title = str(node.get("title") or "").strip()
    if not handle or not title:
        return None
    card: dict[str, str] = {
        "handle": handle,
        "title": title,
        "url": _product_store_url(
            shop_domain=shop_domain,
            handle=handle,
            online_store_url=str(node.get("onlineStoreUrl") or "") or None,
        ),
    }
    price = _price_from_node(node)
    if price:
        card["price"] = price
    image_url = _featured_image_url(node)
    if image_url:
        card["image_url"] = image_url
    return card


def normalize_product_search_ui_cards(
    data: dict[str, object],
    shop_domain: str,
    *,
    exclude_handle: str | None = None,
    max_results: int | None = None,
) -> list[dict[str, str]]:
    exclude = (exclude_handle or "").strip().lower()
    limit = max(1, int(max_results)) if max_results is not None else None
    cards: list[dict[str, str]] = []
    for edge in _product_edges(data):
        if not isinstance(edge, dict):
            continue
        node = edge.get("node")
        if not isinstance(node, dict):
            continue
        handle = str(node.get("handle") or "").strip().lower()
        if exclude and handle == exclude:
            continue
        card = _node_to_product_card(node, shop_domain=shop_domain)
        if card is None:
            continue
        cards.append(card)
        if limit is not None and len(cards) >= limit:
            break
    return cards


def normalize_product_detail_ui(
    node: dict[str, object],
    *,
    shop_domain: str,
) -> dict[str, object] | None:
    card = _node_to_product_card(node, shop_domain=shop_domain)
    if card is None:
        return None
    image_urls: list[str] = []
    seen: set[str] = set()
    media = node.get("media")
    if isinstance(media, dict):
        edges = media.get("edges")
        if isinstance(edges, list):
            for edge in edges:
                if not isinstance(edge, dict):
                    continue
                media_node = edge.get("node")
                if not isinstance(media_node, dict):
                    continue
                image = media_node.get("image")
                if not isinstance(image, dict):
                    continue
                url = str(image.get("url") or "").strip()
                if url and url not in seen:
                    seen.add(url)
                    image_urls.append(url)
    featured = _featured_image_url(node)
    if featured and featured not in seen:
        image_urls.insert(0, featured)
    detail: dict[str, object] = dict(card)
    detail["image_urls"] = image_urls
    return detail


_CATALOG_QUERY_STOPWORDS = frozenset(
    {
        "a",
        "about",
        "also",
        "an",
        "and",
        "any",
        "are",
        "as",
        "at",
        "be",
        "but",
        "can",
        "carry",
        "do",
        "for",
        "guys",
        "have",
        "i",
        "in",
        "is",
        "it",
        "me",
        "my",
        "not",
        "of",
        "offer",
        "on",
        "one",
        "options",
        "or",
        "please",
        "same",
        "sell",
        "show",
        "size",
        "sizes",
        "sizing",
        "some",
        "that",
        "the",
        "these",
        "this",
        "those",
        "to",
        "want",
        "we",
        "well",
        "what",
        "with",
        "you",
        "your",
        "got",
        "give",
        "then",
        "else",
        "okay",
        "anyway",
        "actually",
        "really",
        "just",
        "yeah",
        "hmm",
    }
)

_SHOPIFY_ADMIN_QUERY_PREFIXES = (
    "published_status:",
    "status:",
    "product_type:",
    "tag:",
    "vendor:",
    "title:",
    "handle:",
)


def _is_shopify_admin_filter_token(token: str) -> bool:
    lower = (token or "").strip().lower()
    return any(lower.startswith(prefix) for prefix in _SHOPIFY_ADMIN_QUERY_PREFIXES)


def _strip_catalog_search_noise(query: str) -> str:
    """Drop emoji and other non-search characters before Shopify Admin product search."""
    kept: list[str] = []
    for ch in query or "":
        if ch.isalnum() or ch.isspace() or ch in ":_-":
            kept.append(ch)
    return " ".join("".join(kept).split())


def _product_keywords_from_query(query: str) -> list[str]:
    """Strip conversational filler so Admin search can match product terms (e.g. boots)."""
    words: list[str] = []
    for raw in _strip_catalog_search_noise(query).split():
        token = raw.strip("?.!,)'\" ").lower().replace("'", "")
        if _is_shopify_admin_filter_token(token):
            continue
        if len(token) > 2 and token not in _CATALOG_QUERY_STOPWORDS:
            words.append(token)
    return words


def _is_generic_catalog_question(query: str) -> bool:
    """Browse-the-catalog phrasing with no concrete product or category term."""
    s = (query or "").strip().lower()
    if len(s) <= 3:
        return True
    if len(s) > 120:
        return True
    return bool(
        re.search(
            r"(?i)(what\s+(kind|type|sort)s?\s+of|do\s+you\s+(have|sell|carry|offer)|"
            r"products?\s+(do\s+you|can\s+i|are\s+)|your\s+(website|store)|"
            r"\bcatalog\b|\bcollection\b|website|tell\s+me\s+about|"
            r"(check|try|look|search)\s+again|whole\s+range)",
            s,
        )
    )


def _needs_broad_catalog_retry(query: str) -> bool:
    """Whole-catalog browse when the message has no concrete product or category term."""
    if _product_keywords_from_query(query):
        return False
    return _is_generic_catalog_question(query)


def _resolve_shopify_product_search_query(query: str) -> tuple[str, bool]:
    """
    One Shopify Admin query per tool call. Broad browse uses published_status:published;
    otherwise prefer the model's keyword or the strongest term from a conversational query.
    """
    q = _strip_catalog_search_noise((query or "").strip())
    if not q:
        return "", False
    if q.lower() == "published_status:published":
        return q, True
    if _needs_broad_catalog_retry(q):
        return "published_status:published", True
    keywords = sorted(_product_keywords_from_query(q), key=len, reverse=True)
    if keywords:
        return keywords[0], False
    return q, False


async def run_product_search(
    *,
    shop_domain: str,
    access_token: str,
    query: str,
    max_results: int = 5,
    include_out_of_stock: bool = False,
    relevance_query: str | None = None,
) -> str:
    q = _strip_catalog_search_noise((query or "").strip())
    if not q:
        return compact_json({"error": "empty_query"})
    n = max(1, min(int(max_results), 20))
    shopify_q, is_broad = _resolve_shopify_product_search_query(q)
    if not shopify_q:
        lookup_meta: dict[str, object] = {
            "query": q,
            "result_count": 0,
            "not_found": True,
            "message": "Empty product search query.",
        }
        return compact_json({"data": {"products": {"edges": []}}, "lookup_meta": lookup_meta})
    fetch_n = max(n, 10) if is_broad else n
    gql = f"""
    query ProductSearch($q: String!, $n: Int!) {{
      products(first: $n, query: $q) {{
        edges {{
          node {{
{_PRODUCT_SEARCH_NODE_FIELDS}
          }}
        }}
      }}
    }}
    """
    body = await shopify_graphql(
        shop_domain=shop_domain,
        access_token=access_token,
        query=gql,
        variables={"q": shopify_q, "n": fetch_n},
    )
    data = dict(body.get("data") or {})
    data = _filter_product_data_by_stock(data, include_out_of_stock=include_out_of_stock)
    final_count = len(_product_edges(data))
    log.info(
        "runtime.shopify_product_search_result",
        query_preview=q[:120],
        shopify_query_preview=shopify_q[:120],
        is_broad_catalog=is_broad,
        final_count=final_count,
        include_out_of_stock=include_out_of_stock,
        relevance_query_preview=(relevance_query or "")[:80] or None,
    )

    lookup_meta: dict[str, object] = {
        "query": q,
        "shopify_query": shopify_q,
        "result_count": final_count,
        "not_found": final_count <= 0,
    }
    if final_count <= 0:
        lookup_meta["not_found"] = True
        lookup_meta["message"] = (
            "No matching product for this search in the connected store catalog. "
            "The item is not listed in Shopify — do not claim it is available."
        )
    ui_cards = normalize_product_search_ui_cards(data, shop_domain, max_results=20)
    payload: dict[str, object] = {"data": data, "lookup_meta": lookup_meta}
    if ui_cards:
        payload["ui_cards"] = ui_cards
    return compact_json(payload)


async def run_product_details(
    *,
    shop_domain: str,
    access_token: str,
    handle: str,
) -> str:
    safe_handle = (handle or "").strip()
    if not safe_handle:
        return compact_json({"error": "empty_handle"})
    gql = """
    query ProductDetails($handle: String!) {
      productByHandle(handle: $handle) {
        title
        handle
        onlineStoreUrl
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        featuredImage {
          url
          altText
        }
        media(first: 20) {
          edges {
            node {
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
    """
    body = await shopify_graphql(
        shop_domain=shop_domain,
        access_token=access_token,
        query=gql,
        variables={"handle": safe_handle},
    )
    data = body.get("data") or {}
    node = data.get("productByHandle") if isinstance(data, dict) else None
    if not isinstance(node, dict):
        return compact_json(
            {
                "lookup_meta": {
                    "handle": safe_handle,
                    "not_found": True,
                    "message": "Product not found in this store catalog.",
                }
            }
        )
    ui_detail = normalize_product_detail_ui(node, shop_domain=shop_domain)
    return compact_json(
        {
            "lookup_meta": {"handle": safe_handle, "not_found": False},
            "ui_detail": ui_detail,
        }
    )


def _similar_search_terms(*, title: str, tags: list[str], product_type: str, vendor: str) -> list[str]:
    terms: list[str] = []
    for keyword in _product_keywords_from_query(title):
        if keyword not in terms:
            terms.append(keyword)
    for tag in tags:
        token = (tag or "").strip().lower()
        if len(token) > 2 and token not in _CATALOG_QUERY_STOPWORDS and token not in terms:
            terms.append(token)
            if len(terms) >= 4:
                break
    pt = (product_type or "").strip()
    if pt and pt.lower() not in terms:
        terms.append(pt.lower())
    vend = (vendor or "").strip()
    if vend and vend.lower() not in terms:
        terms.append(vend.lower())
    return terms[:6]


async def run_similar_products(
    *,
    shop_domain: str,
    access_token: str,
    handle: str,
    title: str | None = None,
    max_results: int = 5,
) -> str:
    safe_handle = (handle or "").strip()
    if not safe_handle:
        return compact_json({"error": "empty_handle"})
    n = max(1, min(int(max_results), 20))
    meta_gql = """
    query SimilarSource($handle: String!) {
      productByHandle(handle: $handle) {
        title
        handle
        productType
        vendor
        tags
      }
    }
    """
    meta_body = await shopify_graphql(
        shop_domain=shop_domain,
        access_token=access_token,
        query=meta_gql,
        variables={"handle": safe_handle},
    )
    meta_data = meta_body.get("data") or {}
    source = meta_data.get("productByHandle") if isinstance(meta_data, dict) else None
    if not isinstance(source, dict):
        return compact_json(
            {
                "lookup_meta": {
                    "handle": safe_handle,
                    "not_found": True,
                    "message": "Product not found in this store catalog.",
                }
            }
        )
    source_title = str(source.get("title") or title or "").strip()
    tags_raw = source.get("tags")
    tags = [str(t) for t in tags_raw] if isinstance(tags_raw, list) else []
    search_terms = _similar_search_terms(
        title=source_title,
        tags=tags,
        product_type=str(source.get("productType") or ""),
        vendor=str(source.get("vendor") or ""),
    )
    query = " ".join(search_terms).strip() or source_title or safe_handle
    search_out = await run_product_search(
        shop_domain=shop_domain,
        access_token=access_token,
        query=query,
        max_results=max(n + 2, n),
    )
    try:
        payload = json.loads(search_out)
    except json.JSONDecodeError:
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    data = dict(payload.get("data") or {})
    ui_cards = normalize_product_search_ui_cards(
        data,
        shop_domain,
        exclude_handle=safe_handle,
        max_results=n,
    )
    lookup_meta = dict(payload.get("lookup_meta") or {})
    lookup_meta["source_handle"] = safe_handle
    lookup_meta["query"] = query
    lookup_meta["result_count"] = len(ui_cards)
    lookup_meta["not_found"] = len(ui_cards) <= 0
    if len(ui_cards) <= 0:
        lookup_meta["message"] = "No similar products found in this store catalog."
    out: dict[str, object] = {"data": data, "lookup_meta": lookup_meta}
    if ui_cards:
        out["ui_cards"] = ui_cards
    return compact_json(out)


def _normalize_order_reference(raw: str) -> str | None:
    """Return Shopify order name (#digits) or None when input is not a safe numeric reference."""
    s = (raw or "").strip()
    if not s:
        return None
    if s.startswith("#"):
        s = s[1:].strip()
    if not s or not s.isdigit():
        return None
    return f"#{s}"


async def run_order_lookup(
    *,
    shop_domain: str,
    access_token: str,
    order_name_or_number: str,
    customer_email: str | None = None,
) -> str:
    """Lookup by order name (#1001) or numeric id string; optional email filter."""
    raw = (order_name_or_number or "").strip()
    email = (customer_email or "").strip()
    order_name = _normalize_order_reference(raw)
    if not order_name and not email:
        if raw:
            return compact_json(
                {
                    "data": {},
                    "lookup_meta": {
                        "queries_tried": [],
                        "selected_query": "",
                        "result_count": 0,
                        "not_found": True,
                        "invalid_order_reference": True,
                    },
                }
            )
        return compact_json({"error": "provide_order_or_email"})
    gql = """
    query OrdersLookup($q: String!, $n: Int!) {
      orders(first: $n, query: $q, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            email
            displayFulfillmentStatus
            displayFinancialStatus
            createdAt
            fulfillments(first: 5) {
              trackingInfo {
                number
                url
              }
              status
            }
            shippingAddress {
              city
              country
              zip
            }
          }
        }
      }
    }
    """
    q_parts: list[str] = []
    if order_name:
        q_parts.append(f"name:{order_name}")
    order_part = " ".join(q_parts).strip()
    email_part = f"email:{email}" if email and "@" in email else ""
    candidates = [
        c
        for c in [
            " ".join(part for part in [order_part, email_part] if part).strip(),
            order_part,
            email_part,
        ]
        if c
    ]
    # Deduplicate while preserving order.
    seen: set[str] = set()
    queries = [q for q in candidates if not (q in seen or seen.add(q))]

    attempts: list[dict[str, object]] = []
    best_data: dict[str, object] = {}
    best_count = -1
    chosen_query = ""
    for q in queries:
        body = await shopify_graphql(
            shop_domain=shop_domain,
            access_token=access_token,
            query=gql,
            variables={"q": q, "n": 10},
        )
        data = body.get("data") or {}
        orders = ((data.get("orders") or {}).get("edges") or []) if isinstance(data, dict) else []
        count = len(orders) if isinstance(orders, list) else 0
        attempts.append({"query": q, "order_count": count})
        if count > best_count:
            best_count = count
            best_data = data if isinstance(data, dict) else {}
            chosen_query = q
        if count > 0:
            break

    return compact_json(
        {
            "data": best_data,
            "lookup_meta": {
                "queries_tried": attempts,
                "selected_query": chosen_query,
                "result_count": max(best_count, 0),
                "not_found": best_count <= 0,
            },
        }
    )


async def run_inventory_check(
    *,
    shop_domain: str,
    access_token: str,
    sku: str | None = None,
    product_query: str | None = None,
) -> str:
    sku_q = (sku or "").strip()
    pq = (product_query or "").strip()
    if not sku_q and not pq:
        return compact_json({"error": "provide_sku_or_product_query"})
    gql = """
    query InvProducts($q: String!, $n: Int!) {
      products(first: $n, query: $q) {
        edges {
          node {
            title
            handle
            variants(first: 50) {
              edges {
                node {
                  sku
                  title
                  inventoryQuantity
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
    """
    q_var = f"sku:{sku_q}" if sku_q else pq
    body = await shopify_graphql(
        shop_domain=shop_domain,
        access_token=access_token,
        query=gql,
        variables={"q": q_var, "n": 5},
    )
    data = body.get("data") or {}
    if not isinstance(data, dict):
        data = {}
    count = len(_product_edges(data))
    lookup_meta: dict[str, object] = {
        "query": q_var,
        "result_count": count,
        "not_found": count <= 0,
    }
    if sku_q:
        lookup_meta["sku_queried"] = sku_q
    elif pq:
        lookup_meta["product_query"] = pq
    if count <= 0:
        if sku_q:
            lookup_meta["message"] = (
                "No product or variant with this SKU in the connected store. "
                "The SKU may be wrong, outdated, or not listed in Shopify."
            )
        else:
            lookup_meta["message"] = (
                "No matching product for this search in the connected store. "
                "Try a shorter name or check spelling."
            )
    return compact_json({"data": data, "lookup_meta": lookup_meta})


async def run_customer_context(
    *,
    shop_domain: str,
    access_token: str,
    email: str,
    recent_orders: int = 5,
    include_lifetime_value: bool = True,
) -> str:
    em = (email or "").strip()
    if not em or "@" not in em:
        return compact_json({"error": "valid_email_required"})
    ro = max(1, min(int(recent_orders), 25))
    gql = """
    query CustomerCtx($q: String!, $orderCount: Int!) {
      customers(first: 5, query: $q) {
        edges {
          node {
            id
            displayName
            email
            numberOfOrders
            amountSpent {
              amount
              currencyCode
            }
            orders(first: $orderCount, sortKey: CREATED_AT, reverse: true) {
              edges {
                node {
                  name
                  createdAt
                  displayFinancialStatus
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    """
    body = await shopify_graphql(
        shop_domain=shop_domain,
        access_token=access_token,
        query=gql,
        variables={"q": f"email:{em}", "orderCount": ro},
    )
    data = body.get("data") or {}
    if isinstance(data, dict) and not include_lifetime_value:
        data = _strip_customer_lifetime_value(data)
    customers = ((data.get("customers") or {}).get("edges") or []) if isinstance(data, dict) else []
    count = len(customers) if isinstance(customers, list) else 0
    lookup_meta: dict[str, object] = {
        "email_queried": em,
        "result_count": count,
        "not_found": count <= 0,
    }
    if count <= 0:
        lookup_meta["message"] = (
            "No customer record for this email in the connected store. "
            "Common for test emails, typos, or shoppers who have not placed an order yet."
        )
    return compact_json({"data": data, "lookup_meta": lookup_meta})
