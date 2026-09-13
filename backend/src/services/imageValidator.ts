import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ApiError } from "../lib/errors.js";
import { sha256hex } from "../lib/crypto.js";

export interface ImageCheck {
  width: number;
  height: number;
  hash: string;
  data: Buffer;
  mime: string;
}

export interface DownloadLimits {
  maxTextureBytes: number;
  maxStaticWidth: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function fetchAndValidateImage(
  rawUrl: string,
  limits: DownloadLimits,
): Promise<ImageCheck> {
  let url = assertSafeUrl(rawUrl);
  let data: Buffer | null = null;
  let contentType = "";

  for (let redirects = 0; redirects < 3; redirects++) {
    await assertSafeHost(url.hostname);
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw ApiError.badRequest("DOWNLOAD_FAILED", "Редирект без Location");
      url = assertSafeUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) throw ApiError.badRequest("DOWNLOAD_FAILED", `Сервер вернул ${res.status}`);
    const declared = res.headers.get("content-length");
    if (declared && Number(declared) > limits.maxTextureBytes) {
      throw ApiError.badRequest("INVALID_IMAGE", "Файл слишком большой");
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > limits.maxTextureBytes) {
      throw ApiError.badRequest("INVALID_IMAGE", "Файл слишком большой");
    }
    contentType = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    data = buf;
    break;
  }

  if (!data) throw ApiError.badRequest("DOWNLOAD_FAILED", "Не удалось скачать файл");

  switch (contentType) {
    case "image/png":
      return validatePng(data);
    case "image/gif":
      throw ApiError.badRequest("INVALID_IMAGE", "GIF-плащи пока не поддерживаются");
    default:
      throw ApiError.badRequest("INVALID_IMAGE", `Неподдерживаемый тип: ${contentType || "unknown"}`);
  }
}

export function validatePng(data: Buffer): ImageCheck {
  if (data.length < 33 || !data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw ApiError.badRequest("INVALID_IMAGE", "Это не PNG-файл");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ihdrLength = view.getUint32(8);
  const ihdrType = data.readUInt32BE(12);
  if (ihdrLength !== 13 || ihdrType !== 0x49484452) {
    throw ApiError.badRequest("INVALID_IMAGE", "Некорректный PNG (нет IHDR)");
  }
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  checkCapeDimensions(width, height, 4096, 2048);
  return { width, height, hash: sha256hex(data), data, mime: "image/png" };
}

export function checkCapeDimensions(width: number, height: number, maxW: number, maxH: number): void {
  if (height === 0 || width !== height * 2) {
    throw ApiError.badRequest("INVALID_IMAGE", `Соотношение сторон должно быть 2:1, получено ${width}×${height}`);
  }
  if (width % 64 !== 0) {
    throw ApiError.badRequest("INVALID_IMAGE", `Ширина должна быть кратна 64, получено ${width}`);
  }
  if (width > maxW || height > maxH) {
    throw ApiError.badRequest("INVALID_IMAGE", `Максимальный размер ${maxW}×${maxH}, получено ${width}×${height}`);
  }
}

export function assertSafeUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw ApiError.badRequest("INVALID_URL", "Некорректный URL");
  }
  if (url.protocol !== "https:") {
    throw ApiError.badRequest("INVALID_URL", "Разрешены только HTTPS-ссылки");
  }
  if (isPrivateIp(url.hostname)) {
    throw ApiError.badRequest("INVALID_URL", "Приватные адреса запрещены");
  }
  return url;
}

export function isPrivateIp(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (bare === "localhost" || bare.endsWith(".localhost") || bare.endsWith(".local") || bare.endsWith(".internal")) {
    return true;
  }
  const version = isIP(bare);
  if (version === 4) return isPrivateV4(bare);
  if (version === 6) return isPrivateV6(bare);
  return false;
}

function isPrivateV4(ip: string): boolean {
  const parts = ip.split(".").map(Number) as [number, number, number, number];
  if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateV6(ip: string): boolean {
  const low = ip.toLowerCase();
  if (low === "::1" || low === "::" || low === "0:0:0:0:0:0:0:1") return true;
  if (low.startsWith("fe80") || low.startsWith("fc") || low.startsWith("fd")) return true;
  if (low.startsWith("::ffff:")) {
    const v4 = low.slice(7);
    return v4.includes(".") && isPrivateV4(v4);
  }
  return false;
}

export async function assertSafeHost(hostname: string): Promise<void> {
  if (isPrivateIp(hostname)) {
    throw ApiError.badRequest("INVALID_URL", "Приватные адреса запрещены");
  }
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0) {
      throw ApiError.badRequest("INVALID_URL", "Не удалось определить адрес хоста");
    }
    for (const { address } of addresses) {
      if (isPrivateIp(address)) {
        throw ApiError.badRequest("INVALID_URL", "Хост указывает на приватный адрес");
      }
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw ApiError.badRequest("INVALID_URL", "Не удалось определить адрес хоста");
  }
}
