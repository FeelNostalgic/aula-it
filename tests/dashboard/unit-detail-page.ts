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

    private currentUnitId: string = "";

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
        this.tabActivities = page.getByRole("link", { name: /RETOS/i });
        this.tabEvaluation = page.getByRole("link", { name: /EVALUACIÓN/i });
        this.tabSettings = page.getByRole("link", { name: /CONFIGURACIÓN/i });
        this.tabMap = page.getByRole("link", { name: /MAPA/i });

        // Activities
        this.addActivityButton = page.getByRole("button", { name: "NUEVO RETO", exact: true }).first();
        this.activitiesList = page.locator('h4'); // We can target h4 tags which are the titles of activities
        this.emptyState = page.locator('text=Aún no hay retos creados');

        // Settings
        this.settingsForm = page.locator('form:has(button:has-text("Guardar Configuración"))');
        this.titleInput = this.settingsForm.locator('input[name="name"]');
        this.descriptionTextarea = page.locator('textarea[name="description"]');
        this.statusSelect = page.locator('button[role="combobox"]').first(); // Status is usually the first select
        this.viewTypeSelect = page.locator('button[role="combobox"]').nth(1); // View type is the second
        this.saveSettingsButton = page.locator('button:has-text("Guardar Configuración")');
    }

    async goto(unitId: string): Promise<void> {
        this.currentUnitId = unitId;
        const targetPath = `/dashboard/units/${unitId}/retos`;

        for (let attempt = 0; attempt < 4; attempt += 1) {
            try {
                await this.page.goto(targetPath, { waitUntil: "domcontentloaded", timeout: 30000 });
                await this.page.waitForURL(new RegExp(`/dashboard/units/${unitId}/retos`), { timeout: 15000 }).catch(() => null);
                if (await this.tabActivities.isVisible().catch(() => false)) return;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                const retryable =
                    message.includes("ERR_ABORTED")
                    || message.includes("frame was detached")
                    || message.includes("ERR_CONNECTION_REFUSED")
                    || message.includes("ECONNREFUSED")
                    || message.includes("Timeout");
                if (!retryable || attempt === 3 || this.page.isClosed()) throw error;
            }
            await this.page.waitForTimeout(350);
        }
        await expect(this.tabActivities).toBeVisible({ timeout: 15000 });
    }

    async clickTab(tab: "actividades" | "evaluacion" | "configuracion" | "mapa"): Promise<void> {
        const paths: Record<string, string> = {
            actividades:   `/dashboard/units/${this.currentUnitId}/retos`,
            evaluacion:    `/dashboard/units/${this.currentUnitId}/evaluacion`,
            configuracion: `/dashboard/units/${this.currentUnitId}/configuracion`,
            mapa:          `/units/${this.currentUnitId}/map`,
        };
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await this.page.goto(paths[tab], { waitUntil: "domcontentloaded", timeout: 20000 });
                return;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                const retryable =
                    message.includes("ERR_ABORTED")
                    || message.includes("frame was detached")
                    || message.includes("ERR_CONNECTION_REFUSED")
                    || message.includes("ECONNREFUSED")
                    || message.includes("Timeout");
                if (!retryable || attempt === 2 || this.page.isClosed()) throw error;
                await this.page.waitForTimeout(300);
            }
        }
    }

    async createActivity(title: string, description?: string): Promise<void> {
        await this.addActivityButton.click();
        const dialog = this.page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();
        await dialog.locator('input[name="title"]').fill(title);

        if (description) {
            await dialog.locator('textarea[name="description"]').fill(description);
        }

        await dialog.getByRole("button", { name: "CREAR RETO", exact: true }).click();

        // The modal close animation / server action can be flaky; downstream assertions
        // verify success via toast and activity visibility.
        await this.page.waitForTimeout(500);
    }

    async verifyActivityExists(title: string): Promise<void> {
        await expect(this.page.locator(`h4:has-text("${title}")`).first()).toBeVisible({ timeout: 10000 });
    }

    async switchToListView(): Promise<void> {
        await this.page.getByRole('button', { name: 'Lista', exact: true }).click();
        // Wait for the list layout to render
        await this.page.waitForTimeout(300);
    }

    async dragActivity(sourceIndex: number, targetIndex: number): Promise<void> {
        const activities = this.page.locator('div.group').filter({ has: this.page.locator('h4') });
        const sourceActivity = activities.nth(sourceIndex);
        const targetActivity = activities.nth(targetIndex);

        // Precise drag handle selection for dnd-kit
        const sourceHandle = sourceActivity.locator('div.cursor-grab');
        
        const sourceBox = await sourceHandle.boundingBox();
        const targetBox = await targetActivity.boundingBox();

        if (!sourceBox || !targetBox) throw new Error("Could not find source or target box");

        const centerX = sourceBox.x + sourceBox.width / 2;
        const centerY = sourceBox.y + sourceBox.height / 2;

        // 1. Click and hold with enough delay for sensor
        await this.page.mouse.move(centerX, centerY);
        await this.page.mouse.down();
        await this.page.waitForTimeout(600); 

        // 2. Slow initial move to trigger the drag sensor
        await this.page.mouse.move(centerX, centerY + 15, { steps: 10 });
        await this.page.waitForTimeout(200);

        // 3. Move to target center with overshoot to ensure swap
        const targetCenterY = targetBox.y + targetBox.height / 2;
        const overshoot = (targetIndex > sourceIndex) ? 40 : -40;

        await this.page.mouse.move(
            targetBox.x + targetBox.width / 2, 
            targetCenterY + overshoot, 
            { steps: 30 }
        );

        // 4. Wait for visual swap and release
        await this.page.waitForTimeout(600);
        await this.page.mouse.up();

        // Wait for potential saving state
        const savingIndicator = this.page.locator('text=Guardando...');
        try {
            if (await savingIndicator.isVisible({ timeout: 1000 })) {
                await expect(savingIndicator).toBeHidden({ timeout: 10000 });
            }
        } catch (e) {}
    }

}
