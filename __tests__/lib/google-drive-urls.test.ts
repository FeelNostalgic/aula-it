import { describe, it, expect } from "vitest";
import type { DriveFile } from "@/hooks/use-google-drive-picker";
import {
    GOOGLE_MIME,
    toEditableUrl,
    toEmbedUrl,
    toFormEmbedUrl,
    extractGoogleFileId,
    toSlidesDownloadUrl,
    normalizeSlidesEmbedUrl,
} from "@/lib/google-drive-urls";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFile(overrides: Partial<DriveFile> = {}): DriveFile {
    return {
        id: "file-id-123",
        name: "Test File",
        mimeType: GOOGLE_MIME.DOCUMENT,
        url: "https://drive.google.com/file/d/file-id-123/view",
        iconUrl: "https://drive-thirdparty.googleusercontent.com/icon.png",
        lastEditedUtc: 1700000000000,
        ...overrides,
    };
}

// ─── toEditableUrl ────────────────────────────────────────────────────────────

describe("toEditableUrl", () => {
    it("returns a docs.google.com/document edit URL for DOCUMENT mime", () => {
        const file = makeFile({ mimeType: GOOGLE_MIME.DOCUMENT, id: "doc-abc" });
        expect(toEditableUrl(file)).toBe(
            "https://docs.google.com/document/d/doc-abc/edit"
        );
    });

    it("returns a spreadsheets edit URL for SPREADSHEET mime", () => {
        const file = makeFile({ mimeType: GOOGLE_MIME.SPREADSHEET, id: "sheet-xyz" });
        expect(toEditableUrl(file)).toBe(
            "https://docs.google.com/spreadsheets/d/sheet-xyz/edit"
        );
    });

    it("returns a presentation edit URL for PRESENTATION mime", () => {
        const file = makeFile({ mimeType: GOOGLE_MIME.PRESENTATION, id: "pres-999" });
        expect(toEditableUrl(file)).toBe(
            "https://docs.google.com/presentation/d/pres-999/edit"
        );
    });

    it("returns a forms edit URL for FORM mime", () => {
        const file = makeFile({ mimeType: GOOGLE_MIME.FORM, id: "form-456" });
        expect(toEditableUrl(file)).toBe(
            "https://docs.google.com/forms/d/form-456/edit"
        );
    });

    it("falls back to file.url for unknown MIME types", () => {
        const fallbackUrl = "https://drive.google.com/file/d/other-id/view";
        const file = makeFile({
            mimeType: "application/pdf",
            id: "other-id",
            url: fallbackUrl,
        });
        expect(toEditableUrl(file)).toBe(fallbackUrl);
    });
});

// ─── toEmbedUrl ───────────────────────────────────────────────────────────────

describe("toEmbedUrl", () => {
    it("returns embed URL with start/loop/delayms params for PRESENTATION", () => {
        const file = makeFile({ mimeType: GOOGLE_MIME.PRESENTATION, id: "pres-embed" });
        expect(toEmbedUrl(file)).toBe(
            "https://docs.google.com/presentation/d/pres-embed/embed?start=false&loop=false&delayms=3000"
        );
    });

    it("returns /preview URL for DOCUMENT mime", () => {
        const file = makeFile({ mimeType: GOOGLE_MIME.DOCUMENT, id: "doc-preview" });
        expect(toEmbedUrl(file)).toBe(
            "https://docs.google.com/document/d/doc-preview/preview"
        );
    });

    it("returns /preview URL for SPREADSHEET mime", () => {
        const file = makeFile({ mimeType: GOOGLE_MIME.SPREADSHEET, id: "sheet-preview" });
        expect(toEmbedUrl(file)).toBe(
            "https://docs.google.com/spreadsheets/d/sheet-preview/preview"
        );
    });

    it("returns drive.google.com /preview URL for unknown mime types", () => {
        const file = makeFile({ mimeType: "image/png", id: "img-001" });
        expect(toEmbedUrl(file)).toBe(
            "https://drive.google.com/file/d/img-001/preview"
        );
    });
});

// ─── toFormEmbedUrl ───────────────────────────────────────────────────────────

describe("toFormEmbedUrl", () => {
    it("returns a viewform?embedded=true URL", () => {
        const file = makeFile({ mimeType: GOOGLE_MIME.FORM, id: "form-embed-789" });
        expect(toFormEmbedUrl(file)).toBe(
            "https://docs.google.com/forms/d/form-embed-789/viewform?embedded=true"
        );
    });
});

// ─── extractGoogleFileId ──────────────────────────────────────────────────────

describe("extractGoogleFileId", () => {
    it("extracts ID from a docs.google.com document URL", () => {
        const url = "https://docs.google.com/document/d/abc123XYZ/edit";
        expect(extractGoogleFileId(url)).toBe("abc123XYZ");
    });

    it("extracts ID from a slides presentation URL", () => {
        const url = "https://docs.google.com/presentation/d/slides-id-456/embed";
        expect(extractGoogleFileId(url)).toBe("slides-id-456");
    });

    it("extracts ID from a /d/e/ (published embed) URL", () => {
        const url =
            "https://docs.google.com/presentation/d/e/2PACX-longpublishedid/pub";
        expect(extractGoogleFileId(url)).toBe("2PACX-longpublishedid");
    });

    it("extracts ID from a drive.google.com/file/d/ URL", () => {
        const url = "https://drive.google.com/file/d/drivefileID789/view";
        expect(extractGoogleFileId(url)).toBe("drivefileID789");
    });

    it("returns null for a non-Google URL", () => {
        expect(extractGoogleFileId("https://example.com/some-page")).toBeNull();
    });
});

// ─── toSlidesDownloadUrl ──────────────────────────────────────────────────────

describe("toSlidesDownloadUrl", () => {
    it("returns an export/pptx URL for a valid Google Slides URL", () => {
        const embedUrl =
            "https://docs.google.com/presentation/d/pres-dl-id/embed?start=false";
        expect(toSlidesDownloadUrl(embedUrl)).toBe(
            "https://docs.google.com/presentation/d/pres-dl-id/export/pptx"
        );
    });

    it("returns null for a non-slides Google URL", () => {
        const docsUrl = "https://docs.google.com/document/d/doc-id/edit";
        expect(toSlidesDownloadUrl(docsUrl)).toBeNull();
    });

    it("returns null when the URL contains no extractable file ID", () => {
        const badUrl = "https://docs.google.com/presentation/";
        expect(toSlidesDownloadUrl(badUrl)).toBeNull();
    });
});

describe("normalizeSlidesEmbedUrl", () => {
    it("normalizes a standard slides URL to /embed", () => {
        expect(
            normalizeSlidesEmbedUrl("https://docs.google.com/presentation/d/pres-123/edit?usp=sharing")
        ).toBe(
            "https://docs.google.com/presentation/d/pres-123/embed?start=false&loop=false&delayms=3000"
        );
    });

    it("normalizes a published slides URL to /pubembed", () => {
        expect(
            normalizeSlidesEmbedUrl("https://docs.google.com/presentation/d/e/2PACX-abc/pub?start=false")
        ).toBe(
            "https://docs.google.com/presentation/d/e/2PACX-abc/pubembed?start=false&loop=false&delayms=3000"
        );
    });

    it("returns null for non-slides URLs", () => {
        expect(normalizeSlidesEmbedUrl("https://docs.google.com/document/d/doc-1/edit")).toBeNull();
    });
});
