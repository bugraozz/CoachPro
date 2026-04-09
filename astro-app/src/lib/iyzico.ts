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
  const client = getIyzicoClient();
  return callIyzico((cb) => client.checkoutFormInitialize.create(payload, cb));
}

export async function retrieveCheckoutForm(payload: Record<string, unknown>): Promise<IyzicoResult> {
  const client = getIyzicoClient();
  return callIyzico((cb) => client.checkoutForm.retrieve(payload, cb));
}

export async function createSubMerchant(payload: Record<string, unknown>): Promise<IyzicoResult> {
  const client = getIyzicoClient();
  return callIyzico((cb) => client.subMerchant.create(payload, cb));
}

export async function updateSubMerchant(payload: Record<string, unknown>): Promise<IyzicoResult> {
  const client = getIyzicoClient();
  return callIyzico((cb) => client.subMerchant.update(payload, cb));
}

export async function retrieveSubMerchant(payload: Record<string, unknown>): Promise<IyzicoResult> {
  const client = getIyzicoClient();
  return callIyzico((cb) => client.subMerchant.retrieve(payload, cb));
}
