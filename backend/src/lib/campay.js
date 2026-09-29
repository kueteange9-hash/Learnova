const CAMPAY_API = process.env.CAMPAY_ENVIRONMENT === "production" 
  ? "https://campay.net/api" 
  : "https://demo.campay.net/api";
const CAMPAY_USERNAME = process.env.CAMPAY_USERNAME || process.env.NAME_OF_USER_APPLICATION;
const CAMPAY_PASSWORD = process.env.CAMPAY_PASSWORD || process.env.PASSWORD_OF_THE_APPLICATION;

let cachedToken = null;
let tokenExpiresAt = 0;

async function getCampayToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!CAMPAY_USERNAME || !CAMPAY_PASSWORD) {
    throw new Error("CamPay credentials are not configured. Add CAMPAY_USERNAME and CAMPAY_PASSWORD to the server environment.");
  }

  const res = await fetch(`${CAMPAY_API}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: CAMPAY_USERNAME,
      password: CAMPAY_PASSWORD
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Campay token error:", errorText);
    throw new Error("Failed to authenticate with payment gateway");
  }

  const data = await res.json();
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 10000; // buffer
  return cachedToken;
}

async function requestCollection(amount, currency = "XAF", phone, description, reference) {
  const token = await getCampayToken();
  const digits = String(phone || "").replace(/\D/g, "");
  const payerNumber = digits.startsWith("237") ? digits : `237${digits}`;

  if (!/^2376\d{8}$/.test(payerNumber)) {
    throw new Error("Enter a valid Cameroon MTN or Orange number, for example 670000000.");
  }

  const res = await fetch(`${CAMPAY_API}/collect/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${token}`
    },
    body: JSON.stringify({
      amount: String(amount),
      currency,
      from: payerNumber,
      description,
      external_reference: reference
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Campay collect error:", errorText);
    throw new Error("CamPay could not start the payment. Check that this is an active MTN or Orange number and try again.");
  }

  return await res.json();
}

async function getTransaction(reference) {
  const token = await getCampayToken();
  const res = await fetch(`${CAMPAY_API}/transaction/${encodeURIComponent(reference)}/`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error("Unable to verify payment. Please check again shortly.");
  return res.json();
}

module.exports = {
  getTransaction,
  getCampayToken,
  requestCollection
};
