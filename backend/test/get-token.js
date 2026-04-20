const { PrivyClient } = require('@privy-io/node');
require('dotenv').config();

console.log("Loaded environment variables:");
console.log("PRIVY_APP_ID:", process.env.PRIVY_APP_ID);
console.log("PRIVY_APP_SECRET:", process.env.PRIVY_SECRET ? "Defined" : "Missing");

// Get these from your Privy Dashboard (Settings -> API Keys)
const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID,
  appSecret: process.env.PRIVY_SECRET
});

async function getToken() {
  // This generates a valid token for a fake test user
  const { access_token } = await privy.apps().getTestAccessToken({
    walletAddress: '0x123' 
  });
  console.log("YOUR PRIVY TOKEN:");
  console.log(access_token);
}

getToken();