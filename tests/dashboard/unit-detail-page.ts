import { BasePage } from "../base-page";
import { expect, Locator, Page } from "@playwright/test";

export class UnitDetailPage extends BasePage {
    readonly breadcrumbUnitName: Locator;
    readonly addActivityButton: Locator;

    // Tabs
    readonly tabActivities: Locator;
    readonly tabEvaluation: Locator;
    readonly tabSettings: Locator;

    // Activities Tab
    readonly activitiesList: Locator;
    readonly emptyState: Locator;

    // Settings Tab
    readonly settingsForm: Locator;
    readonly titleInput: Locator;
    readonly descriptionTextarea: Locator;
    readonly statusSelect: Locator;
    readonly viewTypeSelect: Locator;
    readonly saveSettingsButton: Locator;

    constructor(page: Page) {
        super(page);
        this.breadcrumbUnitName = page.locator("header");

        // Tabs
        this.tabActivities = page.getByRole("tab", { name: /ACTIVIDADES/i });
        this.tabEvaluation = page.getByRole("tab", { name: /EVALUACIÓN/i });
        this.tabSettings = page.getByRole("tab", { name: /CONFIGURACIÓN/i });

        // Activities
        this.addActivityButton = page.locator('button:has-text("Añadir Reto")').first();
        this.activitiesList = page.locator('h4'); // We can target h4 tags which are the titles of activities
        this.emptyState = page.locator('text=Aún no hay retos creados');

        // Settings
        this.settingsForm = page.locator('form:has(button:has-text("Guardar Configuración"))');
        this.titleInput = page.locator('input[name="name"]');
        this.descriptionTextarea = page.locator('textarea[name="description"]');
        this.statusSelect = page.locator('button[role="combobox"]').first(); // Status is usually the first select
        this.viewTypeSelect = page.locator('button[role="combobox"]').nth(1); // View type is the second
        this.saveSettingsButton = page.locator('button:has-text("Guardar Configuración")');
    }

    async goto(unitId: string): Promise<void> {
        await super.goto(`/dashboard/units/${unitId}`);
    }

    async clickTab(tab: "actividades" | "evaluacion" | "configuracion"): Promise<void> {
        const tabLocator = {
            actividades: this.tabActivities,
            evaluacion: this.tabEvaluation,
            configuracion: this.tabSettings,
        }[tab];
        await tabLocator.click();
    }

    async createActivity(title: string, xp: string = "100", description?: string): Promise<void> {
        await this.addActivityButton.click();
        const dialog = this.page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();
        await dialog.locator('input[name="title"]').fill(title);

        if (description) {
            await dialog.locator('textarea[name="description"]').fill(description);
        }

        if (xp) {
            await dialog.locator('input[name="xp"]').fill(xp);
        }

        await dialog.locator('button:has-text("Crear Reto")').click();
    }

    async verifyActivityExists(title: string): Promise<void> {
        await expect(this.page.locator(`h4:has-text("${title}")`).first()).toBeVisible({ timeout: 10000 });
    }

    async moveActivity(index: number, direction: 'up' | 'down'): Promise<void> {
        if (direction === 'up') {
            await this.page.getByRole('button', { name: /subir/i }).nth(index).click();
        } else {
            await this.page.getByRole('button', { name: /bajar/i }).nth(index).click();
        }
    }
}
