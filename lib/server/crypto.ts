// Criptografia de campos sensíveis em repouso (token do Instagram etc.) — AES-256-GCM.
// SOMENTE para uso em rotas de servidor (nunca importar em componentes client).
//
// Formato gravado no banco:  enc:v1:<iv>.<tag>.<ciphertext>   (base64url)
// Valores sem o prefixo são legado em texto puro e passam por decryptField()
// sem alteração — permite publicar o código antes de recifrar os dados antigos
// (a leitura em lib/server/instagram-connection.ts recifra automaticamente).
//
// Chave: env ENCRYPTION_KEY com 32 bytes — base64 (`openssl rand -base64 32`)
// ou hex de 64 caracteres. Formato idêntico ao helper do backend
// (isoscanning-backend/src/shared/infrastructure/crypto/field-encryption.ts).

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export const ENC_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

export class EncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionKeyError";
  }
}

export const ENCRYPTION_KEY_MISSING_MSG =
  "ENCRYPTION_KEY não configurada no .env.local. Gere com `openssl rand -base64 32` e reinicie o servidor.";

function parseKey(raw: string): Buffer {
  const value = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 32) return decoded;
  throw new EncryptionKeyError(
    "ENCRYPTION_KEY inválida: precisa ter 32 bytes — use `openssl rand -base64 32` (44 caracteres) ou 64 caracteres hex."
  );
}

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || !raw.trim()) throw new EncryptionKeyError(ENCRYPTION_KEY_MISSING_MSG);
  cachedKey = parseKey(raw);
  return cachedKey;
}

export function resetEncryptionKeyCache(): void {
  cachedKey = null;
}

export function isEncryptionConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

export function encryptField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return null;
  if (isEncrypted(plain)) return plain;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, loadKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENC_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptField(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === "") return null;
  if (!isEncrypted(stored)) return stored;

  const parts = stored.slice(ENC_PREFIX.length).split(".");
  if (parts.length !== 3) throw new Error("Valor cifrado em formato inválido.");
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64url"));
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Valor cifrado em formato inválido.");
  }

  const decipher = createDecipheriv(ALGORITHM, loadKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
