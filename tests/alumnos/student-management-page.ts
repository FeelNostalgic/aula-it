import { BasePage } from "../base-page";
import { Page } from "@playwright/test";

export class StudentManagementPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    async goto() {
        await super.goto("/alumnos");
    }

    // Click the "Crear cuentas" tab (TabsTrigger renders as role="tab")
    async openCreateDialog() {
        await this.page.locator('[role="tab"]').filter({ hasText: /crear cuentas/i }).click();
    }

    // The prefix is a Popover/combobox. Open it, type the value, then close.
    // The hidden input name="prefix" is driven by React state.
    async fillCreateForm(prefix: string, count: number, password: string) {
        // Open prefix combobox
        const combobox = this.page.locator('[role="combobox"]').first();
        await combobox.click();

        // Type prefix into the CommandInput
        const prefixCommandInput = this.page.locator('input[placeholder="Escribe un prefijo..."]');
        await prefixCommandInput.fill(prefix);
        await prefixCommandInput.press("Escape");

        // Fill count (input#count, type="number")
        await this.page.locator('input#count').fill(String(count));

        // Fill password (input#password, type="text")
        await this.page.locator('input#password').fill(password);
    }

    async submitCreateForm() {
        // Submit button text is "GENERAR CUENTAS"
        await this.page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first().click();
    }

    async getStudentRows() {
        return this.page.locator('[data-testid="student-row"], tbody tr, [role="row"]').all();
    }

    async selectStudentByIdentifier(identifier: string) {
        const row = this.page.locator(`text=${identifier}`).locator('..').locator('..');
        const checkbox = row.locator('input[type="checkbox"]').first();
        await checkbox.check();
    }
}
