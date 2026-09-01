# Frontend Authentication and Hasura Integration

Implement authenticated frontend access through the Greed & Fear backend. The browser must never connect directly to Hasura or receive the Hasura admin secret.

## Configuration

Set the production frontend environment variable:

```env
VITE_API_BASE_URL=https://greedandfear.in
```

Do not add any of these backend-only values to the frontend repository, build arguments, or deployment environment:

```text
HASURA_ENDPOINT
HASURA_GRAPHQL_ADMIN_SECRET
AUTH_SECRET
```

The production reverse proxy must route `https://greedandfear.in/api/*` to the FastAPI backend.

## API Client

Create or update the shared API client. Every request must include `credentials: "include"` so the browser sends the backend-managed `HttpOnly` session cookie.

```ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://greedandfear.in";

export interface ValidationIssue {
  type: string;
  loc: Array<string | number>;
  msg: string;
  input?: unknown;
}

export interface ApiErrorBody {
  detail: string | ValidationIssue[];
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody | null,
  ) {
    super(
      typeof body?.detail === "string"
        ? body.detail
        : `API request failed with status ${status}`,
    );
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

Do not add an `Authorization`, `X-Hasura-Admin-Secret`, or `X-Hasura-Role` header. The backend supplies trusted Hasura headers.

## Authentication Types

```ts
export interface User {
  id: number;
  name: string;
  phone: string;
  plan: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}
```

## Login

Use `POST /api/auth/login`:

```ts
export function login(payload: LoginRequest): Promise<User> {
  return apiRequest<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
```

The JSON response contains the user. The response also sets a signed `HttpOnly` session cookie. Do not attempt to read that cookie or store a token in `localStorage`, `sessionStorage`, IndexedDB, or a JavaScript-managed cookie.

## Restore Session

Use `GET /api/auth/me` once during application startup before rendering protected routes:

```ts
export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiRequest<User>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
```

The authentication provider should expose three states:

```ts
type AuthStatus = "loading" | "authenticated" | "anonymous";
```

- Start in `loading`.
- Change to `authenticated` after `/api/auth/me` returns a user.
- Change to `anonymous` when `/api/auth/me` returns `401`.
- Do not briefly render protected content while session restoration is loading.

## Logout

Use `POST /api/auth/logout`:

```ts
export async function logout(): Promise<void> {
  await apiRequest<void>("/api/auth/logout", { method: "POST" });
}
```

After logout succeeds, clear the user from application state and navigate to the login page.

## Expired Sessions

When any protected API request returns `401`:

1. Clear the current user from frontend state.
2. Mark authentication as `anonymous`.
3. Navigate to the login page.
4. Preserve the intended route if the application supports returning after login.

Do not automatically retry a request that returned `401`.

## GraphQL Client

All GraphQL requests must use `POST https://greedandfear.in/api/graphql` through `apiRequest`. Never use the Hasura URL from the browser.

```ts
export interface GraphQLError {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export class GraphQLRequestError extends Error {
  constructor(public readonly errors: GraphQLError[]) {
    super(errors.map((error) => error.message).join(", "));
  }
}

export async function graphqlRequest<
  TData,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  query: string,
  variables?: TVariables,
  operationName?: string,
): Promise<TData> {
  const response = await apiRequest<GraphQLResponse<TData>>("/api/graphql", {
    method: "POST",
    body: JSON.stringify({
      query,
      variables: variables ?? {},
      operationName,
    }),
  });

  if (response.errors?.length) {
    throw new GraphQLRequestError(response.errors);
  }

  if (response.data === undefined) {
    throw new Error("GraphQL response did not contain data");
  }

  return response.data;
}
```

GraphQL execution errors commonly use HTTP `200`, so checking only `response.ok` is insufficient. Always inspect the GraphQL `errors` array.

## MWPL Query Example

```ts
export interface MwplHistoryRow {
  trade_date: string;
  isin: string;
  scrip_code: number;
  scrip_name: string;
  mwpl: number;
  open_interest: number;
  recorded_at: string;
}

interface LatestMwplData {
  stock_mwpl_history: MwplHistoryRow[];
}

export async function getLatestMwpl(): Promise<MwplHistoryRow[]> {
  const result = await graphqlRequest<LatestMwplData>(
    `
      query LatestMwpl {
        stock_mwpl_history(
          order_by: [{ trade_date: desc }, { scrip_name: asc }]
          limit: 500
        ) {
          trade_date
          isin
          scrip_code
          scrip_name
          mwpl
          open_interest
          recorded_at
        }
      }
    `,
    {},
    "LatestMwpl",
  );

  return result.stock_mwpl_history;
}
```

Hasura may serialize PostgreSQL `BIGINT` values as JSON numbers or strings depending on its scalar configuration. Normalize numeric values at the application boundary before calculations.

## Security Requirements

- Do not install or configure a direct Hasura client with an admin secret.
- Do not add Hasura secrets to `VITE_*` variables; Vite embeds them into public browser bundles.
- Do not persist the backend session token in frontend storage.
- Do not log login request bodies or passwords.
- Do not allow users to select or submit a Hasura role.
- Do not send arbitrary client headers through the GraphQL wrapper.
- Keep all API calls on `https://greedandfear.in/api/*`.
- Use HTTPS in production.

## Acceptance Criteria

1. Logging in returns the user and establishes a session without exposing a token to JavaScript.
2. Refreshing the page restores the user through `GET /api/auth/me`.
3. Protected routes remain hidden while authentication is loading.
4. Logging out clears the session and returns to the login page.
5. A `401` from a protected endpoint clears stale frontend authentication state.
6. GraphQL queries use only `POST /api/graphql` with `credentials: "include"`.
7. GraphQL `errors` returned with HTTP `200` are displayed or handled correctly.
8. The production frontend bundle contains no Hasura endpoint, Hasura admin secret, or backend auth secret.
9. Existing non-authenticated public API pages continue to work.
