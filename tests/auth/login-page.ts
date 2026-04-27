import { BasePage } from "../base-page";
import { expect, Locator } from "@playwright/test";

export class LoginPage extends BasePage {
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;

    constructor(page: any) {
        super(page);
        this.emailInput = page.locator('input[name="email"]');
        this.passwordInput = page.locator('input[name="password"]');
        this.loginButton = page.locator('button:has-text("INICIAR SESIÓN")');
    }

    async login(email: string, pass: string) {
        await this.goto("/login");
        await this.emailInput.fill(email);
        await this.passwordInput.fill(pass);
        await this.loginButton.click();
    }

    async loginTeacher(email: string, pass: string) {
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 2; attempt += 1) {
            await this.goto("/login/teacher");
            await this.emailInput.fill(email);
            await this.passwordInput.fill(pass);
            await this.loginButton.click();

            try {
                await this.page.waitForURL(/\/(dashboard|admin)/, {
                    timeout: 30000,
                    waitUntil: "domcontentloaded",
                });
                return;
            } catch (error) {
                lastError = error;
                const currentUrl = this.page.url();
                const isRetryable =
                    currentUrl.startsWith("chrome-error://")
                    || /\/login\/teacher/.test(currentUrl)
                    || /\/login$/.test(currentUrl);

                if (!isRetryable || attempt === 1) {
                    throw error;
                }

                await this.page.waitForTimeout(500);
            }
        }

        throw lastError instanceof Error ? lastError : new Error("Teacher login failed");
    }

    async loginAdmin(email: string, pass: string) {
        await this.loginTeacher(email, pass);
    }

    async gotoTeacherLogin() {
        await this.goto("/login/teacher");
    }
}
