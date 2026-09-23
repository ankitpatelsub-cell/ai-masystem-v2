import { expect, test } from '@playwright/test';

async function login(page) {
  await page.goto('/login');
  await page.getByPlaceholder('username').fill('admin');
  await page.getByPlaceholder('password').fill('ShreeAuto@2026');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await expect(page.getByRole('heading', { name: /command center/i })).toBeVisible();
}

async function openWorkspace(page, label) {
  const link = page.locator('.nav a', { hasText: label });
  await link.scrollIntoViewIfNeeded();
  await link.click();
}

test('visitor can try the hospital demo and request a tailored walkthrough', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Try hospital demo/i }).click();
  await page.getByRole('button', { name: /Run hospital demo/i }).click();
  await expect(page.getByText(/demo token/i)).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-demo.png', fullPage: true });
  await page.getByLabel('Your name').fill('Dr. Priya Shah');
  await page.getByLabel('Work email').fill('priya@example.com');
  await page.getByLabel('Hospital or clinic').fill('Sunrise Clinic');
  await page.getByRole('button', { name: /Request hospital demo/i }).click();
  await expect(page.getByText(/Thanks — our team will contact you/i)).toBeVisible();
});

test('separate hospital website supports the complete public patient journey', async ({ page }) => {
  await page.goto('/hospital-site/');
  await expect(page.getByRole('heading', { name: /Care that respects/i })).toBeVisible();
  await expect(page.getByText('Your Hospital').first()).toBeVisible();
  await page.getByLabel('Find care').fill('Cardiology');
  await expect(page.getByText('Dr. Neha Iyer')).toBeVisible();
  await page.getByRole('button', { name: 'A+ text' }).click();
  await expect(page.getByRole('button', { name: 'A+ text' })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'artifacts/playwright/hospital-site-home.png', fullPage: true });
  await page.getByRole('link', { name: 'Book an appointment' }).click();
  await expect(page.getByRole('heading', { name: 'Book an appointment' })).toBeVisible();
  await page.locator('.slots button:not([disabled])').first().click();
  await page.getByLabel('Site patient name').fill('Standalone Site Patient');
  await page.getByLabel('Site patient phone').fill('7444444444');
  await page.getByLabel('Notification preference').selectOption('email');
  await page.getByLabel('Consultation mode').selectOption('video');
  await page.getByLabel('Consent to booking privacy notice').check();
  await page.getByRole('button', { name: 'Confirm appointment' }).click();
  await expect(page.getByRole('heading', { name: 'Appointment confirmed' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-site-booking.png', fullPage: true });
  await page.getByRole('main').getByRole('link', { name: 'Securely manage visit' }).click();
  await expect(page.getByRole('heading', { name: 'Manage your visit' })).toBeVisible();
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await expect(page.getByText(/Demo verification code:.*123456/)).toBeVisible();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify and open' }).click();
  await expect(page.getByRole('heading', { name: 'Pre-visit information' })).toBeVisible();
  await page.getByLabel('Current medicines').fill('Vitamin D');
  await page.getByRole('button', { name: 'Send to care team' }).click();
  await expect(page.getByRole('status')).toContainText('Saved successfully');
  await page.getByLabel('Patient document').setInputFiles({ name: 'referral.pdf', mimeType: 'application/pdf', buffer: Buffer.from('demo referral') });
  await expect(page.getByText(/referral.pdf/)).toBeVisible();
  await page.getByRole('button', { name: 'Open secure payment' }).click();
  await expect(page.getByRole('status')).toContainText('approved payment provider');
  await page.locator('.portal-card .slots button:not([disabled])').first().click();
  await page.getByRole('button', { name: 'Reschedule securely' }).click();
  await expect(page.getByRole('status')).toContainText('Saved successfully');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/playwright/hospital-site-secure-portal.png' });
  await page.goto('/hospital-site/kiosk');
  await expect(page.getByRole('heading', { name: 'Walk-in check-in' })).toBeVisible();
  await page.goto('/hospital-site/board');
  await expect(page.getByRole('heading', { name: 'Now serving' })).toBeVisible();
  await page.goto('/hospital-site/staff/login');
  await page.getByLabel('Staff username').fill('admin');
  await page.getByLabel('Staff password').fill('ShreeAuto@2026');
  await page.getByRole('button', { name: 'Sign in to staff portal' }).click();
  await expect(page.getByRole('heading', { name: 'Care operations' })).toBeVisible();
  await expect(page.getByText('Standalone Site Patient')).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-site-staff-portal.png', fullPage: true });
});

test('visitor can book and check in for a hospital appointment', async ({ page }) => {
  await page.goto('/hospital/book');
  await expect(page.getByLabel('Doctor')).toBeVisible();
  await expect(page.locator('button.chip:not([disabled])').first()).toBeVisible();
  await page.locator('button.chip:not([disabled])').first().click();
  await page.getByLabel('Patient name').fill('Playwright Patient');
  await page.getByLabel('Patient phone').fill('9999999999');
  await page.getByLabel('Reason for visit').fill('Routine consultation');
  await page.getByRole('button', { name: /Confirm appointment/i }).click();
  await expect(page.getByText(/Appointment confirmed/i)).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-booking-confirmed.png', fullPage: true });
  await page.getByRole('link', { name: /Open check-in pass/i }).click();
  await expect(page.getByAltText('Check-in QR code')).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-checkin-qr.png', fullPage: true });
  await page.getByRole('button', { name: /Check in now/i }).click();
  await expect(page.getByText(/Queue number/i)).toBeVisible();
});

test('patient self-service, kiosk check-in, and privacy-safe waiting board work', async ({ page }) => {
  await page.goto('/hospital/book');
  await page.locator('button.chip:not([disabled])').first().click();
  await page.getByLabel('Patient name').fill('Self Service Browser');
  await page.getByLabel('Patient phone').fill('8888888888');
  await page.getByRole('button', { name: /Confirm appointment/i }).click();
  await page.getByRole('link', { name: /Manage visit/i }).click();
  await expect(page.getByRole('heading', { name: /Manage your visit/i })).toBeVisible();
  await expect(page.getByText('Self Service Browser')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your appointment' })).toBeVisible();

  await page.goto('/hospital/kiosk');
  await page.getByLabel('Kiosk patient name').fill('Kiosk Browser');
  await page.getByLabel('Kiosk phone').fill('7777777777');
  await page.getByLabel('Kiosk reason').fill('Walk-in consultation');
  await page.getByRole('button', { name: /Get queue number/i }).click();
  await expect(page.getByText(/You are checked in/i)).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-kiosk-pass.png', fullPage: true });

  await page.goto('/hospital/board');
  await expect(page.getByRole('heading', { name: /Now serving/i })).toBeVisible();
  await expect(page.getByText(/Patient names are never shown/i)).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-waiting-board.png', fullPage: true });
});

test('staff can call and complete a checked-in appointment', async ({ page }) => {
  await login(page); await openWorkspace(page, 'Hospital');
  await expect(page.getByRole('table').getByText('Playwright Patient')).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-staff-queue.png', fullPage: true });
  await page.getByRole('button', { name: 'Call' }).first().click();
  await expect(page.getByText(/Patient called/i)).toBeVisible();
  await page.getByRole('button', { name: 'Complete' }).first().click();
  await expect(page.getByText(/Consultation completed/i)).toBeVisible();
});

test('staff can configure a hospital-specific department, doctor, room, policy, and closure', async ({ page }) => {
  await login(page); await page.goto('/hospital/config');
  await expect(page.getByRole('heading', { name: /Hospital configuration/i })).toBeVisible();
  await page.getByLabel('Department name').fill('Diagnostics');
  await page.getByLabel('Department location').fill('East Campus');
  await page.getByRole('button', { name: 'Add department' }).click();
  await expect(page.getByLabel('Configured department').locator('option', { hasText: 'Diagnostics' })).toHaveCount(1);
  await page.getByLabel('Configured doctor name').fill('Dr. Configured');
  await page.getByLabel('Configured specialty').fill('Diagnostics');
  await page.getByLabel('Configured department').selectOption({ label: 'Diagnostics' });
  await page.getByLabel('Configured room').fill('Room D-12');
  await page.getByRole('button', { name: 'Add doctor' }).click();
  await expect(page.locator('.feed-item b', { hasText: 'Dr. Configured' })).toBeVisible();
  await page.getByLabel('Policy doctor').selectOption({ label: 'Dr. Configured · Room D-12' });
  await page.getByLabel('Policy start time').fill('10:00');
  await page.getByLabel('Policy end time').fill('12:00');
  await page.getByLabel('Policy duration').fill('30');
  await page.getByRole('button', { name: 'Add policy' }).click();
  await expect(page.getByText(/10:00–12:00/)).toBeVisible();
  await page.getByLabel('Holiday date').fill('2027-01-01');
  await page.getByLabel('Holiday name').fill('New Year closure');
  await page.getByRole('button', { name: 'Add closure' }).click();
  await expect(page.getByText('New Year closure')).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-configuration.png', fullPage: true });
});

test('staff can triage, advance visit stages, record absence, and inspect integration readiness', async ({ page }) => {
  const doctors = await (await page.request.get('/api/hospital/public/doctors')).json();
  const date = new Date().toISOString().slice(0,10);
  const slots = await (await page.request.get(`/api/hospital/public/slots?doctorId=${doctors[0].id}&date=${date}`)).json();
  const bookingResponse = await page.request.post('/api/hospital/public/bookings', { data: { patientName: 'Care Ops Browser', phone: '7555555555', doctorId: doctors[0].id, slotId: slots.find(slot => slot.available > 0).id } });
  const booking = await bookingResponse.json();
  await page.request.post(`/api/hospital/public/bookings/${booking.appointment.checkin_code}/check-in`);
  await login(page); await page.goto('/hospital/operations');
  await expect(page.getByRole('heading', { name: /Care operations/i })).toBeVisible();
  const careOption = page.getByLabel('Operations appointment').locator('option', { hasText: 'Care Ops Browser' });
  await expect(careOption).toHaveCount(1);
  await page.getByLabel('Operations appointment').selectOption(await careOption.getAttribute('value'));
  await page.getByLabel('Triage disposition').selectOption('nurse_review');
  await page.getByLabel('Chest pain').check();
  await page.getByLabel('Triage note').fill('Nurse review requested by Playwright.');
  await page.getByRole('button', { name: 'Record triage' }).click();
  await expect(page.getByText(/Triage recorded: nurse review/i)).toBeVisible();
  const vitals = page.locator('.feed-item', { hasText: 'Vitals' });
  await vitals.getByRole('button', { name: 'Start' }).click();
  await expect(vitals.getByText('in_progress')).toBeVisible();
  await vitals.getByRole('button', { name: 'Complete' }).click();
  await expect(vitals.getByText('completed')).toBeVisible();
  const lab = page.locator('.feed-item', { hasText: 'Laboratory' });
  await lab.getByRole('button', { name: 'Require' }).click();
  await expect(lab.getByText('waiting')).toBeVisible();
  await page.getByLabel('Absence start').fill('2027-02-01T09:00');
  await page.getByLabel('Absence end').fill('2027-02-01T17:00');
  await page.getByLabel('Absence reason').fill('Approved leave');
  await page.getByRole('button', { name: /Save absence & rebook/i }).click();
  await expect(page.getByText(/Absence saved:/i)).toBeVisible();
  await page.getByRole('button', { name: 'Preview FHIR' }).click();
  await expect(page.getByLabel('FHIR appointment preview')).toContainText('"resourceType": "Appointment"');
  await page.getByRole('button', { name: 'Sync HMIS' }).click();
  await expect(page.getByText(/HMIS integration is not configured/i)).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/hospital-care-operations.png', fullPage: true });
});

test('admin can navigate every workspace and capture the dashboard', async ({ page }) => {
  await login(page);
  await expect(page.getByText(/agents online/i)).toBeVisible();
  await page.screenshot({ path: 'artifacts/playwright/dashboard.png', fullPage: true });

  const workspaces = [
    ['Car Sales', /Car Sales Agent/], ['Hospital', /Hospital Booking & Queue/], ['Hotel', /Hotel Booking Agent/],
    ['Manager', /Manager \(Call Agent\)/], ['Back-Office', /Back-Office AI/], ['Reels', /Reels Studio/],
    ['Leads', /^📥 Leads$/], ['SDR Outreach', /SDR Outreach/], ['Reminders', /Reminders/],
    ['Reviews', /Reviews/], ['Translate', /Translate/], ['Billing', /Billing/], ['Analytics', /Analytics/],
    ['Users', /Users/], ['Roles', /Roles & Permissions/], ['Settings', /Settings/],
  ];
  for (const [label, heading] of workspaces) {
    await openWorkspace(page, label);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('all dashboard actions complete safely in test mode', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);

  await openWorkspace(page, 'Back-Office');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.locator('.bubble')).toContainText(/Test agent response/i);

  await openWorkspace(page, 'Leads');
  await page.getByRole('button', { name: /Sync real leads/i }).click();
  await expect(page.getByText(/Maps sync done/i)).toBeVisible();
  await page.getByRole('button', { name: /Score & prioritize/i }).click();
  await expect(page.getByText(/Scoring done/i)).toBeVisible();
  await page.getByRole('button', { name: '✍️ Personal' }).first().click();
  await expect(page.getByText(/personalized draft/i)).toBeVisible();
  await page.getByRole('button', { name: '🧠 Summarize' }).first().click();
  await expect(page.getByText(/summary:/i)).toBeVisible();
  await page.getByRole('button', { name: '✉️ Send' }).first().click();
  await expect(page.getByText(/sent:/i)).toBeVisible();
  await page.getByRole('button', { name: /Sync real leads/i }).click();
  await expect(page.getByText(/Maps sync done/i)).toBeVisible();
  await page.getByRole('button', { name: /Score & prioritize/i }).click();
  await expect(page.getByText(/Scoring done/i)).toBeVisible();

  await openWorkspace(page, 'SDR Outreach');
  await page.getByRole('button', { name: /Draft top 3/i }).click();
  await expect(page.getByText(/Drafted \d+ emails/i)).toBeVisible();
  await page.getByRole('button', { name: '✉️ Send' }).first().click();
  await expect(page.getByText(/sent:/i)).toBeVisible();

  await openWorkspace(page, 'Reminders');
  page.once('dialog', dialog => dialog.accept('Demo Patient'));
  await page.getByRole('button', { name: /Add appointment/i }).click();
  await expect(page.getByText('Demo Patient')).toBeVisible();
  await page.locator('tbody').getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/mock delivery accepted/i)).toBeVisible();
  await page.getByRole('button', { name: /Send due reminders/i }).click();
  await expect(page.getByText(/Sent \d+ reminders/i)).toBeVisible();

  await openWorkspace(page, 'Reviews');
  page.once('dialog', dialog => dialog.accept('Demo Hospital'));
  await page.getByRole('button', { name: /Add review/i }).click();
  await expect(page.getByText('Demo Hospital')).toBeVisible();
  await page.getByRole('button', { name: /Respond/i }).click();
  await expect(page.getByText(/Test agent response/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Draft all pending/i }).click();
  await expect(page.getByText(/Drafted \d+\./i)).toBeVisible();

  await openWorkspace(page, 'Translate');
  await page.getByRole('button', { name: /Translate/i }).click();
  await expect(page.getByText(/Test agent response/i)).toBeVisible();
  await page.getByRole('button', { name: /Detect language/i }).click();
  await expect(page.getByText(/detected:/i)).toBeVisible();

  await openWorkspace(page, 'Billing');
  let billingPrompt = 0;
  const fillBillingPrompt = dialog => dialog.accept(billingPrompt++ === 0 ? 'Demo Hospital' : '15000');
  page.on('dialog', fillBillingPrompt);
  await page.getByRole('button', { name: /New invoice/i }).click();
  page.off('dialog', fillBillingPrompt);
  await expect(page.getByText('Demo Hospital')).toBeVisible();
  await page.getByRole('button', { name: 'Remind' }).click();
  await expect(page.getByText(/mock delivery accepted/i)).toBeVisible();

  await openWorkspace(page, 'Users');
  await page.getByPlaceholder('username').fill('playwright-user');
  await page.getByPlaceholder('password').fill('Playwright@123');
  await page.getByRole('button', { name: 'Create' }).click();
  const userRow = page.locator('tr', { hasText: 'playwright-user' });
  await expect(userRow).toBeVisible();
  await userRow.locator('select').selectOption('viewer');
  await userRow.getByRole('button', { name: 'Remove' }).click();
  await expect(userRow).toHaveCount(0);

  await openWorkspace(page, 'Roles');
  const viewerPermission = page.locator('tr', { hasText: 'backoffice:run' }).locator('input[type="checkbox"]').nth(2);
  const before = await viewerPermission.isChecked();
  await viewerPermission.click();
  await expect(viewerPermission).toHaveJSProperty('checked', !before);
  await viewerPermission.click();
  await expect(viewerPermission).toHaveJSProperty('checked', before);

  await openWorkspace(page, 'Settings');
  await page.getByRole('button', { name: /Codex/i }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/Signed in as/i)).toBeVisible();

  await openWorkspace(page, 'Analytics');
  await expect(page.getByText('Total leads')).toBeVisible();
});

test('core agent and lead workflows complete in test mode', async ({ page }) => {
  await login(page);

  for (const [nav, message] of [
    ['Car Sales', 'on-road price of Creta 12 lakh'],
    ['Hospital', 'My name is Test Patient, fever since morning'],
    ['Hotel', 'I want a deluxe room for 2 nights'],
    ['Manager', 'patient wants appointment'],
  ]) {
    await page.locator('.nav a', { hasText: nav }).click();
    await page.locator('textarea').fill(message);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('.thread .msg')).toHaveCount(2);
  }

  await page.locator('.nav a', { hasText: 'Reels' }).click();
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.locator('.bubble')).toContainText(/Mode:/);

  await page.locator('.nav a', { hasText: 'Leads' }).click();
  await page.getByRole('button', { name: /Sync real leads/i }).click();
  await expect(page.getByText(/Maps sync done/i)).toBeVisible();
  await expect(page.getByRole('button', { name: '✍️ Personal' }).first()).toBeVisible();
  await page.getByRole('button', { name: '✍️ Personal' }).first().click();
  await expect(page.getByText(/personalized draft/i)).toBeVisible();

  await page.locator('.nav a', { hasText: 'Translate' }).click();
  await page.getByRole('button', { name: /Detect language/i }).click();
  await expect(page.getByText(/detected:/i)).toBeVisible();
});
