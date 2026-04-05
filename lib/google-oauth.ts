import { google } from "googleapis";

function getRequiredGoogleEnv(name: "NEXT_PUBLIC_GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required Google OAuth env: ${name}`);
    }

    return value;
}

export function resolveGoogleRedirectUri(origin?: string): string | undefined {
    const envRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

    if (envRedirectUri) {
        return envRedirectUri;
    }

    if (!origin) {
        return undefined;
    }

    return new URL("/api/drive/callback", origin).toString();
}

export function requireGoogleRedirectUri(origin?: string): string {
    const redirectUri = resolveGoogleRedirectUri(origin);

    if (!redirectUri) {
        throw new Error("Missing Google OAuth redirect URI. Set GOOGLE_REDIRECT_URI or derive it from the current request origin.");
    }

    return redirectUri;
}

export function createGoogleOAuth2Client(origin?: string) {
    return new google.auth.OAuth2(
        getRequiredGoogleEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID"),
        getRequiredGoogleEnv("GOOGLE_CLIENT_SECRET"),
        resolveGoogleRedirectUri(origin)
    );
}
