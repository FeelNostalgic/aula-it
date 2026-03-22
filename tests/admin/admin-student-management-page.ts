import { BasePage } from "../base-page";
import { Page } from "@playwright/test";

export class AdminStudentManagementPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    async goto() {
        await super.goto("/admin/students");
    }

    async openCreateTab() {
        await this.page.locator('[role="tab"]').filter({ hasText: /crear cuentas/i }).click();
    }

    async fillCreateForm(prefix: string, count: number, password: string) {
        // Open prefix combobox (allowCreate mode — typing sets the value directly)
        const combobox = this.page.locator('[role="combobox"]').first();
        await combobox.click();
        const prefixInput = this.page.locator('input[placeholder="Buscar prefijo..."]');
        await prefixInput.fill(prefix);
        await prefixInput.press("Escape");

        await this.page.locator('input#count').fill(String(count));
        await this.page.locator('input#password').fill(password);
    }

    async submitCreateForm() {
        await this.page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first().click();
    }
}
