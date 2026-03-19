"use server";

import { marked } from "marked";

/**
 * Launches the appropriate browser for the current environment:
 * - Development: full puppeteer (Chrome bundled, already installed via md-to-pdf)
 * - Production (Vercel/Lambda): puppeteer-core + @sparticuz/chromium-min
 *   The Chromium binary is downloaded at cold-start from CHROMIUM_EXECUTABLE_URL
 *   (defaults to the matching GitHub Releases URL for the installed package version).
 *
 * On Vercel, set CHROMIUM_EXECUTABLE_URL to a CDN/Blob URL if GitHub is unreachable
 * or if you need to control the exact version being used.
 */
// Chromium version must match the installed @sparticuz/chromium-min version.
const CHROMIUM_VERSION = "143.0.4";
const CHROMIUM_DEFAULT_URL = `https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_VERSION}/chromium-v${CHROMIUM_VERSION}-pack.tar`;

async function launchBrowser() {
    if (process.env.NODE_ENV === "production") {
        // @sparticuz/chromium-min v143+ exports: args, executablePath(url?), setGraphicsMode
        // headless / defaultViewport / version were removed in this major version.
        const Chromium = (await import("@sparticuz/chromium-min")).default;
        const puppeteerCore = (await import("puppeteer-core")).default;

        const chromiumUrl = process.env.CHROMIUM_EXECUTABLE_URL ?? CHROMIUM_DEFAULT_URL;
        const executablePath = await Chromium.executablePath(chromiumUrl);

        return puppeteerCore.launch({
            args: Chromium.args,
            executablePath,
            headless: true,
        });
    }

    // Development — puppeteer bundles its own Chrome, no extra config needed
    const puppeteer = (await import("puppeteer")).default;
    return puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
}

const PDF_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: #1e293b;
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 48px;
  }
  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    color: #0f172a;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.25;
  }
  h1 { font-size: 2em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.2em; }
  h3 { font-size: 1.25em; }
  p { margin-bottom: 1em; }
  ul, ol { margin-bottom: 1em; padding-left: 1.5em; }
  li { margin-bottom: 0.3em; }
  code {
    background: #f1f5f9;
    color: #0f172a;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875em;
  }
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
    margin-bottom: 1em;
  }
  pre code {
    background: none;
    padding: 0;
    font-size: 0.85em;
    color: #1e293b;
  }
  blockquote {
    border-left: 4px solid #94a3b8;
    padding-left: 1em;
    color: #64748b;
    margin-bottom: 1em;
    font-style: italic;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1em; font-size: 0.9em; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; color: #0f172a; }
  tr:nth-child(even) td { background: #fafafa; }
  img { max-width: 100%; height: auto; border-radius: 4px; margin: 0.5em 0; }
  a { color: #3b82f6; text-decoration: underline; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
`;

export async function generateMarkdownPdf(
    markdown: string,
    filename?: string
): Promise<{ pdf: string; filename: string } | { error: string }> {
    let browser;
    try {
        const body = await marked(markdown ?? "");

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>${PDF_STYLES}</style>
</head>
<body>${body}</body>
</html>`;

        browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        });

        return {
            pdf: Buffer.from(pdfBuffer).toString("base64"),
            filename: filename ?? "teoria.pdf",
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[generateMarkdownPdf]", msg);
        return { error: msg };
    } finally {
        await browser?.close();
    }
}
