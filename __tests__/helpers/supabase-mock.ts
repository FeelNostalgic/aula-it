import { vi, type Mock } from "vitest";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupabaseResponse<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface MockAuthUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

interface TableConfig {
  select?: SupabaseResponse;
  insert?: SupabaseResponse;
  update?: SupabaseResponse;
  delete?: SupabaseResponse;
  upsert?: SupabaseResponse;
}

// ─── MockQueryChain ───────────────────────────────────────────────────────────
// Every method returns `this` so chains work. The object is also thenable so
// `await supabase.from('x').select('*').eq('id', 1).single()` works.

type ChainResult = MockQueryChain & Promise<SupabaseResponse>;

function makeChain(response: SupabaseResponse): ChainResult {
  const chain: Record<string, unknown> = {};

  const methods = [
    "select",
    "eq",
    "neq",
    "not",
    "in",
    "ilike",
    "like",
    "lt",
    "lte",
    "gt",
    "gte",
    "order",
    "limit",
    "single",
    "maybeSingle",
    "match",
    "filter",
    "or",
    "range",
    "contains",
    "containedBy",
    "overlaps",
    "is",
  ];

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Make the chain thenable — awaiting any chain node resolves to response.
  chain["then"] = (
    resolve: (v: SupabaseResponse) => void,
    reject?: (e: unknown) => void
  ) => Promise.resolve(response).then(resolve, reject);

  chain["catch"] = (reject: (e: unknown) => void) =>
    Promise.resolve(response).catch(reject);

  chain["finally"] = (onFinally: () => void) =>
    Promise.resolve(response).finally(onFinally);

  return chain as unknown as ChainResult;
}

// ─── MockQueryChain type (for consumers) ────────────────────────────────────

// Chain methods must be typed as callable so TypeScript allows chaining:
// client.from("t").select("*").eq("id", 1).single()
type ChainFn = Mock<(...args: unknown[]) => MockQueryChain & Promise<SupabaseResponse>>;

export interface MockQueryChain extends Promise<SupabaseResponse> {
  select: ChainFn;
  eq: ChainFn;
  neq: ChainFn;
  not: ChainFn;
  in: ChainFn;
  ilike: ChainFn;
  like: ChainFn;
  lt: ChainFn;
  lte: ChainFn;
  gt: ChainFn;
  gte: ChainFn;
  order: ChainFn;
  limit: ChainFn;
  single: ChainFn;
  maybeSingle: ChainFn;
  match: ChainFn;
  filter: ChainFn;
  or: ChainFn;
  range: ChainFn;
  contains: ChainFn;
  containedBy: ChainFn;
  overlaps: ChainFn;
  is: ChainFn;
}

// ─── Default responses ────────────────────────────────────────────────────────

const DEFAULT_RESPONSE: SupabaseResponse = { data: null, error: null };
const DEFAULT_AUTH_RESPONSE: SupabaseResponse<{ user: MockAuthUser | null }> = {
  data: { user: null },
  error: null,
};

// ─── SupabaseMockBuilder ─────────────────────────────────────────────────────

export class SupabaseMockBuilder {
  private authConfig: {
    getUser?: SupabaseResponse;
    signInWithPassword?: SupabaseResponse;
    signUp?: SupabaseResponse;
    signOut?: SupabaseResponse;
    signInWithOAuth?: SupabaseResponse;
    adminListUsers?: SupabaseResponse;
  } = {};

  private tableConfigs: Map<string, TableConfig> = new Map();

  // ─── Auth configuration ──────────────────────────────────────────────────

  mockAuth(user: MockAuthUser | null): this {
    this.authConfig.getUser = {
      data: { user },
      error: null,
    };
    return this;
  }

  mockAuthError(message: string): this {
    this.authConfig.getUser = {
      data: { user: null },
      error: { message },
    };
    return this;
  }

  mockSignIn(response: SupabaseResponse = DEFAULT_RESPONSE): this {
    this.authConfig.signInWithPassword = response;
    return this;
  }

  mockSignUp(response: SupabaseResponse = DEFAULT_RESPONSE): this {
    this.authConfig.signUp = response;
    return this;
  }

  mockSignOut(response: SupabaseResponse = DEFAULT_RESPONSE): this {
    this.authConfig.signOut = response;
    return this;
  }

  mockOAuth(response: SupabaseResponse = DEFAULT_RESPONSE): this {
    this.authConfig.signInWithOAuth = response;
    return this;
  }

  mockAdminListUsers(response: SupabaseResponse = DEFAULT_RESPONSE): this {
    this.authConfig.adminListUsers = response;
    return this;
  }

  // ─── Table configuration ─────────────────────────────────────────────────

  mockQuery(
    table: string,
    response: SupabaseResponse = DEFAULT_RESPONSE
  ): this {
    const existing = this.tableConfigs.get(table) ?? {};
    this.tableConfigs.set(table, { ...existing, select: response });
    return this;
  }

  mockInsert(
    table: string,
    response: SupabaseResponse = DEFAULT_RESPONSE
  ): this {
    const existing = this.tableConfigs.get(table) ?? {};
    this.tableConfigs.set(table, { ...existing, insert: response });
    return this;
  }

  mockUpdate(
    table: string,
    response: SupabaseResponse = DEFAULT_RESPONSE
  ): this {
    const existing = this.tableConfigs.get(table) ?? {};
    this.tableConfigs.set(table, { ...existing, update: response });
    return this;
  }

  mockDelete(
    table: string,
    response: SupabaseResponse = DEFAULT_RESPONSE
  ): this {
    const existing = this.tableConfigs.get(table) ?? {};
    this.tableConfigs.set(table, { ...existing, delete: response });
    return this;
  }

  mockUpsert(
    table: string,
    response: SupabaseResponse = DEFAULT_RESPONSE
  ): this {
    const existing = this.tableConfigs.get(table) ?? {};
    this.tableConfigs.set(table, { ...existing, upsert: response });
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build() {
    return this._buildClient();
  }

  private _buildClient() {
    const tableConfigs = this.tableConfigs;
    const authConfig = this.authConfig;

    const fromSpy = vi.fn((table: string) => {
      const config = tableConfigs.get(table) ?? {};

      const selectResponse = config.select ?? DEFAULT_RESPONSE;
      const insertResponse = config.insert ?? DEFAULT_RESPONSE;
      const updateResponse = config.update ?? DEFAULT_RESPONSE;
      const deleteResponse = config.delete ?? DEFAULT_RESPONSE;
      const upsertResponse = config.upsert ?? DEFAULT_RESPONSE;

      return {
        select: vi.fn((_cols?: unknown) => makeChain(selectResponse)),
        insert: vi.fn((_data?: unknown) => makeChain(insertResponse)),
        update: vi.fn((_data?: unknown) => makeChain(updateResponse)),
        delete: vi.fn(() => makeChain(deleteResponse)),
        upsert: vi.fn((_data?: unknown, _opts?: unknown) => makeChain(upsertResponse)),
      };
    });

    const authMock = {
      getUser: vi.fn().mockResolvedValue(
        authConfig.getUser ?? DEFAULT_AUTH_RESPONSE
      ),
      signInWithPassword: vi.fn().mockResolvedValue(
        authConfig.signInWithPassword ?? DEFAULT_RESPONSE
      ),
      signUp: vi.fn().mockResolvedValue(
        authConfig.signUp ?? DEFAULT_RESPONSE
      ),
      signOut: vi.fn().mockResolvedValue(
        authConfig.signOut ?? DEFAULT_RESPONSE
      ),
      signInWithOAuth: vi.fn().mockResolvedValue(
        authConfig.signInWithOAuth ?? DEFAULT_RESPONSE
      ),
      admin: {
        listUsers: vi.fn().mockResolvedValue(
          authConfig.adminListUsers ?? DEFAULT_RESPONSE
        ),
      },
    };

    const client = {
      from: fromSpy,
      auth: authMock,
    };

    return {
      client,
      spies: {
        from: fromSpy,
        auth: authMock,
      },
    };
  }
}
