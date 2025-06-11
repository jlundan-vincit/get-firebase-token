import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {startLoginServer, stopLoginServer, initialise as initialiseOauth, refreshIdToken} from "./google-oauth2.js";
import {loginToFirebaseWithGoogleIdToken, initialize as initializeFirebase} from "./firebase-login.js";
import {config} from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tokensPath = join(__dirname, 'tokens.json');

async function writeTokenConfig(providerTokens, firebaseIdToken) {
  const tokenConfig = {
    providerTokens:providerTokens,
    firebaseAccessToken:firebaseIdToken
  };

  await fs.writeFile(tokensPath, JSON.stringify(tokenConfig, null, 2));
}

function printFirebaseTokenAndExit(token) {
  console.log("Firebase token successfully received:")
  console.log(token);
  process.exit(0);
}

initialiseOauth(config.googleOAuth2);
initializeFirebase(config.firebase);

async function getExistingTokens() {
  try {
    return JSON.parse(await fs.readFile(tokensPath, 'utf-8'));
  } catch (err) {
    return null;
  }
}

let existingTokens = await getExistingTokens();

if (existingTokens) {
  if (!existingTokens.providerTokens || !existingTokens.providerTokens.id_token || !existingTokens.providerTokens.refresh_token) {
    console.log(`Token config at ${tokensPath} exists, but is malformed. Please check your config.`);
    process.exit(-1)
  }
} else {
  console.log("No stored tokens found.")
}

if (existingTokens && existingTokens.providerTokens && existingTokens.providerTokens.id_token) {
  console.log("Stored Google id token found. Trying to log into Firebase.")

  try {
    const userCredential = await loginToFirebaseWithGoogleIdToken(existingTokens.providerTokens.id_token);

    const firebaseIdToken = await userCredential.user.getIdToken();

    await writeTokenConfig(existingTokens.providerTokens, firebaseIdToken);
    printFirebaseTokenAndExit(firebaseIdToken);
  } catch (e) {
    console.log("Cannot log into Firebase with current Google id token.")
  }
}

if (existingTokens && existingTokens.providerTokens && existingTokens.providerTokens.refresh_token) {
  console.log("Stored Google refresh token found. Trying to refresh the Google id token.")
  let oauthTokens = null;
  try {
    oauthTokens = (await refreshIdToken(existingTokens.providerTokens.refresh_token)).credentials
  } catch (e) {
    console.log("Cannot refresh Google id token with the current Google refresh token.")
  }

  if (oauthTokens) {
    console.log("Google id token refreshed, trying to log into Firebase.")
    try {
      const userCredential = await loginToFirebaseWithGoogleIdToken(oauthTokens.id_token);
      const firebaseIdToken = await userCredential.user.getIdToken();
      await writeTokenConfig(oauthTokens, firebaseIdToken);
      printFirebaseTokenAndExit(firebaseIdToken);
    } catch (e) {
      console.log("Cannot log into Firebase with refreshed Google id token.")
    }
  }
}

console.log("Starting login.")
await startLoginServer(config.port, async (oauthTokens) => {
  const userCredential= await loginToFirebaseWithGoogleIdToken(oauthTokens.id_token)
  const firebaseIdToken = await userCredential.user.getIdToken();
  await writeTokenConfig(oauthTokens, firebaseIdToken);
  stopLoginServer()
  printFirebaseTokenAndExit(firebaseIdToken);
});
