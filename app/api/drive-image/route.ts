import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return new NextResponse("Missing file ID", { status: 400 });
    }

    try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

        if (!apiKey) {
            console.error("Missing NEXT_PUBLIC_GOOGLE_API_KEY");
            return new NextResponse("Server Configuration Error", { status: 500 });
        }

        const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Google Drive API error: ${response.status} ${response.statusText}`);
            return new NextResponse("Error fetching image from Google Drive", { status: response.status });
        }

        const contentType = response.headers.get("Content-Type") || "image/jpeg";
        const arrayBuffer = await response.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Proxy error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
