import type { APIRoute } from 'astro';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import prisma from '../../../lib/prisma';
import { getUserFromMobileRequest } from './utils';
import { isCoach } from '../../../lib/auth';

const prismaClient = prisma as any;
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo']);

async function resolveTargetUserId(user: any, studentId?: string | null): Promise<string> {
  if (isCoach(user) && studentId) {
    const student = await prisma.user.findFirst({
      where: { id: studentId, coachId: user.id },
      select: { id: true },
    });

    if (student) {
      return studentId;
    }
  }

  return user.id;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let analyses: any[] = [];

    if (isCoach(user)) {
      const students = await prisma.user.findMany({
        where: { coachId: user.id, role: 'student' },
        select: { id: true },
      });

      const studentIds = students.map((student) => student.id);
      analyses = await prisma.bodyAnalysis.findMany({
        where: { userId: { in: studentIds } },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      });
    } else {
      analyses = await prisma.bodyAnalysis.findMany({
        where: { userId: user.id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      });
    }

    return new Response(JSON.stringify({ analyses, role: user.role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const analysisType = String(formData.get('analysisType') || 'front').trim() || 'front';
    const studentId = String(formData.get('studentId') || '').trim() || null;

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'Dosya gerekli.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE) {
      return new Response(JSON.stringify({ error: 'Dosya boyutu 1 byte ile 50MB arasında olmalıdır.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const extension = extname(file.name || '').toLowerCase();
    const mimeType = String(file.type || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension) && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return new Response(JSON.stringify({ error: 'Desteklenen formatlar: JPG, PNG, WEBP, MP4, MOV, AVI' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const targetUserId = await resolveTargetUserId(user, studentId);
    const uploadDir = join(process.cwd(), 'uploads', targetUserId);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const ext = extension.slice(1) || 'jpg';
    const filename = `analysis_${timestamp}.${ext}`;
    const filepath = join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const imageUrl = `/api/uploads/${targetUserId}/${filename}`;

    let landmarks = null;
    let angles = null;
    let postureScore = null;
    let postureNotes = null;
    let muscleDensity = null;

    try {
      const pythonUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
      const pythonFormData = new FormData();
      const blob = new Blob([buffer], { type: file.type });
      pythonFormData.append('file', blob, filename);

      const analysisResponse = await fetch(`${pythonUrl}/analyze`, {
        method: 'POST',
        body: pythonFormData,
      });

      if (analysisResponse.ok) {
        const result = await analysisResponse.json();
        landmarks = result.landmarks;
        angles = result.angles;
        postureScore = result.postureScore;
        postureNotes = result.postureNotes;
        muscleDensity = result.muscleDensity;
      }
    } catch (analysisError) {
      console.log('Python servisi kullanılamadı, analiz kaydedildi:', analysisError);
    }

    const analysis = await prisma.bodyAnalysis.create({
      data: {
        userId: targetUserId,
        imageUrl,
        analysisType,
        landmarks: landmarks || [],
        angles: angles || {},
        postureScore,
        postureNotes,
        muscleDensity,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return new Response(JSON.stringify({ analysis }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Analiz yüklenemedi', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};