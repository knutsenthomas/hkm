require("dotenv").config();
const { createClient, OAuthStrategy } = require("@wix/sdk");
const { products } = require("@wix/stores");
const fs = require("fs");

async function run() {
  const wixClient = createClient({
    modules: { products },
    auth: OAuthStrategy({ clientId: process.env.WIX_CLIENT_ID })
  });

  await wixClient.auth.generateVisitorTokens();
  
  let allItems = [];
  let skip = 0;
  const limit = 100;
  let hasMore = true;

  console.log("Henter produkter sortert etter NYESTE først...");

  while (hasMore) {
    const result = await wixClient.products.queryProducts()
      .descending('lastUpdated') // Try lastUpdated first, or createdDate
      .limit(limit)
      .skip(skip)
      .find();

    if (result.items.length === 0) {
      hasMore = false;
      break;
    }

    const items = result.items.map(item => ({
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
        collectionIds: item.collectionIds || [],
        lastUpdated: item.lastUpdated || item._updatedDate // Store date for sorting
    }));
    
    allItems = allItems.concat(items);
    console.log(`Hentet ${allItems.length} produkter...`);
    
    skip += limit;
    if (result.items.length < limit) hasMore = false;
  }

  // Sort one more time locally just to be absolutely sure
  allItems.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

  const cacheData = {
    updatedAt: new Date().toISOString(),
    count: allItems.length,
    total: allItems.length,
    items: allItems,
    source: "local-script-newest-first"
  };

  fs.writeFileSync("../wix_products.json", JSON.stringify(cacheData, null, 2));
  console.log("Fullført! " + allItems.length + " produkter lagret.");
}
run().catch(console.error);
