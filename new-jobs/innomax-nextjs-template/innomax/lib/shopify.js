import "@shopify/shopify-api/adapters/web-api";
import { createAdminApiClient } from "@shopify/admin-api-client";

export const shopify = createAdminApiClient({
  storeDomain: `${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_NAME}`,
  apiVersion: `${process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION}`,
  accessToken: `${process.env.NEXT_PUBLIC_SHOPIFY_PRIVATE_ACCESS_TOKEN}`,
});
