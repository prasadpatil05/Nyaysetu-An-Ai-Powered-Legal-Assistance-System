import * as crypto from 'crypto';
import { verifyRegistrationResponse, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { findOneByEmail } from './db';

const isDevelopment = process.env.NODE_ENV === 'development';

const HOST_SETTINGS = {
    expectedOrigin: isDevelopment ? "http://localhost:3000" : "https://nyaysathi.vercel.app",
    expectedRPID: isDevelopment ? "localhost" : "nyaysathi.vercel.app",
    requireResidentKey: false,
    authenticatorAttachment: "platform",
    userVerification: "preferred",
};

function clean(str) {
    return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function generateChallenge() {
    return clean(crypto.randomBytes(32).toString("base64"));
}

// Helper function to translate values between
// `@github/webauthn-json` and `@simplewebauthn/server`
function binaryToBase64url(bytes) {
    let str = "";

    bytes.forEach((charCode) => {
        str += String.fromCharCode(charCode);
    });

    return btoa(str);
}

function base64ToArray(base64) {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[ i ] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function login(request) {
    const challenge = request.session.challenge ?? "";
    const credential = request.body.credential ?? "";
    const email = request.body.email ?? "";

    console.log("Login attempt:", { email, hasCredential: !!credential });

    if (!email || !credential?.id) {
        throw new Error("Please provide both email and authentication credentials");
    }

    const user = await findOneByEmail(email);
    if (!user || !user.credentials || user.credentials.length === 0) {
        throw new Error("No registered credentials found for this email");
    }

    try {
        console.log("Verifying authentication...");
        const verification = await verifyAuthenticationResponse({
            credential,
            expectedChallenge: challenge,
            expectedOrigin: HOST_SETTINGS.expectedOrigin,
            expectedRPID: HOST_SETTINGS.expectedRPID,
            authenticator: {
                credentialID: base64ToArray(user.credentials[0].credentialID),
                credentialPublicKey: base64ToArray(user.credentials[0].publicKey),
                counter: user.credentials[0].counter || 0,
            },
            requireUserVerification: true,
        });

        console.log("Verification result:", verification);

        if (!verification.verified) {
            throw new Error("Authentication verification failed");
        }

        return user.uid;
    } catch (error) {
        console.error("Authentication error:", error);
        throw new Error(error.message || "Authentication failed. Please try again.");
    }
}

export async function verifyCredentials(request) {

    const challenge = request.session.challenge ?? "";
    const credential = request.body.cred ?? "";

    if (credential == null) {
        throw new Error("Invalid Credentials");
    }

    let verification;

    verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challenge,
        requireUserVerification: true,
        ...HOST_SETTINGS,
    });

    if (!verification.verified) {
        throw new Error("Invalid Credentials - Registration verification failed.");
    }

    const { credentialID, credentialPublicKey } =
        verification.registrationInfo ?? {};

    if (credentialID == null || credentialPublicKey == null) {
        throw new Error("Registration failed");
    }

    return {
        credentialID: clean(binaryToBase64url(credentialID)),
        publicKey: Buffer.from(credentialPublicKey).toString("base64"),
    };
}