import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/drive-image/route";

// drive-image/route.ts does not use Supabase — no need to mock it.

describe("GET /api/drive-image", () => {
  const API_KEY = "test-google-api-key";

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY = API_KEY;
  });

  it("returns 400 when the `id` search param is missing", async () => {
    const request = new NextRequest("http://localhost/api/drive-image");

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing file ID");
  });

  it("returns 500 when NEXT_PUBLIC_GOOGLE_API_KEY env var is not set", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const request = new NextRequest("http://localhost/api/drive-image?id=abc123");

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Server Configuration Error");
  });

  it("forwards the Google API error status when Google Drive returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        headers: { get: vi.fn().mockReturnValue(null) },
      })
    );

    const request = new NextRequest("http://localhost/api/drive-image?id=abc123");

    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Error fetching image from Google Drive");

    vi.unstubAllGlobals();
  });

  it("proxies the image content with correct headers on success", async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71]).buffer; // PNG magic bytes
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue("image/png") },
        arrayBuffer: vi.fn().mockResolvedValue(imageBytes),
      })
    );

    const request = new NextRequest("http://localhost/api/drive-image?id=abc123");

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable"
    );

    const body = await response.arrayBuffer();
    expect(body).toEqual(imageBytes);

    vi.unstubAllGlobals();
  });
});
