import Iyzipay from 'iyzipay';

const client = new Iyzipay({
  apiKey: 'sandbox-20dWInaV8N2SRNIqufFQsEXH0gISPROK',
  secretKey: '06sOG62V6NFL2fERpFHcgOmnCrEIIx3k',
  uri: 'https://sandbox-api.iyzipay.com',
});

function call(exec) {
  return new Promise((resolve, reject) => {
    exec((err, res) => {
      if (err) return reject(err);
      resolve(res || {});
    });
  });
}

const conversationId = `verify-${Date.now()}`;

const retrieveRes = await call((cb) =>
  client.subMerchant.retrieve(
    {
      locale: 'tr',
      conversationId,
      subMerchantExternalId: '1dbd6c5e-1802-4864-b946-6ef18e9cb1b2',
    },
    cb,
  ),
);

const checkoutRes = await call((cb) =>
  client.checkoutFormInitialize.create(
    {
      locale: 'tr',
      conversationId: `${conversationId}-checkout`,
      price: '10.00',
      paidPrice: '10.00',
      currency: 'TRY',
      basketId: `basket-${Date.now()}`,
      paymentGroup: 'PRODUCT',
      callbackUrl: 'http://localhost:4321/api/payments/webhook',
      enabledInstallments: [1],
      buyer: {
        id: 'verify-buyer',
        name: 'Test',
        surname: 'User',
        gsmNumber: '+905000000000',
        email: 'verify@example.com',
        identityNumber: '11111111111',
        registrationAddress: 'Istanbul',
        ip: '127.0.0.1',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34000',
      },
      shippingAddress: {
        contactName: 'Test User',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Istanbul',
        zipCode: '34000',
      },
      billingAddress: {
        contactName: 'Test User',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Istanbul',
        zipCode: '34000',
      },
      basketItems: [
        {
          id: 'verify-item',
          name: 'Verify Package',
          category1: 'Package',
          itemType: 'VIRTUAL',
          price: '10.00',
          subMerchantKey: 'tjG7zZg6gbSMCLn1771544428569',
          subMerchantPrice: '10.00',
        },
      ],
    },
    cb,
  ),
);

console.log(
  JSON.stringify(
    {
      retrieve: {
        status: retrieveRes.status,
        errorCode: retrieveRes.errorCode,
        errorMessage: retrieveRes.errorMessage,
        subMerchantKey: retrieveRes.subMerchantKey,
        subMerchantExternalId: retrieveRes.subMerchantExternalId,
      },
      checkout: {
        status: checkoutRes.status,
        errorCode: checkoutRes.errorCode,
        errorMessage: checkoutRes.errorMessage,
        paymentPageUrl: checkoutRes.paymentPageUrl,
      },
    },
    null,
    2,
  ),
);
