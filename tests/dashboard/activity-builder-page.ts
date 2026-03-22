import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../base-page";

export class ActivityBuilderPage extends BasePage {
    readonly headerTitle: Locator;
    readonly btnPublishToggle: Locator;
    readonly btnSettings: Locator;
    readonly btnAddPhase: Locator;
    readonly btnStudentPreview: Locator;

    // Settings Panel
    readonly settingsPanelHeader: Locator;
    readonly inputTitle: Locator;
    readonly inputDescription: Locator;
    readonly inputDuration: Locator;
    readonly selectDifficulty: Locator;
    readonly logoContainer: Locator;
    readonly btnRemoveLogo: Locator;
    readonly settingsPanel: Locator;

    // Central Editor
    readonly sidebarContainer: Locator;
    readonly editorContainer: Locator;
    readonly editorTitleInput: Locator;

    constructor(page: Page) {
        super(page);

        // Header
        this.headerTitle = page.locator('div.flex.items-center.gap-1\\.5.font-mono').locator('span.text-foreground.font-bold');
        this.btnPublishToggle = page.getByRole('button', { name: /Borrador|Publicado|Bloqueado/i });
        this.btnSettings = page.getByRole('button', { name: "Configuración" });
        this.btnStudentPreview = page.getByRole('button', { name: "Vista Alumno" });

        // Settings Panel Location changed since it's a tab now
        this.settingsPanelHeader = page.getByRole('heading', { name: 'Configuración de la Actividad' });
        this.inputTitle = page.getByLabel(/Nombre de la Actividad/i);
        this.inputDescription = page.getByLabel(/Descripción/i);
        this.inputDuration = page.getByLabel(/Duración/i);
        this.selectDifficulty = page.getByRole('combobox', { name: /Dificultad/i });
        this.logoContainer = page.getByTestId('activity-logo-container');
        this.btnRemoveLogo = page.getByTestId('remove-logo');
        this.settingsPanel = page.getByRole('heading', { name: 'Configuración de la Actividad' }).locator('..').locator('..'); // Target the panel container

        // Sidebar
        this.sidebarContainer = page.locator('#sidebar-panel');
        this.editorContainer = page.locator('#main-content');
        this.btnAddPhase = this.sidebarContainer.getByRole('button', { name: 'Añadir Fase' });

        // Central Editor Tab Name (used when renaming steps)
        this.editorTitleInput = page.locator('input').filter({ has: page.locator('..') }).first(); // Will refine this selector
    }

    async goto(id: string): Promise<void> {
        await this.page.goto(`/activities/${id}/edit`);
        await this.page.waitForLoadState('networkidle');
        // Wait for the sidebar to be ready (at least the add phase button should be there)
        await expect(this.btnAddPhase).toBeVisible({ timeout: 10000 });
    }

    // --- Settings Methods ---
    async openSettings(): Promise<void> {
        await this.btnSettings.click();
        await expect(this.settingsPanel).toBeVisible(); // Modified
    }

    async updateSettings(data: { title?: string; description?: string; difficulty?: string; duration?: string; logoUrl?: string }): Promise<void> {
        if (data.title) await this.page.getByLabel('Nombre de la Actividad').fill(data.title);
        if (data.description) await this.page.getByLabel('Descripción para el Alumno').fill(data.description);
        if (data.difficulty) {
            await this.page.getByLabel('Nivel de Dificultad').click();
            await this.page.getByRole('option', { name: data.difficulty }).click();
        }
        if (data.duration) await this.page.getByLabel('Duración Estimada (min)').fill(data.duration);

        // Wait for debounce/save
        await this.page.waitForTimeout(1500);
    }

    async toggleStatus(): Promise<void> {
        await this.btnPublishToggle.click();
        await this.page.getByRole('menuitem', { name: /Publicar/i }).click();
        await this.waitForNotification();
    }

    // --- Sidebar Methods ---
    async addPhase(title: string): Promise<void> { // Modified
        await this.btnAddPhase.click();
        const dialog = this.page.getByRole('dialog', { name: 'Nueva Fase' });
        await expect(dialog).toBeVisible();
        await dialog.getByLabel('Nombre de la fase').fill(title);
        await dialog.getByRole('button', { name: 'Crear Fase' }).click();
        await expect(dialog).toBeHidden();
    }

    async addStep(phaseTitle: string, title: string, type: 'Teoría' | 'Animación' | 'Entregable' | 'Cuestionario' | 'Presentación' | 'Recursos'): Promise<void> { // Modified
        const phase = this.page.locator(`[data-phase-title="${phaseTitle}"]`);
        await phase.getByRole('button', { name: 'Añadir Paso' }).click();

        // Menu item mapping
        const menuLabel = `Añadir ${type}`;
        await this.page.getByRole('menuitem', { name: menuLabel }).click();

        const dialog = this.page.getByRole('dialog', { name: 'Nuevo Paso' });
        await expect(dialog).toBeVisible();
        await dialog.getByLabel('Título del paso').fill(title);
        await dialog.getByRole('button', { name: 'Crear Paso' }).click();
        await expect(dialog).toBeHidden();
    }

    async clickStep(stepTitle: string): Promise<void> {
        const step = this.sidebarContainer.locator(`div[data-step-title="${stepTitle}"]`);
        await step.scrollIntoViewIfNeeded();
        // dispatchEvent bypasses coordinate-based routing: Playwright's normal click() moves
        // the mouse first (triggering group-hover), making opacity-0 buttons pointer-events-auto,
        // which then intercept the click and call stopPropagation before onSelect fires.
        await step.dispatchEvent('click');
        // Wait for the active content panel (editor or student preview) to show the step title.
        // StepEditorPanel (#editor-panel) and StudentPreview (#main-content) both render an h2
        // with the step title immediately — no dynamic import needed for this header element.
        await expect(
            this.page.locator('#editor-panel h2, #main-content h2').filter({ hasText: stepTitle })
        ).toBeVisible({ timeout: 10000 });
    }

    async verifyStepVisible(stepTitle: string): Promise<void> {
        const step = this.sidebarContainer.locator(`div[data-step-title="${stepTitle}"]`);
        await step.scrollIntoViewIfNeeded();
        await expect(step).toBeVisible();
    }

    async toggleStepVisibility(stepTitle: string): Promise<void> {
        const step = this.sidebarContainer.locator(`div[data-step-title="${stepTitle}"]`);
        await step.hover();
        // The label changes based on state, but we can use a partial match or just target the button
        await step.getByRole('button').filter({ has: this.page.locator('svg.lucide-eye, svg.lucide-eye-off') }).click();
    }

    async toggleStepLock(stepTitle: string): Promise<void> {
        const step = this.sidebarContainer.locator(`div[data-step-title="${stepTitle}"]`);
        await step.hover();
        await step.getByRole('button').filter({ has: this.page.locator('svg.lucide-lock, svg.lucide-unlock') }).click();
    }

    // --- Editor Methods ---
    async fillTheoryContent(content: string): Promise<void> {
        await this.page.locator('.ProseMirror').fill(content);
        await this.waitForNotification(); // Save notification
    }

    async addResource(url: string, title: string): Promise<void> {
        await this.page.getByRole('button', { name: 'Añadir Enlace' }).click();

        // Find the last added resource card (empty)
        const resourceCards = this.page.getByTestId('resource-card');
        const newCard = resourceCards.last();

        await newCard.getByPlaceholder('URL del enlace externo').fill(url);
        await newCard.getByPlaceholder('Título del recurso').fill(title);
        // Wait for auto-save debounce
        await this.page.waitForTimeout(1500);
        await this.waitForNotification();
    }

    async toggleQuizToGoogleForms(url: string): Promise<void> {
        // Mode selector is in Configuración tab
        await this.page.getByRole('tab', { name: 'Configuración' }).click();
        await this.page.getByRole('button', { name: 'Google Form' }).click();
        // Contenido tab label changes to "Google Form" after mode switch
        await this.page.getByRole('tab', { name: 'Google Form' }).click();
        await this.page.getByPlaceholder('https://docs.google.com/forms/d/e/.../viewform?embedded=true').fill(url);
        await this.page.waitForTimeout(1500); // debounce
        await this.waitForNotification();
    }

    // --- Student Preview Methods ---
    async enterStudentPreview(): Promise<void> {
        await this.btnStudentPreview.click();
        // The button text changes to "Editor" when preview is active
        await expect(this.page.getByRole('button', { name: 'Editor' })).toBeVisible();
    }

    async exitStudentPreview(): Promise<void> {
        await this.page.getByRole('button', { name: 'Editor' }).click();
        // Verify we are back in editor mode (Vista Alumno button visible again)
        await expect(this.btnStudentPreview).toBeVisible();
    }
}
