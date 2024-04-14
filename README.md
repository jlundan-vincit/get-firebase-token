# get-firebase-token

## Configure
Create file called `config.js` in the repository root with following contents:
```javascript
export const config = {
  firebase: {
    apiKey: "<firebase api key>",
    authDomain: "<firebase auth domain>",
    projectId: "<firebase project id>",
    storageBucket: "<firebase storage bucket>",
    messagingSenderId: "<firbase messaging sender id>",
    appId: "<firebase app id>",
    measurementId: "<firebase measurement id>"
  },
  googleOAuth2: {
    clientId: '<google oauth client id>',
    clientSecret: '<google oauth client id>',
    oauthRedirectUrl: 'http://localhost:5000/oauth2callback'
  },
  port: 5000
}
```

You can get firebase configs from Firebase console by navigating into the project settings and selecting/creating firebase web app.

You can get googleOauth2 clientId and clientSecret from Google Cloud Platform, by navigating into `APIs and Services` and then into `Credentials`. While there, either select existing Web application OAuth client or create one. Make sure that the oauthRedirectUrl is authorized in the client config.  

## Run
```
npm install
npm start
```

On the first run, the script should open up a browser window where you can log in with your Google credentials. After you have logged in, the script stores your login into file called `tokens.json` and prints the Firebase token. On subsequent runs the script should be able to use the stored tokens to obtain new Firebase token without needing to log in again. 