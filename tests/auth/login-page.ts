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

    async gotoTeacherLogin() {
        await this.goto("/login/teacher");
    }
}
