# Shared monthly payments for HKM and HKPC

HKM `/bli-fast-giver` and HKPC `/betaling` and `/gi-gave` use the same Firebase project (`his-kingdom-ministry`), Stripe/PayPal secrets and `donations` ledger.

## Entry points

- `createRecurringPayment`: server-validated setup, `provider: stripe|paypal`.
- `verifyRecurringPayment`: verifies PayPal approval using the server's saved subscription and plan identifiers. Approval is not recorded as money received.
- `reconcileRecurringPayPal`: daily provider verification and transaction reconciliation, independent of the browser returning. Failed checks are logged and retried on the next run.
- `stripeWebhook`: signature-verified successful charges, including every subscription renewal. Failed database writes return 500 so Stripe can retry.

School payment is fixed to NOK 1,000 across ten monthly periods. Stripe receives a cancellation cap from the first subscription call and its actual billing anchor sets the final date. PayPal uses ten regular billing cycles. A school-year/payer/student identity reserves a single plan across providers; duplicate requests cannot create a second school plan. A blocked or expired attempt must be reviewed by the administrator before resetting it.

Gifts recur monthly until cancelled. Stripe creates a fresh customer so a card saved for another agreement is never silently reused. The payer explicitly authorises recurring charges before entering the provider checkout.

## Administration

Stripe agreements are managed in the Stripe dashboard, PayPal agreements in the merchant PayPal account. Payers can cancel PayPal agreements in PayPal; card cancellation requests go through the organisation. Look up the subscription ID in the ledger or agreement record. Cancelling a school payment plan does not settle unpaid tuition. Failed payments need follow-up with the student.

Bank standing orders are created and stopped by the payer in their online bank; they are registered manually when received. Buy Me a Coffee remains an external HKM giving channel and is not represented as an HKPC transaction in this ledger.

Recurring Vipps on HKPC is unavailable pending the new sales unit's activation and integration. Existing HKM Vipps code is not used by these school plans. Before enabling it, implement finite school charges, provider verification and recurring charge reconciliation; activating the merchant product alone is insufficient.

## Validation

`node --test functions/recurring-payments.test.cjs` covers fixed prices/cycles, month ends, duplicate setup, renewal metadata and the distinction between approved agreements and completed payments. HKPC's `test/school-payments.test.js` covers payment payloads, failed/unverified states and duplicate agreements. No live agreement or monetary charge was created while testing.

Deploy only the four entry points above. Functions runtime is Node 22.

## Administrative school payment views

HKM admin links to `/admin/skolebetalinger.html` from the giving area. The page shows linked student balances, school agreement references, and course transactions. Gifts are excluded. All data comes from the default HKM payment database through `schoolPaymentsAdmin`; the server verifies a current, verified HKM administrator.

HKPC website admin provides a School payments tab at `/admin/portal?tab=payments`. Its `studentPayments` admin mode verifies current Community/website admin access before invoking the private HKM payment service. A managed suspended role overrides legacy website admin access. No elevated browser claims or automatic payer-to-student matching are used.

Both views distinguish tuition from the separate registration fee. Only completed course payments reduce the balance. Bank transfers must be recorded as received first. No approved student link means no invented student balance. The displayed administration list is capped at 100 linked accounts, 100 agreements and 500 transactions; a visible notice identifies capped results. Transactions with no year remain visibly unassigned to a school year.
