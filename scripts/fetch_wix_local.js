require("dotenv").config({ path: "functions/.env" });
const { createClient, OAuthStrategy } = require("@wix/sdk");
const { products } = require("@wix/stores");
const fs = require("fs");

async function run() {
  const wixClient = createClient({
    modules: { products },
    auth: OAuthStrategy({ clientId: process.env.WIX_CLIENT_ID })
  });

  await wixClient.auth.generateVisitorTokens();
  const result = await wixClient.products.queryProducts().limit(100).find();
  const items = result.items.map(item => {
    return {
      id: item._id,
      name: item.name,
      slug: item.slug,
      price: item.priceData?.price || 0,
      formattedPrice: item.priceData?.formatted?.price || "",
      imageUrl: item.media?.mainMedia?.image?.url || "",
      description: item.description || "",
      ribbon: item.ribbon || "",
      inStock: item.stock?.inStock !== false,
      productType: item.productType,
      collectionIds: item.collectionIds || []
    };
  });

  const cacheData = {
    updatedAt: new Date().toISOString(),
    count: items.length,
    total: result.totalCount || items.length,
    items: items,
    source: "local-script"
  };

  fs.writeFileSync("wix_products.json", JSON.stringify(cacheData, null, 2));
  console.log("Saved " + items.length + " products to wix_products.json");
}
run().catch(console.error);
