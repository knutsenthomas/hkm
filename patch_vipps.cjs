const fs = require('fs');
const file = 'functions/index.js';
let content = fs.readFileSync(file, 'utf8');

// Replace getVippsPayment
content = content.replace(
  /epayment\/v1\/payments\/\$\{encodeURIComponent\(reference\)\}/g,
  'ecomm/v2/payments/${encodeURIComponent(reference)}/details'
);

// Replace captureVippsPayment
content = content.replace(
  /epayment\/v1\/payments\/\$\{encodeURIComponent\(reference\)\}\/capture/g,
  'ecomm/v2/payments/${encodeURIComponent(reference)}/capture'
);
content = content.replace(
  /modificationAmount:\s*\{[^}]+\}/g,
  'merchantInfo: { merchantSerialNumber: config.merchantSerialNumber }, transaction: { amount: amount && Number.isFinite(amount.value) ? amount.value : 0, transactionText: "Capture" }'
);

// We need a more targeted replace for createVippsPayment
content = content.replace(
  /const paymentRequest = \{[\s\S]*?body: JSON.stringify\(paymentRequest\),/g,
  `const paymentRequest = {
      merchantInfo: {
        merchantSerialNumber: config.merchantSerialNumber,
        callbackPrefix: "https://europe-west3-his-kingdom-ministry.cloudfunctions.net", // adjust if needed
        fallBack: paymentReturnUrl,
        isApp: false
      },
      customerInfo: {},
      transaction: {
        amount: amountOre,
        orderId: reference,
        transactionText: "Donasjon til His Kingdom Ministry"
      }
    };

    if (phoneNumber) {
      paymentRequest.customerInfo.mobileNumber = phoneNumber;
    }

    const paymentResponse = await fetch(\`\${baseUrl}/ecomm/v2/payments\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${accessToken}\`,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Merchant-Serial-Number": config.merchantSerialNumber,
        ...getVippsSystemHeaders(config),
      },
      body: JSON.stringify(paymentRequest),`
);

// Replace redirectUrl with url (eCom v2 returns url)
content = content.replace(
  /redirectUrl: paymentPayload\.redirectUrl,/g,
  'redirectUrl: paymentPayload.url,'
);
content = content.replace(
  /if \(\!paymentPayload\.redirectUrl\)/g,
  'if (!paymentPayload.url)'
);

fs.writeFileSync(file, content);
console.log('Patched');
