/**
 * SmartCondo - SePay High-Security AES-256-CBC Cryptography Module
 *
 * Chuẩn mã hóa gói tin SePay:
 * - Thuật toán: AES-256-CBC với PKCS7 padding chuẩn
 * - Khóa bí mật (AES_SECRET_KEY): đúng 32 bytes UTF-8
 * - Vector khởi tạo (IV): 16 bytes ngẫu nhiên, mã hóa Base64
 * - Gói tin HTTP Body: { "iv": "...", "data": "..." }
 */

export const DEFAULT_SEPAY_AES_KEY = "SePaySecretKey2026_AES256Secure!";
export const DEFAULT_SEPAY_API_URL = "https://trantien.id.vn/webcheck/api.php";
export const DEFAULT_SEPAY_WEBHOOK_URL = "https://trantien.id.vn/webcheck/sepaywebhook.php";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(secretKey: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(secretKey);
  if (keyBytes.length !== 32) {
    throw new Error(`AES_SECRET_KEY phải có độ dài chính xác 32 bytes (hiện tại: ${keyBytes.length} bytes).`);
  }
  return window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Mã hóa dữ liệu JSON thành gói tin { iv, data }
 */
export async function encryptPayload<T = unknown>(
  payload: T,
  secretKey: string = DEFAULT_SEPAY_AES_KEY
): Promise<{ iv: string; data: string }> {
  const cryptoKey = await getCryptoKey(secretKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const plainText = JSON.stringify(payload);
  const plainBytes = new TextEncoder().encode(plainText);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv: iv as unknown as BufferSource },
    cryptoKey,
    plainBytes as unknown as BufferSource
  );

  return {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipherBuffer)),
  };
}

/**
 * Giải mã gói tin { iv, data } thành đối tượng JSON
 */
export async function decryptPayload<T = unknown>(
  packet: { iv: string; data: string },
  secretKey: string = DEFAULT_SEPAY_AES_KEY
): Promise<T> {
  if (!packet || typeof packet.iv !== "string" || typeof packet.data !== "string") {
    throw new Error("Gói tin mã hóa không hợp lệ. Cần chứa 'iv' và 'data'.");
  }

  const iv = base64ToBytes(packet.iv);
  if (iv.length !== 16) {
    throw new Error("Invalid IV length. IV phải đúng 16 bytes.");
  }

  const cipherBytes = base64ToBytes(packet.data);
  const cryptoKey = await getCryptoKey(secretKey);

  try {
    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv: iv as unknown as BufferSource },
      cryptoKey,
      cipherBytes as unknown as BufferSource
    );
    const plainText = new TextDecoder().decode(plainBuffer);
    return JSON.parse(plainText) as T;
  } catch (error) {
    throw new Error("AES Decryption failed. Khóa AES_SECRET_KEY không khớp hoặc dữ liệu bị can thiệp.");
  }
}
