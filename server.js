/* =========================================================
   GRAND THEFT BICYCLE — 서버 (Render 대응)
   - Express + Neon Postgres (vegas-slots ns_players 자금 실시간 연동)
   - ONEID SSO 지원
   - 5분 자전거 버티기 100만원 보상 챌린지 API
   ========================================================= */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { initSchema, isDbAvailable, getPlayer, adjustBalance } from './lib/db.js';
import { requireAuth, ONEID_URL, CLIENT_ID } from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5506);
const SLOTS_URL = (process.env.SLOTS_URL || 'https://vegas-slots-2izy.onrender.com').replace(/\/$/, '');

await initSchema();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- 1. 상태 및 공개 설정 ----------
app.get('/api/health', (req, res) => res.json({ ok: true, db: isDbAvailable() }));

app.get('/api/config', (req, res) => res.json({
  gameTitle: 'GRAND THEFT BICYCLE (엄복동의 도시)',
  oneidUrl: (process.env.ONEID_PUBLIC_URL || ONEID_URL).replace(/\/$/, ''),
  clientId: CLIENT_ID,
  slotsUrl: SLOTS_URL,
  dbConnected: isDbAvailable()
}));

// ---------- 2. 플레이어 상태 & 베가스 슬롯 연동 잔고 조회 ----------
app.get('/api/player', requireAuth, async (req, res) => {
  try {
    const player = await getPlayer(req.user.id, req.user.name);
    res.json({
      id: player.id,
      name: player.name,
      balance: player.balance, // 베가스 슬롯 공유 자금!
      credit: player.credit,
      slotsUrl: SLOTS_URL
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 3. 장물아비 자전거 매각 (베가스 슬롯 자금 입금) ----------
app.post('/api/fence/sell', requireAuth, async (req, res) => {
  try {
    const { bikeName, amount } = req.body || {};
    const sellAmount = Math.max(0, Number(amount) || 0);

    if (sellAmount <= 0) {
      return res.status(400).json({ error: '유효하지 않은 금액' });
    }

    const newBalance = await adjustBalance(
      req.user.id,
      sellAmount,
      'bike_fence_sale',
      bikeName || '자전거 장물 매각'
    );

    res.json({
      ok: true,
      soldAmount: sellAmount,
      balance: newBalance,
      message: `장물 매각 완료! 슬롯 자금에 +₩${sellAmount.toLocaleString()} 입금되었습니다.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 4. [핵심] 자전거 5분 버티기 챌린지 (슬롯 자금 +100만원!) ----------
app.post('/api/challenge/survival-reward', requireAuth, async (req, res) => {
  try {
    const { bikeType, durationSeconds } = req.body || {};
    const seconds = Number(durationSeconds) || 0;

    // 5분(300초) 이상 버텼는지 체크
    if (seconds < 299) {
      return res.status(400).json({
        error: `5분(300초)을 버텨야 합니다. (현재: ${Math.floor(seconds)}초)`
      });
    }

    const REWARD = 1000000; // 백만원!
    const newBalance = await adjustBalance(
      req.user.id,
      REWARD,
      'bike_survival_5min_bonus',
      `자전거 사수 챌린지 성공 (${bikeType || '자전거'})`
    );

    res.json({
      ok: true,
      reward: REWARD,
      balance: newBalance,
      message: `🎉 [챌린지 대성공] 자전거로 5분간 경찰과 시민을 피해 버텨냈습니다! 베가스 슬롯 자금에 ₩1,000,000이 즉시 입금되었습니다!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 5. BUSTED 체포 벌금 차감 ----------
app.post('/api/police/bail', requireAuth, async (req, res) => {
  try {
    const { fine } = req.body || {};
    const fineAmount = Math.max(0, Number(fine) || 0);

    const newBalance = await adjustBalance(
      req.user.id,
      -fineAmount,
      'police_busted_fine',
      '경찰 현행범 검거 보석금'
    );

    res.json({ ok: true, fine: fineAmount, balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 6. 장비 업그레이드 자금 차감 ----------
app.post('/api/shop/upgrade', requireAuth, async (req, res) => {
  try {
    const { cost, upgradeName } = req.body || {};
    const costAmount = Math.max(0, Number(cost) || 0);

    const player = await getPlayer(req.user.id, req.user.name);
    if (player.balance < costAmount) {
      return res.status(400).json({ error: '슬롯 잔고가 부족합니다!' });
    }

    const newBalance = await adjustBalance(
      req.user.id,
      -costAmount,
      'bike_shop_upgrade',
      upgradeName || '장비 업그레이드'
    );

    res.json({ ok: true, cost: costAmount, balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 클라이언트 SPA 라우팅
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚲 GRAND THEFT BICYCLE — 엄복동의 도시 (포트: ${PORT})`);
  console.log(`🎰 베가스 슬롯 자금 연동: ${SLOTS_URL}`);
  console.log(`🔐 ONEID SSO 연동: ${ONEID_URL}`);
  console.log(`====================================================`);
});
