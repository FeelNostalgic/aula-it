import { BasePage } from "../base-page";
import { expect, Locator } from "@playwright/test";

export class ModuleDetailPage extends BasePage {
    readonly breadcrumbInicio: Locator;
    readonly breadcrumbModuleName: Locator;
    readonly addUnitButton: Locator;
    readonly addStudentsButton: Locator;
    readonly unitCards: Locator;
    readonly emptyState: Locator;
    readonly tabDashboard: Locator;
    readonly tabAlumnos: Locator;
    readonly tabConfiguracion: Locator;
    readonly viewModeGrid: Locator;
    readonly viewModeList: Locator;
    private currentModuleId: string = "";

    constructor(page: any) {
        super(page);
        // Breadcrumb is now in the top nav header
        this.breadcrumbInicio = page.locator('header a:has-text("Inicio")');
        this.breadcrumbModuleName = page.locator("header");
        this.addUnitButton = page.getByRole('button', { name: 'UNIDAD DIDÁCTICA', exact: true }).first();
        this.addStudentsButton = page.getByRole('button', { name: 'MATRICULAR ALUMNO', exact: true });
        this.unitCards = page.locator('[class*="bg-surface-dark"][class*="border-border-subtle"]').filter({ has: page.locator("h3") });
        this.emptyState = page.locator('text=No hay unidades registradas');
        this.tabDashboard = page.getByRole("tab", { name: /dashboard/i }).or(page.getByRole("link", { name: /dashboard/i }));
        this.tabAlumnos = page.getByRole("tab", { name: /alumnos/i }).or(page.getByRole("link", { name: /alumnos/i }));
        this.tabConfiguracion = page.getByRole("tab", { name: /configuraci.n/i }).or(page.getByRole("link", { name: /configuraci.n/i }));
        this.viewModeGrid = page.getByRole("button", { name: "Grid", exact: true });
        this.viewModeList = page.getByRole("button", { name: "Lista", exact: true });
    }

    async goto(moduleId: string): Promise<void> {
        this.currentModuleId = moduleId;
        await super.goto(`/dashboard/modules/${moduleId}/dashboard`);
        await expect(this.tabDashboard).toBeVisible({ timeout: 15000 });
    }

    async createUnit(name: string, description?: string): Promise<void> {
        const unitButtons = this.page.getByRole("button", { name: "UNIDAD DIDÁCTICA", exact: true });
        const headerTrigger = unitButtons.first();
        const emptyStateTrigger = unitButtons.nth(1);
        const cardTrigger = this.page.getByRole("button", { name: /Nueva unidad didáctica/i }).first();
        const dialog = this.page.getByRole("dialog").filter({
            has: this.page.getByRole("heading", { name: /Nueva unidad didáctica/i }),
        });

        for (let attempt = 0; attempt < 2; attempt += 1) {
            const triggers = [headerTrigger, emptyStateTrigger, cardTrigger];

            for (const trigger of triggers) {
                if (!(await trigger.isVisible().catch(() => false))) continue;
                if (!(await trigger.isEnabled().catch(() => false))) continue;

                await trigger.click();
                if (await dialog.isVisible({ timeout: 2500 }).catch(() => false)) {
                    await dialog.locator('input[name="name"]').fill(name);
                    if (description) {
                        await dialog.locator('textarea[name="description"]').fill(description);
                    }
                    await dialog.getByRole('button', { name: 'CREAR UNIDAD', exact: true }).click();
                    return;
                }
            }

            // Reintenta tras recargar para cubrir renders cliente lentos en CI.
            await this.page.goto(`/dashboard/modules/${this.currentModuleId}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
            const headerVisible = await headerTrigger.first().isVisible({ timeout: 15000 }).catch(() => false);
            if (!headerVisible) {
                const emptyVisible = await emptyStateTrigger.isVisible({ timeout: 15000 }).catch(() => false);
                if (!emptyVisible) {
                    await expect(cardTrigger).toBeVisible({ timeout: 15000 });
                }
            }
            await this.page.waitForTimeout(500);
        }

        await expect(dialog).toBeVisible({ timeout: 10000 });
    }

    async verifyUnitExists(name: string): Promise<void> {
        await expect(this.page.locator('h3, div').filter({ hasText: name }).first()).toBeVisible({ timeout: 10000 });
    }

    async verifyBreadcrumbModuleName(name: string): Promise<void> {
        // Verify the module name appears in the top nav header
        await expect(this.breadcrumbModuleName).toContainText(name, { timeout: 5000 });
    }

    async clickTab(tab: "dashboard" | "alumnos" | "configuracion"): Promise<void> {
        const paths = {
            dashboard: `/dashboard/modules/${this.currentModuleId}/dashboard`,
            alumnos: `/dashboard/modules/${this.currentModuleId}/alumnos`,
            configuracion: `/dashboard/modules/${this.currentModuleId}/configuracion`,
        } as const;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                await this.page.goto(paths[tab], { waitUntil: "domcontentloaded", timeout: 60000 });
                return;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                const retryable =
                    message.includes("ERR_ABORTED")
                    || message.includes("frame was detached")
                    || message.includes("ERR_CONNECTION_REFUSED")
                    || message.includes("ECONNREFUSED");
                if (!retryable || attempt === 2) throw error;
                await this.page.waitForTimeout(300);
            }
        }
    }

    async navigateToInicio(): Promise<void> {
        await this.breadcrumbInicio.click();
        await this.page.waitForURL(/\/dashboard$/, { timeout: 15000 });
    }
}
