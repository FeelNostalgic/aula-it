import { Page, expect } from "@playwright/test";

export class BasePage {
    constructor(protected page: Page) { }

    async goto(path: string): Promise<void> {
        await this.page.goto(path, { waitUntil: "commit", timeout: 60000 });
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
