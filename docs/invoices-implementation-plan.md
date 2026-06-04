# Custom Invoices Implementation Plan

## Goal

Add downloadable invoices to the transactions page while keeping invoice data inside Tap-it. Invoices should be generated from paid transactions and contain immutable snapshots of buyer, seller, and purchased item data.

## Preferred Approach

Use custom Tap-it invoices instead of Stripe Invoices.

Reasons:

- Tap-it already owns the transaction, profile, booking, and membership data.
- Invoice content can match Slovak/local business needs.
- Invoice data can be snapshotted so old invoices do not change when a user edits their profile.
- The transactions page can offer a simple `Download invoice` action without changing the existing Stripe PaymentIntent flow.

## Database

Create an `invoices` table.

Suggested fields:

- `id`
- `invoice_number`
- `transaction_id`
- `user_id`
- `status`
- `seller_snapshot`
- `buyer_snapshot`
- `line_items`
- `subtotal`
- `tax_total`
- `total`
- `currency`
- `issued_at`
- `paid_at`
- `service_date`
- `pdf_path`
- `created_at`

Use JSON snapshots for `seller_snapshot`, `buyer_snapshot`, and `line_items` so generated invoices remain stable even if profile or company details change later.

## Invoice Numbering

Use DB-backed numbering, not a simple app-side count.

Suggested format:

```text
2026-000001
```

The implementation should avoid duplicate numbers under concurrent invoice generation.

## Seller Data

Do not hardcode seller details inside UI components.

Start with a config file, later move to admin settings if needed:

```ts
export const SELLER = {
  name: "Tap-it",
  email: "info@tap-it.sk",
  address: "...",
  ico: "...",
  dic: "...",
  icDph: null,
  isVatPayer: false,
};
```

Exact company details still need to be confirmed.

## Buyer Data

Use the user's profile data at invoice creation time:

- full name
- email
- phone
- address

If required buyer fields are missing, the download flow should either:

- block invoice creation and ask the user to complete profile details, or
- generate the invoice with available data only, depending on the final legal/accounting decision.

## Generation Flow

Transactions page shows a `Download invoice` button for paid transactions.

When clicked:

1. Server verifies the authenticated user owns the transaction.
2. Server checks if an invoice already exists for the transaction.
3. If not, server creates the invoice snapshot.
4. Server generates a PDF.
5. PDF is returned as a download or stored in Supabase Storage and then returned.

Recommended MVP: create invoice on first download.

## PDF Generation

Create an API route:

```text
/api/invoices/[transactionId]/download
```

The route should return:

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-2026-000001.pdf"
```

For MVP, use a simple server-side PDF library. Avoid a headless browser unless the design needs precise HTML/CSS rendering.

## Invoice Content

Include:

- invoice number
- issue date
- payment date
- service date or reservation period
- seller details
- buyer details
- line items
- item description, for example membership name or booked facility
- reservation time if relevant
- quantity and unit
- subtotal
- VAT/tax fields depending on seller VAT status
- total
- currency
- payment note, for example `Paid by card via Stripe`

## Open Decisions

- Exact Tap-it company details.
- Whether Tap-it is a VAT payer.
- Whether invoices should be stored in Supabase Storage or generated on demand from snapshots.
- Whether missing buyer address should block invoice generation.
- Final PDF visual layout.

