# Meta WhatsApp Cloud API setup

This project can send the trainer a WhatsApp notification after a paid consultation booking is completed.

The notification is sent directly through Meta WhatsApp Cloud API from:

```text
src/app/api/booking/booked/route.ts
```

The sender implementation lives in:

```text
src/lib/whatsapp.ts
```

## Booking notification flow

```text
Client fills consultation form
→ Lead is saved
→ Client pays
→ Client books Calendly slot
→ /api/booking/booked marks lead as booked
→ Meta WhatsApp Cloud API sends trainer notification
```

If WhatsApp notification fails, the booking still succeeds. The failure is logged server-side.

## Required environment variables

Add these to `.env.local` locally and to the production host, for example Render.

```env
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_WHATSAPP_TO=
META_WHATSAPP_TEMPLATE_NAME=booking_confirmation_trainer
META_WHATSAPP_TEMPLATE_LANGUAGE=en_US
META_GRAPH_API_VERSION=v23.0
```

### Variable meanings

| Variable | Required | Description |
|---|---:|---|
| `META_WHATSAPP_ACCESS_TOKEN` | Yes | Meta system-user access token with WhatsApp messaging permission. |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Yes | Phone Number ID from the WhatsApp API setup page. |
| `META_WHATSAPP_TO` | Recommended | Trainer recipient number. Use country code, digits only or `+` prefixed. If empty, the app falls back to the trainer WhatsApp number in `/admin`. |
| `META_WHATSAPP_TEMPLATE_NAME` | Yes | Approved WhatsApp template name. Default used by the app: `booking_confirmation_trainer`. |
| `META_WHATSAPP_TEMPLATE_LANGUAGE` | Yes | Template language code. Default: `en_US`. |
| `META_GRAPH_API_VERSION` | Yes | Meta Graph API version. Default: `v23.0`. |

Remove the old Zapier variable if it exists:

```env
ZAPIER_BOOKING_WEBHOOK_URL
```

## WhatsApp template

Create a utility template named:

```text
booking_confirmation_trainer
```

Language:

```text
en_US
```

Template body:

```text
New consultation booked

Booking ID: {{1}}
Name: {{2}}
Client WhatsApp: {{3}}
Email: {{4}}
Goal: {{5}}
Level: {{6}}
Amount: {{7}}
Calendly event: {{8}}
Booked time: {{9}}
```

The app sends template variables in this exact order:

| Template variable | Value |
|---:|---|
| `{{1}}` | Booking ID |
| `{{2}}` | Client name |
| `{{3}}` | Client WhatsApp number |
| `{{4}}` | Client email |
| `{{5}}` | Goal |
| `{{6}}` | Level |
| `{{7}}` | Paid amount |
| `{{8}}` | Calendly event URL |
| `{{9}}` | Booked time in India time |

## Meta setup steps

1. Create or use a Meta Business account.

   Go to Meta Business Suite and make sure the business has a Meta Business portfolio.

2. Create a Meta developer app.

   Go to Meta for Developers, create an app, and add the WhatsApp product.

3. Open WhatsApp API setup.

   In the app dashboard, go to:

   ```text
   WhatsApp → API Setup
   ```

   Copy:

   - Phone Number ID
   - WhatsApp Business Account ID

4. Add and verify the sender phone number.

   This is the WhatsApp Business sender number. It does not have to be the same as the trainer recipient number.

5. Create a production access token.

   Do not use the temporary test token in production. Create a Meta Business system user, assign WhatsApp permissions, and generate a long-lived token.

   Save it as:

   ```env
   META_WHATSAPP_ACCESS_TOKEN=...
   ```

6. Set the Phone Number ID.

   ```env
   META_WHATSAPP_PHONE_NUMBER_ID=...
   ```

7. Set the trainer recipient number.

   Example:

   ```env
   META_WHATSAPP_TO=919949191359
   ```

8. Create and submit the message template.

   Use the template body shown above. Wait for Meta approval before production testing.

9. Add the environment variables in Render.

   In Render, open the service and add the Meta WhatsApp variables under Environment.

10. Redeploy the service.

11. Test the full booking flow.

   ```text
   Fill consultation form
   → complete payment or test bypass
   → book Calendly slot
   → confirm trainer receives WhatsApp message
   ```

## Troubleshooting

### Booking succeeds but WhatsApp does not arrive

Check server logs for messages beginning with:

```text
[whatsapp]
```

Common causes:

- Missing or invalid access token.
- Wrong Phone Number ID.
- Template is not approved.
- Template name or language does not match the approved template.
- Trainer recipient number is invalid or missing country code.
- Meta app is still in test mode and the recipient number is not allowed.

### Template parameter mismatch

The template must have exactly nine body variables because the app sends nine parameters.

If the template has fewer or more variables, Meta will reject the message.

### Token expires

Temporary tokens expire. Use a system-user access token for production.

## Official references

- Meta WhatsApp Cloud API get started: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- Meta WhatsApp Cloud API messages: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
- Meta message templates: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
