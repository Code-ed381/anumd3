# Pre-Order Cooking App

Mobile-first Next.js PWA for pre-ordering meals. Customers browse the menu, pick a pickup slot, and pay with Paystack (Mobile Money or card). The owner manages dishes and orders, and gets SMS + push when a payment succeeds.

## Stack

- Next.js App Router on Vercel
- Supabase (Postgres + Storage + Auth) via the JS client
- Paystack
- Pave360 External SMS API
- Web Push

## Local setup

1. Copy env placeholders:

   ```bash
   cp .env.local.example .env.local
   ```

2. Create a [Supabase](https://supabase.com) project and paste into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. In the Supabase dashboard, open **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql), and run it. That creates the tables **and** row-level security (the public anon key can only read available dishes; it cannot create orders or payments). The app’s API uses the service role key, which bypasses RLS.

4. In Supabase Storage, create a public bucket named `dish-photos`.

5. In Supabase Authentication → Users → Add user, create the **one** owner account (email + password). Set `OWNER_PHONE` to `233XXXXXXXXX`.

6. Start the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) (redirects to `/menu`). Owner login is `/owner/login`.

## Payments (Paystack)

Add test keys to `.env.local`. After an order is created, **Pay now** starts a Paystack transaction.

In the Paystack dashboard, set the webhook URL to:

`https://<your-domain>/api/webhooks/paystack`

The webhook is the source of truth. The `/order-status/[reference]` page also verifies the transaction so local testing works without a public webhook.

## SMS & OTP (Pave360)

Set `PAVE360_API_URL`, `PAVE360_API_KEY`, and `PAVE360_SENDER_ID` in `.env.local`. You need an **approved sender ID** in Pave360.

- **Order alerts** — `src/lib/sms.ts` calls `POST {PAVE360_API_URL}/api/external/sms/send` with `{ phone_number, message, sender_id }`.
- **Phone verification** — `src/lib/otp.ts` calls Pave360 OTP endpoints:
  - `POST /api/external/otp/send` — 6-digit numeric code, 10-minute expiry
  - `POST /api/external/otp/verify` — validates the code; on success the app sets a 90-day session cookie

Without Pave360 credentials, order SMS is skipped and OTP falls back to local dev codes (logged to the server console). Alerts are best-effort: a failed SMS/push never undoes a successful payment.

## Push notifications

```bash
npx web-push generate-vapid-keys
```

Put the keys in `.env.local` (`VAPID_*` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). On the owner dashboard, tap **Enable push notifications**.

## Next.js 16 note

Owner route protection lives in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts`). Unauthenticated `/owner/*` requests redirect to `/owner/login`.

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Add every variable from `.env.local.example` in Vercel → Environment Variables.
3. Set `NEXT_PUBLIC_APP_URL` to the live domain.
4. Update Paystack webhook URL and Supabase Auth redirect URLs to that domain.

Do not commit `.env.local`.
# anumd3
# anumd3
