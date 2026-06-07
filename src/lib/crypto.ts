// Real WebCrypto-backed vault primitives.
// Pipeline: PBKDF2-SHA512 (adaptive iters) -> HKDF-SHA512 -> AES-256-GCM + HMAC-SHA512.
// All operations are vault-local; nothing leaves the browser.

const enc = new TextEncoder();
const dec = new TextDecoder();

// TS lib.dom is strict about ArrayBuffer vs SharedArrayBuffer; WebCrypto only
// accepts plain ArrayBuffers, which is what we always have here.
const bs = (u: Uint8Array): ArrayBuffer => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

export const b64 = {
  encode(bytes: Uint8Array): string {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  },
  decode(s: string): Uint8Array {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

export function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

export function ctEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

export async function deriveMaster(
  passphrase: string,
  salt: Uint8Array,
  iters: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    bs(enc.encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-512", salt: bs(salt), iterations: iters } as Pbkdf2Params,
    baseKey,
    512,
  );
  return crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveBits"]);
}

async function hkdfBits(
  master: CryptoKey,
  salt: Uint8Array,
  info: string,
  len: number,
): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-512", salt: bs(salt), info: bs(enc.encode(info)) } as HkdfParams,
    master,
    len * 8,
  );
  return new Uint8Array(bits);
}

export async function splitKeys(
  master: CryptoKey,
  hkdfSalt: Uint8Array,
): Promise<{ enc: CryptoKey; mac: CryptoKey; decoy: Uint8Array }> {
  const encRaw = await hkdfBits(master, hkdfSalt, "sxcrypt|enc|aes256gcm|v1", 32);
  const macRaw = await hkdfBits(master, hkdfSalt, "sxcrypt|mac|hmacsha512|v1", 64);
  const decoy = await hkdfBits(master, hkdfSalt, "sxcrypt|decoy|seed|v1", 32);
  const encKey = await crypto.subtle.importKey(
    "raw",
    bs(encRaw),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  const macKey = await crypto.subtle.importKey(
    "raw",
    bs(macRaw),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"],
  );
  encRaw.fill(0);
  macRaw.fill(0);
  return { enc: encKey, mac: macKey, decoy };
}

export interface VaultHeader {
  v: 1;
  alg: "AES-256-GCM+HMAC-SHA512";
  kdf: "PBKDF2-SHA512";
  iters: number;
  pSalt: string;
  hSalt: string;
  nonce: string;
  aad: string;
  created: number;
  updated: number;
}

export interface VaultBlob extends VaultHeader {
  ct: string;
  mac: string;
  verifier?: string;
  attempts: number;
}

async function reactorBurn(passphrase: string, salt: Uint8Array, extraIters: number): Promise<void> {
  if (extraIters <= 0) return;
  await deriveMaster(`sxcrypt-reactor-burn|${passphrase}`, salt, extraIters);
}

function headerBytes(h: VaultHeader): Uint8Array {
  return enc.encode(
    JSON.stringify({
      v: h.v, alg: h.alg, kdf: h.kdf, iters: h.iters,
      pSalt: h.pSalt, hSalt: h.hSalt, nonce: h.nonce, aad: h.aad,
      created: h.created, updated: h.updated,
    }),
  );
}

export async function sealVault(
  plaintext: string,
  passphrase: string,
  iters: number,
  prev?: VaultBlob,
): Promise<VaultBlob> {
  const pSalt = prev ? b64.decode(prev.pSalt) : randomBytes(32);
  const hSalt = randomBytes(32);
  const nonce = randomBytes(12);
  const aad = randomBytes(16);
  const master = await deriveMaster(passphrase, pSalt, iters);
  const { enc: encKey, mac: macKey } = await splitKeys(master, hSalt);

  const pt = enc.encode(plaintext);
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bs(nonce), additionalData: bs(aad) } as AesGcmParams,
    encKey,
    bs(pt),
  );
  const ct = new Uint8Array(ctBuf);
  const now = Date.now();
  const header: VaultHeader = {
    v: 1, alg: "AES-256-GCM+HMAC-SHA512", kdf: "PBKDF2-SHA512",
    iters,
    pSalt: b64.encode(pSalt),
    hSalt: b64.encode(hSalt),
    nonce: b64.encode(nonce),
    aad: b64.encode(aad),
    created: prev?.created ?? now,
    updated: now,
  };
  const hb = headerBytes(header);
  const macBuf = await crypto.subtle.sign("HMAC", macKey, bs(concat(hb, ct)));
  const verifierBuf = await crypto.subtle.sign(
    "HMAC",
    macKey,
    bs(enc.encode("sxcrypt|passphrase-verifier|v1")),
  );
  return {
    ...header,
    ct: b64.encode(ct),
    mac: b64.encode(new Uint8Array(macBuf)),
    verifier: b64.encode(new Uint8Array(verifierBuf)),
    attempts: 0,
  };
}

export async function openVault(
  blob: VaultBlob,
  passphrase: string,
  iters: number,
): Promise<
  | { ok: true; plaintext: string }
  | { ok: false; reason: "tamper" | "bad_passphrase" }
> {
  const pSalt = b64.decode(blob.pSalt);
  const hSalt = b64.decode(blob.hSalt);
  const nonce = b64.decode(blob.nonce);
  const aad = b64.decode(blob.aad);
  const ct = b64.decode(blob.ct);
  const macStored = b64.decode(blob.mac);

  await reactorBurn(passphrase, hSalt, Math.max(0, iters - blob.iters));

  const master = await deriveMaster(passphrase, pSalt, blob.iters);
  const { enc: encKey, mac: macKey } = await splitKeys(master, hSalt);

  if (blob.verifier) {
    const verifierComputed = new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        macKey,
        bs(enc.encode("sxcrypt|passphrase-verifier|v1")),
      ),
    );
    if (!ctEqual(verifierComputed, b64.decode(blob.verifier))) {
      return { ok: false, reason: "bad_passphrase" };
    }
  }

  const hb = headerBytes(blob);
  const macComputed = new Uint8Array(
    await crypto.subtle.sign("HMAC", macKey, bs(concat(hb, ct))),
  );
  if (!ctEqual(macComputed, macStored)) {
    return { ok: false, reason: blob.verifier ? "tamper" : "bad_passphrase" };
  }
  try {
    const ptBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bs(nonce), additionalData: bs(aad) } as AesGcmParams,
      encKey,
      bs(ct),
    );
    return { ok: true, plaintext: dec.decode(ptBuf) };
  } catch {
    return { ok: false, reason: "bad_passphrase" };
  }
}

export async function decoyPayload(seed: Uint8Array, branch: number): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    bs(concat(seed, enc.encode(`|decoy|${branch}`))),
  );
  const bytes = new Uint8Array(buf);
  const words = [
    "alpha","bravo","cipher","delta","echo","falcon","gamma","haven",
    "ion","jade","krypton","lumen","mira","nova","orion","pyrex",
    "quartz","raven","sable","tundra","umbra","vega","wraith","xenon",
  ];
  const w = (i: number) => words[bytes[i] % words.length];
  return `# decoy/${branch}\nlabel: ${w(0)}-${w(1)}-${w(2)}\nkey: ${b64.encode(bytes.slice(0, 12))}\nnote: ${w(3)} ${w(4)} ${w(5)}`;
}

// Heuristic passphrase strength (bits) — Shannon-style over character classes.
export function passphraseEntropy(p: string): number {
  if (!p) return 0;
  let pool = 0;
  if (/[a-z]/.test(p)) pool += 26;
  if (/[A-Z]/.test(p)) pool += 26;
  if (/[0-9]/.test(p)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(p)) pool += 33;
  return Math.round(Math.log2(Math.max(pool, 2)) * p.length);
}
