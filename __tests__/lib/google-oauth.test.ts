import { afterEach, describe, expect, it, vi } from "vitest";
import { requireGoogleRedirectUri, resolveGoogleRedirectUri } from "@/lib/google-oauth";

describe("google-oauth", () => {
  afterEach(() => {
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/drive/callback";
  });

  it("uses GOOGLE_REDIRECT_URI when it is defined", () => {
    process.env.GOOGLE_REDIRECT_URI = "https://prod.example.com/api/drive/callback";

    expect(resolveGoogleRedirectUri("http://localhost:3000")).toBe(
      "https://prod.example.com/api/drive/callback"
    );
  });

  it("derives the callback URL from the request origin when the env is missing", () => {
    delete process.env.GOOGLE_REDIRECT_URI;

    expect(resolveGoogleRedirectUri("https://aula-it.vercel.app")).toBe(
      "https://aula-it.vercel.app/api/drive/callback"
    );
  });

  it("throws when neither env nor request origin can provide a redirect URI", () => {
    delete process.env.GOOGLE_REDIRECT_URI;

    expect(() => requireGoogleRedirectUri()).toThrow(/redirect uri/i);
  });
});
