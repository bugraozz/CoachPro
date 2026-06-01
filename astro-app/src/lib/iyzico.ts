import Iyzipay from 'iyzipay';

type IyzicoResult = {
  status?: string;
  errorMessage?: string;
  [key: string]: unknown;
};

type IyzicoClient = {
  checkoutFormInitialize: {
    create(payload: Record<string, unknown>, cb: (err: unknown, result: IyzicoResult) => void): void;
  };
  checkoutForm: {
    retrieve(payload: Record<string, unknown>, cb: (err: unknown, result: IyzicoResult) => void): void;
  };
  subMerchant: {
    create(payload: Record<string, unknown>, cb: (err: unknown, result: IyzicoResult) => void): void;
    update(payload: Record<string, unknown>, cb: (err: unknown, result: IyzicoResult) => void): void;
    retrieve(payload: Record<string, unknown>, cb: (err: unknown, result: IyzicoResult) => void): void;
  };
};

let iyzicoClient: IyzicoClient | null = null;

type MockCheckoutRecord = {
  conversationId: string;
  basketId: string;
  price: string;
  paidPrice: string;
  currency: string;
};

const MOCK_MODE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const mockCheckouts = new Map<string, MockCheckoutRecord>();

function isMockMode(): boolean {
  const raw = String(import.meta.env.IYZICO_MOCK_MODE || '').trim().toLowerCase();
  return MOCK_MODE_VALUES.has(raw);
}

function toPrice(value: unknown): string {
  const numeric = Number(String(value ?? '0').replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric < 0) {
    return '0.00';
  }

  return numeric.toFixed(2);
}

function decodeMockToken(token: string): {
  scenario: 'success' | 'fail' | 'amount_mismatch' | 'conversation_mismatch';
  transactionId: string;
} | null {
  const normalized = token.trim();
  const patterns: Array<{
    regex: RegExp;
    scenario: 'success' | 'fail' | 'amount_mismatch' | 'conversation_mismatch';
  }> = [
    { regex: /^mock-token-(.+)$/i, scenario: 'success' },
    { regex: /^mock-success-(.+)$/i, scenario: 'success' },
    { regex: /^mock-fail-(.+)$/i, scenario: 'fail' },
    { regex: /^mock-amount-mismatch-(.+)$/i, scenario: 'amount_mismatch' },
    { regex: /^mock-conversation-mismatch-(.+)$/i, scenario: 'conversation_mismatch' },
  ];

  for (const pattern of patterns) {
    const match = pattern.regex.exec(normalized);
    if (!match || !match[1]) {
      continue;
    }

    return {
      scenario: pattern.scenario,
      transactionId: match[1],
    };
  }

  return null;
}

async function initializeCheckoutFormMock(payload: Record<string, unknown>): Promise<IyzicoResult> {
  const conversationId = String(payload.conversationId || payload.basketId || `mock-${Date.now()}`).trim();
  const basketId = String(payload.basketId || conversationId).trim();
  const price = toPrice(payload.price);
  const paidPrice = toPrice(payload.paidPrice ?? payload.price);
  const currency = String(payload.currency || 'TRY').toUpperCase();
  const token = `mock-token-${conversationId}`;

  mockCheckouts.set(conversationId, {
    conversationId,
    basketId,
    price,
    paidPrice,
    currency,
  });

  return {
    status: 'success',
    conversationId,
    basketId,
    token,
    paymentPageUrl: `https://mock.iyzico.local/checkout/${encodeURIComponent(token)}`,
  };
}

async function retrieveCheckoutFormMock(payload: Record<string, unknown>): Promise<IyzicoResult> {
  const token = String(payload.token || '').trim();
  if (!token) {
    return {
      status: 'failure',
      errorMessage: 'Mock token is required.',
    };
  }

  const decoded = decodeMockToken(token);
  if (!decoded) {
    return {
      status: 'failure',
      errorMessage: 'Unknown mock token.',
    };
  }

  const record = mockCheckouts.get(decoded.transactionId);
  const baseConversationId = record?.conversationId || decoded.transactionId;
  const baseBasketId = record?.basketId || decoded.transactionId;
  const basePrice = record?.price || '0.00';
  const basePaidPrice = record?.paidPrice || basePrice;
  const currency = record?.currency || 'TRY';

  if (decoded.scenario === 'fail') {
    return {
      status: 'success',
      paymentStatus: 'failure',
      conversationId: baseConversationId,
      basketId: baseBasketId,
      price: basePrice,
      paidPrice: basePaidPrice,
      currency,
      token,
      errorMessage: 'Mock payment was declined.',
    };
  }

  if (decoded.scenario === 'amount_mismatch') {
    const mismatchPaidPrice = (Number(basePaidPrice) + 7).toFixed(2);
    return {
      status: 'success',
      paymentStatus: 'success',
      conversationId: baseConversationId,
      basketId: baseBasketId,
      price: basePrice,
      paidPrice: mismatchPaidPrice,
      currency,
      token,
      paymentId: `mock-payment-${baseConversationId}`,
    };
  }

  if (decoded.scenario === 'conversation_mismatch') {
    return {
      status: 'success',
      paymentStatus: 'success',
      conversationId: `${baseConversationId}-other`,
      basketId: baseBasketId,
      price: basePrice,
      paidPrice: basePaidPrice,
      currency,
      token,
      paymentId: `mock-payment-${baseConversationId}`,
    };
  }

  return {
    status: 'success',
    paymentStatus: 'success',
    conversationId: baseConversationId,
    basketId: baseBasketId,
    price: basePrice,
    paidPrice: basePaidPrice,
    currency,
    token,
    paymentId: `mock-payment-${baseConversationId}`,
  };
}

async function createSubMerchantMock(payload: Record<string, unknown>): Promise<IyzicoResult> {
  const externalId = String(payload.subMerchantExternalId || '').trim() || `mock-external-${Date.now()}`;
  return {
    status: 'success',
    subMerchantKey: `mock-sub-merchant-${externalId}`,
    subMerchantExternalId: externalId,
  };
}

async function updateSubMerchantMock(payload: Record<string, unknown>): Promise<IyzicoResult> {
  return {
    status: 'success',
    subMerchantKey: String(payload.subMerchantKey || '').trim() || `mock-sub-merchant-${Date.now()}`,
    subMerchantExternalId: String(payload.subMerchantExternalId || '').trim() || `mock-external-${Date.now()}`,
  };
}

async function retrieveSubMerchantMock(payload: Record<string, unknown>): Promise<IyzicoResult> {
  const externalId = String(payload.subMerchantExternalId || '').trim() || `mock-external-${Date.now()}`;
  return {
    status: 'success',
    subMerchantKey: `mock-sub-merchant-${externalId}`,
    subMerchantExternalId: externalId,
    subMerchantStatus: 'ACTIVE',
  };
}

export function getIyzicoClient(): IyzicoClient {
  if (!iyzicoClient) {
    const apiKey = import.meta.env.IYZICO_API_KEY;
    const secretKey = import.meta.env.IYZICO_SECRET_KEY;
    const baseUrl = import.meta.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

    if (!apiKey || !secretKey) {
      throw new Error('IYZICO_API_KEY or IYZICO_SECRET_KEY is not configured.');
    }

    iyzicoClient = new Iyzipay({
      apiKey,
      secretKey,
      uri: baseUrl,
    }) as unknown as IyzicoClient;
  }

  return iyzicoClient;
}

function callIyzico(
  executor: (cb: (err: unknown, result: IyzicoResult) => void) => void,
): Promise<IyzicoResult> {
  return new Promise((resolve, reject) => {
    executor((err, result) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(result || {});
    });
  });
}

export async function initializeCheckoutForm(payload: Record<string, unknown>): Promise<IyzicoResult> {
  if (isMockMode()) {
    return initializeCheckoutFormMock(payload);
  }

  const client = getIyzicoClient();
  return callIyzico((cb) => client.checkoutFormInitialize.create(payload, cb));
}

export async function retrieveCheckoutForm(payload: Record<string, unknown>): Promise<IyzicoResult> {
  if (isMockMode()) {
    return retrieveCheckoutFormMock(payload);
  }

  const client = getIyzicoClient();
  return callIyzico((cb) => client.checkoutForm.retrieve(payload, cb));
}

export async function createSubMerchant(payload: Record<string, unknown>): Promise<IyzicoResult> {
  if (isMockMode()) {
    return createSubMerchantMock(payload);
  }

  const client = getIyzicoClient();
  return callIyzico((cb) => client.subMerchant.create(payload, cb));
}

export async function updateSubMerchant(payload: Record<string, unknown>): Promise<IyzicoResult> {
  if (isMockMode()) {
    return updateSubMerchantMock(payload);
  }

  const client = getIyzicoClient();
  return callIyzico((cb) => client.subMerchant.update(payload, cb));
}

export async function retrieveSubMerchant(payload: Record<string, unknown>): Promise<IyzicoResult> {
  if (isMockMode()) {
    return retrieveSubMerchantMock(payload);
  }

  const client = getIyzicoClient();
  return callIyzico((cb) => client.subMerchant.retrieve(payload, cb));
}
