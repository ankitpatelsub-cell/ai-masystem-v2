# Hospital booking and queue rollout

The public patient flow is available at:

- `/hospital/book` — scheduled appointment booking
- `/hospital/visit?code=APT-…` — self-service booking lookup, cancellation, and rescheduling
- `/hospital/check-in?code=CHK-…` — arrival check-in pass
- `/hospital/kiosk` — walk-in reception / tablet flow
- `/hospital/board` — privacy-safe waiting-room display

The separate patient-facing hospital website is available at `/hospital-site/`. It has its own source, styles, package, and production build under `hospital-web/`, so it can later be deployed on the hospital's own domain without the MASystem marketing or staff navigation.

Copy `hospital-web/.env.example` to the deployment environment and set `VITE_HOSPITAL_NAME`, tagline, hospital contact number, and local emergency number when the final site identity is provided.

Staff use `/hospital` after sign-in for appointments, live queue controls, transfers, priority audit, scheduling blocks, metrics, and delivery history.

`/hospital/operations` provides nurse-reviewed triage, visit-stage handoffs (registration, vitals, consultation, laboratory, pharmacy, and billing), doctor-absence substitution/rebooking, and interoperability status. Triage is an operational aid only; hospitals must supply their approved emergency protocol and trained clinical staff remain responsible for disposition decisions.

## Configure each hospital

Open `/hospital/config` after sign-in and configure in this order:

1. Departments and campus/location.
2. Doctors, their department, consultation room, and default duration.
3. Weekly slot policies for each doctor: weekday, start/end time, slot duration, capacity, and service type.
4. Holiday and closure dates.

Production does not create a generic doctor roster or 9–5 calendar. A doctor is not publicly bookable until the hospital adds the doctor and at least one matching weekly slot policy. `HOSPITAL_DEMO_SEED=1` is reserved for automated tests and sandbox demonstrations.

## Notification provider

Notification events are durable before delivery. Set these server environment variables to deliver them through your approved SMS, WhatsApp, email, or integration service:

```bash
HOSPITAL_NOTIFICATION_WEBHOOK=https://provider.example/hospital-events
HOSPITAL_NOTIFICATION_TOKEN=provider-secret
HOSPITAL_PUBLIC_RATE_LIMIT=20
HOSPITAL_HMIS_WEBHOOK=https://hmis.example/fhir/appointments
HOSPITAL_HMIS_TOKEN=hmis-secret
HOSPITAL_ABDM_WEBHOOK=https://approved-abdm-gateway.example/appointments
HOSPITAL_ABDM_TOKEN=abdm-issued-secret
```

The webhook receives the event channel, event kind, body, destination, and booking code. Configure it to route `sms` to your approved SMS/WhatsApp provider and `email` to your email provider. Use `HOSPITAL_NOTIFICATION_TRANSPORT=mock` for safe non-delivery environments.

For production, place the public app behind HTTPS, replace the generic webhook with the hospital's approved messaging provider, configure OTP enforcement in the identity layer, and complete hospital-specific privacy, retention, consent, and incident-response reviews. HMIS and ABDM endpoints receive a FHIR R4 Appointment payload. ABDM/ABHA interoperability requires separate provider onboarding and credentials; the optional ABHA field alone is not a network integration.
