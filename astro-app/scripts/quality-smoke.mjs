#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = (process.env.QUALITY_SMOKE_BASE_URL || 'http://localhost:4321').replace(/\/+$/, '');
const origin = process.env.QUALITY_SMOKE_ORIGIN || baseUrl;

const QA_USERS = {
  coach: {
    email: 'qa.coach.quality@example.com',
    name: 'QA Quality Coach',
    role: 'coach',
    sessionToken: 'qa_quality_coach_session_0001',
  },
  student: {
    email: 'qa.student.quality@example.com',
    name: 'QA Quality Student',
    role: 'student',
    sessionToken: 'qa_quality_student_session_0001',
  },
};

const QA_PASSWORD_HASH = '$2b$12$k9UEVfTk1lA7Y21Yhx9v9OP1LQDgY17M2E4WQxHyfKVJkQW8C9sNq';

const prisma = new PrismaClient();
const results = [];

function buildUrl(pathname) {
  return `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function buildSessionCookie(token) {
  return `session_token=${token}`;
}

function snippet(text) {
  if (!text) return '';
  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
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
  results.push({
    name,
    method,
    path,
    expected: expected.join(','),
    status,
    pass,
    bodySnippet: snippet(text),
  });

  return { status, text, pass };
}

async function ensureQaData() {
  const coach = await prisma.user.upsert({
    where: { email: QA_USERS.coach.email },
    update: {
      name: QA_USERS.coach.name,
      role: QA_USERS.coach.role,
      password: QA_PASSWORD_HASH,
      active: true,
      subscriptionStatus: 'active',
      referralCode: 'QAQLTY01',
    },
    create: {
      email: QA_USERS.coach.email,
      name: QA_USERS.coach.name,
      role: QA_USERS.coach.role,
      password: QA_PASSWORD_HASH,
      active: true,
      subscriptionStatus: 'active',
      referralCode: 'QAQLTY01',
    },
    select: { id: true },
  });

  const student = await prisma.user.upsert({
    where: { email: QA_USERS.student.email },
    update: {
      name: QA_USERS.student.name,
      role: QA_USERS.student.role,
      coachId: coach.id,
      password: QA_PASSWORD_HASH,
      active: true,
      studentPaymentStatus: 'paid',
      studentAccessEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    create: {
      email: QA_USERS.student.email,
      name: QA_USERS.student.name,
      role: QA_USERS.student.role,
      coachId: coach.id,
      password: QA_PASSWORD_HASH,
      active: true,
      studentPaymentStatus: 'paid',
      studentAccessEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
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
    where: { token: QA_USERS.student.sessionToken },
    update: { userId: student.id, expiresAt },
    create: {
      userId: student.id,
      token: QA_USERS.student.sessionToken,
      expiresAt,
    },
  });

  return {
    coachId: coach.id,
    studentId: student.id,
    coachCookie: buildSessionCookie(QA_USERS.coach.sessionToken),
    studentCookie: buildSessionCookie(QA_USERS.student.sessionToken),
  };
}

async function main() {
  const qa = await ensureQaData();
  const coachWriteHeaders = { Cookie: qa.coachCookie, Origin: origin };
  const studentWriteHeaders = { Cookie: qa.studentCookie, Origin: origin };

  await sendRequest({
    name: 'analysis health reachable',
    method: 'GET',
    path: '/api/analysis/health',
    expected: [200, 503],
  });

  await sendRequest({
    name: 'coach clients list returns data',
    method: 'GET',
    path: '/api/clients',
    headers: { Cookie: qa.coachCookie },
    expected: [200],
  });

  await sendRequest({
    name: 'student profile update works',
    method: 'POST',
    path: '/api/user/update-profile',
    headers: studentWriteHeaders,
    body: {
      name: 'QA Quality Student Updated',
      height: 178,
    },
    expected: [200],
  });

  const programCreate = await sendRequest({
    name: 'program create works',
    method: 'POST',
    path: '/api/programs',
    headers: coachWriteHeaders,
    body: {
      studentId: qa.studentId,
      name: 'QA Quality Program',
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

  let programId = null;
  try {
    programId = JSON.parse(programCreate.text)?.id || null;
  } catch {
    programId = null;
  }

  if (!programId) {
    results.push({
      name: 'program create returns id',
      method: 'POST',
      path: '/api/programs',
      expected: 'id',
      status: programCreate.status,
      pass: false,
      bodySnippet: snippet(programCreate.text),
    });
  }

  if (programId) {
    await sendRequest({
      name: 'program update works',
      method: 'PUT',
      path: `/api/programs/${programId}`,
      headers: coachWriteHeaders,
      body: {
        name: 'QA Quality Program Updated',
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
      name: 'program delete works',
      method: 'DELETE',
      path: `/api/programs/${programId}`,
      headers: coachWriteHeaders,
      expected: [200],
    });
  }

  const dietCreate = await sendRequest({
    name: 'diet create works',
    method: 'POST',
    path: '/api/diet',
    headers: coachWriteHeaders,
    body: {
      studentId: qa.studentId,
      name: 'QA Quality Diet',
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

  let dietId = null;
  try {
    dietId = JSON.parse(dietCreate.text)?.id || null;
  } catch {
    dietId = null;
  }

  if (!dietId) {
    results.push({
      name: 'diet create returns id',
      method: 'POST',
      path: '/api/diet',
      expected: 'id',
      status: dietCreate.status,
      pass: false,
      bodySnippet: snippet(dietCreate.text),
    });
  }

  if (dietId) {
    await sendRequest({
      name: 'diet update works',
      method: 'PUT',
      path: `/api/diet/${dietId}`,
      headers: coachWriteHeaders,
      body: {
        name: 'QA Quality Diet Updated',
        dailyCalorieTarget: 2100,
        proteinTarget: 125,
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
      name: 'diet delete works',
      method: 'DELETE',
      path: `/api/diet/${dietId}`,
      headers: coachWriteHeaders,
      expected: [200],
    });
  }

  await sendRequest({
    name: 'student to coach messaging works',
    method: 'POST',
    path: `/api/messages/${qa.coachId}`,
    headers: studentWriteHeaders,
    body: { content: 'QA quality smoke message' },
    expected: [201],
  });

  await sendRequest({
    name: 'coach payment report works',
    method: 'GET',
    path: '/api/payments/report',
    headers: { Cookie: qa.coachCookie },
    expected: [200],
  });

  const total = results.length;
  const passed = results.filter((item) => item.pass).length;
  const failed = total - passed;

  console.log(`TOTAL=${total} PASS=${passed} FAIL=${failed}`);

  if (failed > 0) {
    console.log('FAILED_CASES_START');
    for (const item of results.filter((item) => !item.pass)) {
      console.log(`${item.name} | ${item.method} ${item.path} | status=${item.status} | expected=${item.expected}`);
      if (item.bodySnippet) {
        console.log(`  body=${item.bodySnippet.replace(/\s+/g, ' ').trim()}`);
      }
    }
    console.log('FAILED_CASES_END');
  }

  await writeFile(resolve(process.cwd(), 'quality-smoke-results.json'), JSON.stringify(results, null, 2), 'utf8');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Fatal quality smoke error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
