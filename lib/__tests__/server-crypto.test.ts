/**
 * @jest-environment node
 */
import { randomBytes } from "crypto";
import {
  ENC_PREFIX,
  decryptField,
  encryptField,
  isEncrypted,
  isEncryptionConfigured,
  resetEncryptionKeyCache,
} from "../server/crypto";

describe("lib/server/crypto", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    resetEncryptionKeyCache();
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalKey;
    resetEncryptionKeyCache();
  });

  it("round-trips and never stores the token in clear", () => {
    const token = "EAAB-long-lived-page-token";
    const stored = encryptField(token)!;
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain(token);
    expect(decryptField(stored)).toBe(token);
  });

  it("is idempotent and tolerant of legacy plaintext", () => {
    const once = encryptField("abc")!;
    expect(encryptField(once)).toBe(once);
    expect(decryptField("plaintext-legacy")).toBe("plaintext-legacy");
    expect(encryptField(null)).toBeNull();
    expect(decryptField(null)).toBeNull();
  });

  it("rejects tampered ciphertext and wrong keys", () => {
    const stored = encryptField("segredo")!;
    const parts = stored.slice(ENC_PREFIX.length).split(".");
    const ct = Buffer.from(parts[2], "base64url");
    ct[0] ^= 0xff;
    expect(() =>
      decryptField(`${ENC_PREFIX}${parts[0]}.${parts[1]}.${ct.toString("base64url")}`)
    ).toThrow();

    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");
    resetEncryptionKeyCache();
    expect(() => decryptField(stored)).toThrow();
  });

  it("reports a missing/invalid key clearly", () => {
    delete process.env.ENCRYPTION_KEY;
    resetEncryptionKeyCache();
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encryptField("x")).toThrow(/ENCRYPTION_KEY não configurada/);
  });
});
