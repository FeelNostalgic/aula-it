import pkg from "@/package.json";

export const APP_VERSION = pkg.version;

/**
 * Returns the current environment tag based on Vercel or Node.js environment variables.
 * - production -> (stable)
 * - preview -> (preview)
 * - local development -> (local)
 */
export const getAppStatus = () => {
    const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
    const nodeEnv = process.env.NODE_ENV;

    if (vercelEnv === "production") return "stable";
    if (vercelEnv === "preview") return "preview";
    if (nodeEnv === "development") return "local";

    return "dev";
};

export const APP_STATUS = getAppStatus();
