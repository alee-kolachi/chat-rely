import type { ProductCard } from "@/lib/product-card";

const DEMO_PRODUCT_IMAGE = (filename: string) => `/marketing/demo-products/${filename}`;

/** Static catalog cards for landing-page chat demos (hero + comparison). */
export const LANDING_DEMO_HOODIE_PRODUCTS: ProductCard[] = [
  {
    handle: "classic-blue-hoodie",
    title: "Classic Blue Hoodie",
    url: "https://example.com/products/classic-blue-hoodie",
    image_url: DEMO_PRODUCT_IMAGE("classic-blue-hoodie.jpg"),
    price: "$58.00",
  },
  {
    handle: "navy-zip-hoodie",
    title: "Navy Zip Hoodie",
    url: "https://example.com/products/navy-zip-hoodie",
    image_url: DEMO_PRODUCT_IMAGE("navy-zip-hoodie.jpg"),
    price: "$64.00",
  },
  {
    handle: "sky-blue-hoodie",
    title: "Sky Blue Hoodie",
    url: "https://example.com/products/sky-blue-hoodie",
    image_url: DEMO_PRODUCT_IMAGE("sky-blue-hoodie.jpg"),
    price: "$52.00",
  },
];

/** Running shoes for the landing comparison scroll demo (distinct from hero hoodies). */
export const LANDING_DEMO_SHOE_PRODUCTS: ProductCard[] = [
  {
    handle: "trail-runner-pro",
    title: "Trail Runner Pro",
    url: "https://example.com/products/trail-runner-pro",
    image_url: DEMO_PRODUCT_IMAGE("trail-runner-pro.jpg"),
    price: "$118.00",
  },
  {
    handle: "city-jogger",
    title: "City Jogger",
    url: "https://example.com/products/city-jogger",
    image_url: DEMO_PRODUCT_IMAGE("city-jogger.jpg"),
    price: "$96.00",
  },
  {
    handle: "lite-pace-runner",
    title: "Lite Pace Runner",
    url: "https://example.com/products/lite-pace-runner",
    image_url: DEMO_PRODUCT_IMAGE("lite-pace-runner.jpg"),
    price: "$84.00",
  },
];
