import prisma from './prisma';

const prismaClient = prisma as any;

const MAINTENANCE_MODE_KEY = 'system.maintenance_mode';
export const DEFAULT_MAINTENANCE_MESSAGE = 'Sistem bakim modunda. Lutfen daha sonra tekrar deneyin.';

export type MaintenanceModeStatus = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type MaintenanceModeWriteInput = {
  enabled: boolean;
  message?: string | null;
  updatedBy?: string | null;
};

const EMPTY_MAINTENANCE_MODE_STATUS: MaintenanceModeStatus = {
  enabled: false,
  message: DEFAULT_MAINTENANCE_MESSAGE,
  updatedAt: null,
  updatedBy: null,
};

function normalizeMaintenanceMode(rawValue: unknown): MaintenanceModeStatus {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return { ...EMPTY_MAINTENANCE_MODE_STATUS };
  }

  const value = rawValue as Record<string, unknown>;
  const normalizedMessage = typeof value.message === 'string' && value.message.trim()
    ? value.message.trim()
    : DEFAULT_MAINTENANCE_MESSAGE;

  return {
    enabled: Boolean(value.enabled),
    message: normalizedMessage,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : null,
  };
}

export async function getMaintenanceModeStatus(): Promise<MaintenanceModeStatus> {
  try {
    const setting = await prismaClient.systemSetting.findUnique({
      where: { key: MAINTENANCE_MODE_KEY },
      select: { value: true },
    });

    if (!setting) {
      return { ...EMPTY_MAINTENANCE_MODE_STATUS };
    }

    return normalizeMaintenanceMode(setting.value);
  } catch (error) {
    console.error('Bakim modu ayari okunamadi:', error);
    return { ...EMPTY_MAINTENANCE_MODE_STATUS };
  }
}

export async function setMaintenanceModeStatus(input: MaintenanceModeWriteInput): Promise<MaintenanceModeStatus> {
  const payload: MaintenanceModeStatus = {
    enabled: Boolean(input.enabled),
    message: typeof input.message === 'string' && input.message.trim()
      ? input.message.trim()
      : DEFAULT_MAINTENANCE_MESSAGE,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy || null,
  };

  await prismaClient.systemSetting.upsert({
    where: { key: MAINTENANCE_MODE_KEY },
    create: {
      key: MAINTENANCE_MODE_KEY,
      value: payload,
    },
    update: {
      value: payload,
    },
  });

  return payload;
}
