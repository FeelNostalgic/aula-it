import { vi, beforeEach } from "vitest";

// ─── Environment variables ────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "mock-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "mock-google-client-secret";
process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";

// ─── RedirectError ────────────────────────────────────────────────────────────

export class RedirectError extends Error {
  readonly digest: string;
  readonly url: string;

  constructor(url: string) {
    super(`NEXT_REDIRECT ${url}`);
    this.url = url;
    this.digest = `NEXT_REDIRECT;replace;${url};303;`;
    this.name = "RedirectError";
  }
}

// ─── next/headers ────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
    has: vi.fn().mockReturnValue(false),
  }),
}));

// ─── next/cache ──────────────────────────────────────────────────────────────

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}));

// ─── next/navigation ─────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string): never => {
    throw new RedirectError(url);
  }),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: vi.fn().mockReturnValue("/"),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// ─── @/utils/supabase/server ──────────────────────────────────────────────────

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

// ─── @/utils/supabase/admin ───────────────────────────────────────────────────

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// ─── @/lib/google-drive-api ───────────────────────────────────────────────────

vi.mock("@/lib/google-drive-api", () => ({
  getAuthorizeUrl: vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  getDriveClient: vi.fn(),
  extractFileIdFromUrl: vi.fn(),
  copyFile: vi.fn(),
  shareFile: vi.fn(),
  listPermissions: vi.fn(),
  removePermission: vi.fn(),
}));

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});
