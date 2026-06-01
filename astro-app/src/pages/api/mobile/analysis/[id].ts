import type { APIRoute } from 'astro';
import { unlink } from 'fs/promises';
import { join } from 'path';
import prisma from '../../../../lib/prisma';
import { getUserFromMobileRequest } from '../utils';
import { isCoach } from '../../../../lib/auth';

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const user = await getUserFromMobileRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const id = String(params.id || '').trim();
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID gerekli' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const analysis = await prisma.bodyAnalysis.findUnique({
      where: { id },
      include: { user: { select: { id: true, coachId: true } } },
    });

    if (!analysis) {
      return new Response(JSON.stringify({ error: 'Analiz bulunamadı' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const canDelete = analysis.userId === user.id || (isCoach(user) && analysis.user.coachId === user.id);
    if (!canDelete) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const imagePath = analysis.imageUrl.replace('/api/uploads/', '');
      const fullPath = join(process.cwd(), 'uploads', imagePath);
      await unlink(fullPath);
    } catch (fileError) {
      console.log('Dosya silinemedi:', fileError);
    }

    await prisma.bodyAnalysis.delete({ where: { id } });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Analiz silinemedi', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};