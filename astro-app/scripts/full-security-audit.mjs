#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const baseUrl = (process.env.SECURITY_AUDIT_BASE_URL || 'http://localhost:4321').replace(/\/+$/, '');
const origin = process.env.SECURITY_AUDIT_ORIGIN || baseUrl;

const QA_USERS = {
  coach: {
    email: 'qa.coach.audit@example.com',
    name: 'QA Coach',
    role: 'coach',
    sessionToken: 'qa_coach_session_token_0001',
  },
  studentOwned: {
    email: 'qa.student.audit@example.com',
    name: 'QA Student Owned',
    role: 'student',
    sessionToken: 'qa_student_session_token_0001',
  },
  studentOther: {
    email: 'qa.student.other@example.com',
    name: 'QA Student Other',
    role: 'student',
    sessionToken: 'qa_student_session_token_0002',
  },
};

const QA_PASSWORD_HASH = '$2b$12$k9UEVfTk1lA7Y21Yhx9v9OP1LQDgY17M2E4WQxHyfKVJkQW8C9sNq';

const results = [];

function buildSessionCookie(token) {
  return `session_token=${token}`;
}

function buildUrl(pathname) {
  return `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

async function sendRequest({ name, method, path, headers = {}, body, expected }) {
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  let payload;
  if (body !== undefined) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let status = -1;
  let text = '';

  try {
    const response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      body: payload,
      redirect: 'manual',
    });

    status = response.status;
    text = await response.text();
  } catch (error) {
    text = error instanceof Error ? error.message : String(error);
  }

  const pass = expected.includes(status);
  const bodySnippet = text.length > 300 ? `${text.slice(0, 300)}...` : text;

  results.push({
    name,
    method,
    path,
    expected: expected.join(','),
    status,
    pass,
    bodySnippet,
  });

  return { status, text, pass };
}

async function ensureQaData() {
  const prisma = new PrismaClient();

  try {
    const coach = await prisma.user.upsert({
      where: { email: QA_USERS.coach.email },
      update: {
        name: QA_USERS.coach.name,
        role: QA_USERS.coach.role,
        password: QA_PASSWORD_HASH,
        active: true,
      },
      create: {
        email: QA_USERS.coach.email,
        name: QA_USERS.coach.name,
        role: QA_USERS.coach.role,
        password: QA_PASSWORD_HASH,
        active: true,
      },
      select: { id: true, email: true },
    });

    const studentOwned = await prisma.user.upsert({
      where: { email: QA_USERS.studentOwned.email },
      update: {
        name: QA_USERS.studentOwned.name,
        role: QA_USERS.studentOwned.role,
        coachId: coach.id,
        password: QA_PASSWORD_HASH,
        active: true,
      },
      create: {
        email: QA_USERS.studentOwned.email,
        name: QA_USERS.studentOwned.name,
        role: QA_USERS.studentOwned.role,
        coachId: coach.id,
        password: QA_PASSWORD_HASH,
        active: true,
      },
      select: { id: true, email: true },
    });

    const studentOther = await prisma.user.upsert({
      where: { email: QA_USERS.studentOther.email },
      update: {
        name: QA_USERS.studentOther.name,
        role: QA_USERS.studentOther.role,
        coachId: null,
        password: QA_PASSWORD_HASH,
        active: true,
      },
      create: {
        email: QA_USERS.studentOther.email,
        name: QA_USERS.studentOther.name,
        role: QA_USERS.studentOther.role,
        coachId: null,
        password: QA_PASSWORD_HASH,
        active: true,
      },
      select: { id: true, email: true },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.upsert({
      where: { token: QA_USERS.coach.sessionToken },
      update: { userId: coach.id, expiresAt },
      create: {
        userId: coach.id,
        token: QA_USERS.coach.sessionToken,
        expiresAt,
      },
    });

    await prisma.session.upsert({
      where: { token: QA_USERS.studentOwned.sessionToken },
      update: { userId: studentOwned.id, expiresAt },
      create: {
        userId: studentOwned.id,
        token: QA_USERS.studentOwned.sessionToken,
        expiresAt,
      },
    });

    await prisma.session.upsert({
      where: { token: QA_USERS.studentOther.sessionToken },
      update: { userId: studentOther.id, expiresAt },
      create: {
        userId: studentOther.id,
        token: QA_USERS.studentOther.sessionToken,
        expiresAt,
      },
    });

    return {
      coachId: coach.id,
      studentOwnedId: studentOwned.id,
      studentOtherId: studentOther.id,
      studentOtherEmail: studentOther.email,
      coachCookie: buildSessionCookie(QA_USERS.coach.sessionToken),
      studentCookie: buildSessionCookie(QA_USERS.studentOwned.sessionToken),
      otherStudentCookie: buildSessionCookie(QA_USERS.studentOther.sessionToken),
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const qa = await ensureQaData();

  await sendRequest({
    name: 'analysis health public',
    method: 'GET',
    path: '/api/analysis/health',
    expected: [200, 503],
  });

  await sendRequest({
    name: 'clients list unauth blocked',
    method: 'GET',
    path: '/api/clients',
    expected: [401],
  });

  await sendRequest({
    name: 'client create unauth blocked',
    method: 'POST',
    path: '/api/clients',
    body: { name: 'x' },
    expected: [401],
  });

  await sendRequest({
    name: 'messages unauth blocked',
    method: 'GET',
    path: `/api/messages/${qa.coachId}`,
    expected: [401],
  });

  await sendRequest({
    name: 'payment malformed id blocked',
    method: 'POST',
    path: '/api/payments/create-checkout-session',
    body: { userId: '../../etc/passwd' },
    expected: [400],
  });

  await sendRequest({
    name: 'payment token in body rejected',
    method: 'POST',
    path: '/api/payments/create-checkout-session',
    body: { userId: qa.studentOwnedId, paymentToken: 'x' },
    expected: [400],
  });

  await sendRequest({
    name: 'payment no token blocked',
    method: 'POST',
    path: '/api/payments/create-checkout-session',
    body: { userId: qa.studentOwnedId },
    expected: [403],
  });

  await sendRequest({
    name: 'webhook missing token blocked',
    method: 'POST',
    path: '/api/payments/webhook',
    body: {},
    expected: [400],
  });

  await sendRequest({
    name: 'contact invalid payload blocked',
    method: 'POST',
    path: '/api/contact',
    body: {},
    expected: [400],
  });

  await sendRequest({
    name: 'contact honeypot accepted silently',
    method: 'POST',
    path: '/api/contact',
    body: {
      name: 'Spam Bot',
      email: 'bot@example.com',
      subject: 'Spam',
      message: 'Spam message body with enough length',
      website: 'https://spam.example.com',
      submittedAt: new Date(Date.now() - 10_000).toISOString(),
    },
    expected: [200],
  });

  await sendRequest({
    name: 'contact valid payload accepted',
    method: 'POST',
    path: '/api/contact',
    body: {
      name: 'QA Contact User',
      email: 'qa.contact.audit@example.com',
      subject: 'QA Contact Test',
      message: 'Bu mesaj audit coverage dogrulamasi icin gonderilmektedir.',
      website: '',
      submittedAt: new Date(Date.now() - 10_000).toISOString(),
    },
    expected: [200],
  });

  await sendRequest({
    name: 'coach clients list ok',
    method: 'GET',
    path: '/api/clients',
    headers: { Cookie: qa.coachCookie },
    expected: [200],
  });

  await sendRequest({
    name: 'student clients list blocked',
    method: 'GET',
    path: '/api/clients',
    headers: { Cookie: qa.studentCookie },
    expected: [401],
  });

  await sendRequest({
    name: 'coach foreign student not found',
    method: 'GET',
    path: `/api/clients/${qa.studentOtherId}`,
    headers: { Cookie: qa.coachCookie },
    expected: [404],
  });

  await sendRequest({
    name: 'coach own student detail ok',
    method: 'GET',
    path: `/api/clients/${qa.studentOwnedId}`,
    headers: { Cookie: qa.coachCookie },
    expected: [200],
  });

  const studentWriteHeaders = { Cookie: qa.studentCookie, Origin: origin };
  const coachWriteHeaders = { Cookie: qa.coachCookie, Origin: origin };

  const clientCreate = await sendRequest({
    name: 'coach client create ok',
    method: 'POST',
    path: '/api/clients',
    headers: coachWriteHeaders,
    body: {
      name: 'QA Temp Client',
      email: `qa.temp.client.${Date.now()}@example.com`,
    },
    expected: [201],
  });

  let createdClientId = null;
  try {
    const parsed = JSON.parse(clientCreate.text);
    createdClientId = parsed?.id || null;
  } catch {
    createdClientId = null;
  }

  if (createdClientId) {
    await sendRequest({
      name: 'coach client update ok',
      method: 'PUT',
      path: `/api/clients/${createdClientId}`,
      headers: coachWriteHeaders,
      body: {
        name: 'QA Temp Client Updated',
        email: `qa.temp.client.updated.${Date.now()}@example.com`,
      },
      expected: [200],
    });

    await sendRequest({
      name: 'coach client delete ok',
      method: 'DELETE',
      path: `/api/clients/${createdClientId}`,
      headers: coachWriteHeaders,
      expected: [200],
    });
  }

  // Expected behavior should be a safe client error (400/409), not an unhandled 500.
  await sendRequest({
    name: 'coach client duplicate email handled gracefully',
    method: 'PUT',
    path: `/api/clients/${qa.studentOwnedId}`,
    headers: coachWriteHeaders,
    body: {
      name: 'QA Student Updated',
      email: qa.studentOtherEmail,
    },
    expected: [400, 409],
  });

  await sendRequest({
    name: 'csrf guard blocks cookie write without origin',
    method: 'POST',
    path: '/api/weight',
    headers: { Cookie: qa.studentCookie },
    body: { userId: qa.studentOwnedId, weight: 72 },
    expected: [403],
  });

  await sendRequest({
    name: 'student own weight ok',
    method: 'POST',
    path: '/api/weight',
    headers: studentWriteHeaders,
    body: { userId: qa.studentOwnedId, weight: 72.2 },
    expected: [201],
  });

  await sendRequest({
    name: 'student other weight forbidden',
    method: 'POST',
    path: '/api/weight',
    headers: studentWriteHeaders,
    body: { userId: qa.studentOtherId, weight: 73 },
    expected: [403],
  });

  await sendRequest({
    name: 'coach student weight ok',
    method: 'POST',
    path: '/api/weight',
    headers: coachWriteHeaders,
    body: { userId: qa.studentOwnedId, weight: 73.4 },
    expected: [201],
  });

  await sendRequest({
    name: 'coach invalid weight rejected',
    method: 'POST',
    path: '/api/weight',
    headers: coachWriteHeaders,
    body: { userId: qa.studentOwnedId, weight: 999 },
    expected: [400],
  });

  await sendRequest({
    name: 'student own measurement ok',
    method: 'POST',
    path: '/api/measurements',
    headers: studentWriteHeaders,
    body: { userId: qa.studentOwnedId, waist: 85 },
    expected: [201],
  });

  await sendRequest({
    name: 'student other measurement forbidden',
    method: 'POST',
    path: '/api/measurements',
    headers: studentWriteHeaders,
    body: { userId: qa.studentOtherId, waist: 90 },
    expected: [403],
  });

  await sendRequest({
    name: 'student to coach message ok',
    method: 'POST',
    path: `/api/messages/${qa.coachId}`,
    headers: studentWriteHeaders,
    body: { content: 'QA hello' },
    expected: [201],
  });

  await sendRequest({
    name: 'coach reads student messages ok',
    method: 'GET',
    path: `/api/messages/${qa.studentOwnedId}`,
    headers: { Cookie: qa.coachCookie },
    expected: [200],
  });

  await sendRequest({
    name: 'student-to-student blocked',
    method: 'GET',
    path: `/api/messages/${qa.studentOtherId}`,
    headers: { Cookie: qa.studentCookie },
    expected: [403],
  });

  await sendRequest({
    name: 'coach student preview ok',
    method: 'GET',
    path: `/api/messages/student-preview/${qa.studentOwnedId}`,
    headers: { Cookie: qa.coachCookie },
    expected: [200],
  });

  await sendRequest({
    name: 'student preview forbidden for student role',
    method: 'GET',
    path: `/api/messages/student-preview/${qa.studentOwnedId}`,
    headers: { Cookie: qa.studentCookie },
    expected: [403],
  });

  await sendRequest({
    name: 'profile update ok',
    method: 'POST',
    path: '/api/user/update-profile',
    headers: studentWriteHeaders,
    body: { name: 'QA Student Updated', height: 180 },
    expected: [200],
  });

  await sendRequest({
    name: 'change password wrong current rejected',
    method: 'POST',
    path: '/api/user/change-password',
    headers: studentWriteHeaders,
    body: {
      currentPassword: 'wrong',
      newPassword: 'NewStrongPass123',
      confirmPassword: 'NewStrongPass123',
    },
    expected: [400],
  });

  await sendRequest({
    name: 'payments history coach ok',
    method: 'GET',
    path: '/api/payments/history',
    headers: { Cookie: qa.coachCookie },
    expected: [200],
  });

  await sendRequest({
    name: 'payments report coach ok',
    method: 'GET',
    path: '/api/payments/report',
    headers: { Cookie: qa.coachCookie },
    expected: [200],
  });

  const programCreate = await sendRequest({
    name: 'program create coach',
    method: 'POST',
    path: '/api/programs',
    headers: coachWriteHeaders,
    body: {
      studentId: qa.studentOwnedId,
      name: 'QA Program',
      category: 'Fitness',
      days: [
        {
          dayName: 'Pazartesi',
          order: 0,
          exercises: [
            { name: 'Squat', muscleGroup: 'Leg', sets: 3, reps: '10', order: 0 },
          ],
        },
      ],
    },
    expected: [201],
  });

  let createdProgramId = null;
  try {
    const parsed = JSON.parse(programCreate.text);
    createdProgramId = parsed?.id || null;
  } catch {
    createdProgramId = null;
  }

  if (createdProgramId) {
    await sendRequest({
      name: 'program get student owner ok',
      method: 'GET',
      path: `/api/programs/${createdProgramId}`,
      headers: { Cookie: qa.studentCookie },
      expected: [200],
    });

    await sendRequest({
      name: 'program get unrelated student forbidden',
      method: 'GET',
      path: `/api/programs/${createdProgramId}`,
      headers: { Cookie: qa.otherStudentCookie },
      expected: [403],
    });

    await sendRequest({
      name: 'program update coach ok',
      method: 'PUT',
      path: `/api/programs/${createdProgramId}`,
      headers: coachWriteHeaders,
      body: {
        name: 'QA Program Updated',
        category: 'Fitness',
        status: 'active',
        days: [
          {
            dayName: 'Sali',
            order: 0,
            exercises: [
              { name: 'Bench', muscleGroup: 'Chest', sets: 4, reps: '8', order: 0 },
            ],
          },
        ],
      },
      expected: [200],
    });

    await sendRequest({
      name: 'program delete coach ok',
      method: 'DELETE',
      path: `/api/programs/${createdProgramId}`,
      headers: coachWriteHeaders,
      expected: [200],
    });
  }

  const dietCreate = await sendRequest({
    name: 'diet create coach',
    method: 'POST',
    path: '/api/diet',
    headers: coachWriteHeaders,
    body: {
      studentId: qa.studentOwnedId,
      name: 'QA Diet',
      dailyCalorieTarget: 2200,
      proteinTarget: 130,
      carbsTarget: 220,
      fatTarget: 70,
      meals: [
        {
          name: 'Breakfast',
          order: 0,
          foods: [
            { name: 'Egg', amount: 2, unit: 'pcs', calories: 160, protein: 12, carbs: 1, fat: 11 },
          ],
        },
      ],
    },
    expected: [201],
  });

  let createdDietId = null;
  try {
    const parsed = JSON.parse(dietCreate.text);
    createdDietId = parsed?.id || null;
  } catch {
    createdDietId = null;
  }

  if (createdDietId) {
    await sendRequest({
      name: 'diet get student owner ok',
      method: 'GET',
      path: `/api/diet/${createdDietId}`,
      headers: { Cookie: qa.studentCookie },
      expected: [200],
    });

    await sendRequest({
      name: 'diet get unrelated student forbidden',
      method: 'GET',
      path: `/api/diet/${createdDietId}`,
      headers: { Cookie: qa.otherStudentCookie },
      expected: [403],
    });

    await sendRequest({
      name: 'diet update coach ok',
      method: 'PUT',
      path: `/api/diet/${createdDietId}`,
      headers: coachWriteHeaders,
      body: {
        name: 'QA Diet Updated',
        dailyCalorieTarget: 2100,
        proteinTarget: 120,
        carbsTarget: 210,
        fatTarget: 65,
        active: true,
        meals: [
          {
            name: 'Dinner',
            order: 0,
            foods: [
              { name: 'Chicken', amount: 200, unit: 'gr', calories: 330, protein: 40, carbs: 0, fat: 18 },
            ],
          },
        ],
      },
      expected: [200],
    });

    await sendRequest({
      name: 'diet delete coach ok',
      method: 'DELETE',
      path: `/api/diet/${createdDietId}`,
      headers: coachWriteHeaders,
      expected: [200],
    });
  }

  await sendRequest({
    name: 'uploads unauth blocked',
    method: 'GET',
    path: `/api/uploads/${qa.studentOwnedId}/nonexistent.jpg`,
    expected: [401],
  });

  await sendRequest({
    name: 'uploads traversal blocked with auth',
    method: 'GET',
    path: '/api/uploads/../secrets.txt',
    headers: { Cookie: qa.coachCookie },
    expected: [400, 404],
  });

  await sendRequest({
    name: 'analysis delete unauth blocked',
    method: 'DELETE',
    path: '/api/analysis/nonexistent-analysis-id',
    expected: [401],
  });

  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Z8f0AAAAASUVORK5CYII=';
  const pngBuffer = Buffer.from(pngBase64, 'base64');
  const analysisForm = new FormData();
  analysisForm.set('analysisType', 'front');
  analysisForm.set('file', new Blob([pngBuffer], { type: 'image/png' }), 'qa.png');

  const uploadResponse = await fetch(buildUrl('/api/analysis/upload'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Cookie: qa.studentCookie,
      Origin: origin,
    },
    body: analysisForm,
    redirect: 'manual',
  });

  const uploadText = await uploadResponse.text();
  const uploadPass = uploadResponse.status === 201;
  results.push({
    name: 'analysis upload student ok',
    method: 'POST',
    path: '/api/analysis/upload',
    expected: '201',
    status: uploadResponse.status,
    pass: uploadPass,
    bodySnippet: uploadText.length > 300 ? `${uploadText.slice(0, 300)}...` : uploadText,
  });

  if (uploadPass) {
    let analysisId = null;
    try {
      analysisId = JSON.parse(uploadText)?.id || null;
    } catch {
      analysisId = null;
    }

    if (analysisId) {
      await sendRequest({
        name: 'analysis delete owner ok',
        method: 'DELETE',
        path: `/api/analysis/${analysisId}`,
        headers: studentWriteHeaders,
        expected: [200],
      });
    }
  }

  const total = results.length;
  const passed = results.filter((item) => item.pass).length;
  const failed = total - passed;

  console.log(`TOTAL=${total} PASS=${passed} FAIL=${failed}`);

  const failedItems = results.filter((item) => !item.pass);
  if (failedItems.length > 0) {
    console.log('FAILED_CASES_START');
    for (const item of failedItems) {
      console.log(`${item.name} | ${item.method} ${item.path} | status=${item.status} | expected=${item.expected}`);
      if (item.bodySnippet) {
        console.log(`  body=${item.bodySnippet.replace(/\s+/g, ' ').trim()}`);
      }
    }
    console.log('FAILED_CASES_END');
  }

  const { writeFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  await writeFile(resolve(process.cwd(), 'security-full-audit-results.json'), JSON.stringify(results, null, 2), 'utf8');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Fatal audit error:', error);
  process.exit(1);
});
