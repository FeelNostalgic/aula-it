import { BasePage } from "../base-page";
import { expect, Page } from "@playwright/test";

export class AdminStudentManagementPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    async goto() {
        await this.page.goto("/admin/students", { waitUntil: "domcontentloaded", timeout: 60000 });
    }

    async openCreateTab() {
        const createTab = this.page.getByRole("tab", { name: /crear cuentas/i });
        if (await createTab.isVisible().catch(() => false)) {
            await createTab.click();
            if (await createTab.getAttribute("aria-selected") === "true") {
                return;
            }
        }

        await this.page.goto("/admin/students?tab=crear", { waitUntil: "domcontentloaded", timeout: 60000 });
        const createTabAfterNav = this.page.getByRole("tab", { name: /crear cuentas/i });
        if (await createTabAfterNav.isVisible().catch(() => false)) {
            await expect(createTabAfterNav).toHaveAttribute("aria-selected", "true");
        }
    }

    async fillCreateForm(prefix: string, count: number, password: string) {
        await this.page.locator('input[name="prefix"]').evaluate((element, value) => {
            const input = element as HTMLInputElement;
            input.value = value as string;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
        }, prefix);
        await this.page.locator('input#count').fill(String(count));
        await this.page.getByLabel("Contraseña inicial").fill(password);
    }

    async submitCreateForm() {
        await this.page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first().click();
    }
}
