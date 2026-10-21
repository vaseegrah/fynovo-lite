# Fynovo Finance

Mobile-first Next.js dashboard for Fynovo income, expenses, profit/loss and CSV reporting. It uses integer paise values for all calculations, encrypted server-side API keys, httpOnly signed sessions, MongoDB/Mongoose persistence, and a labelled development demo.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. For the visual demo, retain `DEMO_MODE=true` and run `npm install`, then `npm run dev`.
3. Open `http://localhost:3000` and sign in with `demo@fynovo.app` / `fynovo-demo`.
4. Run `npm test` to validate calculation rules and duplicate-prevention index coverage.

## Production configuration

Set `DEMO_MODE=false`, `MONGODB_URI`, a long random `SESSION_SECRET`, and a base64-encoded 32-byte `ENCRYPTION_KEY`. Use TLS behind your deployment platform. Create users through the registration screen and set a scheduler to call `GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET`.

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

Replace every example path and field with values confirmed by Fynovo’s documentation. Amounts must be mapped to integer minor units (paise). The app validates the key server-side against `healthPath`; it never returns or logs a supplied key. `SyncedTransaction` upserts on user, integration and source transaction ID to prevent duplicates.

## Financial treatment

Only `paid` records contribute to totals. Pending, cancelled and voided records are shown in ledgers but excluded. Refunds/reversals should arrive from Fynovo as offsetting settled records; map them accordingly in the verified connector contract. The report uses the transaction date and INR by default.

## Deployment notes

Use a durable MongoDB deployment and an external scheduler (Vercel Cron, GitHub Actions, or your cloud scheduler) rather than a browser session. The provided cron route is protected with `CRON_SECRET`. Configure platform HTTPS, rotate `ENCRYPTION_KEY` through a planned re-encryption migration, and ensure your Fynovo credentials are tenant-scoped.
