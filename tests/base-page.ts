import { Page, expect } from "@playwright/test";

export class BasePage {
    constructor(protected page: Page) { }

    async goto(path: string): Promise<void> {
        await this.page.goto(path);
        await this.page.waitForLoadState("networkidle");
    }

    async waitForNotification(): Promise<void> {
        await this.page.waitForSelector('[role="status"]', { state: "visible", timeout: 5000 }).catch(() => null);
    }

    async verifyUrl(regex: RegExp | string): Promise<void> {
        await expect(this.page).toHaveURL(regex);
    }
}
