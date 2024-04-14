import {getAuth, GoogleAuthProvider, signInWithCredential} from "firebase/auth";
import {initializeApp as initializeClientApp} from "firebase/app";

let clientApp = null;

export function initialize(config) {
    if (!clientApp) {
        clientApp = initializeClientApp(config, "clientApp");
    }
}

export async function loginToFirebaseWithGoogleIdToken(idToken) {
    const clientAuth = getAuth(clientApp);

    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(clientAuth, credential)
}
