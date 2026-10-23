# Fynovo Finance

Mobile-first Next.js dashboard for Fynovo income, expenses, profit/loss and CSV reporting. It uses integer paise values for all calculations, encrypted server-side API keys, httpOnly signed sessions, and MongoDB/Mongoose persistence. Dashboard records are fetched from configured Fynovo API connections; no sample transactions are used.

## Run locally

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `SESSION_SECRET`, and `ENCRYPTION_KEY`.
2. Run `npm install`, then `npm run dev`.
3. Create an account, open Settings, enter each brand's Income and Expense API URLs and API key, then save or use **Sync now** to fetch its transactions.
4. Run `npm test` to validate calculation rules and duplicate-prevention index coverage.

## Production configuration

Set `MONGODB_URI`, a long random `SESSION_SECRET`, and a base64-encoded 32-byte `ENCRYPTION_KEY`. Use TLS behind your deployment platform. Create users through the registration screen and set a scheduler to call `GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET`.

For a base URL ending in `/transactions`, the app automatically requests income and expense separately using `?type=income` and `?type=expense`. For a base URL ending in `/income`, it derives the sibling `/expenses` endpoint, and vice versa. For a different deployment or response shape, add a verified JSON endpoint contract as `FYNOVO_CONTRACT_JSON`:

```json
{
  "healthPath": "/verified/health-path",
  "incomePath": "/verified/income-path",
  "expensePath": "/verified/expense-path",
  "authHeader": "Authorization",
  "authPrefix": "Bearer ",
  "fields": {
    "id": "id",
    "date": "transactionDate",
    "amount": "amountMinor",
    "category": "category.name",
    "description": "description",
    "paymentMethod": "paymentMethod",
    "status": "status",
    "currency": "currency"
  }
}
```

Replace every example path and field with values confirmed by Fynovo’s documentation. Amount values are treated as major currency units (for example, `amount: 250` means ₹250) and converted to integer minor units. If the API returns paise, map the field to a path named `amountMinor` or `amountPaise` so it is stored without another conversion. Payment status is preferred over generic order status; missing status is recorded as unknown rather than assumed paid. The app validates the key server-side against `healthPath`; it never returns or logs a supplied key. `SyncedTransaction` upserts on user, brand and source transaction ID to prevent duplicates. On the first sync after upgrading, the app removes the obsolete unique integration index and creates the current indexes.

## Financial treatment

Only `paid` records contribute to totals. Pending, cancelled and voided records are shown in ledgers but excluded. Refunds/reversals should arrive from Fynovo as offsetting settled records; map them accordingly in the verified connector contract. The report uses the transaction date and INR by default.

## Deployment notes

Use a durable MongoDB deployment and an external scheduler (Vercel Cron, GitHub Actions, or your cloud scheduler) rather than a browser session. The provided Vercel Cron runs daily, syncing each configured brand with that brand's saved API key; set `CRON_SECRET` to authorize the route. Configure platform HTTPS, rotate `ENCRYPTION_KEY` through a planned re-encryption migration, and ensure your Fynovo credentials are tenant-scoped.
