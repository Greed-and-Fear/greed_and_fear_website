# Frontend API Integration Guide

This document is the implementation contract for a frontend application or coding agent integrating with the Greed & Fear FastAPI backend.

## Base URLs

| Environment | Base URL |
| --- | --- |
| Production | `https://api.greedandfear.in` |
| Local backend | `http://127.0.0.1:8000` |

Do not use `http://greedandfear.in:8000` in frontend code. Production traffic must use the HTTPS API subdomain through Nginx.

Interactive API resources:

- Swagger UI: `${API_BASE_URL}/docs`
- OpenAPI JSON: `${API_BASE_URL}/openapi.json`
- Health check: `${API_BASE_URL}/health`

Recommended frontend environment variable:

```env
VITE_API_BASE_URL=https://api.greedandfear.in
```

For local backend development:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Browser Access

The backend currently accepts browser requests from these origins:

- `http://localhost:5173`
- `http://localhost:82`
- `http://greedandfear.in`
- `https://greedandfear.in`
- `https://www.greedandfear.in`

An origin includes its scheme, host, and port. A frontend running on another localhost port is not covered until that exact origin is added to `CORS_ORIGINS`.

## Important Behavior

- Request and response bodies use JSON.
- Datetimes are ISO 8601 strings, normally in UTC.
- PostgreSQL `Decimal` values are serialized as JSON strings. Convert them with `Number(value)` before calculations or charting.
- List endpoints return plain arrays except `/api/market/all-stocks`, which returns a paginated object.
- Login creates a signed session in an `HttpOnly` cookie. Frontend JavaScript cannot and should not read this cookie.
- `/api/auth/me` and `/api/graphql` require the session cookie. All frontend API calls must use `credentials: "include"`.
- Never expose the Hasura URL, admin secret, or a Hasura authorization header in frontend code or frontend environment variables.
- `/api/market/all-stocks` proxies TradeBrains. Its `next` and `previous` values can contain an upstream URL. Do not fetch those URLs directly; increment or decrement `page` against this backend instead.

## TypeScript Contract

```ts
export interface ApiError {
  detail: string | ValidationIssue[];
}

export interface ValidationIssue {
  type: string;
  loc: Array<string | number>;
  msg: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

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

export interface MarketSnapshot {
  name: string;
  value: string;
  change_percent: string | null;
  detail: string | null;
  tone: string | null;
  captured_at: string;
}

export interface StockMetric {
  symbol: string;
  mwpl: string;
  one_day_change: string;
  two_day_change: string;
  price_change: string;
  oi_change: string;
  volume_change: string;
  signal: string;
  score: number;
  captured_at: string;
}

export type BoardStatus =
  | "under_watch"
  | "in_ban"
  | "ban_lifted"
  | "in_trade"
  | "exited_profit"
  | "exited_loss";

export interface StockSearchResult {
  id: number;
  symbol: string;
  company_name: string;
  exchange: string;
  isin: string | null;
  current_price: string | null;
  change: string | null;
  change_percent: string | null;
  price_at: string | null;
}

export interface CreateBoardPosition {
  stock_id: number;
  owner_user_id?: number | null;
  status?: BoardStatus;
  buy_price?: string | null;
  quantity?: string | null;
  target_price?: string | null;
  stop_loss?: string | null;
  notes?: string | null;
  opened_at?: string | null;
}

export interface UpdateBoardPosition {
  owner_user_id?: number | null;
  buy_price?: string | null;
  quantity?: string | null;
  target_price?: string | null;
  stop_loss?: string | null;
  notes?: string | null;
}

export interface BoardPosition {
  id: number;
  reference: string;
  stock_id: number;
  symbol: string;
  company_name: string;
  exchange: string;
  owner_user_id: number | null;
  owner_name: string | null;
  status: BoardStatus;
  buy_price: string | null;
  current_price: string | null;
  pnl_percent: string | null;
  quantity: string | null;
  target_price: string | null;
  stop_loss: string | null;
  notes: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketAlert {
  id: number;
  symbol: string;
  message: string;
  created_at: string;
}

export interface NewsArticle {
  id: number;
  category: string;
  title: string;
  summary: string;
  source: string;
  published_at: string;
}

export interface ContactRequest {
  name: string;
  phone: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  reference: string;
  received_at: string;
}

export interface AllStock {
  id: number;
  company_id: number;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  per_change: number;
  date: string;
  exchange: string;
  symbol: string;
  company: string;
  scripcode: number;
  co_code: number;
  isin: string;
  prev_close: number;
  FINCODE: number;
  ISIN: string;
  mcap: number;
  pe: number;
  roe: number;
}

export interface PaginatedAllStocks {
  count: number;
  next: string | null;
  previous: string | null;
  results: AllStock[];
}
```

`AllStock` is an upstream response and may gain fields. Frontend code should ignore unknown fields and handle nullable or missing upstream values defensively.

## Fetch Client

```ts
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000")
  .replace(/\/$/, "");

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
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
    const body = await response.json().catch(() => null);
    throw new ApiRequestError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

## Endpoints

### Health

`GET /health`

Response: `200 OK`

```json
{
  "status": "ok"
}
```

This confirms that the API process is running. It does not currently test PostgreSQL or TradeBrains connectivity.

### Login

`POST /api/auth/login`

Request:

```json
{
  "phone": "admin",
  "password": "admin"
}
```

Validation:

- `phone`: at least 1 character; no maximum length
- `password`: 1 to 128 characters

Response: `200 OK`

```json
{
  "id": 1,
  "name": "Admin",
  "phone": "admin",
  "plan": "demo"
}
```

Errors:

- `401`: invalid credentials or inactive user
- `422`: invalid request body

Frontend call:

```ts
const user = await apiRequest<User>("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ phone, password } satisfies LoginRequest),
});
```

The response also sets the `gf_session` cookie. It is intentionally unavailable through JavaScript.

### Current Session

`GET /api/auth/me`

Returns the currently authenticated `User`. A missing, expired, invalid, or inactive-user session returns `401`.

```ts
const user = await apiRequest<User>("/api/auth/me");
```

### Logout

`POST /api/auth/logout`

Clears the session cookie and returns `204 No Content`.

```ts
await apiRequest<void>("/api/auth/logout", { method: "POST" });
```

### Hasura GraphQL

`POST /api/graphql`

This authenticated backend proxy accepts a standard GraphQL HTTP request. The backend adds Hasura credentials and restricted session variables; the frontend must not send Hasura headers.

```ts
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: Array<string | number> }>;
}

const result = await apiRequest<GraphQLResponse<{ stock_mwpl_history: unknown[] }>>(
  "/api/graphql",
  {
    method: "POST",
    body: JSON.stringify({
      query: `
        query LatestMwpl {
          stock_mwpl_history(order_by: { trade_date: desc }, limit: 20) {
            trade_date
            isin
            scrip_name
            mwpl
            open_interest
          }
        }
      `,
      variables: {},
      operationName: "LatestMwpl",
    }),
  },
);
```

GraphQL execution errors can be returned with HTTP `200`; always inspect the response `errors` array.

### Market Snapshots

`GET /api/market/snapshots`

Returns all snapshots, newest first.

Response: `200 OK`

```json
[
  {
    "name": "NIFTY 50",
    "value": "24874.2500",
    "change_percent": "0.6200",
    "detail": "Market open",
    "tone": "positive",
    "captured_at": "2026-08-25T10:30:00Z"
  }
]
```

Frontend call:

```ts
const snapshots = await apiRequest<MarketSnapshot[]>("/api/market/snapshots");
```

### Stock Metrics

`GET /api/stocks`

Query parameters:

| Parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `signal` | string | omitted | Exact, case-sensitive signal match |
| `limit` | integer | `100` | Minimum `1`, maximum `500` |

Results are ordered by `score` descending.

Example:

```text
/api/stocks?signal=Long%20build-up&limit=100
```

Response: `200 OK`

```json
[
  {
    "symbol": "RELIANCE",
    "mwpl": "72.5000",
    "one_day_change": "3.1000",
    "two_day_change": "5.2000",
    "price_change": "1.2500",
    "oi_change": "4.8000",
    "volume_change": "10.3000",
    "signal": "Long build-up",
    "score": 82,
    "captured_at": "2026-08-25T10:30:00Z"
  }
]
```

Frontend call:

```ts
const query = new URLSearchParams({ signal: "Long build-up", limit: "100" });
const stocks = await apiRequest<StockMetric[]>(`/api/stocks?${query}`);
```

### Stock Catalog Search

`GET /api/catalog/stocks`

Use this endpoint for the board's search field and **Add stock** dialog. It searches the normalized local catalog populated from TradeBrains. Do not use `/api/market/all-stocks` for board selection.

Query parameters:

| Parameter | Type | Required | Rules |
| --- | --- | --- | --- |
| `search` | string | yes | 1 to 100 characters; matches symbol, company name, or ISIN |
| `exchange` | string | no | Exact exchange code, normally `NSE` or `BSE` |
| `limit` | integer | no | Default `20`, minimum `1`, maximum `50` |

Example:

```text
/api/catalog/stocks?search=RELIANCE&exchange=NSE&limit=20
```

Response: `200 OK`

```json
[
  {
    "id": 5707,
    "symbol": "RELIANCE",
    "company_name": "Reliance Industries Ltd",
    "exchange": "NSE",
    "isin": "INE002A01018",
    "current_price": "1317.0000",
    "change": "7.2000",
    "change_percent": "0.5500",
    "price_at": "2026-08-25T15:59:58Z"
  }
]
```

The `id` is the normalized database stock ID. Save the selected result and send its `id` as `stock_id` when creating a board position.

Search-button implementation:

```ts
export async function searchStockCatalog(
  search: string,
  exchange?: "NSE" | "BSE",
): Promise<StockSearchResult[]> {
  const term = search.trim();
  if (!term) return [];

  const params = new URLSearchParams({ search: term, limit: "20" });
  if (exchange) params.set("exchange", exchange);

  return apiRequest<StockSearchResult[]>(`/api/catalog/stocks?${params}`);
}

async function handleStockSearch(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setSearchLoading(true);
  try {
    setStockResults(await searchStockCatalog(searchText, selectedExchange));
  } finally {
    setSearchLoading(false);
  }
}
```

Use a `<form onSubmit={handleStockSearch}>` so both the search button and Enter key trigger the search. Display `symbol`, `company_name`, `exchange`, and `current_price` in each result.

Errors:

- `422`: missing/empty search, invalid limit, or search longer than 100 characters

### Board Positions

Board columns map to these exact status values:

| UI column | API status |
| --- | --- |
| Under Watch | `under_watch` |
| In Ban | `in_ban` |
| Ban Lifted | `ban_lifted` |
| In Trade | `in_trade` |
| Exited With Profit | `exited_profit` |
| Exited With Loss | `exited_loss` |

#### Load Board

`GET /api/board/positions`

Query parameters:

| Parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `status` | `BoardStatus` | omitted | Return only one column |
| `search` | string | omitted | Matches reference, symbol, company, or owner |
| `limit` | integer | `200` | Minimum `1`, maximum `500` |

Load all cards once and group them by `status` for the six columns:

```ts
const positions = await apiRequest<BoardPosition[]>("/api/board/positions");

const positionsByStatus = Object.groupBy(
  positions,
  (position) => position.status,
);
```

For runtimes without `Object.groupBy`, use `reduce`. The API returns newest-updated cards first.

Board search example:

```ts
const params = new URLSearchParams({ search: boardSearch.trim() });
const filtered = await apiRequest<BoardPosition[]>(
  `/api/board/positions?${params}`,
);
```

#### Add Stock To Board

`POST /api/board/positions`

First select a stock from `GET /api/catalog/stocks`. Never create a card from free-text symbol/company values.

Request:

```json
{
  "stock_id": 5707,
  "owner_user_id": 1,
  "status": "under_watch",
  "buy_price": "1300.00",
  "quantity": "10",
  "target_price": "1400.00",
  "stop_loss": "1250.00",
  "notes": "Volume expansion near weekly resistance."
}
```

Only `stock_id` is required. Prices and quantity must be greater than zero when provided. `notes` has a maximum length of 5000 characters.

Response: `201 Created`

```json
{
  "id": 42,
  "reference": "GF-A1B2C3D4",
  "stock_id": 5707,
  "symbol": "RELIANCE",
  "company_name": "Reliance Industries Ltd",
  "exchange": "NSE",
  "owner_user_id": 1,
  "owner_name": "Admin",
  "status": "under_watch",
  "buy_price": "1300.0000",
  "current_price": "1317.0000",
  "pnl_percent": "1.3077",
  "quantity": "10.0000",
  "target_price": "1400.0000",
  "stop_loss": "1250.0000",
  "notes": "Volume expansion near weekly resistance.",
  "opened_at": null,
  "closed_at": null,
  "created_at": "2026-08-25T17:00:00Z",
  "updated_at": "2026-08-25T17:00:00Z"
}
```

Frontend call:

```ts
export async function addStockToBoard(
  selectedStock: StockSearchResult,
  form: Omit<CreateBoardPosition, "stock_id">,
): Promise<BoardPosition> {
  return apiRequest<BoardPosition>("/api/board/positions", {
    method: "POST",
    body: JSON.stringify({ ...form, stock_id: selectedStock.id }),
  });
}
```

After creation, either insert the returned card into its status column or refetch the board.

Errors:

- `404 Stock not found`: invalid or inactive `stock_id`
- `404 Owner user not found`: invalid `owner_user_id`
- `422`: invalid status, non-positive numeric field, or invalid request shape

#### Move Card Between Columns

`PATCH /api/board/positions/{position_id}/status`

Request:

```json
{
  "status": "in_trade",
  "changed_by_user_id": 1
}
```

Response: `200 OK` with the complete updated `BoardPosition`.

```ts
export function moveBoardPosition(
  positionId: number,
  status: BoardStatus,
  changedByUserId?: number,
): Promise<BoardPosition> {
  return apiRequest<BoardPosition>(
    `/api/board/positions/${positionId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
        changed_by_user_id: changedByUserId ?? null,
      }),
    },
  );
}
```

Moving to `in_trade` sets `opened_at` if it is empty. Moving to an exit status sets `closed_at`. Every real status change is recorded in `trade_status_history`.

Errors:

- `404 Board position not found`: invalid card ID
- `404 User not found`: invalid `changed_by_user_id`
- `422`: invalid status

#### Edit Card

`PATCH /api/board/positions/{position_id}`

Use this endpoint to edit card details without changing its status. Send only fields that changed.

Editable fields:

- `owner_user_id`
- `buy_price`
- `quantity`
- `target_price`
- `stop_loss`
- `notes`

Request:

```json
{
  "owner_user_id": 1,
  "buy_price": "1310.00",
  "quantity": "25",
  "target_price": "1425.00",
  "stop_loss": "1260.00",
  "notes": "Raised target after breakout confirmation."
}
```

Response: `200 OK` with the complete updated `BoardPosition`.

```ts
export function updateBoardPosition(
  positionId: number,
  changes: UpdateBoardPosition,
): Promise<BoardPosition> {
  return apiRequest<BoardPosition>(`/api/board/positions/${positionId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}
```

Omitted fields remain unchanged. Send `null` to clear an optional field:

```ts
await updateBoardPosition(position.id, {
  owner_user_id: null,
  target_price: null,
  notes: null,
});
```

Numeric values must be greater than zero when they are not `null`.

Errors:

- `404 Board position not found`: invalid card ID
- `404 Owner user not found`: invalid non-null `owner_user_id`
- `422`: non-positive numeric field or invalid request shape

#### Delete Card

`DELETE /api/board/positions/{position_id}`

Permanently deletes the card and its status-change history.

Response: `204 No Content`

```ts
export async function deleteBoardPosition(positionId: number): Promise<void> {
  await apiRequest<void>(`/api/board/positions/${positionId}`, {
    method: "DELETE",
  });
}
```

After success, remove the card from local state. The response has no JSON body.

```ts
setPositions((current) =>
  current.filter((position) => position.id !== deletedPositionId),
);
```

Require a confirmation dialog before calling this endpoint because deletion cannot be undone.

Errors:

- `404 Board position not found`: invalid or already deleted card ID

### All Stocks

`GET /api/market/all-stocks`

This endpoint proxies the TradeBrains all-stocks API without exposing its server-side credentials.

Query parameters:

| Parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `ascending` | boolean | `true` | Sort direction |
| `by` | string | `company` | Letters and underscores only |
| `page` | integer | `1` | Minimum `1` |
| `per_page` | integer | `10` | Minimum `1`, maximum `100` |

Example:

```text
/api/market/all-stocks?ascending=true&by=company&page=1&per_page=10
```

Response: `200 OK`

```json
{
  "count": 6302,
  "next": "http://portal.tradebrains.in/api/company/sector-data/all-stocks/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1006,
      "company_id": 23450,
      "close": 210.65,
      "open": 215.2,
      "high": 215.9,
      "low": 208.0,
      "volume": 149537.0,
      "change": -2.61,
      "per_change": -1.22,
      "date": "2026-08-25T15:55:10Z",
      "exchange": "NSE",
      "symbol": "20MICRONS",
      "company": "20 Microns Ltd",
      "scripcode": 533022,
      "co_code": 23450,
      "isin": "INE144J01027",
      "prev_close": 213.26,
      "FINCODE": 207635.0,
      "ISIN": "INE144J01027",
      "mcap": 751.78,
      "pe": 11.05,
      "roe": 13.82
    }
  ]
}
```

Errors:

- `422`: invalid query parameter
- `502`: upstream HTTP error or invalid upstream JSON
- `503`: upstream unavailable
- `504`: upstream timed out after 15 seconds

Frontend pagination:

```ts
const params = new URLSearchParams({
  ascending: "true",
  by: "company",
  page: String(page),
  per_page: String(perPage),
});
const result = await apiRequest<PaginatedAllStocks>(
  `/api/market/all-stocks?${params}`,
);
```

Use `result.count` to calculate page count. Do not request `result.next` directly.

### Alerts

`GET /api/alerts`

Query parameters:

| Parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `limit` | integer | `50` | Minimum `1`, maximum `200` |

Results are ordered newest first.

Response: `200 OK`

```json
[
  {
    "id": 1,
    "symbol": "RELIANCE",
    "message": "Open interest increased with price",
    "created_at": "2026-08-25T10:30:00Z"
  }
]
```

Frontend call:

```ts
const alerts = await apiRequest<MarketAlert[]>("/api/alerts?limit=50");
```

### News

`GET /api/news`

Query parameters:

| Parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `search` | string | omitted | Maximum 100 characters; searches title, summary, and category |
| `limit` | integer | `20` | Minimum `1`, maximum `100` |

Search is case-insensitive. Results are ordered newest first.

Response: `200 OK`

```json
[
  {
    "id": 1,
    "category": "Commodities",
    "title": "Crude oil update",
    "summary": "Market summary text",
    "source": "Example News",
    "published_at": "2026-08-25T09:00:00Z"
  }
]
```

Frontend call:

```ts
const params = new URLSearchParams({ search: "crude", limit: "20" });
const news = await apiRequest<NewsArticle[]>(`/api/news?${params}`);
```

### Contact Request

`POST /api/contact`

Request:

```json
{
  "name": "Example User",
  "phone": "+91 90000 00000",
  "subject": "Membership enquiry",
  "message": "Please send membership details."
}
```

Validation:

| Field | Minimum | Maximum |
| --- | --- | --- |
| `name` | 1 character | 120 characters |
| `phone` | 1 character | No maximum |
| `subject` | 1 character | 160 characters |
| `message` | 1 character | 5000 characters |

Response: `201 Created`

```json
{
  "reference": "GF-A1B2C3D4E5",
  "received_at": "2026-08-25T10:30:00Z"
}
```

Frontend call:

```ts
const result = await apiRequest<ContactResponse>("/api/contact", {
  method: "POST",
  body: JSON.stringify(formData satisfies ContactRequest),
});
```

## Error Handling

Typical application error:

```json
{
  "detail": "Invalid credentials"
}
```

Typical FastAPI validation error:

```json
{
  "detail": [
    {
      "type": "less_than_equal",
      "loc": ["query", "limit"],
      "msg": "Input should be less than or equal to 500",
      "input": "501",
      "ctx": {
        "le": 500
      }
    }
  ]
}
```

Frontend rules:

1. Check `response.ok`; do not assume every response is successful JSON.
2. Show `detail` when it is a string.
3. Map validation issues by the final item in each `loc` array for form fields.
4. Provide a retry action for `502`, `503`, and `504` responses from the all-stocks endpoint.
5. Treat network failures separately from API status errors.
6. Cancel obsolete list requests with `AbortController` when filters or pages change rapidly.

## Frontend Implementation Checklist

1. Read the API base URL from environment configuration.
2. Centralize fetch and error parsing in one client.
3. URL-encode all query parameters with `URLSearchParams`.
4. Convert decimal strings only at the display or calculation boundary.
5. Keep original ISO datetime strings in state and format them for the user's locale at render time.
6. Debounce the news search input.
7. Keep all-stocks pagination on the Greed & Fear API base URL.
8. Send `credentials: "include"` for login and all authenticated API calls.
9. Never expose database, TradeBrains, or Hasura credentials in frontend environment variables.
