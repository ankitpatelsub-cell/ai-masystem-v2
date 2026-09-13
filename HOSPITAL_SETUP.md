# Hospital booking and queue rollout

The public patient flow is available at:

- `/hospital/book` — scheduled appointment booking
- `/hospital/visit?code=APT-…` — self-service booking lookup, cancellation, and rescheduling
- `/hospital/check-in?code=CHK-…` — arrival check-in pass
- `/hospital/kiosk` — walk-in reception / tablet flow
- `/hospital/board` — privacy-safe waiting-room display

Staff use `/hospital` after sign-in for appointments, live queue controls, transfers, priority audit, scheduling blocks, metrics, and delivery history.

## Notification provider

Notification events are durable before delivery. Set these server environment variables to deliver them through your approved SMS, WhatsApp, email, or integration service:

```bash
HOSPITAL_NOTIFICATION_WEBHOOK=https://provider.example/hospital-events
HOSPITAL_NOTIFICATION_TOKEN=provider-secret
HOSPITAL_PUBLIC_RATE_LIMIT=20
```

The webhook receives the event channel, event kind, body, destination, and booking code. Configure it to route `sms` to your approved SMS/WhatsApp provider and `email` to your email provider. Use `HOSPITAL_NOTIFICATION_TRANSPORT=mock` for safe non-delivery environments.

For production, place the public app behind HTTPS, replace the generic webhook with the hospital's approved messaging provider, configure OTP enforcement in the identity layer, and complete hospital-specific privacy, retention, consent, and incident-response reviews. ABDM/ABHA interoperability requires separate provider onboarding and credentials; the optional ABHA field is not a network integration.
