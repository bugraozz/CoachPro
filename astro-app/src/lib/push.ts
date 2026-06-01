import prisma from './prisma';

const FCM_SERVER_KEY = String(process.env.FCM_SERVER_KEY || '').trim();

export async function sendPushToUser(userId: string, title: string, body: string, data: Record<string, unknown> = {}){
  if (!FCM_SERVER_KEY) return;
  const tokens = await prisma.deviceToken.findMany({ where: { userId, revoked: false } });
  if (!tokens || tokens.length === 0) return;

  const fcmTokens = tokens.map(t=>t.token).filter(Boolean);
  if (fcmTokens.length === 0) return;

  const payload = {
    registration_ids: fcmTokens,
    notification: { title, body },
    data,
  };

  await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
  });
}
