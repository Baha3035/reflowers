// Generates a VAPID key pair for web push. Run once: `node scripts/generate-vapid-keys.mjs`
// then add the three values as secrets in Lovable Cloud (never commit them).
const { subtle } = globalThis.crypto;

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const keys = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
  "sign",
  "verify",
]);
const publicKey = b64url(await subtle.exportKey("raw", keys.publicKey));
const { d: privateKey } = await subtle.exportKey("jwk", keys.privateKey);

console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log("VAPID_SUBJECT=mailto:you@example.com   # a contact address for push services");
