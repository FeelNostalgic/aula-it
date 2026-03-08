import { BasePage } from "../base-page";
import { expect, Locator, Page } from "@playwright/test";

export class UnitDetailPage extends BasePage {
    readonly breadcrumbUnitName: Locator;
    readonly addActivityButton: Locator;

    // Tabs
    readonly tabActivities: Locator;
    readonly tabEvaluation: Locator;
    readonly tabSettings: Locator;
    readonly tabMap: Locator;

    // Map Tab
    readonly openMapIdeButton: Locator;

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
        this.tabActivities = page.getByRole("tab", { name: /RETOS/i });
        this.tabEvaluation = page.getByRole("tab", { name: /EVALUACIÓN/i });
        this.tabSettings = page.getByRole("tab", { name: /CONFIGURACIÓN/i });
        this.tabMap = page.getByRole("tab", { name: /MAPA/i });

        // Map
        this.openMapIdeButton = page.locator('button:has-text("Abrir")'); // "Abrir Creador de Mapa" or "Abrir Mapa Interactivo"

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

    async clickTab(tab: "actividades" | "evaluacion" | "configuracion" | "mapa"): Promise<void> {
        const tabLocator = {
            actividades: this.tabActivities,
            evaluacion: this.tabEvaluation,
            configuracion: this.tabSettings,
            mapa: this.tabMap,
        }[tab];
        await tabLocator.click();
    }

    async createActivity(title: string, description?: string): Promise<void> {
        await this.addActivityButton.click();
        const dialog = this.page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();
        await dialog.locator('input[name="title"]').fill(title);

        if (description) {
            await dialog.locator('textarea[name="description"]').fill(description);
        }

        await dialog.locator('button:has-text("Crear Reto")').click();
    }

    async verifyActivityExists(title: string): Promise<void> {
        await expect(this.page.locator(`h4:has-text("${title}")`).first()).toBeVisible({ timeout: 10000 });
    }

    async dragActivity(sourceIndex: number, targetIndex: number): Promise<void> {
        const sourceActivity = this.page.locator('div.group').filter({ has: this.page.locator('h4') }).nth(sourceIndex);
        const targetActivity = this.page.locator('div.group').filter({ has: this.page.locator('h4') }).nth(targetIndex);

        const sourceHandle = sourceActivity.locator('svg.lucide-grip-vertical');

        // Manual drag and drop sequence for better dnd-kit compatibility
        const sourceBox = await sourceHandle.boundingBox();
        const targetBox = await targetActivity.boundingBox();

        if (!sourceBox || !targetBox) throw new Error("Could not find source or target box");

        // Move to handle
        await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
        await this.page.mouse.down();

        // Move slightly to trigger the drag (activationConstraint: 8)
        await this.page.mouse.move(sourceBox.x + sourceBox.width / 2 + 10, sourceBox.y + sourceBox.height / 2 + 10);

        // Move to target
        await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
        await this.page.mouse.up();

        // Wait for the reordering to finish (loading indicator)
        const savingIndicator = this.page.locator('text=Guardando...');
        try {
            // It might be too fast to see it visible sometimes
            if (await savingIndicator.isVisible({ timeout: 1000 })) {
                await expect(savingIndicator).toBeHidden({ timeout: 10000 });
            }
        } catch (e) {
            // If it didn't appear or already disappeared, that's fine
        }
    }

}

