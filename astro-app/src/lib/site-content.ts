const HOME_TEXT_OVERRIDES_KEY = 'site.content.home.text_overrides';

export type HomeTextOverrides = Record<string, string>;

function normalizeTextOverrides(rawValue: unknown): HomeTextOverrides {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {};
  }

  const value = rawValue as Record<string, unknown>;
  const normalized: HomeTextOverrides = {};

  for (const [rawKey, rawText] of Object.entries(value)) {
    const key = String(rawKey || '').trim();
    if (!key) {
      continue;
    }

    if (typeof rawText !== 'string') {
      continue;
    }

    const text = rawText.trim();
    if (!text) {
      continue;
    }

    normalized[key] = text;
  }

  return normalized;
}

export async function getHomeTextOverrides(): Promise<HomeTextOverrides> {
  // Site metinleri artik dogrudan koddan yonetiliyor.
  return {};
}

export async function setHomeTextOverrides(
  overrides: HomeTextOverrides,
  updatedBy?: string | null,
): Promise<void> {
  // Geriye donuk uyumluluk icin tutuluyor; artik kalici ayar yazmiyor.
  void normalizeTextOverrides(overrides);
  void updatedBy;
}

export async function getHomeTextOverridesWithMeta(): Promise<{
  overrides: HomeTextOverrides;
  updatedAt: string | null;
  updatedBy: string | null;
}> {
  return {
    overrides: {},
    updatedAt: null,
    updatedBy: null,
  };
}
