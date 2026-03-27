import { google } from "googleapis";

function createOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
        process.env.GOOGLE_REDIRECT_URI!
    );
}

/**
 * Opens or closes a Google Form for new responses.
 * Uses the existing Drive OAuth scope — no additional permissions needed.
 *
 * @param refreshToken  Teacher's stored refresh token
 * @param formId        Google Form ID (the part after /d/ in the URL)
 * @param accepting     true = accept responses, false = stop accepting
 */
export async function setFormAcceptingResponses(
    refreshToken: string,
    formId: string,
    accepting: boolean
): Promise<void> {
    const auth = createOAuth2Client();
    auth.setCredentials({ refresh_token: refreshToken });
    const { token } = await auth.getAccessToken();
    if (!token) throw new Error("No se pudo obtener token de acceso a Google.");

    const res = await fetch(
        `https://forms.googleapis.com/v1/forms/${formId}:setPublishSettings`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                publishSettings: {
                    publishState: {
                        isPublished: true,
                        isAcceptingResponses: accepting,
                    },
                },
            }),
        }
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Forms API error ${res.status}: ${text}`);
    }
}
