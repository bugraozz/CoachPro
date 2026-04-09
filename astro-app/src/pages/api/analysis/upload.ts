import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
  const ext = file.name.split('.').pop() || 'jpg';
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
