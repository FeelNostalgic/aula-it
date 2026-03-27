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

    constructor(page: any) {
        super(page);
        // Breadcrumb is now in the top nav header
        this.breadcrumbInicio = page.locator('header a:has-text("Inicio")');
        this.breadcrumbModuleName = page.locator("header");
        this.addUnitButton = page.getByRole('button', { name: 'UNIDAD DIDÁCTICA', exact: true }).first();
        this.addStudentsButton = page.getByRole('button', { name: 'MATRICULAR ALUMNO', exact: true });
        this.unitCards = page.locator('[class*="bg-surface-dark"][class*="border-border-subtle"]').filter({ has: page.locator("h3") });
        this.emptyState = page.locator('text=No hay unidades registradas');
        this.tabDashboard = page.getByRole("tab", { name: 'DASHBOARD', exact: true });
        this.tabAlumnos = page.getByRole("tab", { name: 'ALUMNOS', exact: true });
        this.tabConfiguracion = page.getByRole("tab", { name: 'CONFIGURACIÓN', exact: true });
        this.viewModeGrid = page.getByRole("button", { name: "Grid", exact: true });
        this.viewModeList = page.getByRole("button", { name: "Lista", exact: true });
    }

    async goto(moduleId: string): Promise<void> {
        await super.goto(`/dashboard/modules/${moduleId}`);
    }

    async createUnit(name: string, description?: string): Promise<void> {
        await this.addUnitButton.click();
        const dialog = this.page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();
        await dialog.locator('input[name="name"]').fill(name);
        if (description) {
            await dialog.locator('textarea[name="description"]').fill(description);
        }
        await dialog.getByRole('button', { name: 'CREAR UNIDAD', exact: true }).click();
    }

    async verifyUnitExists(name: string): Promise<void> {
        await expect(this.page.locator('h3, div').filter({ hasText: name }).first()).toBeVisible({ timeout: 10000 });
    }

    async verifyBreadcrumbModuleName(name: string): Promise<void> {
        // Verify the module name appears in the top nav header
        await expect(this.breadcrumbModuleName).toContainText(name, { timeout: 5000 });
    }

    async clickTab(tab: "dashboard" | "alumnos" | "configuracion"): Promise<void> {
        const tabLocator = {
            dashboard: this.tabDashboard,
            alumnos: this.tabAlumnos,
            configuracion: this.tabConfiguracion,
        }[tab];
        await tabLocator.click();
    }

    async navigateToInicio(): Promise<void> {
        this.breadcrumbInicio.click();
        await this.page.waitForLoadState("networkidle");
    }
}
