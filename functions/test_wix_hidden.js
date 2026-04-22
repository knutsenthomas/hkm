require("dotenv").config();
const { createClient, OAuthStrategy } = require("@wix/sdk");
const { products } = require("@wix/stores");

async function run() {
  const wixClient = createClient({
    modules: { products },
    auth: OAuthStrategy({ clientId: process.env.WIX_CLIENT_ID })
  });
  await wixClient.auth.generateVisitorTokens();
  
  const resultHidden = await wixClient.products.queryProducts().eq('visible', false).find();
  console.log("Skjulte produkter: " + resultHidden.totalCount);
  
  const resultAll = await wixClient.products.queryProducts().find();
  console.log("Totale produkter (default): " + resultAll.totalCount);
}
run().catch(console.error);
