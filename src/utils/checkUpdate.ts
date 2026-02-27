const RELEASES_API =
  'https://api.github.com/repos/kanan4gh/dev-tasks2/releases/latest';
const RELEASES_URL = 'https://github.com/kanan4gh/dev-tasks2/releases/latest';
const TIMEOUT_MS = 2000;

// major.minor.patch の数値比較で current < latest かどうかを判定する
export function isNewer(current: string, latest: string): boolean {
  const parse = (v: string): [number, number, number] => {
    const [maj = 0, min = 0, pat = 0] = v.split('.').map(Number);
    return [maj, min, pat];
  };
  const [cMaj, cMin, cPat] = parse(current);
  const [lMaj, lMin, lPat] = parse(latest);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

/**
 * GitHub Releases から最新バージョンを取得し、アップデートがあれば通知文字列を返す。
 * ネットワークエラー・タイムアウト・404 時は null を返す（クラッシュしない）。
 */
export async function checkUpdate(
  currentVersion: string
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(RELEASES_API, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return null;

    const data = (await response.json()) as { tag_name?: string };
    const tagName = data.tag_name;
    if (typeof tagName !== 'string') return null;

    // "v0.3.0" → "0.3.0"
    const latestVersion = tagName.replace(/^v/, '');

    if (!isNewer(currentVersion, latestVersion)) return null;

    return (
      `\n✨ アップデートがあります: ${currentVersion} → ${latestVersion}\n` +
      `   最新版: ${RELEASES_URL}`
    );
  } catch {
    return null;
  }
}
