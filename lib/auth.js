/* =========================================================
   GRAND THEFT BICYCLE — Auth Module (ONEID SSO & Guest)
   ========================================================= */
import { getPlayer } from './db.js';

export const ONEID_URL = (process.env.ONEID_URL || 'https://oneid-icvq.onrender.com').replace(/\/$/, '');
export const CLIENT_ID = process.env.ONEID_CLIENT_ID || 'grandtheftbicycle';

const CACHE_MS = 60_000;
const cache = new Map(); // token -> { user, until }

export class AuthError extends Error {
  constructor(msg, status = 401) { super(msg); this.status = status; }
}

function decodePayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch { return null; }
}

export async function verifyToken(token) {
  if (!token) throw new AuthError('로그인이 필요합니다.');

  // 1. 게스트 모드 토큰 지원
  if (token.startsWith('guest_')) {
    const parts = token.split('_');
    const guestId = parts.slice(0, 2).join('_');
    const guestName = decodeURIComponent(parts[2] || '익명의자전거도둑');
    const player = await getPlayer(guestId, guestName);
    return { id: player.id, name: player.name, isGuest: true };
  }

  // 2. 캐시 확인
  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.user;

  // 3. ONEID 검증
  let res;
  try {
    res = await fetch(`${ONEID_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    // 오프라인 시 payload 파싱 허용
    const p = decodePayload(token);
    if (p && p.sub) {
      const uid = String(p.sub);
      const name = String(p.nickname || p.username || 'ONEID라이더').slice(0, 20);
      const player = await getPlayer(uid, name);
      return { id: player.id, name: player.name, isOffline: true };
    }
    throw new AuthError('ONEID 인증 서버에 연결할 수 없습니다.', 503);
  }

  if (!res.ok) {
    cache.delete(token);
    const body = await res.json().catch(() => ({}));
    throw new AuthError(body.detail || '로그인이 만료되었습니다.', res.status === 403 ? 403 : 401);
  }

  const me = await res.json();
  const uid = String(me.id || me.sub);
  const name = String(me.nickname || me.username || 'ONEID라이더').slice(0, 20);
  const player = await getPlayer(uid, name);

  const user = { id: player.id, name: player.name, email: me.email };
  cache.set(token, { user, until: Date.now() + CACHE_MS });
  return user;
}

export async function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : (req.query.token || null);
  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message });
  }
}
