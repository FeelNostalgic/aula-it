import { BasePage } from "./base-page";
import { Locator, Page } from "@playwright/test";

export class SettingsPage extends BasePage {
    // Tab triggers
    readonly tabProfile: Locator;
    readonly tabSettings: Locator;

    // Settings tab — account form
    readonly fullNameInput: Locator;
    readonly googleEmailInput: Locator;
    readonly saveProfileButton: Locator;

    // Settings tab — privacy card
    readonly privacyToggle: Locator;

    // Settings tab — Drive section (teacher-only)
    readonly driveSection: Locator;
    readonly driveAuthorizeButton: Locator;
    readonly driveDisconnectButton: Locator;

    constructor(page: Page) {
        super(page);

        this.tabProfile = page.getByRole("tab", { name: /perfil/i });
        this.tabSettings = page.getByRole("tab", { name: /ajustes/i });

        this.fullNameInput = page.locator('input[placeholder="Tu nombre completo"]');
        this.googleEmailInput = page.locator('input[placeholder="tu@gmail.com"]');
        this.saveProfileButton = page.locator('button:has-text("Guardar cambios en el sistema")');

        this.privacyToggle = page.locator('span:has-text("Perfil Público")').locator('..').locator('button[type="button"]');

        this.driveSection = page.locator('text=Google Drive del Profesor').first();
        this.driveAuthorizeButton = page.locator('button:has-text("Autorizar Acceso a Drive")');
        this.driveDisconnectButton = page.locator('button:has-text("Desconectar")');
    }

    async goto(): Promise<void> {
        await super.goto("/settings");
        await this.page.waitForURL(/\/settings$/, { timeout: 15000 });
    }

    async openSettingsTab(): Promise<void> {
        await this.tabSettings.click();
    }

    async openProfileTab(): Promise<void> {
        await this.tabProfile.click();
    }

    async updateFullName(name: string): Promise<void> {
        await this.fullNameInput.fill(name);
        await this.saveProfileButton.click();
    }
}
