import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { extname, join } from 'path';

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
]);

export const POST: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const analysisType = (formData.get('analysisType') as string) || 'front';
  const studentId = formData.get('studentId') as string | null;

  if (!file) {
    return new Response(JSON.stringify({ error: 'File is required' }), { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE) {
    return new Response(JSON.stringify({ error: 'File size must be between 1 byte and 50MB' }), { status: 400 });
  }

  const extension = extname(file.name || '').toLowerCase();
  const mimeType = String(file.type || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension) && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return new Response(JSON.stringify({ error: 'Supported formats: JPG, PNG, WEBP, MP4, MOV, AVI' }), { status: 400 });
  }

  // Determine target userId for analysis
  let targetUserId = user.id;

  if (isCoach(user) && studentId) {
    // Verify the student belongs to this coach
    const student = await prisma.user.findFirst({
      where: { id: studentId, coachId: user.id },
    });
    if (!student) {
      return new Response(JSON.stringify({ error: 'Student not found or not your student' }), { status: 403 });
    }
    targetUserId = studentId;
  }

  // Create upload directory
  const uploadDir = join(process.cwd(), 'uploads', targetUserId);
  await mkdir(uploadDir, { recursive: true });

  // Save file
  const timestamp = Date.now();
  const ext = extension.slice(1) || 'jpg';
  const filename = `analysis_${timestamp}.${ext}`;
  const filepath = join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const imageUrl = `/api/uploads/${targetUserId}/${filename}`;

  // Try to send to Python service for analysis
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
  } catch (err) {
    console.log('Python service not available, saving without analysis:', err);
  }

  // Create body analysis record
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
  });

  return new Response(JSON.stringify(analysis), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
