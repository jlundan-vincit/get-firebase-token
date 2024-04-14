import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {startLoginServer, stopLoginServer, initialise as initialiseOauth, refreshIdToken} from "./google-oauth2.js";
import {loginToFirebaseWithGoogleIdToken, initialize as initializeFirebase} from "./firebase-login.js";
import {config} from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tokensPath = join(__dirname, 'tokens.json');

function writeTokenConfig(providerTokens, firebaseIdToken) {
  const tokenConfig = {
    providerTokens:providerTokens,
    firebaseAccessToken:firebaseIdToken
  };

  fs.writeFileSync(tokensPath, JSON.stringify(tokenConfig, null, 2));
}

function printFirebaseTokenAndExit(token) {
  console.log("Firebase token successfully received:")
  console.log(token);
  process.exit(0);
}

initialiseOauth(config.googleOAuth2);
initializeFirebase(config.firebase);

let existingTokens = null;

if (fs.existsSync(tokensPath)) {
  try {
    existingTokens = (await import(tokensPath, {assert: {type: 'json'}})).default;

    if (existingTokens && (!existingTokens.providerTokens || !existingTokens.providerTokens.id_token || !existingTokens.providerTokens.refresh_token)) {
      console.log(`Token config at ${tokensPath} exists, but is malformed. Please check your config.`);
      process.exit(-1)
    }
  } catch (e) {
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

    writeTokenConfig(existingTokens.providerTokens, firebaseIdToken);
    printFirebaseTokenAndExit(await userCredential.user.getIdToken());
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
      writeTokenConfig(oauthTokens, firebaseIdToken);
      printFirebaseTokenAndExit(await userCredential.user.getIdToken());
    } catch (e) {
      console.log("Cannot log into Firebase with refreshed Google id token.")
    }
  }
}

console.log("Starting login.")
await startLoginServer(config.port, async (oauthTokens) => {
  const userCredential= await loginToFirebaseWithGoogleIdToken(oauthTokens.id_token)
  const firebaseIdToken = await userCredential.user.getIdToken();
  writeTokenConfig(oauthTokens, firebaseIdToken);
  stopLoginServer()
  printFirebaseTokenAndExit(await userCredential.user.getIdToken());
});
