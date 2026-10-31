/**
 * GRAND THEFT BICYCLE - 엄복동의 도시
 * Retro GTA 1 Style Top-down Bicycle Theft & Fencing Simulator
 * - Vegas Slots (ns_players) 실시간 잔고 연동
 * - 5분 자전거 사수 챌린지 (+₩1,000,000 슬롯 자금 지급)
 * - 7200x7200 대형 광역 맵 & 좁은 골목길 탈출로
 * - 고정 스폰 포인트 (신림동 은신처 / 강남경찰서 정문 석방)
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

// Game World Size: 7200 x 7200 (대형 광역 맵)
const WORLD_WIDTH = 7200;
const WORLD_HEIGHT = 7200;

// 고정 스폰 포인트 (건물 충돌 없는 안전한 광장 좌표)
const FIXED_SPAWNS = {
  START_SAFEHOUSE: { x: 1200, y: 1480, name: '신림동 은신처 앞 광장' },
  POLICE_PRECINCT: { x: 3870, y: 4050, name: '강남경찰서 정문 광장' },
  CHOP_SHOP: { x: 6200, y: 1100, w: 320, h: 260, name: '외곽 폐차장 장물아비 컨테이너' }
};

// Bicycle Database Definitions
const BIKE_TYPES = {
  DDAREUNGI: {
    name: '서울 따릉이',
    desc: '공공자전거. 자물쇠가 허술해서 발로 차도 열릴 수준.',
    color: '#00c853',
    accentColor: '#ffffff',
    basePrice: 25000,
    lockTime: 1.5,
    maxSpeed: 5.5,
    accel: 0.22,
    handling: 0.055,
    heat: 1,
    hasDeliveryBox: false
  },
  SAMCHULY: {
    name: '삼천리 생활 하이브리드',
    desc: '출퇴근용 국민 자전거. 다이소 와이어 자물쇠 장착.',
    color: '#0288d1',
    accentColor: '#b0bec5',
    basePrice: 120000,
    lockTime: 2.8,
    maxSpeed: 6.8,
    accel: 0.26,
    handling: 0.06,
    heat: 1,
    hasDeliveryBox: false
  },
  FIXIE: {
    name: '엔진11 트릭 픽시',
    desc: '노브레이크 폭주족 픽시. 가속이 미쳤지만 브레이크가 밀림!',
    color: '#e91e63',
    accentColor: '#00e5ff',
    basePrice: 450000,
    lockTime: 4.2,
    maxSpeed: 8.8,
    accel: 0.35,
    handling: 0.075,
    heat: 2,
    hasDeliveryBox: false
  },
  EBIKE: {
    name: '배민 라이더 전기자전거',
    desc: '스로틀 모터 장착! 스태미나 소모 없이 폭풍 가속.',
    color: '#26c6da',
    accentColor: '#212121',
    basePrice: 850000,
    lockTime: 5.0,
    maxSpeed: 8.5,
    accel: 0.40,
    handling: 0.05,
    heat: 2,
    hasDeliveryBox: true
  },
  SWORKS: {
    name: '에스웍스 타막 SL8 카본로드',
    desc: '풀카본 천만원대 기함급 로드! 최고속도 최상. 분노의 주인 추격!',
    color: '#212121',
    accentColor: '#ffd700',
    basePrice: 4200000,
    lockTime: 7.2,
    maxSpeed: 11.5,
    accel: 0.46,
    handling: 0.07,
    heat: 3,
    hasDeliveryBox: false
  }
};

// Tools Database
const TOOLS = [
  { name: '다이소 펜치 (Lv.1)', speedMult: 1.0, nextCost: 200000, nextName: '공업용 볼트 커터 (Lv.2)' },
  { name: '공업용 볼트 커터 (Lv.2)', speedMult: 2.2, nextCost: 800000, nextName: '유압 충전 절단기 (Lv.3)' },
  { name: '유압 충전 절단기 (Lv.3)', speedMult: 4.0, nextCost: 2500000, nextName: '암시장 플라즈마 토치 (MAX)' },
  { name: '암시장 플라즈마 토치 (MAX)', speedMult: 8.0, nextCost: 0, nextName: '최대 레벨' }
];

// District Zones Database (7200 x 7200)
const DISTRICTS = [
  { x1: 0, y1: 0, x2: 2400, y2: 2400, name: '📍 신림동 은신처 & 구도심 주택가' },
  { x1: 2400, y1: 0, x2: 4800, y2: 2400, name: '📍 성수동 카페거리 & 좁은 골목길' },
  { x1: 4800, y1: 0, x2: 7200, y2: 2400, name: '📍 외곽 폐차장 & 장물아비 아지트' },
  { x1: 0, y1: 2400, x2: 2400, y2: 4800, name: '📍 여의도 금융업무지구 & 따릉이 허브' },
  { x1: 2400, y1: 2400, x2: 4800, y2: 4800, name: '📍 강남 테헤란로 중심가 & 경찰서 본청' },
  { x1: 4800, y1: 2400, x2: 7200, y2: 4800, name: '📍 청담 & 압구정 초호화 명품 부촌' },
  { x1: 0, y1: 4800, x2: 2400, y2: 7200, name: '📍 노량진 고시촌 & 먹자골목' },
  { x1: 2400, y1: 4800, x2: 4800, y2: 7200, name: '📍 한강 시민공원 & 자전거 고속도로' },
  { x1: 4800, y1: 4800, x2: 7200, y2: 7200, name: '📍 잠실 올림픽 단지 & 대형 환승센터' },
];

// Game State
const state = {
  isRunning: false,
  isPaused: false,
  isBusted: false,
  authToken: null,
  userId: null,
  userName: '익명의자전거도둑',
  cash: 0, // Vegas Slots 연동 잔고

  // 5-Minute Survival Challenge (백만원 보상)
  challengeRemaining: 300, // 300 seconds = 5 minutes
  challengeMax: 300,
  challengeDismountGrace: 30, // 30s grace period when dismounted
  challengeActive: false,
  challengeCompletedCount: 0,

  wantedLevel: 0, // 0 to 5
  wantedDecayTimer: 0,
  toolLevel: 0,
  maxStamina: 100,
  stamina: 100,
  staminaUpgradeLevel: 0,

  // Camera
  camX: 0,
  camY: 0,

  // Theft interaction
  targetBike: null,
  isCutting: false,
  cutProgress: 0,

  // Entities
  player: null,
  bikes: [],
  pedestrians: [],
  policeList: [],
  buildings: [],
  roads: [],
  alleys: [], // Narrow alleyways for bikes only
  racks: [],
  particles: []
};

// Input
const keys = {};

// =========================================================
// 1. ONEID / Vegas Slots OAuth PKCE 인증 및 잔고 동기화
// =========================================================
const PKCE_KEY = 'gtb_pkce';
const AUTH_KEY = 'gtb_token';
const redirectUri = () => window.location.origin + '/';
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function startOneidLogin() {
  localStorage.removeItem(AUTH_KEY);

  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = b64url(new Uint8Array(digest));
  const stateVal = b64url(crypto.getRandomValues(new Uint8Array(18)));

  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state: stateVal }));

  const oneid = 'https://oneid-icvq.onrender.com';
  const loginUrl = `${oneid}/login.html?` + new URLSearchParams({
    client_id: 'grandtheftbicycle',
    redirect_uri: redirectUri(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: stateVal
  });

  window.location.assign(loginUrl);
}

async function handleOauthCallback() {
  const p = new URLSearchParams(window.location.search);
  const code = p.get('code');
  if (!code) {
    const directToken = p.get('token');
    if (directToken) {
      state.authToken = directToken;
      localStorage.setItem(AUTH_KEY, directToken);
      localStorage.setItem('ns_auth', JSON.stringify({ token: directToken }));
      window.history.replaceState(null, '', window.location.pathname);
    }
    return;
  }

  const saved = JSON.parse(sessionStorage.getItem(PKCE_KEY) || 'null');
  sessionStorage.removeItem(PKCE_KEY);
  window.history.replaceState(null, '', window.location.pathname);

  if (!saved || saved.state !== p.get('state')) {
    console.warn('OAuth State validation failed');
    return;
  }

  try {
    const res = await fetch('https://oneid-icvq.onrender.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'grandtheftbicycle',
        redirect_uri: redirectUri(),
        code: code,
        code_verifier: saved.verifier
      })
    });

    const d = await res.json().catch(() => ({}));
    if (res.ok && d.access_token) {
      state.authToken = d.access_token;
      localStorage.setItem(AUTH_KEY, d.access_token);
      localStorage.setItem('ns_auth', JSON.stringify({ token: d.access_token }));
      showBanner('🎉 ONEID 로그인 성공!', '베가스 슬롯 자금 및 계정이 실시간 연동되었습니다!');
    } else {
      console.error('ONEID token exchange failed:', d);
    }
  } catch (err) {
    console.error('ONEID callback error:', err);
  }
}

async function initAuthAndBalance() {
  // 1) OAuth 콜백 처리 (?code=...)
  await handleOauthCallback();

  // 2) 토큰 로드 (gtb_token 또는 ns_auth)
  let savedToken = localStorage.getItem(AUTH_KEY);
  if (!savedToken) {
    try {
      const raw = localStorage.getItem('ns_auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token) savedToken = parsed.token;
      }
    } catch (e) {}
  }

  // 3) 없으면 게스트 토큰 자동 생성
  if (!savedToken) {
    let guestId = localStorage.getItem('gtb_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.floor(Math.random() * 899999 + 100000);
      localStorage.setItem('gtb_guest_id', guestId);
    }
    savedToken = `${guestId}_엄복동`;
  }

  state.authToken = savedToken;

  // 4) 서버에서 내 상태 & 베가스 슬롯 잔고 조회
  try {
    const res = await fetch('/api/player', {
      headers: { Authorization: `Bearer ${state.authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      state.userId = data.id;
      state.userName = data.name;
      state.cash = Number(data.balance) || 0;
      document.getElementById('user-display-name').innerText = state.userName;
      document.getElementById('cash-value').innerText = state.cash.toLocaleString();

      const isOneidUser = !state.authToken.startsWith('guest_');
      const authBtn = document.getElementById('btn-oneid-login');
      if (authBtn) {
        authBtn.innerText = isOneidUser ? `👤 ${state.userName} (연동됨)` : 'ONEID 로그인 (내 슬롯 계정 연동)';
      }
    }
  } catch (e) {
    console.warn('서버 잔고 동기화 대기 중 (오프라인 모드):', e.message);
  }
}

// =========================================================
// 2. 5분 자전거 사수 챌린지 (백만원 보상!)
// =========================================================
async function updateSurvivalChallenge(dt) {
  const isRiding = state.player.currentBike !== null;
  const challengeTimerEl = document.getElementById('challenge-timer');
  const challengeBarEl = document.getElementById('challenge-bar-fill');
  const challengeStatusEl = document.getElementById('challenge-status-text');

  if (isRiding) {
    state.challengeActive = true;
    state.challengeDismountGrace = 30; // Reset grace period
    state.challengeRemaining = Math.max(0, state.challengeRemaining - dt);

    // Percentage
    const pct = ((state.challengeMax - state.challengeRemaining) / state.challengeMax) * 100;
    challengeBarEl.style.width = pct + '%';

    // Format MM:SS
    const mins = Math.floor(state.challengeRemaining / 60);
    const secs = Math.floor(state.challengeRemaining % 60);
    challengeTimerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    challengeStatusEl.innerText = `자전거 질주 중! (5분 버티면 슬롯 자금 +₩1,000,000!)`;
    challengeStatusEl.style.color = '#76ff03';

    // 챌린지 성공 조건 달성! (0초 도달)
    if (state.challengeRemaining <= 0) {
      await triggerSurvivalReward();
    }

  } else if (state.challengeActive) {
    // 자전거에서 내린 상태: 30초 유예 시간 카운트다운
    state.challengeDismountGrace -= dt;
    challengeStatusEl.innerText = `⚠️ 자전거 하차 상태! (${Math.ceil(state.challengeDismountGrace)}초 내 미탑승 시 타이머 초기화)`;
    challengeStatusEl.style.color = '#ff9100';

    if (state.challengeDismountGrace <= 0) {
      // 초기화
      state.challengeRemaining = state.challengeMax;
      state.challengeActive = false;
      challengeBarEl.style.width = '0%';
      challengeTimerEl.innerText = '05:00';
      challengeStatusEl.innerText = '타이머 초기화됨. 자전거를 타고 다시 도전하세요!';
      challengeStatusEl.style.color = '#ff5252';
    }
  }
}

async function triggerSurvivalReward() {
  state.challengeRemaining = state.challengeMax; // Reset for next streak
  state.challengeCompletedCount++;

  const bikeName = state.player.currentBike?.stats?.name || '자전거';

  try {
    const res = await fetch('/api/challenge/survival-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.authToken}`
      },
      body: JSON.stringify({ bikeType: bikeName, durationSeconds: 300 })
    });

    if (res.ok) {
      const data = await res.json();
      state.cash = data.balance; // 최신 슬롯 잔고 갱신!
    } else {
      state.cash += 1000000;
    }
  } catch (e) {
    state.cash += 1000000;
  }

  // Celebration Audio & Visuals
  window.soundEngine.playCash();
  window.soundEngine.playBell();

  // Show GTA Style Mission Passed Banner
  const banner = document.getElementById('mission-passed-banner');
  banner.classList.remove('hidden');

  // Spawn cash fireworks particles
  for (let i = 0; i < 40; i++) {
    spawnParticle(state.player.x, state.player.y, '#ffd700', 4, 45);
    spawnParticle(state.player.x, state.player.y, '#00e5ff', 3, 40);
  }

  setTimeout(() => {
    banner.classList.add('hidden');
  }, 4800);
}

// =========================================================
// 3. Player Object (고정 스폰: 신림동 은신처)
// =========================================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 0;
    this.currentBike = null;
    this.radius = 14;
    this.pedalCooldown = 0;
  }

  update() {
    if (state.isBusted) return;

    const isRiding = this.currentBike !== null;
    let turnSpeed = 0.07;
    let maxSpeed = 3.0;
    let accel = 0.16;
    let friction = 0.92;

    if (isRiding) {
      const stats = this.currentBike.stats;
      turnSpeed = stats.handling;
      maxSpeed = stats.maxSpeed;
      accel = stats.accel;
      friction = 0.96;
    }

    // Steering
    if (keys['ArrowLeft'] || keys['KeyA']) {
      this.angle -= turnSpeed * (isRiding ? Math.min(1.2, Math.max(0.3, Math.abs(this.speed) / 2)) : 1);
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
      this.angle += turnSpeed * (isRiding ? Math.min(1.2, Math.max(0.3, Math.abs(this.speed) / 2)) : 1);
    }

    // Throttle
    if (keys['ArrowUp'] || keys['KeyW']) {
      this.speed += accel;
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
      this.speed -= accel * 0.7;
    }

    // Sprinting / Pedaling (Space)
    const isSprinting = (keys['Space'] || keys['ShiftLeft']) && state.stamina > 0;
    if (isSprinting && (keys['ArrowUp'] || keys['KeyW'])) {
      if (isRiding) {
        const drain = this.currentBike.typeKey === 'EBIKE' ? 0.04 : 0.45;
        state.stamina = Math.max(0, state.stamina - drain);
        this.speed += accel * 1.6;
        maxSpeed *= 1.45;

        this.pedalCooldown--;
        if (this.pedalCooldown <= 0) {
          window.soundEngine.playPedal();
          this.pedalCooldown = 11;
        }

        if (Math.random() < 0.35) {
          spawnParticle(this.x, this.y, 'rgba(80,80,80,0.5)', 3, 20);
        }
      } else {
        state.stamina = Math.max(0, state.stamina - 0.5);
        maxSpeed = 5.0;
        this.speed += accel * 1.3;
      }
    } else {
      const regen = (1.0 + state.staminaUpgradeLevel * 0.4) * 0.28;
      state.stamina = Math.min(state.maxStamina, state.stamina + regen);
    }

    this.speed = Math.max(-maxSpeed * 0.5, Math.min(maxSpeed, this.speed));
    this.speed *= friction;

    // Anti-stuck resolution before moving
    resolveBuildingOverlap(this);

    const moveX = Math.cos(this.angle) * this.speed;
    const moveY = Math.sin(this.angle) * this.speed;

    // Sliding collision check
    if (!checkBuildingCollision(this.x + moveX, this.y + moveY, this.radius)) {
      this.x += moveX;
      this.y += moveY;
    } else {
      // Try X slide
      if (!checkBuildingCollision(this.x + moveX, this.y, this.radius)) {
        this.x += moveX;
        this.speed *= 0.85;
      }
      // Try Y slide
      else if (!checkBuildingCollision(this.x, this.y + moveY, this.radius)) {
        this.y += moveY;
        this.speed *= 0.85;
      } else {
        this.speed *= -0.25;
        window.soundEngine.playCrash();
      }
    }

    // Safety: ensure player is never inside any wall
    resolveBuildingOverlap(this);

    this.x = Math.max(40, Math.min(WORLD_WIDTH - 40, this.x));
    this.y = Math.max(40, Math.min(WORLD_HEIGHT - 40, this.y));

    if (this.currentBike) {
      this.currentBike.x = this.x;
      this.currentBike.y = this.y;
      this.currentBike.angle = this.angle;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.currentBike) {
      const stats = this.currentBike.stats;

      // Wheels
      ctx.fillStyle = '#111';
      ctx.fillRect(-18, -3, 9, 6);
      ctx.fillRect(11, -3, 9, 6);

      // Frame
      ctx.strokeStyle = stats.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(13, 0);
      ctx.stroke();

      // Handlebars
      ctx.fillStyle = stats.accentColor;
      ctx.fillRect(8, -10, 4, 20);

      // Saddle
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.ellipse(-8, 0, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Delivery Box
      if (stats.hasDeliveryBox) {
        ctx.fillStyle = '#26c6da';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-22, -8, 11, 16);
        ctx.strokeRect(-22, -8, 11, 16);
      }

      // Rider
      ctx.fillStyle = '#ffcc80';
      ctx.beginPath();
      ctx.arc(-2, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // Red Cap
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.arc(-2, 0, 5.5, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

      // Blue Jacket
      ctx.fillStyle = '#1e88e5';
      ctx.beginPath();
      ctx.ellipse(-3, 0, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Arms
      ctx.strokeStyle = '#1e88e5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(8, -7);
      ctx.moveTo(-2, 6);
      ctx.lineTo(8, 7);
      ctx.stroke();

    } else {
      // Walking
      ctx.fillStyle = '#1e88e5';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffcc80';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.arc(1, 0, 5, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.fill();

      if (Math.abs(this.speed) > 0.1) {
        const swing = Math.sin(Date.now() * 0.015) * 4;
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(swing, -11, 2.5, 0, Math.PI * 2);
        ctx.arc(-swing, 11, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

// Bicycle Object
class Bike {
  constructor(x, y, typeKey, isLocked = true, angle = 0, rackRef = null) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.typeKey = typeKey;
    this.stats = BIKE_TYPES[typeKey];
    this.isLocked = isLocked;
    this.owner = null;
    this.rackRef = rackRef;
    this.radius = 18;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = '#111';
    ctx.fillRect(-17, -2.5, 8, 5);
    ctx.fillRect(10, -2.5, 8, 5);

    ctx.strokeStyle = this.stats.color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();

    ctx.fillStyle = this.stats.accentColor;
    ctx.fillRect(7, -8, 3, 16);

    if (this.stats.hasDeliveryBox) {
      ctx.fillStyle = '#26c6da';
      ctx.fillRect(-20, -7, 10, 14);
    }

    if (this.isLocked) {
      ctx.strokeStyle = '#ff3d00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(-3, -3, 6, 6);
    }

    ctx.restore();
  }
}

// Pedestrian Object
class Pedestrian {
  constructor(x, y, isOwner = false, ownedBike = null) {
    this.x = x;
    this.y = y;
    this.isOwner = isOwner;
    this.ownedBike = ownedBike;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 1.1 + Math.random() * 0.4;
    this.state = 'walk';
    this.radius = 10;
    this.alertTimer = 0;
    this.color = isOwner ? '#ff5722' : ['#ab47bc', '#5c6bc0', '#26a69a', '#78909c'][Math.floor(Math.random() * 4)];
    this.wanderTimer = Math.floor(Math.random() * 120);
  }

  update() {
    if (this.state === 'pursuit') {
      const dx = state.player.x - this.x;
      const dy = state.player.y - this.y;
      const dist = Math.hypot(dx, dy);

      this.angle = Math.atan2(dy, dx);
      this.speed = 3.8;

      if (dist < 22 && state.player.currentBike) {
        triggerDismount('주인에게 멱살잡혀 자전거를 빼앗겼습니다!');
        this.state = 'walk';
        this.speed = 1.2;
        addWanted(1);
      }
    } else if (this.state === 'panic') {
      const dx = this.x - state.player.x;
      const dy = this.y - state.player.y;
      this.angle = Math.atan2(dy, dx);
      this.speed = 2.8;

      this.alertTimer--;
      if (this.alertTimer <= 0) {
        this.state = 'walk';
        this.speed = 1.2;
      }
    } else {
      this.wanderTimer--;
      if (this.wanderTimer <= 0) {
        this.angle += (Math.random() - 0.5) * 1.5;
        this.wanderTimer = 80 + Math.random() * 140;
      }

      if (state.isCutting && state.targetBike) {
        const dist = Math.hypot(state.player.x - this.x, state.player.y - this.y);
        if (dist < 180) {
          if (this.isOwner && this.ownedBike === state.targetBike) {
            this.state = 'pursuit';
            showBanner('자전거 주인이 격노하여 추격합니다!!', '야 저 새끼 내 자전거 턴다!! 잡아라!');
            addWanted(2);
            window.soundEngine.playBell();
          } else if (dist < 120 && Math.random() < 0.05) {
            this.state = 'panic';
            this.alertTimer = 180;
            showBanner('시민이 절도 현장을 목격하고 신고했습니다!', '수배도 상승!');
            addWanted(1);
          }
        }
      }
    }

    const nextX = this.x + Math.cos(this.angle) * this.speed;
    const nextY = this.y + Math.sin(this.angle) * this.speed;

    if (!checkBuildingCollision(nextX, nextY, this.radius)) {
      this.x = nextX;
      this.y = nextY;
    } else {
      this.angle += Math.PI * 0.7;
    }

    this.x = Math.max(30, Math.min(WORLD_WIDTH - 30, this.x));
    this.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, this.y));
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === 'pursuit') {
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, this.y - 18);
      ctx.fillStyle = '#ff1744';
      ctx.font = 'bold 14px "Noto Sans KR", sans-serif';
      ctx.fillText('💢', -7, 0);
      ctx.restore();
      return;
    } else if (this.state === 'panic') {
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, this.y - 18);
      ctx.fillStyle = '#ffea00';
      ctx.font = 'bold 14px "Noto Sans KR", sans-serif';
      ctx.fillText('❗', -5, 0);
      ctx.restore();
      return;
    }

    ctx.restore();
  }
}

// Police Cruiser & Bicycle Police
// Police Cruiser, Bicycle Police, and On-Foot Dismount Chase
class Police {
  constructor(x, y, isCar = true) {
    this.x = x;
    this.y = y;
    this.isCar = isCar;
    this.originalIsCar = isCar;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.radius = isCar ? 24 : 14;
    this.patrolTimer = 0;
    this.onFoot = false;
    this.parkedVehicle = null;
  }

  dismountVehicle() {
    if (this.onFoot) return;
    this.onFoot = true;
    this.parkedVehicle = {
      x: this.x,
      y: this.y,
      angle: this.angle,
      isCar: this.isCar
    };
    this.radius = 11;
    this.speed = 2.4;
    showBanner('🚨 경찰관 하차!', '경찰관이 차에서 뛰어내려 곤봉을 들고 전력 질주합니다! "거기 서라!"');
    window.soundEngine.playBell();
  }

  remountVehicle() {
    if (!this.onFoot) return;
    this.onFoot = false;
    this.isCar = this.originalIsCar;
    this.radius = this.isCar ? 24 : 14;
    if (this.parkedVehicle) {
      this.x = this.parkedVehicle.x;
      this.y = this.parkedVehicle.y;
      this.parkedVehicle = null;
    }
  }

  update() {
    const distToPlayer = Math.hypot(state.player.x - this.x, state.player.y - this.y);

    if (state.wantedLevel > 0) {
      const inAlley = isInAlley(state.player.x, state.player.y);
      const playerOnBike = !!state.player.currentBike;

      // 경찰 하차 조건:
      // 1) 순찰차인데 플레이어가 좁은 골목길(차량 진입 불가 구역)로 도망쳤을 때
      // 2) 플레이어가 자전거에서 내려 맨몸으로 도주 중이고 경찰과 가까울 때 (distToPlayer < 75)
      // 3) 순찰차가 충돌 등으로 거의 멈췄고 플레이어가 바로 코앞일 때 (distToPlayer < 45 && this.speed < 1.5)
      // * 도로를 자전거 타고 달리는 플레이어에게는 차에서 내리지 않고 순찰차로 추격합니다!
      if (!this.onFoot) {
        const shouldDismount = (this.isCar && inAlley) ||
          (!playerOnBike && distToPlayer < 75) ||
          (this.isCar && distToPlayer < 45 && this.speed < 1.5);
        if (shouldDismount) {
          this.dismountVehicle();
        }
      }

      const targetAngle = Math.atan2(state.player.y - this.y, state.player.x - this.x);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (this.onFoot) {
        // 도보 질주 모드: 장비 착용 경찰관의 현실적인 달리기 속도 (2.3~2.7).
        // 자전거(5.5~11.5)로는 당연히 여유롭게 따돌릴 수 있고, 맨몸 플레이어(2.4)와는 팽팽한 추격전!
        this.angle += Math.max(-0.16, Math.min(0.16, diff));
        this.speed = 2.3 + state.wantedLevel * 0.08;

        // 플레이어 포획 / 자전거 강제 끌어내림
        if (distToPlayer < 24) {
          if (state.player.currentBike) {
            triggerDismount('경찰관이 덮쳐 자전거에서 강제로 끌어내렸습니다! "꼼짝 마!"');
            window.soundEngine.playCrash();
          } else {
            triggerBusted();
          }
        }
      } else {
        // 차량/자전거 주행 모드
        this.angle += Math.max(-0.065, Math.min(0.065, diff));
        const maxSpeed = this.isCar ? 6.5 + state.wantedLevel * 0.45 : 5.4;
        this.speed = Math.min(maxSpeed, this.speed + 0.2);

        if (distToPlayer < (this.isCar ? 34 : 20)) {
          if (state.player.currentBike) {
            triggerDismount('순찰차에 들이받혀 자전거에서 튕겨져 나갔습니다!');
            window.soundEngine.playCrash();
          } else {
            triggerBusted();
          }
        }
      }
    } else {
      if (this.onFoot) {
        this.remountVehicle();
      }

      this.patrolTimer--;
      if (this.patrolTimer <= 0) {
        this.angle += (Math.random() - 0.5) * 1.0;
        this.patrolTimer = 100 + Math.random() * 100;
      }
      this.speed = this.isCar ? 2.3 : 1.8;

      if (state.isCutting && distToPlayer < 240) {
        showBanner('경찰이 절도 현장을 즉시 포착했습니다!', '사이렌 울림! 전원 추격 개시!');
        addWanted(2);
      }
    }

    const nextX = this.x + Math.cos(this.angle) * this.speed;
    const nextY = this.y + Math.sin(this.angle) * this.speed;

    if (!checkBuildingCollision(nextX, nextY, this.radius)) {
      this.x = nextX;
      this.y = nextY;
    } else {
      this.angle += Math.PI * 0.8;
      this.speed *= 0.4;
    }
  }

  draw() {
    // 1) 하차한 경우 길가에 주차된 순찰차 먼저 렌더링
    if (this.parkedVehicle) {
      ctx.save();
      ctx.translate(this.parkedVehicle.x, this.parkedVehicle.y);
      ctx.rotate(this.parkedVehicle.angle);
      if (this.parkedVehicle.isCar) {
        this.drawCarBody();
      } else {
        this.drawBikeBody();
      }
      ctx.restore();
    }

    // 2) 현재 경찰 본체 렌더링
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.onFoot) {
      // 도보 질주 경찰관 (남색 제복, 경찰모, 곤봉)
      ctx.fillStyle = '#0d47a1';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 머리 & 모자
      ctx.fillStyle = '#ffcc80';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a237e';
      ctx.beginPath();
      ctx.arc(1, 0, 5.5, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

      // 곤봉
      ctx.fillStyle = '#212121';
      ctx.fillRect(4, 7, 11, 3);

      // 팔 스윙
      const swing = Math.sin(Date.now() * 0.02) * 5;
      ctx.fillStyle = '#ffcc80';
      ctx.beginPath();
      ctx.arc(swing, -11, 2.5, 0, Math.PI * 2);
      ctx.arc(-swing, 11, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 머리 위 텍스트 뱃지
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, this.y - 18);
      ctx.fillStyle = '#ff1744';
      ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
      ctx.fillText('🚨서라!', -14, 0);
      ctx.restore();
      return;

    } else if (this.isCar) {
      this.drawCarBody();
    } else {
      this.drawBikeBody();
    }

    ctx.restore();
  }

  drawCarBody() {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-26, -14, 56, 28);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-24, -13, 50, 26);

    ctx.fillStyle = '#0d47a1';
    ctx.fillRect(-10, -13, 20, 4);
    ctx.fillRect(-10, 9, 20, 4);

    ctx.fillStyle = '#37474f';
    ctx.fillRect(8, -10, 6, 20);
    ctx.fillRect(-14, -10, 5, 20);

    ctx.fillStyle = '#eceff1';
    ctx.fillRect(-9, -9, 17, 18);

    const flash = Math.floor(Date.now() / 120) % 2 === 0;
    ctx.fillStyle = flash ? '#ff1744' : '#2979ff';
    ctx.fillRect(-3, -7, 6, 6);
    ctx.fillStyle = flash ? '#2979ff' : '#ff1744';
    ctx.fillRect(-3, 1, 6, 6);

    if (state.wantedLevel > 0) {
      ctx.fillStyle = 'rgba(255, 255, 180, 0.3)';
      ctx.beginPath();
      ctx.moveTo(26, -10);
      ctx.lineTo(95, -30);
      ctx.lineTo(95, 30);
      ctx.lineTo(26, 10);
      ctx.fill();
    }
  }

  drawBikeBody() {
    ctx.fillStyle = '#0d47a1';
    ctx.fillRect(-16, -2, 8, 4);
    ctx.fillRect(10, -2, 8, 4);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();

    ctx.fillStyle = '#1a237e';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Particle System
function spawnParticle(x, y, color, size, life) {
  state.particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 3,
    color,
    size,
    life,
    maxLife: life
  });
}

function updateAndDrawParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();

    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

// =========================================================
// 4. 대형 7200 x 7200 맵 생성 & 좁은 골목길 탈출로
// =========================================================
function initMap() {
  state.buildings = [];
  state.roads = [];
  state.alleys = [];
  state.racks = [];

  // Major Road Grid Across 7200 x 7200
  // Horizontal Avenues
  [800, 1800, 3000, 4200, 5400, 6400].forEach(y => {
    state.roads.push({ x: 0, y: y - 55, w: WORLD_WIDTH, h: 110, isVertical: false });
  });

  // Vertical Boulevards
  [900, 2100, 3300, 4500, 5700, 6600].forEach(x => {
    state.roads.push({ x: x - 55, y: 0, w: 110, h: WORLD_HEIGHT, isVertical: true });
  });

  // 좁은 골목길 (순찰차 진입 불가, 자전거만 통과 가능!)
  state.alleys = [
    { x: 1100, y: 850, w: 900, h: 45, label: '🚲 신림 고시촌 샛길' },
    { x: 2300, y: 1200, w: 50, h: 1200, label: '🚲 성수동 붉은벽돌 골목' },
    { x: 3500, y: 850, w: 900, h: 45, label: '🚲 테헤란 이면도로' },
    { x: 4700, y: 3200, w: 50, h: 1000, label: '🚲 압구정 명품거리 뒷골목' },
    { x: 1100, y: 5600, w: 1100, h: 50, label: '🚲 노량진 먹자골목' },
  ];

  // Buildings & City Blocks
  const bList = [
    // 1. 신림동 은신처 (시작 스폰지점)
    { x: 1050, y: 1050, w: 300, h: 280, type: 'safehouse', label: '🏠 신림동 비밀 은신처 (Safehouse)', color: '#263238' },
    { x: 1450, y: 1050, w: 500, h: 280, type: 'commercial', label: '🏪 신림 고시식당 & 편의점', color: '#37474f' },

    // 2. 성수동 카페거리
    { x: 2300, y: 900, w: 850, h: 250, type: 'commercial', label: '☕ 성수 감성 팩토리 카페', color: '#4e342e' },
    { x: 2300, y: 1300, w: 850, h: 350, type: 'commercial', label: '🎨 성수 팝업스토어 & 픽시샵', color: '#3e2723' },

    // 3. 외곽 폐차장 & 장물아비 컨테이너 (6200, 1100)
    { x: 5900, y: 900, w: 900, h: 600, type: 'industrial', label: '🚛 외곽 폐차장 & 컨테이너 야드', color: '#212121' },

    // 4. 여의도 금융가 & 지하철역
    { x: 1050, y: 2000, w: 850, h: 800, type: 'commercial', label: '🏢 여의도 IFC 금융센터', color: '#1a237e' },
    { x: 1050, y: 3200, w: 850, h: 800, type: 'station', label: '🚇 여의도역 복합환승 광장', color: '#0d47a1' },

    // 5. 강남 테헤란로 & 강남경찰서 본청 (석방 스폰지점 3600, 3600)
    { x: 3450, y: 3200, w: 850, h: 700, type: 'police', label: '🚔 서울강남경찰서 본청', color: '#1565c0' },
    { x: 2300, y: 3200, w: 850, h: 700, type: 'commercial', label: '🏢 강남 파이낸스 타워', color: '#263238' },

    // 6. 청담 & 압구정 초호화 명품 부촌
    { x: 4700, y: 3200, w: 850, h: 800, type: 'luxury', label: '🏰 한남 더 힐 & 청담 펜트하우스', color: '#424242' },
    { x: 5800, y: 3200, w: 850, h: 800, type: 'luxury', label: '💎 갤러리아 명품관', color: '#37474f' },

    // 7. 한강 시민공원 & 자전거 고속도로 (Wide Green Belt)
    { x: 2300, y: 5600, w: 3200, h: 600, type: 'park', label: '🌳 한강 시민공원 & 자전거 고속도로', color: '#1b5e20' },
    
    // 8. 잠실 올림픽 단지
    { x: 4700, y: 5600, w: 1900, h: 600, type: 'station', label: '🏟️ 잠실 올림픽 종합운동장', color: '#2e7d32' }
  ];

  state.buildings = bList;

  // 고정 자전거 보관소 스폰
  state.bikes = [];
  state.pedestrians = [];

  // Rack 1: 신림동 은신처 앞 광장 (따릉이 & 하이브리드)
  spawnBikeRack(1260, 1480, 5, ['DDAREUNGI', 'SAMCHULY']);

  // Rack 2: 성수동 픽시샵 앞 (엔진11 트릭 픽시!)
  spawnBikeRack(2600, 1150, 4, ['FIXIE', 'FIXIE', 'SAMCHULY']);

  // Rack 3: 배달대행지 앞 (배민 전기자전거!)
  spawnBikeRack(1500, 1950, 4, ['EBIKE', 'EBIKE', 'SAMCHULY']);

  // Rack 4: 강남경찰서 앞 광장 거치대 (간 큰 도둑 전용!)
  spawnBikeRack(3870, 4100, 3, ['DDAREUNGI', 'SAMCHULY']);

  // Rack 5: 청담 럭셔리 부촌 (기함급 에스웍스 타막!)
  spawnBikeRack(5000, 3350, 3, ['SWORKS', 'SWORKS', 'FIXIE']);
  spawnBikeRack(5200, 4050, 3, ['SWORKS', 'EBIKE', 'SAMCHULY']);

  // Rack 6: 한강 자전거 도로 진입로
  spawnBikeRack(2800, 5550, 6, ['SAMCHULY', 'FIXIE', 'DDAREUNGI']);
  spawnBikeRack(4200, 5550, 6, ['SWORKS', 'EBIKE', 'DDAREUNGI']);

  // 맵 전역 랜덤 자전거 & 보행자
  for (let i = 0; i < 40; i++) {
    const rx = 300 + Math.random() * (WORLD_WIDTH - 600);
    const ry = 300 + Math.random() * (WORLD_HEIGHT - 600);
    if (!checkBuildingCollision(rx, ry, 25)) {
      const typeKeys = ['DDAREUNGI', 'SAMCHULY', 'FIXIE', 'EBIKE'];
      const chosen = typeKeys[Math.floor(Math.random() * typeKeys.length)];
      const b = new Bike(rx, ry, chosen, true, Math.random() * Math.PI * 2);
      state.bikes.push(b);

      if (Math.random() < 0.35) {
        const owner = new Pedestrian(rx + (Math.random() - 0.5) * 40, ry + (Math.random() - 0.5) * 40, true, b);
        state.pedestrians.push(owner);
        b.owner = owner;
      }
    }
  }

  // 보행자 배치
  for (let i = 0; i < 80; i++) {
    const px = 200 + Math.random() * (WORLD_WIDTH - 400);
    const py = 200 + Math.random() * (WORLD_HEIGHT - 400);
    if (!checkBuildingCollision(px, py, 15)) {
      state.pedestrians.push(new Pedestrian(px, py));
    }
  }

  // 경찰 순찰차 및 자전거 경찰 배치
  state.policeList = [];
  [
    { x: 1200, y: 1800, car: true },
    { x: 3300, y: 1800, car: true },
    { x: 5700, y: 1800, car: true },
    { x: 3600, y: 3400, car: true }, // 강남경찰서 앞
    { x: 2100, y: 4200, car: true },
    { x: 4500, y: 4200, car: true },
    { x: 2400, y: 1200, car: false }, // 성수 자전거 경찰
    { x: 3600, y: 3600, car: false }, // 경찰서 정문 자전거 경찰
    { x: 4800, y: 5600, car: false }, // 한강 자전거 순찰관
  ].forEach(p => {
    state.policeList.push(new Police(p.x, p.y, p.car));
  });
}

function spawnBikeRack(startX, startY, count, allowedTypes) {
  for (let i = 0; i < count; i++) {
    const typeKey = allowedTypes[i % allowedTypes.length];
    const bx = startX + i * 34;
    const by = startY;
    const bike = new Bike(bx, by, typeKey, true, Math.PI / 2);
    state.bikes.push(bike);

    if (typeKey === 'SWORKS' || Math.random() < 0.4) {
      const owner = new Pedestrian(bx + (Math.random() - 0.5) * 40, by - 25, true, bike);
      state.pedestrians.push(owner);
      bike.owner = owner;
    }
  }
}

// Check if player is in narrow alley
function isInAlley(x, y) {
  for (const a of state.alleys) {
    if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) {
      return true;
    }
  }
  return false;
}

// Building Collision Check
function checkBuildingCollision(x, y, r) {
  for (const b of state.buildings) {
    if (b.type === 'park') continue; // Passable
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) {
      return true;
    }
  }
  return false;
}

// Anti-Stuck Ejection: Ejects player to the nearest outside edge if ever intersecting a wall
function resolveBuildingOverlap(p) {
  if (!p) return;
  for (const b of state.buildings) {
    if (b.type === 'park') continue;
    if (p.x + p.radius > b.x && p.x - p.radius < b.x + b.w && 
        p.y + p.radius > b.y && p.y - p.radius < b.y + b.h) {
      
      const leftDist = Math.abs(p.x - b.x);
      const rightDist = Math.abs(p.x - (b.x + b.w));
      const topDist = Math.abs(p.y - b.y);
      const bottomDist = Math.abs(p.y - (b.y + b.h));

      const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
      if (minDist === leftDist) p.x = b.x - p.radius - 8;
      else if (minDist === rightDist) p.x = b.x + b.w + p.radius + 8;
      else if (minDist === topDist) p.y = b.y - p.radius - 8;
      else p.y = b.y + b.h + p.radius + 8;
    }
  }
}

// Wanted Level Management
function addWanted(amount) {
  state.wantedLevel = Math.min(5, state.wantedLevel + amount);
  state.wantedDecayTimer = 900;
  updateWantedStarsUI();

  if (state.wantedLevel > 0) {
    window.soundEngine.setSiren(true);
  }
}

function reduceWanted(amount) {
  state.wantedLevel = Math.max(0, state.wantedLevel - amount);
  updateWantedStarsUI();

  if (state.wantedLevel === 0) {
    window.soundEngine.setSiren(false);
  }
}

function updateWantedStarsUI() {
  const container = document.getElementById('wanted-stars');
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star' + (i <= state.wantedLevel ? ' active' : '');
    star.innerText = '★';
    container.appendChild(star);
  }
}

// Banner Notification
let bannerTimer = null;
function showBanner(title, desc) {
  const banner = document.getElementById('alert-banner');
  document.getElementById('alert-title').innerText = title;
  document.getElementById('alert-desc').innerText = desc;
  banner.classList.remove('hidden');

  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    banner.classList.add('hidden');
  }, 4000);
}

// Dismount
function triggerDismount(reason) {
  if (state.player.currentBike) {
    const bike = state.player.currentBike;
    bike.x = state.player.x + (Math.random() - 0.5) * 20;
    bike.y = state.player.y + (Math.random() - 0.5) * 20;
    bike.isLocked = false;
    state.player.currentBike = null;
    state.player.speed = -1.5;
    showBanner('낙차 사고 발생!', reason);
    window.soundEngine.playCrash();
  }
}

// BUSTED Handler (강남경찰서 정문 석방 대응)
async function triggerBusted() {
  state.isBusted = true;
  window.soundEngine.playBusted();

  // Reset survival challenge
  state.challengeRemaining = state.challengeMax;
  state.challengeActive = false;

  const fine = Math.min(state.cash, 100000 + state.wantedLevel * 150000);

  // Call Server Busted API to deduct fine from shared balance
  try {
    const res = await fetch('/api/police/bail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.authToken}`
      },
      body: JSON.stringify({ fine })
    });
    if (res.ok) {
      const d = await res.json();
      state.cash = d.balance;
    } else {
      state.cash = Math.max(0, state.cash - fine);
    }
  } catch (e) {
    state.cash = Math.max(0, state.cash - fine);
  }

  document.getElementById('busted-stats').innerText = 
    `지명수배 별 ${state.wantedLevel}개 현행범 체포! 베가스 슬롯 자금에서 보석금 ₩${fine.toLocaleString()} 납부 완료.`;
  document.getElementById('busted-screen').classList.remove('hidden');
}

// Chop Shop Transaction (외곽 폐차장 컨테이너 6200, 1100)
async function checkChopShopTransaction() {
  if (!state.player.currentBike) return;

  const cs = FIXED_SPAWNS.CHOP_SHOP;
  const p = state.player;

  if (p.x > cs.x && p.x < cs.x + cs.w && p.y > cs.y && p.y < cs.y + cs.h) {
    const bike = state.player.currentBike;
    const payout = bike.stats.basePrice;

    // Send POST to server to credit Vegas Slots shared balance
    try {
      const res = await fetch('/api/fence/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.authToken}`
        },
        body: JSON.stringify({ bikeName: bike.stats.name, amount: payout })
      });
      if (res.ok) {
        const d = await res.json();
        state.cash = d.balance; // 최신 슬롯 잔고
      } else {
        state.cash += payout;
      }
    } catch (e) {
      state.cash += payout;
    }

    reduceWanted(2);
    window.soundEngine.playCash();

    showBanner('🏁 장물 납품 성공 (CHOP SHOP)', `[${bike.stats.name}] 매각 완료! 베가스 슬롯 자금에 +₩${payout.toLocaleString()} 즉시 입금!`);

    const bikeIdx = state.bikes.indexOf(bike);
    if (bikeIdx !== -1) state.bikes.splice(bikeIdx, 1);
    state.player.currentBike = null;

    // Respawn new bike in the city
    setTimeout(() => {
      spawnBikeRack(1500 + Math.random() * 4000, 1500 + Math.random() * 4000, 1, ['SWORKS', 'FIXIE', 'EBIKE']);
    }, 6000);
  }
}

// Theft Interaction Logic
function updateTheftLogic() {
  const promptEl = document.getElementById('action-prompt');
  const gaugeWrap = document.getElementById('stealing-gauge-wrap');
  const gaugeBar = document.getElementById('stealing-bar');
  const bikeInfoEl = document.getElementById('stealing-bike-info');

  if (state.player.currentBike) {
    promptEl.classList.remove('hidden');
    promptEl.querySelector('.key-badge').innerText = 'E';
    promptEl.querySelector('.action-text').innerText = '자전거에서 내리기';
    gaugeWrap.classList.add('hidden');
    state.isCutting = false;
    return;
  }

  let nearest = null;
  let minDist = 40;

  for (const b of state.bikes) {
    const d = Math.hypot(b.x - state.player.x, b.y - state.player.y);
    if (d < minDist) {
      minDist = d;
      nearest = b;
    }
  }

  state.targetBike = nearest;

  if (nearest) {
    promptEl.classList.remove('hidden');
    promptEl.querySelector('.key-badge').innerText = 'E';

    if (nearest.isLocked) {
      promptEl.querySelector('.action-text').innerText = `자물쇠 절단하기 [${nearest.stats.name}]`;

      if (keys['KeyE']) {
        state.isCutting = true;
        gaugeWrap.classList.remove('hidden');
        bikeInfoEl.innerText = `${nearest.stats.name} (장물가: ₩${nearest.stats.basePrice.toLocaleString()})`;

        const tool = TOOLS[state.toolLevel];
        const progressRate = (1 / (nearest.stats.lockTime * 60)) * tool.speedMult;
        state.cutProgress += progressRate;

        if (Math.random() < 0.28) {
          window.soundEngine.playCut();
          spawnParticle(nearest.x, nearest.y, '#ffd54f', 3, 15);
        }

        gaugeBar.style.width = Math.min(100, Math.floor(state.cutProgress * 100)) + '%';

        if (state.cutProgress >= 1.0) {
          nearest.isLocked = false;
          state.player.currentBike = nearest;
          state.isCutting = false;
          state.cutProgress = 0;
          gaugeWrap.classList.add('hidden');

          window.soundEngine.playBell();
          showBanner('자물쇠 절단 완료!', `[${nearest.stats.name}] 탈취 성공! 5분 버티기 챌린지가 시작됩니다!`);

          addWanted(nearest.stats.heat);

          if (nearest.owner) nearest.owner.state = 'pursuit';
        }
      } else {
        state.isCutting = false;
        state.cutProgress = 0;
        gaugeWrap.classList.add('hidden');
      }
    } else {
      promptEl.querySelector('.action-text').innerText = `탑승하기 [${nearest.stats.name}]`;
      gaugeWrap.classList.add('hidden');

      if (keys['KeyE']) {
        state.player.currentBike = nearest;
        window.soundEngine.playBell();
        keys['KeyE'] = false;
      }
    }
  } else {
    promptEl.classList.add('hidden');
    gaugeWrap.classList.add('hidden');
    state.isCutting = false;
    state.cutProgress = 0;
  }
}

// Current District Detection
function updateDistrictUI() {
  const px = state.player.x;
  const py = state.player.y;
  let dName = '📍 서울특별시';

  for (const d of DISTRICTS) {
    if (px >= d.x1 && px < d.x2 && py >= d.y1 && py < d.y2) {
      dName = d.name;
      break;
    }
  }

  document.getElementById('district-name').innerText = dName;
  document.getElementById('gps-coords').innerText = `X: ${Math.floor(px)} | Y: ${Math.floor(py)}`;
}

// HUD & UI Refresh
function updateHUD() {
  document.getElementById('cash-value').innerText = state.cash.toLocaleString();

  const vEl = document.getElementById('vehicle-name');
  if (state.player.currentBike) {
    vEl.innerText = state.player.currentBike.stats.name;
    vEl.style.color = state.player.currentBike.stats.color;
  } else {
    vEl.innerText = '도보 (뚜벅이)';
    vEl.style.color = '#fff';
  }

  document.getElementById('tool-name').innerText = TOOLS[state.toolLevel].name;

  const pct = (state.stamina / state.maxStamina) * 100;
  document.getElementById('stamina-bar').style.width = pct + '%';

  if (state.wantedLevel > 0) {
    state.wantedDecayTimer--;
    if (state.wantedDecayTimer <= 0) {
      reduceWanted(1);
      state.wantedDecayTimer = 900;
    }
  }

  updateDistrictUI();
}

// Minimap Radar Render (Scales 7200 -> 180px)
function drawMinimap() {
  minimapCtx.clearRect(0, 0, 180, 180);

  minimapCtx.fillStyle = '#0b141a';
  minimapCtx.fillRect(0, 0, 180, 180);

  const scale = 180 / WORLD_WIDTH;

  // Roads
  minimapCtx.fillStyle = '#22303c';
  state.roads.forEach(r => {
    minimapCtx.fillRect(r.x * scale, r.y * scale, Math.max(2, r.w * scale), Math.max(2, r.h * scale));
  });

  // Alleys (Cyan lines)
  minimapCtx.fillStyle = '#00bcd4';
  state.alleys.forEach(a => {
    minimapCtx.fillRect(a.x * scale, a.y * scale, Math.max(1, a.w * scale), Math.max(1, a.h * scale));
  });

  // Chop Shop (Bright yellow flashing)
  const flash = Math.floor(Date.now() / 250) % 2 === 0;
  minimapCtx.fillStyle = flash ? '#00e5ff' : '#ffd700';
  minimapCtx.fillRect(FIXED_SPAWNS.CHOP_SHOP.x * scale, FIXED_SPAWNS.CHOP_SHOP.y * scale, 12, 10);

  // Safehouse (Green icon)
  minimapCtx.fillStyle = '#76ff03';
  minimapCtx.fillRect(FIXED_SPAWNS.START_SAFEHOUSE.x * scale, FIXED_SPAWNS.START_SAFEHOUSE.y * scale, 8, 8);

  // Police Station (Blue icon)
  minimapCtx.fillStyle = '#2979ff';
  minimapCtx.fillRect(FIXED_SPAWNS.POLICE_PRECINCT.x * scale, FIXED_SPAWNS.POLICE_PRECINCT.y * scale, 8, 8);

  // Stolen Bikes
  minimapCtx.fillStyle = '#00e676';
  state.bikes.forEach(b => {
    if (b !== state.player.currentBike) {
      minimapCtx.beginPath();
      minimapCtx.arc(b.x * scale, b.y * scale, 2.0, 0, Math.PI * 2);
      minimapCtx.fill();
    }
  });

  // Police blips
  if (state.wantedLevel > 0) {
    state.policeList.forEach(p => {
      minimapCtx.fillStyle = flash ? '#ff1744' : '#2979ff';
      minimapCtx.beginPath();
      minimapCtx.arc(p.x * scale, p.y * scale, 3.0, 0, Math.PI * 2);
      minimapCtx.fill();
    });
  }

  // Player
  minimapCtx.fillStyle = '#ffea00';
  minimapCtx.beginPath();
  minimapCtx.arc(state.player.x * scale, state.player.y * scale, 4, 0, Math.PI * 2);
  minimapCtx.fill();
}

// Render Loop
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  state.camX = state.player.x - canvas.width / 2;
  state.camY = state.player.y - canvas.height / 2;

  ctx.save();
  ctx.translate(-state.camX, -state.camY);

  // 1. World Ground
  ctx.fillStyle = '#1c222b';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // 2. Roads
  state.roads.forEach(r => {
    ctx.fillStyle = '#12161c';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 20]);
    ctx.beginPath();
    if (r.isVertical) {
      ctx.moveTo(r.x + r.w / 2, r.y);
      ctx.lineTo(r.x + r.w / 2, r.y + r.h);
    } else {
      ctx.moveTo(r.x, r.y + r.h / 2);
      ctx.lineTo(r.x + r.w, r.y + r.h / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // 3. 좁은 골목길 (Alleys - Bicycles only!)
  state.alleys.forEach(a => {
    ctx.fillStyle = '#263238';
    ctx.fillRect(a.x, a.y, a.w, a.h);

    // Alley label on ground
    ctx.fillStyle = '#80deea';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.fillText(a.label + ' (순찰차 진입 불가)', a.x + 8, a.y + a.h / 2 + 4);
  });

  // 4. Buildings & Landmark Grounds
  state.buildings.forEach(b => {
    if (b.type === 'park') {
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Bike Highway path in park
      ctx.strokeStyle = '#388e3c';
      ctx.lineWidth = 32;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.h / 2);
      ctx.lineTo(b.x + b.w, b.y + b.h / 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Noto Sans KR", sans-serif';
      ctx.fillText('🚴 한강 자전거 전용 고속도로 (BIKE EXPRESS)', b.x + 50, b.y + b.h / 2 + 6);
    } else {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      ctx.strokeStyle = '#101419';
      ctx.lineWidth = 8;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(b.x + 20, b.y + 20, b.w - 40, b.h - 40);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
    ctx.fillText(b.label, b.x + 16, b.y + 32);
  });

  // 5. Chop Shop Compound
  const cs = FIXED_SPAWNS.CHOP_SHOP;
  ctx.fillStyle = '#37474f';
  ctx.fillRect(cs.x, cs.y, cs.w, cs.h);

  const neonGlow = Math.floor(Date.now() / 300) % 2 === 0;
  ctx.fillStyle = neonGlow ? '#00e5ff' : '#ff007f';
  ctx.font = 'bold 16px "Press Start 2P", "Noto Sans KR", sans-serif';
  ctx.fillText('🏴‍☠️ 장물아비 CHOP SHOP', cs.x + 10, cs.y + 40);

  ctx.fillStyle = '#ffea00';
  ctx.font = '12px "Noto Sans KR", sans-serif';
  ctx.fillText('훔친 자전거 매각 ➔ 베가스 슬롯 자금 즉시 입금!', cs.x + 10, cs.y + 75);

  // 6. Bikes
  state.bikes.forEach(b => {
    if (b !== state.player.currentBike) b.draw();
  });

  // 7. Pedestrians
  state.pedestrians.forEach(ped => ped.draw());

  // 8. Police
  state.policeList.forEach(cop => cop.draw());

  // 9. Player
  state.player.draw();

  // 10. Particles
  updateAndDrawParticles();

  ctx.restore();

  // Minimap
  drawMinimap();
}

// Game Loop
let lastFrameTime = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  if (state.isRunning && !state.isPaused && !state.isBusted) {
    state.player.update();
    state.pedestrians.forEach(ped => ped.update());
    state.policeList.forEach(cop => cop.update());

    updateTheftLogic();
    checkChopShopTransaction();
    updateSurvivalChallenge(dt);
    updateHUD();
  }

  render();
  requestAnimationFrame(gameLoop);
}

// Resize Handling
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

// Input Listeners
window.addEventListener('keydown', e => {
  keys[e.code] = true;

  if (e.code === 'KeyQ') {
    if (state.player && state.player.currentBike) {
      window.soundEngine.playBell();
      showBanner('🔔 따르릉!', '보행자들이 깜짝 놀라 비킵니다.');
      state.pedestrians.forEach(p => {
        const d = Math.hypot(p.x - state.player.x, p.y - state.player.y);
        if (d < 140 && p.state === 'walk') {
          p.state = 'panic';
          p.alertTimer = 60;
        }
      });
    }
  }

  if (e.code === 'KeyE') {
    if (state.player && state.player.currentBike && !state.isCutting) {
      const b = state.player.currentBike;
      b.x = state.player.x;
      b.y = state.player.y;
      b.isLocked = false;
      state.player.currentBike = null;
      showBanner('자전거 하차', '뚜벅이 모드로 전환되었습니다.');
    }
  }

  if (e.code === 'KeyM') {
    toggleShopModal();
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

// Shop Modal Handlers
function toggleShopModal() {
  const modal = document.getElementById('shop-modal');
  const isHidden = modal.classList.contains('hidden');
  if (isHidden) {
    modal.classList.remove('hidden');
    state.isPaused = true;
    updateShopUI();
  } else {
    modal.classList.add('hidden');
    state.isPaused = false;
  }
}

function updateShopUI() {
  document.getElementById('shop-my-cash').innerText = `₩ ${state.cash.toLocaleString()}`;

  const tool = TOOLS[state.toolLevel];
  const btnTool = document.getElementById('btn-buy-tool');
  if (state.toolLevel < TOOLS.length - 1) {
    document.getElementById('shop-tool-name').innerText = tool.nextName;
    document.getElementById('shop-tool-desc').innerText = `절단 속도 대폭 상승!`;
    btnTool.innerText = `₩ ${tool.nextCost.toLocaleString()}`;
    btnTool.disabled = state.cash < tool.nextCost;
  } else {
    document.getElementById('shop-tool-name').innerText = '최고급 장비 장착 중 (MAX)';
    document.getElementById('shop-tool-desc').innerText = '더 이상 업그레이드할 수 없습니다.';
    btnTool.innerText = '구매 완료';
    btnTool.disabled = true;
  }

  const btnLegs = document.getElementById('btn-buy-legs');
  const legCost = 150000 + state.staminaUpgradeLevel * 100000;
  document.getElementById('shop-legs-name').innerText = `경륜선수 허벅지 (Lv.${state.staminaUpgradeLevel + 1})`;
  btnLegs.innerText = `₩ ${legCost.toLocaleString()}`;
  btnLegs.disabled = state.cash < legCost;

  const btnSpray = document.getElementById('btn-buy-spray');
  btnSpray.disabled = state.cash < 100000 || !state.player.currentBike;
}

// Purchase Tool
document.getElementById('btn-buy-tool').addEventListener('click', async () => {
  const tool = TOOLS[state.toolLevel];
  if (state.toolLevel < TOOLS.length - 1 && state.cash >= tool.nextCost) {
    try {
      const res = await fetch('/api/shop/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken}` },
        body: JSON.stringify({ cost: tool.nextCost, upgradeName: tool.nextName })
      });
      if (res.ok) {
        const d = await res.json();
        state.cash = d.balance;
      } else {
        state.cash -= tool.nextCost;
      }
    } catch (e) {
      state.cash -= tool.nextCost;
    }

    state.toolLevel++;
    window.soundEngine.playCash();
    updateShopUI();
    showBanner('장비 업그레이드 완료!', `새 공구: ${TOOLS[state.toolLevel].name}`);
  }
});

// Purchase Legs
document.getElementById('btn-buy-legs').addEventListener('click', async () => {
  const legCost = 150000 + state.staminaUpgradeLevel * 100000;
  if (state.cash >= legCost) {
    try {
      const res = await fetch('/api/shop/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken}` },
        body: JSON.stringify({ cost: legCost, upgradeName: `경륜선수 허벅지 Lv.${state.staminaUpgradeLevel + 1}` })
      });
      if (res.ok) {
        const d = await res.json();
        state.cash = d.balance;
      } else {
        state.cash -= legCost;
      }
    } catch (e) {
      state.cash -= legCost;
    }

    state.staminaUpgradeLevel++;
    state.maxStamina += 30;
    state.stamina = state.maxStamina;
    window.soundEngine.playCash();
    updateShopUI();
    showBanner('허벅지 근육 강화!', `최대 스태미나: ${state.maxStamina}`);
  }
});

// Purchase Spray
document.getElementById('btn-buy-spray').addEventListener('click', async () => {
  if (state.cash >= 100000 && state.player.currentBike) {
    try {
      const res = await fetch('/api/shop/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.authToken}` },
        body: JSON.stringify({ cost: 100000, upgradeName: '위장 도색 스프레이' })
      });
      if (res.ok) {
        const d = await res.json();
        state.cash = d.balance;
      } else {
        state.cash -= 100000;
      }
    } catch (e) {
      state.cash -= 100000;
    }

    state.player.currentBike.stats.color = ['#ff007f', '#76ff03', '#ffeb3b', '#651fff'][Math.floor(Math.random() * 4)];
    reduceWanted(5);
    window.soundEngine.playCash();
    updateShopUI();
    toggleShopModal();
    showBanner('위장 도색 완료!', '수배도가 즉시 전부 해제되었습니다!');
  }
});

document.getElementById('btn-close-shop').addEventListener('click', toggleShopModal);

// Restart Button (고정 석방 스폰: 강남경찰서 정문 3600, 3600)
document.getElementById('btn-restart').addEventListener('click', () => {
  document.getElementById('busted-screen').classList.add('hidden');
  state.isBusted = false;
  state.wantedLevel = 0;
  state.player.currentBike = null;

  // Respawn at fixed Police Precinct Gate
  state.player.x = FIXED_SPAWNS.POLICE_PRECINCT.x;
  state.player.y = FIXED_SPAWNS.POLICE_PRECINCT.y;
  state.player.speed = 0;
  state.player.angle = Math.PI / 2;

  updateWantedStarsUI();
  window.soundEngine.setSiren(false);
  showBanner('보석금 납부 후 석방', '강남경찰서 정문에서 풀려났습니다. 다시 자전거를 찾으세요!');
});

// Start Game (고정 시작 스폰: 신림동 은신처 1200, 1200)
document.getElementById('btn-start').addEventListener('click', startGame);
window.addEventListener('keydown', e => {
  if (!state.isRunning && (e.code === 'Enter' || e.code === 'Space')) {
    startGame();
  }
});

// ONEID SSO 로그인 버튼
document.getElementById('btn-oneid-login').addEventListener('click', startOneidLogin);

// 유저 뱃지 클릭 시 계정 전환 / 로그아웃 지원
document.getElementById('account-badge').addEventListener('click', () => {
  const isOneidUser = state.authToken && !state.authToken.startsWith('guest_');
  const msg = isOneidUser 
    ? `현재 [${state.userName}] 계정으로 연동 중입니다.\n로그아웃하고 다른 ONEID 계정으로 로그인하시겠습니까?`
    : 'ONEID로 로그인하여 베가스 슬롯의 실제 잔고와 연동하시겠습니까?';

  if (confirm(msg)) {
    startOneidLogin();
  }
});

function startGame() {
  document.getElementById('start-screen').classList.add('hidden');
  window.soundEngine.init();
  window.soundEngine.startRetroRadio();
  state.isRunning = true;
  showBanner('신림동 은신처에서 출발합니다!', '자전거를 5분간 사수하여 베가스 슬롯 자금 +₩1,000,000을 획득하세요!');
}

// Initial Setup
resizeCanvas();
initAuthAndBalance();
initMap();

// 고정 시작 스폰: 신림동 비밀 은신처 (1200, 1200)
state.player = new Player(FIXED_SPAWNS.START_SAFEHOUSE.x, FIXED_SPAWNS.START_SAFEHOUSE.y);
updateWantedStarsUI();
requestAnimationFrame(gameLoop);
