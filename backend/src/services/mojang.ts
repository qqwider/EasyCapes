const HAS_JOINED_URL = "https://sessionserver.mojang.com/session/minecraft/hasJoined";

export async function verifyMojangSession(
  name: string,
  uuid: string,
  serverId: string,
): Promise<boolean> {
  const url = `${HAS_JOINED_URL}?username=${encodeURIComponent(name)}&serverId=${encodeURIComponent(serverId)}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(7000) });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return false;
  }
  const expected = uuid.replace(/-/g, "").toLowerCase();
  return (
    typeof body === "object" &&
    body !== null &&
    "id" in body &&
    typeof (body as { id: unknown }).id === "string" &&
    ((body as { id: string }).id === expected ||
      normalizeUuid((body as { id: string }).id) === uuid.toLowerCase())
  );
}

export function normalizeUuid(short: string): string {
  const s = short.replace(/-/g, "").toLowerCase();
  if (s.length !== 32) return short;
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
