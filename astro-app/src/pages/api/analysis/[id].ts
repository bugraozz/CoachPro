import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';
import { unlink } from 'fs/promises';
import { join } from 'path';

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID gerekli' }), { status: 400 });
  }

  // Analizi bul
  const analysis = await prisma.bodyAnalysis.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!analysis) {
    return new Response(JSON.stringify({ error: 'Analiz bulunamadı' }), { status: 404 });
  }

  // Yetki kontrolü: kendi analizi veya eğitmenin öğrencisinin analizi
  const canDelete =
    analysis.userId === user.id ||
    (isCoach(user) && analysis.user.coachId === user.id);

  if (!canDelete) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 403 });
  }

  // Dosyayı sil
  try {
    const imagePath = analysis.imageUrl.replace('/api/uploads/', '');
    const fullPath = join(process.cwd(), 'uploads', imagePath);
    await unlink(fullPath);
  } catch (err) {
    console.log('Dosya silinemedi (zaten silinmiş olabilir):', err);
  }

  // DB kaydını sil
  await prisma.bodyAnalysis.delete({ where: { id } });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
