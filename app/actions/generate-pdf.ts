"use server";

import { mdToPdf } from "md-to-pdf";

export async function generateMarkdownPdf(
    markdown: string,
    filename?: string
): Promise<{ pdf: string; filename: string } | { error: string }> {
    try {
        const result = await mdToPdf(
            { content: markdown },
            {
                pdf_options: {
                    format: "A4",
                    margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
                    printBackground: true,
                },
                stylesheet_encoding: "utf-8",
            }
        );

        if (!result?.content) {
            return { error: "No se pudo generar el PDF." };
        }

        return {
            pdf: Buffer.from(result.content).toString("base64"),
            filename: filename ?? "teoria.pdf",
        };
    } catch (err) {
        console.error("[generateMarkdownPdf]", err);
        return { error: "Error al generar el PDF." };
    }
}
