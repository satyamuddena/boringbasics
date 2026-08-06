# WhatsApp booking notifications

When a consultation booking is confirmed, the app sends two WhatsApp messages through **Twilio**:

| Audience | Recipient | Content SID env var |
|---|---|---|
| Trainer | `trainer.whatsapp` — the number in `/admin/trainer` | `TWILIO_WHATSAPP_CONTENT_SID` |
| Customer | the number they entered on the booking form | `TWILIO_WHATSAPP_CUSTOMER_CONTENT_SID` |

Neither recipient is configured in the environment. Changing the trainer's number is an admin edit, not a redeploy.

Implementation:

```text
src/lib/whatsapp.ts          Twilio transport (server-only)
src/lib/whatsappTemplate.ts  message variables, formatting, recipient validation
src/app/api/booking/booked/route.ts   the trigger
```

## Flow

```text
Client fills consultation form   → lead saved, stage = details
→ pays via Razorpay              → stage = paid
→ books a Calendly slot          → POST /api/booking/booked
→ event verified against the Calendly API (slot start time read here)
→ stage = booked, scheduled_at stored
→ trainer alert + customer confirmation sent (after the response)
```

Notifications are dispatched with `after()` so they never delay the client's confirmation screen, and every outcome is written to the audit log. **A notification failure never un-books a booking** — the booking is already committed before either message is attempted.

## Message content

Both templates use variables `{{1}}`–`{{5}}`. Twilio rejects empty variables, so any missing value is sent as an em dash.

**Trainer alert** — `TWILIO_WHATSAPP_CONTENT_SID`, template `booking_confirmation_trainer`

```text
New booking received.

Name: {{1}}
Phone: {{2}}
Date: {{3}}
Time: {{4}}
Email: {{5}}

Please review this booking in the admin panel.
```

| Variable | Value |
|---:|---|
| `{{1}}` | Client name |
| `{{2}}` | Client WhatsApp number |
| `{{3}}` | Consultation date, e.g. `20 July` |
| `{{4}}` | Consultation time, e.g. `6:00 PM` |
| `{{5}}` | Client email |

**Customer confirmation** — `TWILIO_WHATSAPP_CUSTOMER_CONTENT_SID`, template `booking_confirmation_customer_v2`

```text
Hi {{1}}, your consultation with {{5}} is confirmed. 🎉

Date: {{2}}
Time: {{3}} (IST)
Duration: {{4}}

A calendar invite is on its way to your email. Please join a couple of minutes early — and if you need to reschedule, just reply to this message.

Looking forward to speaking with you!
```

| Variable | Value |
|---:|---|
| `{{1}}` | Client first name |
| `{{2}}` | Consultation date |
| `{{3}}` | Consultation time |
| `{{4}}` | Consultation duration from `/admin/consultation` |
| `{{5}}` | Trainer brand |

The brand appears in the greeting rather than as a sign-off because **Meta rejects any template whose body starts or ends with a variable**. An earlier version ended with `— {{5}}` and was rejected for exactly this. Keep that rule in mind before editing either body.

Note also that a Content Template **cannot be edited once it has been submitted for WhatsApp approval — including after a rejection** (Twilio error `92010`). Fixing a rejected template means creating a new one, which produces a new Content SID and therefore an env var change in both `.env.local` and Render. Get the body right before submitting.

Date and time are rendered in `Asia/Kolkata`, matching how Calendly presents slots.

## Where the date and time come from

They are the **Calendly slot**, read from the scheduled event via the Calendly API and stored on the lead as `scheduled_at`. They are not the time the booking was made — that is `booked_at`, and the two are usually days apart.

This makes `CALENDLY_ACCESS_TOKEN` load-bearing:

- **In production it is required.** `verifyCalendlyEvent` fails closed without it, so `/api/booking/booked` returns 400 and no booking can ever reach the `booked` stage.
- **In local development it is optional.** Verification is skipped, but the slot time is then unavailable and both messages fall back to the booking timestamp. Set it locally if you are testing the notifications.

Get one from Calendly → Integrations & apps → API & webhooks → Personal Access Tokens.

## Environment variables

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_WHATSAPP_CONTENT_SID=
TWILIO_WHATSAPP_CUSTOMER_CONTENT_SID=
CALENDLY_ACCESS_TOKEN=
```

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Account SID from the Twilio console. |
| `TWILIO_AUTH_TOKEN` | Auth token for that account. |
| `TWILIO_WHATSAPP_FROM` | Sender, e.g. `whatsapp:+919999999999`. The `whatsapp:` prefix is added if omitted. |
| `TWILIO_WHATSAPP_CONTENT_SID` | `HX...` Content SID of the approved trainer template. |
| `TWILIO_WHATSAPP_CUSTOMER_CONTENT_SID` | `HX...` Content SID of the approved customer template. |
| `CALENDLY_ACCESS_TOKEN` | Personal Access Token; see above. |

All are `sync: false` in `render.yaml` — values must be set in the Render dashboard by hand; nothing carries over from `.env.local`.

## Production sender vs the Sandbox

The **Twilio Sandbox cannot be used for customer messages.** Every recipient must first text `join <code>` to the sandbox number, and the opt-in lapses after 72 hours — a real client will never have done this. Sends fail with error `63016`.

For production, register a WhatsApp sender in Twilio (Messaging → Senders → WhatsApp senders), complete the Meta Business verification, and point `TWILIO_WHATSAPP_FROM` at it. Both Content Templates must show **Approved** for WhatsApp in the Content Template Builder.

## Setup steps

1. Twilio Console → Messaging → **Content Template Builder** → create two `Text` templates, category **Utility**, using the bodies above.
2. Submit both for WhatsApp approval and wait for `Approved`.
3. Copy each `HX...` Content SID into the matching env var.
4. Register a production WhatsApp sender and set `TWILIO_WHATSAPP_FROM`.
5. Set the trainer's number in `/admin/trainer` — digits with country code, e.g. `919999999999`.
6. Add every variable in the Render dashboard, then redeploy.
7. Test both templates from `/admin/whatsapp-test` before relying on a live booking.

## Verifying and troubleshooting

`/admin/whatsapp-test` sends either template to a number you choose and polls Twilio for the delivery receipt. `/admin/leads` shows, per booking, the consultation slot and whether each message was sent, with a **Check delivery** button.

Twilio's send response only means *accepted* (`queued`). Delivery is confirmed separately — that is what the status buttons are for.

Server logs are prefixed `[whatsapp]`. Common Twilio error codes:

| Code | Meaning |
|---:|---|
| `63015` | The sender is the Sandbox and the recipient has not joined it. They must send `join <code>` to the sandbox number, and re-join every 3 days. Customers never will — this is the code you see until you move to a registered sender. |
| `63016` | Template not approved, or sending free-form outside a session — usually the Sandbox. |
| `21211` | Invalid `To` number. The app validates recipients first, so this should be rare. |
| `63024` | Invalid `From` — the sender is not a registered WhatsApp number. |
| `21610` | The recipient blocked the sender. |

If a message never arrives but the booking succeeded, check `/admin/leads` for the recorded error first — it names the audience and the Twilio code.

## Official references

- Twilio Content Template Builder: https://www.twilio.com/docs/content
- Twilio WhatsApp senders: https://www.twilio.com/docs/whatsapp/self-sign-up
- Twilio message resource: https://www.twilio.com/docs/messaging/api/message-resource
- Calendly API — scheduled events: https://developer.calendly.com/api-docs
