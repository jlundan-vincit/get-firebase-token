import express from "express";
import {OAuth2Client} from "google-auth-library";
import open from "open";

const app = express();
let DEFAULT_PORT= 5000, tokenResultHandler, loginServer, oauth2Client;

app.get('/oauth2callback', async (req, res) => {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    tokenResultHandler(tokens);
    res.send('Authentication completed. You can now close this window.');
});

export function initialise(config) {
    oauth2Client = new OAuth2Client(config.clientId, config.clientSecret, config.oauthRedirectUrl);
}

export async function refreshIdToken(refreshToken) {
    if (!oauth2Client) {
        throw "Called startLoginServer without a valid OAuth2 client, did you forgot to call initialise?";
    }
    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    return oauth2Client.refreshAccessToken();
}

export async function startLoginServer(port, resultHandler) {
    tokenResultHandler = resultHandler

    if (!oauth2Client) {
        console.error("Called startLoginServer without a valid OAuth2 client, did you forgot to call initialise?");
    }

    port = port || DEFAULT_PORT;
    loginServer = app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`);
    });

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
        prompt: 'consent'
    });

    try{
        await open(url);
    } catch (error) {
        console.error('Failed to open browser:', error);
    }
}

export function stopLoginServer() {
    loginServer.close()
}
