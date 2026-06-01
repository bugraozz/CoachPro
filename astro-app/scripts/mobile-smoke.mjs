const BASE_URL = String(process.env.MOBILE_API_BASE_URL || 'http://localhost:4321/api/mobile').replace(/\/+$/, '');

const ADMIN_EMAIL = 'admin@coach.com';
const COACH_EMAIL = 'coach@coach.com';
const STUDENT_EMAIL = 'student@coach.com';
const MOBILE_TEST_EMAIL = 'mobile-test@coach.com';

const DEFAULT_PASSWORD = 'password123';
const MOBILE_TEST_PASSWORD = 'StrongPass123!';
const MOBILE_TEST_PASSWORD_NEXT = 'StrongerPass123!';

const results = [];

function addResult(name, ok, details) {
  results.push({ name, ok, details: details ? String(details) : '' });
}

function buildUrl(path) {
  if (!path.startsWith('/')) {
    return `${BASE_URL}/${path}`;
  }
  return `${BASE_URL}${path}`;
}

async function requestJson(path, { method = 'GET', token, body, headers } = {}) {
  const url = buildUrl(path);
  const finalHeaders = { ...(headers || {}) };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const options = { method, headers: finalHeaders };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { response, status: response.status, ok: response.ok, json, text };
}

function assertStatus(result, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(result.status)) {
    const snippet = result.text ? result.text.slice(0, 200) : '';
    throw new Error(`${label} -> status ${result.status} ${snippet}`.trim());
  }
}

async function step(name, fn) {
  try {
    const data = await fn();
    addResult(name, true, data ? JSON.stringify(data).slice(0, 180) : '');
  } catch (error) {
    addResult(name, false, error && error.message ? error.message : String(error));
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let adminToken = '';
  let coachToken = '';
  let studentToken = '';
  let mobileTestToken = '';

  let coachUser = null;
  let studentUser = null;

  let createdStudentId = '';
  let createdProgramId = '';
  let createdDietId = '';
  let createdAnalysisId = '';

  let adminSnapshot = null;

  await step('auth login admin', async () => {
    const result = await requestJson('/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: DEFAULT_PASSWORD },
    });
    assertStatus(result, 200, 'admin login');
    adminToken = result.json?.token || '';
    if (!adminToken) {
      throw new Error('admin token missing');
    }
    return { userId: result.json?.user?.id };
  });

  await step('auth login coach', async () => {
    const result = await requestJson('/auth/login', {
      method: 'POST',
      body: { email: COACH_EMAIL, password: DEFAULT_PASSWORD },
    });
    assertStatus(result, 200, 'coach login');
    coachToken = result.json?.token || '';
    coachUser = result.json?.user || null;
    if (!coachToken || !coachUser) {
      throw new Error('coach token/user missing');
    }
    return { userId: coachUser.id, referralCode: coachUser.referralCode };
  });

  await step('auth login student', async () => {
    const result = await requestJson('/auth/login', {
      method: 'POST',
      body: { email: STUDENT_EMAIL, password: DEFAULT_PASSWORD },
    });
    assertStatus(result, 200, 'student login');
    studentToken = result.json?.token || '';
    studentUser = result.json?.user || null;
    if (!studentToken || !studentUser) {
      throw new Error('student token/user missing');
    }
    return { userId: studentUser.id };
  });

  await step('auth login mobile-test user', async () => {
    const result = await requestJson('/auth/login', {
      method: 'POST',
      body: { email: MOBILE_TEST_EMAIL, password: MOBILE_TEST_PASSWORD },
    });
    assertStatus(result, 200, 'mobile-test login');
    mobileTestToken = result.json?.token || '';
    if (!mobileTestToken) {
      throw new Error('mobile-test token missing');
    }
    return { userId: result.json?.user?.id };
  });

  let paymentAccessToken = '';
  let pendingCoachId = '';

  await step('register coach (payment pending)', async () => {
    const email = `mobile-coach-${Date.now()}@local.test`;
    const password = 'TempCoachPass123!';
    const result = await requestJson('/auth/register', {
      method: 'POST',
      body: {
        name: 'Mobile Coach',
        email,
        password,
        confirmPassword: password,
        role: 'coach',
      },
    });
    assertStatus(result, 201, 'coach register');
    if (!result.json?.requiresPayment) {
      throw new Error('expected requiresPayment=true');
    }
    paymentAccessToken = result.json?.paymentAccessToken || '';
    pendingCoachId = result.json?.user?.id || '';
    if (!paymentAccessToken || !pendingCoachId) {
      throw new Error('paymentAccessToken or userId missing');
    }
    return { userId: pendingCoachId };
  });

  await step('mobile checkout (mock) for coach subscription', async () => {
    const result = await requestJson('/payments/create-checkout-session', {
      method: 'POST',
      body: {
        userId: pendingCoachId,
        paymentToken: paymentAccessToken,
        subscriptionPlanId: 'monthly',
      },
    });
    assertStatus(result, 200, 'checkout session');
    if (!result.json?.url) {
      throw new Error('checkout url missing');
    }
    return { sessionId: result.json?.sessionId };
  });

  await step('dashboard coach', async () => {
    const result = await requestJson('/dashboard', { token: coachToken });
    assertStatus(result, 200, 'coach dashboard');
    return { role: result.json?.role };
  });

  await step('dashboard student', async () => {
    const result = await requestJson('/dashboard', { token: studentToken });
    assertStatus(result, 200, 'student dashboard');
    return { role: result.json?.role };
  });

  await step('update profile coach', async () => {
    const result = await requestJson('/user/update-profile', {
      method: 'POST',
      token: coachToken,
      body: {
        name: coachUser?.name || 'Test Coach',
        phone: '5550001122',
        gender: 'male',
        age: 30,
        height: 180,
        currentWeight: 82,
        targetWeight: 78,
        healthNotes: 'Seed profile update.',
      },
    });
    assertStatus(result, 200, 'update profile');
    return { userId: result.json?.user?.id };
  });

  await step('register notification token', async () => {
    const result = await requestJson('/notifications/register-token', {
      method: 'POST',
      token: coachToken,
      body: { token: `notif-${Date.now()}`, platform: 'ios' },
    });
    assertStatus(result, 200, 'register notification token');
    return result.json;
  });

  await step('register device token', async () => {
    const result = await requestJson('/user/device-token', {
      method: 'POST',
      token: coachToken,
      body: { token: `device-${Date.now()}`, platform: 'android' },
    });
    assertStatus(result, 200, 'register device token');
    return result.json;
  });

  await step('students list', async () => {
    const result = await requestJson('/students', { token: coachToken });
    assertStatus(result, 200, 'students list');
    return { count: Array.isArray(result.json?.students) ? result.json.students.length : 0 };
  });

  await step('students create', async () => {
    const result = await requestJson('/students', {
      method: 'POST',
      token: coachToken,
      body: {
        name: 'Smoke Student',
        email: `smoke-student-${Date.now()}@local.test`,
        phone: '5550002233',
        gender: 'female',
        age: 23,
        height: 165,
        currentWeight: 62,
        targetWeight: 58,
        healthNotes: 'Mobile smoke student.',
      },
    });
    assertStatus(result, 201, 'students create');
    createdStudentId = result.json?.student?.id || '';
    if (!createdStudentId) {
      throw new Error('student id missing');
    }
    return { studentId: createdStudentId };
  });

  await step('students get', async () => {
    const result = await requestJson(`/students/${createdStudentId}`, { token: coachToken });
    assertStatus(result, 200, 'students get');
    return { studentId: result.json?.id };
  });

  await step('students update', async () => {
    const result = await requestJson(`/students/${createdStudentId}`, {
      method: 'PUT',
      token: coachToken,
      body: {
        name: 'Smoke Student Updated',
        email: `smoke-student-${Date.now()}@local.test`,
        phone: '5550003344',
        gender: 'female',
        age: 24,
        height: 166,
        currentWeight: 61,
        targetWeight: 57,
        healthNotes: 'Updated from mobile smoke.',
        active: true,
      },
    });
    assertStatus(result, 200, 'students update');
    return { studentId: result.json?.id };
  });

  await step('students delete', async () => {
    const result = await requestJson(`/students/${createdStudentId}`, {
      method: 'DELETE',
      token: coachToken,
    });
    assertStatus(result, 200, 'students delete');
    return result.json;
  });

  await step('programs create', async () => {
    const result = await requestJson('/programs', {
      method: 'POST',
      token: coachToken,
      body: {
        studentId: studentUser?.id,
        name: 'Smoke Program',
        category: 'Fitness',
        days: [
          {
            dayName: 'Day 1',
            order: 1,
            exercises: [
              {
                name: 'Squat',
                muscleGroup: 'Legs',
                sets: 3,
                reps: '10',
                weight: 60,
                restSeconds: 90,
                notes: 'Keep form',
                order: 1,
              },
            ],
          },
        ],
      },
    });
    assertStatus(result, 201, 'programs create');
    createdProgramId = result.json?.id || '';
    if (!createdProgramId) {
      throw new Error('program id missing');
    }
    return { programId: createdProgramId };
  });

  await step('programs list coach', async () => {
    const result = await requestJson('/programs', { token: coachToken });
    assertStatus(result, 200, 'programs list coach');
    return { count: Array.isArray(result.json?.programs) ? result.json.programs.length : 0 };
  });

  await step('programs list student', async () => {
    const result = await requestJson('/programs', { token: studentToken });
    assertStatus(result, 200, 'programs list student');
    return { count: Array.isArray(result.json?.programs) ? result.json.programs.length : 0 };
  });

  await step('programs get', async () => {
    const result = await requestJson(`/programs/${createdProgramId}`, { token: coachToken });
    assertStatus(result, 200, 'programs get');
    return { programId: result.json?.id };
  });

  await step('programs update', async () => {
    const result = await requestJson(`/programs/${createdProgramId}`, {
      method: 'PUT',
      token: coachToken,
      body: {
        name: 'Smoke Program Updated',
        category: 'Fitness',
        status: 'active',
        days: [
          {
            dayName: 'Day 1',
            order: 1,
            exercises: [
              {
                name: 'Bench Press',
                muscleGroup: 'Chest',
                sets: 4,
                reps: '8',
                weight: 50,
                restSeconds: 120,
                notes: 'Controlled',
                order: 1,
              },
            ],
          },
        ],
      },
    });
    assertStatus(result, 200, 'programs update');
    return { programId: result.json?.id };
  });

  await step('diet create', async () => {
    const result = await requestJson('/diet', {
      method: 'POST',
      token: coachToken,
      body: {
        studentId: studentUser?.id,
        name: 'Smoke Diet',
        dailyCalorieTarget: 2200,
        proteinTarget: 160,
        carbsTarget: 200,
        fatTarget: 70,
        waterTarget: 2800,
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            foods: [
              {
                name: 'Oats',
                amount: 80,
                unit: 'g',
                calories: 300,
                protein: 10,
                carbs: 50,
                fat: 5,
              },
            ],
          },
        ],
      },
    });
    assertStatus(result, 201, 'diet create');
    createdDietId = result.json?.id || '';
    if (!createdDietId) {
      throw new Error('diet id missing');
    }
    return { dietId: createdDietId };
  });

  await step('diet list coach', async () => {
    const result = await requestJson('/diet', { token: coachToken });
    assertStatus(result, 200, 'diet list coach');
    return { count: Array.isArray(result.json?.dietPlans) ? result.json.dietPlans.length : 0 };
  });

  await step('diet list student', async () => {
    const result = await requestJson('/diet', { token: studentToken });
    assertStatus(result, 200, 'diet list student');
    return { count: Array.isArray(result.json?.dietPlans) ? result.json.dietPlans.length : 0 };
  });

  await step('diet get', async () => {
    const result = await requestJson(`/diet/${createdDietId}`, { token: coachToken });
    assertStatus(result, 200, 'diet get');
    return { dietId: result.json?.id };
  });

  await step('diet update', async () => {
    const result = await requestJson(`/diet/${createdDietId}`, {
      method: 'PUT',
      token: coachToken,
      body: {
        name: 'Smoke Diet Updated',
        dailyCalorieTarget: 2100,
        proteinTarget: 150,
        carbsTarget: 190,
        fatTarget: 65,
        waterTarget: 2700,
        meals: [
          {
            name: 'Lunch',
            order: 1,
            foods: [
              {
                name: 'Chicken',
                amount: 200,
                unit: 'g',
                calories: 330,
                protein: 60,
                carbs: 0,
                fat: 8,
              },
            ],
          },
        ],
      },
    });
    assertStatus(result, 200, 'diet update');
    return { dietId: result.json?.id };
  });

  await step('messages send (coach -> student)', async () => {
    const result = await requestJson('/messages', {
      method: 'POST',
      token: coachToken,
      body: { receiverId: studentUser?.id, content: 'Merhaba, test mesajı.' },
    });
    assertStatus(result, 201, 'messages send coach');
    return { messageId: result.json?.message?.id };
  });

  await step('messages list coach conversation', async () => {
    const result = await requestJson(`/messages?contactId=${studentUser?.id}`, { token: coachToken });
    assertStatus(result, 200, 'messages list coach conversation');
    return { count: Array.isArray(result.json?.messages) ? result.json.messages.length : 0 };
  });

  await step('messages list student contacts', async () => {
    const result = await requestJson('/messages', { token: studentToken });
    assertStatus(result, 200, 'messages list student contacts');
    return { count: Array.isArray(result.json?.contacts) ? result.json.contacts.length : 0 };
  });

  await step('messages get student conversation', async () => {
    const result = await requestJson(`/messages/${coachUser?.id}`, { token: studentToken });
    assertStatus(result, 200, 'messages get student conversation');
    return { count: Array.isArray(result.json?.messages) ? result.json.messages.length : 0 };
  });

  await step('messages send (student -> coach)', async () => {
    const result = await requestJson(`/messages/${coachUser?.id}`, {
      method: 'POST',
      token: studentToken,
      body: { content: 'Tesekkurler, mesaj alindi.' },
    });
    assertStatus(result, 201, 'messages send student');
    return { messageId: result.json?.message?.id };
  });

  await step('analysis upload (coach for student)', async () => {
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X9aQAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(pngBase64, 'base64');
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('file', blob, 'tiny.png');
    formData.append('analysisType', 'front');
    formData.append('studentId', studentUser?.id || '');

    const result = await requestJson('/analysis', {
      method: 'POST',
      token: coachToken,
      body: formData,
    });
    assertStatus(result, 201, 'analysis upload');
    createdAnalysisId = result.json?.analysis?.id || '';
    if (!createdAnalysisId) {
      throw new Error('analysis id missing');
    }
    return { analysisId: createdAnalysisId };
  });

  await step('analysis list student', async () => {
    const result = await requestJson('/analysis', { token: studentToken });
    assertStatus(result, 200, 'analysis list student');
    return { count: Array.isArray(result.json?.analyses) ? result.json.analyses.length : 0 };
  });

  await step('notifications list coach', async () => {
    const result = await requestJson('/notifications', { token: coachToken });
    assertStatus(result, 200, 'notifications list');
    const notifications = Array.isArray(result.json?.notifications) ? result.json.notifications : [];
    return { unread: result.json?.unread || 0, count: notifications.length };
  });

  await step('notifications mark read (if any)', async () => {
    const result = await requestJson('/notifications', { token: coachToken });
    assertStatus(result, 200, 'notifications list');
    const notifications = Array.isArray(result.json?.notifications) ? result.json.notifications : [];
    if (!notifications.length) {
      return { skipped: true };
    }

    const ids = notifications.slice(0, 3).map((item) => item.id).filter(Boolean);
    if (!ids.length) {
      return { skipped: true };
    }

    const markResult = await requestJson('/notifications/mark-read', {
      method: 'POST',
      token: coachToken,
      body: { ids },
    });
    assertStatus(markResult, 200, 'notifications mark read');
    return { marked: ids.length };
  });

  await step('analysis delete', async () => {
    const result = await requestJson(`/analysis/${createdAnalysisId}`, {
      method: 'DELETE',
      token: coachToken,
    });
    assertStatus(result, 200, 'analysis delete');
    return result.json;
  });

  await step('programs delete', async () => {
    const result = await requestJson(`/programs/${createdProgramId}`, {
      method: 'DELETE',
      token: coachToken,
    });
    assertStatus(result, 200, 'programs delete');
    return result.json;
  });

  await step('diet delete', async () => {
    const result = await requestJson(`/diet/${createdDietId}`, {
      method: 'DELETE',
      token: coachToken,
    });
    assertStatus(result, 200, 'diet delete');
    return result.json;
  });

  await step('password change mobile-test (forward)', async () => {
    const result = await requestJson('/user/change-password', {
      method: 'POST',
      token: mobileTestToken,
      body: {
        currentPassword: MOBILE_TEST_PASSWORD,
        newPassword: MOBILE_TEST_PASSWORD_NEXT,
        confirmPassword: MOBILE_TEST_PASSWORD_NEXT,
      },
    });
    assertStatus(result, 200, 'password change forward');
    return result.json;
  });

  await step('password change mobile-test (back)', async () => {
    const result = await requestJson('/user/change-password', {
      method: 'POST',
      token: mobileTestToken,
      body: {
        currentPassword: MOBILE_TEST_PASSWORD_NEXT,
        newPassword: MOBILE_TEST_PASSWORD,
        confirmPassword: MOBILE_TEST_PASSWORD,
      },
    });
    assertStatus(result, 200, 'password change back');
    return result.json;
  });

  await step('admin get', async () => {
    const result = await requestJson('/admin', { token: adminToken });
    assertStatus(result, 200, 'admin get');
    adminSnapshot = result.json || null;
    return { isSuperAdmin: result.json?.isSuperAdmin };
  });

  await step('admin save subscription plans', async () => {
    const plans = Array.isArray(adminSnapshot?.coachPlans) ? adminSnapshot.coachPlans : [];
    const monthly = plans.find((plan) => plan.id === 'monthly');
    const yearly = plans.find((plan) => plan.id === 'yearly');

    const result = await requestJson('/admin', {
      method: 'POST',
      token: adminToken,
      body: {
        action: 'save_subscription_plans',
        monthlyPrice: monthly?.price ?? 299,
        yearlyPrice: yearly?.price ?? 2990,
      },
    });
    assertStatus(result, 200, 'admin save subscription plans');
    return result.json;
  });

  await step('admin save plan discounts', async () => {
    const discounts = adminSnapshot?.coachPlanDiscounts || {};
    const result = await requestJson('/admin', {
      method: 'POST',
      token: adminToken,
      body: {
        action: 'save_subscription_plan_discounts',
        monthlyEnabled: Boolean(discounts?.monthly?.enabled),
        monthlyAmount: Number(discounts?.monthly?.amount || 0),
        yearlyEnabled: Boolean(discounts?.yearly?.enabled),
        yearlyAmount: Number(discounts?.yearly?.amount || 0),
      },
    });
    assertStatus(result, 200, 'admin save plan discounts');
    return result.json;
  });

  await step('admin save global discount', async () => {
    const globalDiscount = adminSnapshot?.globalCoachDiscount || { enabled: false, amount: 0 };
    const result = await requestJson('/admin', {
      method: 'POST',
      token: adminToken,
      body: {
        action: 'save_global_discount',
        enabled: Boolean(globalDiscount.enabled),
        amount: Number(globalDiscount.amount || 0),
      },
    });
    assertStatus(result, 200, 'admin save global discount');
    return result.json;
  });

  await step('admin save platform payout profile', async () => {
    const profile = adminSnapshot?.platformPayoutProfile || { subMerchantType: 'PERSONAL' };
    const result = await requestJson('/admin', {
      method: 'POST',
      token: adminToken,
      body: {
        action: 'save_platform_payout_profile',
        subMerchantType: profile.subMerchantType || 'PERSONAL',
        identityNumber: profile.identityNumber ?? null,
        iban: profile.iban ?? null,
        address: profile.address ?? null,
        city: profile.city ?? null,
        zipCode: profile.zipCode ?? null,
        taxOffice: profile.taxOffice ?? null,
        legalCompanyTitle: profile.legalCompanyTitle ?? null,
        contactPhone: profile.contactPhone ?? null,
        contactName: profile.contactName ?? null,
        contactSurname: profile.contactSurname ?? null,
        subMerchantKey: profile.subMerchantKey ?? null,
        subMerchantExternalId: profile.subMerchantExternalId ?? null,
        subMerchantStatus: profile.subMerchantStatus ?? null,
        payoutReadyAt: profile.payoutReadyAt ?? null,
        lastSyncAt: profile.lastSyncAt ?? null,
        lastError: profile.lastError ?? null,
      },
    });
    assertStatus(result, 200, 'admin save platform payout profile');
    return result.json;
  });

  await step('admin invite create+revoke', async () => {
    const inviteResult = await requestJson('/admin', {
      method: 'POST',
      token: adminToken,
      body: {
        action: 'create_admin_invite',
        email: COACH_EMAIL,
        role: 'admin',
      },
    });
    assertStatus(inviteResult, 200, 'admin invite create');
    const inviteId = inviteResult.json?.invite?.id || '';
    if (!inviteId) {
      throw new Error('inviteId missing');
    }

    const revokeResult = await requestJson('/admin', {
      method: 'POST',
      token: adminToken,
      body: {
        action: 'revoke_admin_invite',
        inviteId,
      },
    });
    assertStatus(revokeResult, 200, 'admin invite revoke');
    return { inviteId };
  });

  await step('admin toggle maintenance (on/off)', async () => {
    const current = adminSnapshot?.maintenanceMode || { enabled: false, message: '' };
    const enableResult = await requestJson('/admin', {
      method: 'POST',
      token: adminToken,
      body: {
        action: 'toggle_maintenance_mode',
        enabled: !current.enabled,
        message: current.message || 'Maintenance smoke test',
      },
    });
    assertStatus(enableResult, 200, 'maintenance toggle on');

    await delay(200);

    const disableResult = await requestJson('/admin', {
      method: 'POST',
      token: adminToken,
      body: {
        action: 'toggle_maintenance_mode',
        enabled: current.enabled,
        message: current.message || 'Maintenance smoke test',
      },
    });
    assertStatus(disableResult, 200, 'maintenance toggle off');
    return { enabled: current.enabled };
  });

  const failures = results.filter((item) => !item.ok);

  for (const item of results) {
    const status = item.ok ? 'PASS' : 'FAIL';
    const details = item.details ? ` | ${item.details}` : '';
    console.log(`${status} ${item.name}${details}`);
  }

  if (failures.length > 0) {
    console.error(`\nFAILED: ${failures.length} step(s).`);
    process.exitCode = 1;
  } else {
    console.log('\nALL MOBILE SMOKE TESTS PASSED.');
  }
}

main().catch((error) => {
  console.error('Mobile smoke script failed:', error);
  process.exitCode = 1;
});
