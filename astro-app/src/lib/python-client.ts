const PYTHON_API_URL = import.meta.env.PYTHON_API_URL || 'http://localhost:8000';

export interface AnalysisResult {
  landmarks: Array<{
    id: number;
    name: string;
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
  angles: Record<string, number>;
  postureScore: number;
  postureIssues: string[];
  muscleDensity: Record<string, number>;
}

export async function analyzeBodyImage(imageBuffer: Uint8Array, filename: string): Promise<AnalysisResult> {
  const formData = new FormData();
  const arrayBuffer = new ArrayBuffer(imageBuffer.byteLength);
  new Uint8Array(arrayBuffer).set(imageBuffer);
  const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
  formData.append('file', blob, filename);

  const response = await fetch(`${PYTHON_API_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Python API error: ${response.statusText}`);
  }

  return response.json();
}

export async function compareAnalyses(analysisId1: string, analysisId2: string) {
  const response = await fetch(`${PYTHON_API_URL}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis1: analysisId1, analysis2: analysisId2 }),
  });

  if (!response.ok) {
    throw new Error(`Python API error: ${response.statusText}`);
  }

  return response.json();
}
