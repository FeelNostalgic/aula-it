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
        this.createNewModuleButton = page.locator('button:has-text("CREAR NUEVO MÓDULO")').first();
        this.moduleNameInput = page.locator('input[name="name"]');
        this.moduleDescriptionInput = page.locator('input[name="description"]');
        this.createModuleSubmitButton = page.locator('button:has-text("CREAR MÓDULO")');
        this.modulesGrid = page.locator("h2"); // Using H2 as reference for now
    }

    async createModule(name: string, description: string) {
        await this.createNewModuleButton.click();
        const dialog = this.page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();
        await dialog.locator('input[name="name"]').fill(name);
        await dialog.locator('input[name="description"]').fill(description);
        await dialog.locator('button:has-text("CREAR MÓDULO")').click();
    }

    async verifyModuleExists(name: string) {
        await expect(this.page.locator(`text=${name}`)).toBeVisible();
    }

    async verifyDashboardRole(roleTitle: string) {
        await expect(this.page.locator("h2")).toContainText(roleTitle);
    }
}
