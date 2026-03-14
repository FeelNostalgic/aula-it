import { BasePage } from "../base-page";
import { expect, Locator } from "@playwright/test";

export class DashboardPage extends BasePage {
    readonly createNewModuleButton: Locator;
    readonly moduleNameInput: Locator;
    readonly moduleDescriptionInput: Locator;
    readonly createModuleSubmitButton: Locator;
    readonly modulesGrid: Locator;

    constructor(page: any) {
        super(page);
        this.createNewModuleButton = page.getByRole('button', { name: 'CREAR NUEVO MÓDULO', exact: true }).first();
        this.moduleNameInput = page.locator('input[name="name"]');
        this.moduleDescriptionInput = page.locator('textarea[name="description"]');
        this.createModuleSubmitButton = page.getByRole('button', { name: 'Crear Módulo', exact: true });
        this.modulesGrid = page.locator("h2"); // Using H2 as reference for now
    }

    async createModule(name: string, description: string) {
        await this.createNewModuleButton.click();
        const dialog = this.page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();
        await dialog.locator('input[name="name"]').fill(name);
        await dialog.locator('textarea[name="description"]').fill(description);

        await dialog.getByRole('button', { name: 'Crear Módulo', exact: true }).click();
    }

    async verifyModuleExists(name: string) {
        await expect(this.page.locator('h3, div').filter({ hasText: name }).first()).toBeVisible({ timeout: 10000 });
    }

    async verifyDashboardRole(roleTitle: string) {
        await expect(this.page.getByRole("heading", { name: roleTitle })).toBeVisible();
    }
}
