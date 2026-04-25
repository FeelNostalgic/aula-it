import { describe, expect, it } from "vitest";
import { getDriveFilesToAutoShare, shouldAutoShareDriveFile } from "@/lib/google-drive-sharing";

describe("google-drive-sharing", () => {
  it("always auto-shares images even when autoShareAll is disabled", () => {
    expect(shouldAutoShareDriveFile({ mimeType: "image/png" }, false)).toBe(true);
    expect(shouldAutoShareDriveFile({ mimeType: "image/jpeg" }, false)).toBe(true);
  });

  it("does not auto-share non-image files when autoShareAll is disabled", () => {
    expect(shouldAutoShareDriveFile({ mimeType: "application/pdf" }, false)).toBe(false);
    expect(shouldAutoShareDriveFile({ mimeType: "application/vnd.google-apps.presentation" }, false)).toBe(false);
    expect(shouldAutoShareDriveFile({ mimeType: "application/vnd.google-apps.form" }, false)).toBe(false);
  });

  it("auto-shares non-image student-facing files when autoShareAll is enabled", () => {
    expect(shouldAutoShareDriveFile({ mimeType: "application/pdf" }, true)).toBe(true);
    expect(shouldAutoShareDriveFile({ mimeType: "application/vnd.google-apps.presentation" }, true)).toBe(true);
    expect(shouldAutoShareDriveFile({ mimeType: "application/vnd.google-apps.form" }, true)).toBe(true);
  });

  it("never auto-shares folders", () => {
    expect(shouldAutoShareDriveFile({ mimeType: "application/vnd.google-apps.folder" }, false)).toBe(false);
    expect(shouldAutoShareDriveFile({ mimeType: "application/vnd.google-apps.folder" }, true)).toBe(false);
  });

  it("returns only files that need public sharing", () => {
    const files = [
      { id: "img", mimeType: "image/png" },
      { id: "pdf", mimeType: "application/pdf" },
      { id: "folder", mimeType: "application/vnd.google-apps.folder" },
    ];

    expect(getDriveFilesToAutoShare(files, false).map((file) => file.id)).toEqual(["img"]);
    expect(getDriveFilesToAutoShare(files, true).map((file) => file.id)).toEqual(["img", "pdf"]);
  });
});
