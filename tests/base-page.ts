import { Page, expect } from "@playwright/test";

export class BasePage {
    constructor(protected page: Page) { }

    async goto(path: string): Promise<void> {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await this.page.goto(path, { waitUntil: "domcontentloaded", timeout: 10000 });
                return;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                const retryable =
                    message.includes("ERR_ABORTED")
                    || message.includes("frame was detached")
                    || message.includes("Target page, context or browser has been closed")
                    || message.includes("ERR_CONNECTION_REFUSED")
                    || message.includes("ECONNREFUSED")
                    || message.includes("Timeout 30000ms exceeded")
                    || message.includes("Timeout 10000ms exceeded");

                if (!retryable || attempt === 2) {
                    throw error;
                }

                if (this.page.isClosed()) {
                    throw error;
                }
                await this.page.waitForTimeout(250);
            }
        }
    }

    async waitForNotification(): Promise<void> {
        await this.page.waitForSelector('[role="status"]', { state: "visible", timeout: 5000 }).catch(() => null);
    }

    async expectToast(text: string | RegExp): Promise<void> {
        const toast = this.page.locator('[role="status"]').filter({ hasText: text });
        await expect(toast).toBeVisible({ timeout: 5000 });
    }

    async verifyUrl(path: string | RegExp): Promise<void> {
        await expect(this.page).toHaveURL(path);
    }

    async expectUrl(path: string | RegExp): Promise<void> {
        await expect(this.page).toHaveURL(path);
    }
}
