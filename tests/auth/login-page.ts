import { BasePage } from "../base-page";
import { expect, Locator } from "@playwright/test";

export class LoginPage extends BasePage {
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;
    readonly registerLink: Locator;
    readonly registerNameInput: Locator;
    readonly registerButton: Locator;

    constructor(page: any) {
        super(page);
        this.emailInput = page.locator('input[name="email"]');
        this.passwordInput = page.locator('input[name="password"]');
        this.loginButton = page.locator('button:has-text("INICIAR SESIÓN")');
        this.registerLink = page.locator('a[href="/register"]');
        this.registerNameInput = page.locator('input[name="name"]');
        this.registerButton = page.locator('button:has-text("CREAR CUENTA")');
    }

    async login(email: string, pass: string) {
        await this.goto("/login");
        await this.emailInput.fill(email);
        await this.passwordInput.fill(pass);
        await this.loginButton.click();
    }

    async register(name: string, email: string, pass: string) {
        await this.goto("/register");
        await this.registerNameInput.fill(name);
        await this.emailInput.fill(email);
        await this.passwordInput.fill(pass);
        await this.registerButton.click();
    }
}
