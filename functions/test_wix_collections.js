require("dotenv").config();
const { createClient, OAuthStrategy } = require("@wix/sdk");
const { collections } = require("@wix/stores");

async function run() {
  const wixClient = createClient({
    modules: { collections },
    auth: OAuthStrategy({ clientId: process.env.WIX_CLIENT_ID })
  });
  await wixClient.auth.generateVisitorTokens();
  
  const result = await wixClient.collections.queryCollections().find();
  console.log("Totale kategorier: " + result.totalCount);
  result.items.forEach(c => {
    console.log(`- ${c.name} (${c.numberOfItems} items)`);
  });
}
run().catch(console.error);
