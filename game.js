// ============================================================
// OFFICE WARS — A Brotato-like Office Survival Game
// ============================================================

// ============================================================
// 1. CONSTANTS & CANVAS SETUP
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 800, H = 600;
canvas.width = W;
canvas.height = H;

// ============================================================
// 2. UTILS
// ============================================================
function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function norm(dx, dy) { const d = Math.sqrt(dx * dx + dy * dy); return d > 0 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 }; }
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
function wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
        else line = test;
    }
    if (line) lines.push(line);
    return lines;
}

// ============================================================
// 3. INPUT (keys, mouse with coord transform)
// ============================================================
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const mouse = { x: 0, y: 0, down: false };

// Transform mouse coords from screen space to logical space
canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (W / r.width);
    mouse.y = (e.clientY - r.top) * (H / r.height);
});
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; });
canvas.addEventListener('mouseup',   e => { if (e.button === 0) mouse.down = false; });
window.addEventListener('blur', () => { mouse.down = false; });

// ============================================================
// 4. AUDIO (all existing SFX + sfxDash + BG music)
// ============================================================
let audioCtx = null;
let musicGain = null;
let musicMuted = false;

function getAC() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.13;
        musicGain.connect(audioCtx.destination);
    }
    return audioCtx;
}

function schedOsc(freq, time, dur, type, vol, dest) {
    const ac = getAC();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g); g.connect(dest || ac.destination);
    osc.start(time); osc.stop(time + dur + 0.01);
}

function schedNoise(time, dur, vol, hpFreq, dest) {
    const ac = getAC();
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const filt = ac.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = hpFreq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filt); filt.connect(g); g.connect(dest || ac.destination);
    src.start(time);
}

function schedKick(time) {
    const ac = getAC();
    const osc = ac.createOscillator(); const g = ac.createGain();
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.3);
    g.gain.setValueAtTime(0.45, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    osc.connect(g); g.connect(musicGain);
    osc.start(time); osc.stop(time + 0.32);
}

// SFX
function sfxShoot()   { const ac = getAC(); if (!ac) return; schedOsc(900, ac.currentTime, 0.04, 'square', 0.08); }
function sfxHit()     { const ac = getAC(); if (!ac) return; schedOsc(200, ac.currentTime, 0.07, 'sawtooth', 0.14); }
function sfxPlayerHurt() { const ac = getAC(); if (!ac) return; schedOsc(100, ac.currentTime, 0.18, 'sawtooth', 0.28); schedNoise(ac.currentTime, 0.1, 0.18, 150); }
function sfxEnemyDie() {
    const ac = getAC(); if (!ac) return;
    const t = ac.currentTime;
    schedOsc(440, t, 0.06, 'square', 0.1); schedOsc(330, t + 0.06, 0.06, 'square', 0.1); schedOsc(220, t + 0.12, 0.1, 'square', 0.1);
}
function sfxLevelUp() {
    const ac = getAC(); if (!ac) return;
    [523, 659, 784, 1047].forEach((f, i) => schedOsc(f, ac.currentTime + i * 0.1, 0.12, 'sine', 0.2));
}
function sfxWaveComplete() {
    const ac = getAC(); if (!ac) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => schedOsc(f, ac.currentTime + i * 0.08, 0.15, 'sine', 0.22));
}
function sfxBuy() {
    const ac = getAC(); if (!ac) return;
    schedOsc(659, ac.currentTime, 0.08, 'sine', 0.2); schedOsc(784, ac.currentTime + 0.08, 0.1, 'sine', 0.2);
}
function sfxReroll() {
    const ac = getAC(); if (!ac) return;
    schedOsc(440, ac.currentTime, 0.06, 'square', 0.1); schedOsc(350, ac.currentTime + 0.06, 0.06, 'square', 0.1);
}
function sfxBossAppear() {
    const ac = getAC(); if (!ac) return;
    for (let i = 0; i < 5; i++) schedOsc(440 / (i + 1), ac.currentTime + i * 0.14, 0.2, 'sawtooth', 0.25);
}
function sfxDash() {
    const ac = getAC(); if (!ac) return;
    const t = ac.currentTime;
    schedNoise(t, 0.12, 0.2, 800);
    schedOsc(600, t, 0.06, 'sine', 0.12);
    schedOsc(400, t + 0.04, 0.08, 'sine', 0.08);
}

// Background music loop
let _musicNextStart = 0;
function startBGMusic() {
    getAC();
    _musicNextStart = audioCtx.currentTime + 0.1;
    scheduleMusicLoop();
}
function stopBGMusic() { musicMuted = true; if (musicGain) musicGain.gain.value = 0; }
function resumeBGMusic() { musicMuted = false; if (musicGain) musicGain.gain.value = 0.13; }

function scheduleMusicLoop() {
    if (musicMuted || !audioCtx) return;
    const ac = audioCtx;
    const bpm = 122;
    const b = 60 / bpm;
    const start = _musicNextStart;

    // 8-beat pattern in Cm
    const bassSeq  = [130.81, 0, 130.81, 0, 155.56, 0, 130.81, 155.56];
    const leadSeq  = [523.25, 0, 659.25, 0, 783.99, 0, 659.25, 523.25];

    for (let i = 0; i < 8; i++) {
        const t = start + i * b;
        if (bassSeq[i] > 0) schedOsc(bassSeq[i], t, b * 0.75, 'sawtooth', 0.06, musicGain);
        if (i % 2 === 0 && leadSeq[i] > 0) schedOsc(leadSeq[i], t, b * 0.4, 'square', 0.03, musicGain);
        if (i === 0 || i === 4) schedKick(t);
        if (i === 2 || i === 6) schedNoise(t, 0.12, 0.12, 600, musicGain);
        schedNoise(t, 0.05, 0.018, 7000, musicGain);
        schedNoise(t + b * 0.5, 0.05, 0.012, 7000, musicGain);
    }

    _musicNextStart = start + 8 * b;
    const delay = Math.max(0, (_musicNextStart - ac.currentTime - 0.8) * 1000);
    setTimeout(scheduleMusicLoop, delay);
}

// ============================================================
// 5. GAME STATE, CHARACTERS, OBSTACLES
// ============================================================
const STATE = { MENU: 'menu', CHAR_SELECT: 'char_select', PLAYING: 'playing', WAVE_END: 'wave_end', SHOP: 'shop', GAME_OVER: 'game_over', VICTORY: 'victory' };
let gameState = STATE.MENU;
let wave = 0;
const MAX_WAVES = 20;
let waveTransitionTimer = 0;
let screenShake = { x: 0, y: 0, t: 0, mag: 0 };

// Combo system globals
let comboCount = 0;
let comboTimer = 0;

// Wave announcement
let waveAnnounceTimer = 0;

// End-of-wave magnet
let magnetActive = false;
let magnetTimer = 0;

// Gameplay stats
const stats = { kills: 0, damageDealt: 0, highestCombo: 0, wavesCompleted: 0 };
function resetStats() { stats.kills = 0; stats.damageDealt = 0; stats.highestCombo = 0; stats.wavesCompleted = 0; }

// Selected character
let selectedChar = null;

// Character definitions
const CHARACTERS = {
    developer: {
        id: 'developer', name: 'The Developer', emoji: '\u{1F9D1}\u200D\u{1F4BB}', // 🧑‍💻
        desc: 'Balanced all-rounder.',
        hp: 100, speed: 1.0, damage: 1.0, atkSpd: 1.0, range: 1.0, armor: 0, lifesteal: 0, luck: 0,
        startWeapon: 'stapler',
        passive: 'None', passiveDesc: 'No special passive.'
    },
    intern: {
        id: 'intern', name: 'The Intern', emoji: '\u{1F9D1}\u200D\u{1F393}', // 🧑‍🎓
        desc: 'Fast & fragile.',
        hp: 75, speed: 1.3, damage: 0.9, atkSpd: 1.15, range: 1.0, armor: 0, lifesteal: 0, luck: 0,
        startWeapon: 'rubberband',
        passive: 'Caffeine Rush', passiveDesc: '+30% speed, +15% atk spd.'
    },
    manager: {
        id: 'manager', name: 'The Manager', emoji: '\u{1F454}', // 👔
        desc: 'Tanky bruiser.',
        hp: 150, speed: 0.9, damage: 1.15, atkSpd: 0.85, range: 1.0, armor: 3, lifesteal: 0, luck: 0,
        startWeapon: 'coffeemug',
        passive: 'Authority', passiveDesc: '+3 armor, +15% damage.'
    },
    itadmin: {
        id: 'itadmin', name: 'IT Admin', emoji: '\u{1F4BB}', // 💻
        desc: 'Range specialist.',
        hp: 90, speed: 1.0, damage: 1.0, atkSpd: 1.1, range: 1.3, armor: 0, lifesteal: 0, luck: 0,
        startWeapon: 'laser',
        passive: 'Long Reach', passiveDesc: '+30% range, +10% atk spd.'
    },
    accountant: {
        id: 'accountant', name: 'The Accountant', emoji: '\u{1F9EE}', // 🧮
        desc: 'Slow powerhouse.',
        hp: 110, speed: 0.85, damage: 1.35, atkSpd: 0.7, range: 1.0, armor: 2, lifesteal: 0, luck: 2,
        startWeapon: 'tpsreport',
        passive: 'Bean Counter', passiveDesc: '+35% dmg, +2 armor, +2 luck.'
    },
    hrrep: {
        id: 'hrrep', name: 'HR Rep', emoji: '\u{1F4CB}', // 📋
        desc: 'Sustain fighter.',
        hp: 85, speed: 1.05, damage: 1.0, atkSpd: 1.0, range: 1.0, armor: 0, lifesteal: 0.08, luck: 0,
        startWeapon: 'sticky',
        passive: 'Compliance', passiveDesc: '+8% lifesteal, +5% speed.'
    }
};
const CHAR_ORDER = ['developer', 'intern', 'manager', 'itadmin', 'accountant', 'hrrep'];

// Obstacles
const OBSTACLES = [
    { x: 120, y: 100, w: 90, h: 55 },
    { x: 590, y: 100, w: 90, h: 55 },
    { x: 120, y: 445, w: 90, h: 55 },
    { x: 590, y: 445, w: 90, h: 55 },
    { x: 350, y: 250, w: 100, h: 60 },
];

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
    return (cx - nx) ** 2 + (cy - ny) ** 2 < cr * cr;
}
function pushOutRect(entity, r) {
    for (const o of OBSTACLES) {
        if (!circleRect(entity.x, entity.y, r, o.x, o.y, o.w, o.h)) continue;
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const dx = entity.x - cx, dy = entity.y - cy;
        const overX = (o.w / 2 + r) - Math.abs(dx);
        const overY = (o.h / 2 + r) - Math.abs(dy);
        if (overX < overY) entity.x += Math.sign(dx) * overX;
        else entity.y += Math.sign(dy) * overY;
    }
}

// ============================================================
// 6. WEAPON DEFINITIONS
// ============================================================
const WEAPONS = {
    stapler: { id: 'stapler', name: 'Stapler', emoji: '\u{1F4CE}', color: '#888', baseDmg: 14, baseRate: 1.8, range: 280, projSpeed: 420, type: 'ranged' },
    rubberband: { id: 'rubberband', name: 'Rubber Band', emoji: '\u{1F517}', color: '#ff0', baseDmg: 5, baseRate: 5.5, range: 240, projSpeed: 580, type: 'ranged' },
    coffeemug: { id: 'coffeemug', name: 'Coffee Mug', emoji: '\u2615', color: '#8B4513', baseDmg: 35, baseRate: 0.7, range: 220, projSpeed: 260, aoe: 55, type: 'ranged' },
    keyboard: { id: 'keyboard', name: 'Keyboard', emoji: '\u2328\uFE0F', color: '#aaa', baseDmg: 28, baseRate: 1.3, range: 68, type: 'melee' },
    usb: { id: 'usb', name: 'USB Drive', emoji: '\u{1F4BE}', color: '#0af', baseDmg: 9, baseRate: 2, range: 80, type: 'orbital', orbitR: 72, orbitSpd: 3.2 },
    laser: { id: 'laser', name: 'Laser Pointer', emoji: '\u{1F534}', color: '#f00', baseDmg: 9, baseRate: 4.5, range: 210, projSpeed: 720, pierce: 3, type: 'ranged' },
    sticky: { id: 'sticky', name: 'Sticky Note', emoji: '\u{1F4DD}', color: '#ffe44d', baseDmg: 5, baseRate: 2, range: 250, projSpeed: 210, slow: 0.45, dotDps: 4, dotDur: 3, type: 'ranged' },
    tpsreport: { id: 'tpsreport', name: 'TPS Report', emoji: '\u{1F4C4}', color: '#ddd', baseDmg: 90, baseRate: 0.38, range: 200, projSpeed: 175, aoe: 95, type: 'ranged' },
};

// ============================================================
// 7. PLAYER (createPlayer with char support, dash, combo)
// ============================================================
function createPlayer(charId) {
    const ch = CHARACTERS[charId || 'developer'];
    selectedChar = ch;
    return {
        x: W / 2, y: H / 2,
        radius: 16,
        baseSpeed: 165,
        hp: ch.hp, maxHp: ch.hp,
        xp: 0, xpToNext: 25, level: 1,
        materials: 0,
        stats: {
            damage: ch.damage,
            atkSpd: ch.atkSpd,
            range: ch.range,
            speed: ch.speed,
            armor: ch.armor,
            regen: 0,
            lifesteal: ch.lifesteal,
            luck: ch.luck
        },
        weapons: [{ ...WEAPONS[ch.startWeapon], level: 1 }],
        weaponTimers: { 0: 0 },
        orbAngles: {},
        invTimer: 0, invDur: 0.25,
        regenTimer: 0,
        facing: 1,
        dashCooldown: 2.5,
        dashTimer: 0,
        isDashing: false,
    };
}
let player;

// Dash afterimage trail
let dashAfterimages = [];

function playerEffectiveDmg(w) { return w.baseDmg * player.stats.damage * (1 + (w.level - 1) * 0.25); }
function playerEffectiveRate(w) { return (w.baseRate || 1) * player.stats.atkSpd * (1 + (w.level - 1) * 0.12); }
function playerEffectiveRange(w) { return w.range * player.stats.range; }

function playerTakeDamage(amt) {
    if (player.invTimer > 0) return;
    if (player.isDashing) return;
    const dmg = Math.max(1, amt - player.stats.armor);
    player.hp -= dmg;
    player.invTimer = player.invDur;
    addFloating(player.x, player.y - 20, `-${Math.floor(dmg)}`, '#f44');
    sfxPlayerHurt();
    addShake(5, 0.25);
    if (player.hp <= 0) { player.hp = 0; setGameState(STATE.GAME_OVER); }
}

// Contact damage bypasses invincibility — continuous bleed when touching enemies
function playerTakeContactDamage(dps, dt) {
    if (player.isDashing) return;
    const dmg = Math.max(0, dps - player.stats.armor * 0.4) * dt;
    if (dmg <= 0) return;
    player.hp -= dmg;
    if (player.hp <= 0) { player.hp = 0; setGameState(STATE.GAME_OVER); }
}
function playerHeal(amt) { player.hp = Math.min(player.maxHp, player.hp + amt); }

function getComboXPMultiplier() {
    if (comboCount >= 10) return 3;
    if (comboCount >= 5) return 2;
    if (comboCount >= 3) return 1.5;
    return 1;
}

function playerGainXP(v) {
    const mult = getComboXPMultiplier();
    player.xp += v * mult;
    while (player.xp >= player.xpToNext) {
        player.xp -= player.xpToNext;
        player.level++;
        player.xpToNext = Math.floor(player.xpToNext * 1.32);
        addFloating(player.x, player.y - 45, 'LEVEL UP!', '#ff0');
        sfxLevelUp();
    }
}

function performDash() {
    if (player.dashTimer > 0) return;
    // Determine facing direction
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    // If no keys, dash toward mouse or facing direction
    if (dx === 0 && dy === 0) {
        const mdx = mouse.x - player.x, mdy = mouse.y - player.y;
        if (Math.sqrt(mdx * mdx + mdy * mdy) > 8) {
            const mn = norm(mdx, mdy);
            dx = mn.x; dy = mn.y;
        } else {
            dx = player.facing; dy = 0;
        }
    }
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }

    // Store pre-dash position for afterimage
    dashAfterimages.push({ x: player.x, y: player.y, t: 0.3 });

    // Move 120px in direction
    player.x += dx * 120;
    player.y += dy * 120;
    player.x = clamp(player.x, player.radius, W - player.radius);
    player.y = clamp(player.y, player.radius, H - player.radius);
    pushOutRect(player, player.radius);

    // Add mid-point afterimage
    dashAfterimages.push({ x: (dashAfterimages[dashAfterimages.length - 1].x + player.x) / 2, y: (dashAfterimages[dashAfterimages.length - 1].y + player.y) / 2, t: 0.25 });

    player.dashTimer = player.dashCooldown;
    player.isDashing = true;
    // isDashing lasts only one frame (set false in update)
    sfxDash();
}

function updatePlayer(dt) {
    // End dash invincibility after one frame
    player.isDashing = false;

    // Dash cooldown
    if (player.dashTimer > 0) player.dashTimer -= dt;

    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    // Mouse movement: hold left button to move toward cursor
    if (mouse.down && gameState === STATE.PLAYING) {
        const mdx = mouse.x - player.x, mdy = mouse.y - player.y;
        if (Math.sqrt(mdx * mdx + mdy * mdy) > 8) {
            const mn = norm(mdx, mdy);
            // Blend with keyboard input (keyboard takes priority if pressed)
            if (dx === 0) dx = mn.x;
            if (dy === 0) dy = mn.y;
        }
    }

    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) { dx /= len; dy /= len; }
        const spd = player.baseSpeed * player.stats.speed;
        player.x += dx * spd * dt;
        player.y += dy * spd * dt;
        if (dx > 0) player.facing = 1;
        if (dx < 0) player.facing = -1;
    }
    player.x = clamp(player.x, player.radius, W - player.radius);
    player.y = clamp(player.y, player.radius, H - player.radius);
    pushOutRect(player, player.radius);

    if (player.invTimer > 0) player.invTimer -= dt;

    // Regen
    if (player.stats.regen > 0) {
        player.regenTimer -= dt;
        if (player.regenTimer <= 0) { playerHeal(player.stats.regen); player.regenTimer = 1; }
    }

    // Auto-collect XP orbs
    for (let i = xpOrbs.length - 1; i >= 0; i--) {
        const o = xpOrbs[i];
        const d = dist(player, o);
        if (d < 50) { playerGainXP(o.v); xpOrbs.splice(i, 1); }
        else if (d < 160) { const n = norm(o.x - player.x, o.y - player.y); o.x -= n.x * 260 * dt; o.y -= n.y * 260 * dt; }
    }
    // Auto-collect materials
    for (let i = matDrops.length - 1; i >= 0; i--) {
        const m = matDrops[i];
        if (dist(player, m) < 44) {
            const total = m.v + Math.floor(player.stats.luck);
            player.materials += total;
            addFloating(m.x, m.y, `+$${total}`, '#fd0');
            matDrops.splice(i, 1);
        }
    }

    // Update combo timer
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) { comboCount = 0; comboTimer = 0; }
    }

    // Update dash afterimages
    for (let i = dashAfterimages.length - 1; i >= 0; i--) {
        dashAfterimages[i].t -= dt;
        if (dashAfterimages[i].t <= 0) dashAfterimages.splice(i, 1);
    }

    // Auto-fire weapons
    updateWeapons(dt);
}

function updateWeapons(dt) {
    for (let i = 0; i < player.weapons.length; i++) {
        const w = player.weapons[i];
        if (!player.weaponTimers[i]) player.weaponTimers[i] = 0;
        player.weaponTimers[i] -= dt;
        const cooldown = 1 / playerEffectiveRate(w);

        if (w.type === 'orbital') {
            if (!player.orbAngles[i]) player.orbAngles[i] = (i / 3) * Math.PI * 2;
            player.orbAngles[i] += w.orbitSpd * player.stats.atkSpd * dt;
            if (player.weaponTimers[i] <= 0) {
                const ox = player.x + Math.cos(player.orbAngles[i]) * w.orbitR;
                const oy = player.y + Math.sin(player.orbAngles[i]) * w.orbitR;
                for (const e of enemies) {
                    if (dist({ x: ox, y: oy }, e) < e.radius + 10) {
                        enemyTakeDamage(e, playerEffectiveDmg(w));
                        player.weaponTimers[i] = 0.25;
                        break;
                    }
                }
            }
            continue;
        }

        if (w.type === 'melee') {
            if (player.weaponTimers[i] <= 0) {
                const range = playerEffectiveRange(w);
                let hit = false;
                for (const e of enemies) {
                    if (dist(player, e) < range + e.radius) {
                        enemyTakeDamage(e, playerEffectiveDmg(w));
                        const n = norm(e.x - player.x, e.y - player.y);
                        e.kbx += n.x * 180; e.kby += n.y * 180;
                        hit = true;
                    }
                }
                if (hit || enemies.length > 0) {
                    player.weaponTimers[i] = cooldown;
                    if (hit) particles.push({ type: 'melee', x: player.x, y: player.y, r: range, t: 0.22 });
                }
            }
            continue;
        }

        // Ranged
        if (player.weaponTimers[i] <= 0) {
            const range = playerEffectiveRange(w);
            let nearest = null, nd = Infinity;
            for (const e of enemies) { const d = dist(player, e); if (d < range + e.radius && d < nd) { nd = d; nearest = e; } }
            if (nearest) {
                fireWeapon(w, nearest);
                player.weaponTimers[i] = cooldown;
            }
        }
    }
}

function fireWeapon(w, target) {
    sfxShoot();
    const n = norm(target.x - player.x, target.y - player.y);
    const speed = w.projSpeed || 300;
    bullets.push({
        x: player.x + n.x * (player.radius + 6),
        y: player.y + n.y * (player.radius + 6),
        vx: n.x * speed, vy: n.y * speed,
        dmg: playerEffectiveDmg(w),
        radius: w.aoe ? 7 : 5,
        weapon: w,
        pierce: w.pierce || 1,
        hitSet: new Set(),
        ttl: (playerEffectiveRange(w) / speed) * 1.6,
        dead: false,
    });
}

// ============================================================
// 8. ENEMIES (all types, AI, contact damage)
// ============================================================
let enemies = [];

const ENEMY_DEFS = {
    intern:    { name: 'Intern',        emoji: '\u{1F9D1}\u200D\u{1F4BC}', color: '#5577cc', radius: 16, hp: 55,  spd: 88,  dmg: 10, contactDps: 16,  xp: 3, mat: 1, ai: 'chase' },
    manager:   { name: 'Mgr',          emoji: '\u{1F624}',   color: '#cc6633', radius: 18, hp: 95,  spd: 105, dmg: 18, contactDps: 28,  xp: 5, mat: 2, ai: 'chase' },
    printer:   { name: 'Printer',      emoji: '\u{1F5A8}\uFE0F',  color: '#667744', radius: 22, hp: 160, spd: 32,  dmg: 14, contactDps: 10,  xp: 7, mat: 3, ai: 'ranged' },
    hrrep:     { name: 'HR Rep',       emoji: '\u{1F4CB}',   color: '#bb44bb', radius: 15, hp: 68,  spd: 132, dmg: 24, contactDps: 36,  xp: 6, mat: 2, ai: 'chase' },
    itguy:     { name: 'IT Guy',       emoji: '\u{1F4BB}',   color: '#44aa77', radius: 17, hp: 85,  spd: 72,  dmg: 12, contactDps: 20,  xp: 6, mat: 3, ai: 'spawner' },
    accountant:{ name: 'Accountant',   emoji: '\u{1F9EE}',   color: '#228833', radius: 20, hp: 140, spd: 50,  dmg: 10, contactDps: 12,  xp: 7, mat: 4, ai: 'ranged2' },
    cfo:       { name: 'THE CFO',      emoji: '\u{1F4B0}',   color: '#ccaa00', radius: 42, hp: 900, spd: 68,  dmg: 38, contactDps: 45,  xp: 60, mat: 25, ai: 'boss1', isBoss: true },
    hrdirector:{ name: 'HR DIRECTOR',  emoji: '\u{1F4CE}',   color: '#cc44cc', radius: 44, hp: 1400,spd: 62,  dmg: 32, contactDps: 40,  xp: 80, mat: 30, ai: 'boss2', isBoss: true },
    cto:       { name: 'THE CTO',      emoji: '\u2328\uFE0F',  color: '#2244cc', radius: 46, hp: 2000,spd: 72,  dmg: 30, contactDps: 45,  xp: 100,mat: 35, ai: 'boss3', isBoss: true },
    ceo:       { name: '\u{1F451} THE CEO \u{1F451}',emoji: '\u{1F451}',   color: '#ff4400', radius: 52, hp: 3500,spd: 75,  dmg: 40, contactDps: 60,  xp: 150,mat: 50, ai: 'boss4', isBoss: true },
};

function spawnEnemy(type, x, y) {
    if (x === undefined) {
        const side = randInt(0, 3);
        if (side === 0) { x = rand(0, W); y = -25; }
        else if (side === 1) { x = W + 25; y = rand(0, H); }
        else if (side === 2) { x = rand(0, W); y = H + 25; }
        else { x = -25; y = rand(0, H); }
    }
    const def = ENEMY_DEFS[type];
    const scale    = 1 + (wave - 1) * 0.30;
    const spdScale = 1 + (wave - 1) * 0.07;
    return {
        ...def, x, y,
        maxHp: Math.floor(def.hp * scale),
        hp: Math.floor(def.hp * scale),
        dmg: Math.round(def.dmg * scale),
        spd: Math.round(def.spd * spdScale),
        contactDps: def.contactDps * scale,
        kbx: 0, kby: 0,
        flashT: 0,
        slowT: 0, slowMult: 1,
        dotT: 0, dotDps: 0, dotTick: 0,
        aiTimer: rand(1, 3),
        aiState: 'normal',
        phase: 1,
        type,
        dead: false,
    };
}

function enemyTakeDamage(e, dmg) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flashT = 0.12;
    stats.damageDealt += dmg;
    addFloating(e.x + rand(-8, 8), e.y - e.radius - 4, Math.floor(dmg).toString(), '#fff');
    if (player.stats.lifesteal > 0) playerHeal(dmg * player.stats.lifesteal);
    if (e.hp <= 0) enemyDie(e);
}

function enemyDie(e) {
    e.dead = true;
    stats.kills++;
    // Combo system
    comboCount++;
    comboTimer = 2.0;
    if (comboCount > stats.highestCombo) stats.highestCombo = comboCount;

    xpOrbs.push({ x: e.x, y: e.y, v: e.xp });
    if (Math.random() < 0.65 + player.stats.luck * 0.08) matDrops.push({ x: e.x, y: e.y, v: e.mat });
    for (let i = 0; i < 6; i++) particles.push({ type: 'death', x: e.x + rand(-12, 12), y: e.y + rand(-12, 12), vx: rand(-130, 130), vy: rand(-130, 130), r: rand(3, 7), color: e.color, t: rand(0.3, 0.7) });
    sfxEnemyDie();
    addShake(3, 0.15);
}

function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.dead) { enemies.splice(i, 1); continue; }
        updateEnemyAI(e, dt);
        if (e.dead) { enemies.splice(i, 1); continue; }
        e.x = clamp(e.x, e.radius, W - e.radius);
        e.y = clamp(e.y, e.radius, H - e.radius);
        pushOutRect(e, e.radius);
        if (e.flashT > 0) e.flashT -= dt;
        if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowMult = 1; }
        if (e.dotT > 0) {
            e.dotT -= dt; e.dotTick -= dt;
            if (e.dotTick <= 0) { e.dotTick = 0.5; enemyTakeDamage(e, e.dotDps * 0.5); }
        }
        if (!e.dead && dist(e, player) < e.radius + player.radius) playerTakeContactDamage(e.contactDps, dt);
    }
}

function updateEnemyAI(e, dt) {
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = e.spd * e.slowMult;

    // Knockback
    if (e.kbx !== 0 || e.kby !== 0) {
        e.x += e.kbx * dt; e.y += e.kby * dt;
        e.kbx *= Math.max(0, 1 - 12 * dt); e.kby *= Math.max(0, 1 - 12 * dt);
        if (Math.abs(e.kbx) < 2) e.kbx = 0; if (Math.abs(e.kby) < 2) e.kby = 0;
    }

    if (e.ai === 'chase') {
        e.x += (dx / d) * spd * dt; e.y += (dy / d) * spd * dt;
    }
    else if (e.ai === 'ranged') { // Printer: keep distance, shoot
        e.aiTimer -= dt;
        if (d < 200) { e.x -= (dx / d) * spd * 0.6 * dt; e.y -= (dy / d) * spd * 0.6 * dt; }
        else if (d > 300) { e.x += (dx / d) * spd * 0.4 * dt; e.y += (dy / d) * spd * 0.4 * dt; }
        if (e.aiTimer <= 0 && d < 380) {
            e.aiTimer = Math.max(0.9, 2.2 - wave * 0.06);
            const n = norm(dx, dy);
            for (let k = -1; k <= 1; k++) {
                const angle = Math.atan2(n.y, n.x) + k * 0.18;
                enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 230, vy: Math.sin(angle) * 230, dmg: e.dmg * 1.6, radius: 8, color: '#ddf', ttl: 2.2, dead: false });
            }
        }
    }
    else if (e.ai === 'ranged2') { // Accountant: shoot spreadsheets
        e.x += (dx / d) * spd * 0.5 * dt; e.y += (dy / d) * spd * 0.5 * dt;
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) {
            e.aiTimer = Math.max(0.7, 1.8 - wave * 0.05);
            for (let k = -1; k <= 1; k++) {
                const angle = Math.atan2(dy, dx) + k * 0.22;
                enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 240, vy: Math.sin(angle) * 240, dmg: e.dmg * 1.2, radius: 7, color: '#8f8', ttl: 2, dead: false });
            }
        }
    }
    else if (e.ai === 'spawner') { // IT Guy
        e.x += (dx / d) * spd * 0.6 * dt; e.y += (dy / d) * spd * 0.6 * dt;
        e.aiTimer -= dt;
        if (e.aiTimer <= 0 && enemies.filter(x => x.type === 'intern').length < 25) {
            e.aiTimer = 5;
            const angle = Math.random() * Math.PI * 2;
            enemies.push(spawnEnemy('intern', e.x + Math.cos(angle) * 30, e.y + Math.sin(angle) * 30));
        }
    }
    else if (e.ai === 'boss1') { // CFO
        e.x += (dx / d) * spd * dt; e.y += (dy / d) * spd * dt;
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) {
            e.aiTimer = 8;
            enemies.push(spawnEnemy('accountant')); enemies.push(spawnEnemy('accountant'));
            enemies.push(spawnEnemy('intern'));      enemies.push(spawnEnemy('intern'));
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2;
                enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: e.dmg * 0.7, radius: 9, color: '#fd0', ttl: 2, dead: false });
            }
            addFloating(e.x, e.y - 60, 'QUARTERLY REVIEW!', '#fd0');
        }
    }
    else if (e.ai === 'boss2') { // HR Director
        e.x += (dx / d) * spd * dt; e.y += (dy / d) * spd * dt;
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) {
            e.aiTimer = 1.6;
            for (const other of enemies) {
                if (other !== e && dist(e, other) < 180) other.hp = Math.min(other.maxHp, other.hp + 15);
            }
            if (d < 360) {
                const n = norm(dx, dy);
                for (let k = -1; k <= 1; k++) {
                    const angle = Math.atan2(n.y, n.x) + k * 0.28;
                    enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 160, vy: Math.sin(angle) * 160, dmg: e.dmg * 1.4, radius: 12, color: '#f8a', ttl: 2.8, dead: false });
                }
            }
            if (!e._summonTimer) e._summonTimer = 0;
            e._summonTimer -= 1.6;
            if (e._summonTimer <= 0) { e._summonTimer = 12; enemies.push(spawnEnemy('hrrep')); enemies.push(spawnEnemy('manager')); }
        }
    }
    else if (e.ai === 'boss3') { // CTO
        e.x += (dx / d) * spd * dt; e.y += (dy / d) * spd * dt;
        if (e.hp < e.maxHp * 0.5 && e.phase === 1) {
            e.phase = 2; e.spd *= 1.6;
            addFloating(e.x, e.y - 70, '\u2620 PHASE 2 \u2620', '#f00');
        }
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) {
            e.aiTimer = e.phase === 2 ? 4 : 7;
            enemies.push(spawnEnemy('itguy'));
            if (e.phase === 2) {
                for (let k = 0; k < 8; k++) {
                    const a = (k / 8) * Math.PI * 2;
                    enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: e.dmg * 0.8, radius: 9, color: '#48f', ttl: 2.2, dead: false });
                }
            }
        }
    }
    else if (e.ai === 'boss4') { // CEO
        e.x += (dx / d) * spd * dt; e.y += (dy / d) * spd * dt;
        if (e.hp < e.maxHp * 0.3 && e.phase === 1) {
            e.phase = 2; e.spd *= 1.4;
            addFloating(e.x, e.y - 80, '\u26A1 SYNERGY! \u26A1', '#f80');
            for (let k = 0; k < 4; k++) enemies.push(spawnEnemy(['intern','manager','hrrep','accountant'][k]));
        }
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) {
            e.aiTimer = 3;
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2 + (Date.now() * 0.001);
                enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, dmg: e.dmg * 0.9, radius: 10, color: '#f84', ttl: 2.5, dead: false });
            }
        }
    }
}

// ============================================================
// 9. PROJECTILES
// ============================================================
let bullets = [];
let enemyBullets = [];

function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt;
        if (b.ttl <= 0 || b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) { b.dead = true; if (b.weapon.aoe && b.ttl <= 0) explodeBullet(b); }
        if (!b.dead) {
            for (const o of OBSTACLES) {
                if (circleRect(b.x, b.y, b.radius, o.x, o.y, o.w, o.h)) {
                    b.dead = true; if (b.weapon.aoe) explodeBullet(b); break;
                }
            }
        }
        if (!b.dead) {
            for (const e of enemies) {
                if (b.hitSet.has(e) || e.dead) continue;
                if (dist(b, e) < b.radius + e.radius) {
                    b.hitSet.add(e);
                    if (b.weapon.aoe) { explodeBullet(b); b.dead = true; break; }
                    enemyTakeDamage(e, b.dmg);
                    if (b.weapon.slow) { e.slowT = 2.5; e.slowMult = b.weapon.slow; }
                    if (b.weapon.dotDps) { e.dotT = b.weapon.dotDur; e.dotDps = b.weapon.dotDps * player.stats.damage; e.dotTick = 0.5; }
                    b.pierce--;
                    if (b.pierce <= 0) { b.dead = true; break; }
                }
            }
        }
        if (b.dead) bullets.splice(i, 1);
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt;
        if (b.ttl <= 0 || b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) { b.dead = true; }
        if (!b.dead) {
            for (const o of OBSTACLES) { if (circleRect(b.x, b.y, b.radius, o.x, o.y, o.w, o.h)) { b.dead = true; break; } }
        }
        if (!b.dead && dist(b, player) < b.radius + player.radius) {
            playerTakeDamage(b.dmg);
            b.dead = true;
        }
        if (b.dead) enemyBullets.splice(i, 1);
    }
}

function explodeBullet(b) {
    const aoe = b.weapon.aoe;
    for (const e of enemies) { if (!e.dead && dist(b, e) < aoe + e.radius) enemyTakeDamage(e, b.dmg); }
    particles.push({ type: 'aoe', x: b.x, y: b.y, maxR: aoe, r: 0, color: b.weapon.color, t: 0.5 });
}

// ============================================================
// 10. WAVE SYSTEM
// ============================================================
let spawnQueue = [];
let spawnTimer = 0;

const WAVE_CONFIGS = (() => {
    const cfg = [];
    for (let w = 1; w <= MAX_WAVES; w++) {
        if (w === 5)  { cfg.push([{ type: 'cfo', count: 1 }, { type: 'intern', count: 6 }, { type: 'manager', count: 3 }]); continue; }
        if (w === 10) { cfg.push([{ type: 'hrdirector', count: 1 }, { type: 'manager', count: 5 }, { type: 'hrrep', count: 4 }]); continue; }
        if (w === 15) { cfg.push([{ type: 'cto', count: 1 }, { type: 'itguy', count: 5 }, { type: 'accountant', count: 4 }]); continue; }
        if (w === 20) { cfg.push([{ type: 'ceo', count: 1 }, { type: 'manager', count: 6 }, { type: 'hrrep', count: 5 }, { type: 'accountant', count: 4 }]); continue; }
        const groups = [{ type: 'intern', count: Math.floor(5 + w * 2.5) }];
        if (w >= 2) groups.push({ type: 'manager', count: Math.floor(w * 1.3) });
        if (w >= 3) groups.push({ type: 'printer', count: Math.floor((w - 2) * 0.9) });
        if (w >= 4) groups.push({ type: 'hrrep', count: Math.floor((w - 3) * 1.0) });
        if (w >= 6) groups.push({ type: 'itguy', count: Math.floor((w - 5) * 0.9) });
        if (w >= 8) groups.push({ type: 'accountant', count: Math.floor((w - 7) * 0.8) });
        cfg.push(groups);
    }
    return cfg;
})();

function buildSpawnQueue(w) {
    const queue = [];
    const groups = WAVE_CONFIGS[w - 1] || [];
    for (const g of groups) for (let i = 0; i < g.count; i++) queue.push(g.type);
    return shuffle(queue);
}

function startWave() {
    spawnQueue = buildSpawnQueue(wave);
    spawnTimer = 0.5;
    enemies = [];
    bullets = [];
    enemyBullets = [];
    gameState = STATE.PLAYING;
    // Wave announcement
    waveAnnounceTimer = 2.0;
}

// ============================================================
// 11. DROPS
// ============================================================
let xpOrbs = [];
let matDrops = [];

// ============================================================
// 12. PARTICLES & FLOATERS
// ============================================================
let particles = [];
let floaters = [];

function addFloating(x, y, text, color) { floaters.push({ x, y, text, color, vy: -72, t: 1.0, mt: 1.0 }); }
function addShake(mag, dur) { if (mag > screenShake.mag) { screenShake.mag = mag; screenShake.t = dur; } }

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t -= dt;
        if (p.type === 'death') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.max(0, 1 - 5 * dt); p.vy *= Math.max(0, 1 - 5 * dt); }
        if (p.type === 'aoe') p.r = p.maxR * (1 - p.t / 0.5);
        if (p.t <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.y += f.vy * dt; f.vy *= Math.max(0, 1 - 4 * dt); f.t -= dt;
        if (f.t <= 0) floaters.splice(i, 1);
    }
    if (screenShake.t > 0) {
        screenShake.t -= dt;
        screenShake.x = rand(-screenShake.mag, screenShake.mag) * (screenShake.t / 0.3);
        screenShake.y = rand(-screenShake.mag, screenShake.mag) * (screenShake.t / 0.3);
        if (screenShake.t <= 0) { screenShake.x = 0; screenShake.y = 0; }
    }
}

// ============================================================
// 13. UPGRADES / SHOP
// ============================================================
const UPGRADE_POOL = [
    { id: 'hp_up',       name: 'Protein Shake',       emoji: '\u{1F964}',  desc: '+30 Max HP, heal 30 HP',       cost: 4, cat: 'stat', apply: p => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 30); } },
    { id: 'speed_up',    name: 'Espresso Shot',        emoji: '\u2615',  desc: '+20% movement speed',           cost: 3, cat: 'stat', apply: p => { p.stats.speed *= 1.2; } },
    { id: 'dmg_up',      name: 'Anger Management',     emoji: '\u{1F624}',  desc: '+25% all damage',               cost: 5, cat: 'stat', apply: p => { p.stats.damage *= 1.25; } },
    { id: 'atkspd_up',   name: 'Too Much Coffee',      emoji: '\u26A1',  desc: '+25% attack speed',             cost: 4, cat: 'stat', apply: p => { p.stats.atkSpd *= 1.25; } },
    { id: 'range_up',    name: 'Bigger Monitor',       emoji: '\u{1F5A5}\uFE0F', desc: '+20% weapon range',             cost: 3, cat: 'stat', apply: p => { p.stats.range *= 1.2; } },
    { id: 'armor_up',    name: 'Bubble Wrap Vest',     emoji: '\u{1F6E1}\uFE0F', desc: '+6 armor (flat reduction)',     cost: 4, cat: 'stat', apply: p => { p.stats.armor += 6; } },
    { id: 'luck_up',     name: 'Office Lottery',       emoji: '\u{1F3B0}',  desc: '+1.5 luck (more drops)',        cost: 2, cat: 'stat', apply: p => { p.stats.luck += 1.5; } },
    { id: 'lifesteal_up',name: 'Vampire Energy Drink', emoji: '\u{1F9DB}',  desc: '+6% lifesteal from attacks',    cost: 5, cat: 'stat', apply: p => { p.stats.lifesteal += 0.06; } },
    { id: 'regen_up',    name: 'Desk Snacks',          emoji: '\u{1F36A}',  desc: 'Regen 3 HP/sec',                cost: 5, cat: 'stat', apply: p => { p.stats.regen += 3; } },
    { id: 'heal',        name: 'First Aid Kit',        emoji: '\u{1FA79}',  desc: 'Restore 50 HP right now',      cost: 2, cat: 'stat', apply: p => { playerHeal(50); } },
    // New weapons
    { id: 'w_rubberband',name: 'Rubber Band',          emoji: '\u{1F517}',  desc: 'New: Rapid-fire rubber bands',  cost: 5, cat: 'weapon', weaponId: 'rubberband', apply: p => { p.weapons.push({ ...WEAPONS.rubberband, level: 1 }); } },
    { id: 'w_coffeemug', name: 'Coffee Mug',           emoji: '\u2615',  desc: 'New: AOE thrown coffee mug',    cost: 6, cat: 'weapon', weaponId: 'coffeemug',  apply: p => { p.weapons.push({ ...WEAPONS.coffeemug, level: 1 }); } },
    { id: 'w_keyboard',  name: 'Keyboard',             emoji: '\u2328\uFE0F', desc: 'New: Melee keyboard smash',     cost: 5, cat: 'weapon', weaponId: 'keyboard',   apply: p => { p.weapons.push({ ...WEAPONS.keyboard, level: 1 }); } },
    { id: 'w_usb',       name: 'USB Drive',            emoji: '\u{1F4BE}',  desc: 'New: Orbiting USB weapon',      cost: 5, cat: 'weapon', weaponId: 'usb',        apply: p => { p.weapons.push({ ...WEAPONS.usb, level: 1 }); } },
    { id: 'w_laser',     name: 'Laser Pointer',        emoji: '\u{1F534}',  desc: 'New: Piercing laser shots',     cost: 6, cat: 'weapon', weaponId: 'laser',      apply: p => { p.weapons.push({ ...WEAPONS.laser, level: 1 }); } },
    { id: 'w_sticky',    name: 'Sticky Note',          emoji: '\u{1F4DD}',  desc: 'New: Slow + poison notes',      cost: 5, cat: 'weapon', weaponId: 'sticky',     apply: p => { p.weapons.push({ ...WEAPONS.sticky, level: 1 }); } },
    { id: 'w_tps',       name: 'TPS Report',           emoji: '\u{1F4C4}',  desc: 'New: Massive AOE slam',         cost: 8, cat: 'weapon', weaponId: 'tpsreport',  apply: p => { p.weapons.push({ ...WEAPONS.tpsreport, level: 1 }); } },
];

let shopOptions = [];
let hoveredCard = -1;
let rerollCost = 2;
let rerollCount = 0;

function generateShopOptions(count = 4) {
    const ownedIds = new Set(player.weapons.map(w => w.id));
    const currentIds = new Set(shopOptions.map(o => o.id));

    const available = UPGRADE_POOL.filter(u => {
        if (currentIds.has(u.id)) return false;
        if (u.cat === 'weapon') return !ownedIds.has(u.weaponId) && player.weapons.length < 6;
        return true;
    });
    // Add weapon upgrade options
    const weaponUpgrades = [];
    for (let i = 0; i < player.weapons.length; i++) {
        const w = player.weapons[i];
        if (w.level < 3) {
            const uid = `upg_${w.id}_${i}`;
            if (!currentIds.has(uid)) {
                weaponUpgrades.push({
                    id: uid,
                    name: `${w.name} Lv${w.level + 1}`,
                    emoji: w.emoji,
                    desc: `Upgrade: +25% dmg, +12% speed`,
                    cost: 4 + w.level * 3,
                    cat: 'upgrade',
                    apply: (p) => { p.weapons[i].level++; p.weapons[i].baseDmg *= 1.25; },
                });
            }
        }
    }
    const priceScale = 1 + (wave - 1) * 0.15;  // +15% cost per wave
    const allOptions = shuffle([...available, ...weaponUpgrades]).slice(0, count);
    allOptions.forEach(o => { o.cost = Math.ceil(o.cost * priceScale); });
    return allOptions;
}

function buyUpgrade(idx) {
    const upg = shopOptions[idx];
    if (!upg || player.materials < upg.cost) return;
    player.materials -= upg.cost;
    upg.apply(player);
    addFloating(W / 2, H / 2 - 30, upg.name + '!', '#fd0');
    sfxBuy();
    shopOptions.splice(idx, 1);
    const extras = generateShopOptions(4 - shopOptions.length);
    shopOptions.push(...extras);
    hoveredCard = -1;
}

function rerollShop() {
    if (player.materials < rerollCost) return;
    player.materials -= rerollCost;
    rerollCount++;
    rerollCost = 2 + rerollCount * 2;
    shopOptions = generateShopOptions(4);
    hoveredCard = -1;
    sfxReroll();
}

function beginNextWave() {
    if (wave >= MAX_WAVES) { setGameState(STATE.VICTORY); return; }
    wave++;
    setGameState(STATE.PLAYING);
    startWave();
}

// ============================================================
// 14. STATE TRANSITIONS
// ============================================================
function setGameState(s) {
    gameState = s;
    if (s === STATE.SHOP) {
        shopOptions = generateShopOptions(4);
        hoveredCard = -1;
        rerollCost = 2; rerollCount = 0;
        Object.keys(keys).forEach(k => keys[k] = false);
        mouse.down = false;
    }
    if (s === STATE.WAVE_END) {
        waveTransitionTimer = 1.8;
        magnetActive = true;
        magnetTimer = 1.0;
        stats.wavesCompleted = wave;
        sfxWaveComplete();
    }
    if (s === STATE.PLAYING && wave % 5 === 0) {
        setTimeout(sfxBossAppear, 500);
    }
}

function startNewGame(charId) {
    player = createPlayer(charId || 'developer');
    enemies = []; bullets = []; enemyBullets = []; xpOrbs = []; matDrops = []; particles = []; floaters = [];
    dashAfterimages = [];
    comboCount = 0; comboTimer = 0;
    waveAnnounceTimer = 0;
    magnetActive = false; magnetTimer = 0;
    resetStats();
    wave = 1;
    setGameState(STATE.PLAYING);
    startWave();
    startBGMusic();
}

// ============================================================
// 15. UPDATE LOOP (with dash, combo, wave announce, magnet)
// ============================================================
function update(dt) {
    updateParticles(dt);

    if (gameState === STATE.PLAYING) {
        // Spawn from queue
        spawnTimer -= dt;
        if (spawnTimer <= 0 && spawnQueue.length > 0) {
            enemies.push(spawnEnemy(spawnQueue.shift()));
            spawnTimer = Math.max(0.18, 1.3 - wave * 0.07);
        }
        updatePlayer(dt);
        updateEnemies(dt);
        updateBullets(dt);

        // Wave announcement timer
        if (waveAnnounceTimer > 0) waveAnnounceTimer -= dt;

        // Wave done when queue empty + all enemies dead
        if (spawnQueue.length === 0 && enemies.length === 0) {
            if (wave >= MAX_WAVES) setGameState(STATE.VICTORY);
            else setGameState(STATE.WAVE_END);
        }
    }
    else if (gameState === STATE.WAVE_END) {
        waveTransitionTimer -= dt;

        // End-of-wave magnet: pull all drops toward player
        if (magnetActive) {
            magnetTimer -= dt;
            const magnetSpeed = 600;
            for (const o of xpOrbs) {
                const n = norm(player.x - o.x, player.y - o.y);
                o.x += n.x * magnetSpeed * dt;
                o.y += n.y * magnetSpeed * dt;
            }
            for (const m of matDrops) {
                const n = norm(player.x - m.x, player.y - m.y);
                m.x += n.x * magnetSpeed * dt;
                m.y += n.y * magnetSpeed * dt;
            }
            // Collect orbs/materials that reach player
            for (let i = xpOrbs.length - 1; i >= 0; i--) {
                if (dist(player, xpOrbs[i]) < 50) { playerGainXP(xpOrbs[i].v); xpOrbs.splice(i, 1); }
            }
            for (let i = matDrops.length - 1; i >= 0; i--) {
                if (dist(player, matDrops[i]) < 50) {
                    const total = matDrops[i].v + Math.floor(player.stats.luck);
                    player.materials += total;
                    addFloating(matDrops[i].x, matDrops[i].y, `+$${total}`, '#fd0');
                    matDrops.splice(i, 1);
                }
            }
            if (magnetTimer <= 0) magnetActive = false;
        }

        if (waveTransitionTimer <= 0) setGameState(STATE.SHOP);
    }
}

// ============================================================
// 16. RENDER
// ============================================================
function render() {
    ctx.save();
    ctx.translate(Math.round(screenShake.x), Math.round(screenShake.y));

    ctx.clearRect(-10, -10, W + 20, H + 20);

    if (gameState === STATE.MENU) renderMenu();
    else if (gameState === STATE.CHAR_SELECT) renderCharSelect();
    else {
        renderArena();
        if (gameState === STATE.PLAYING || gameState === STATE.WAVE_END) {
            renderPickupsAndParticles();
            renderBullets();
            renderEnemies();
            renderDashAfterimages();
            renderPlayer();
            renderOrbitalWeapons();
            renderFloaters();
            // Danger vignette (before HUD)
            renderDangerVignette();
            renderHUD();
            renderComboDisplay();
            renderDashCooldown();
            if (wave % 5 === 0 && enemies.find(e => e.isBoss)) renderBossBar();
            // Wave announcement overlay
            renderWaveAnnouncement();
        }
        if (gameState === STATE.WAVE_END) renderWaveEnd();
        if (gameState === STATE.SHOP) renderShop();
        if (gameState === STATE.GAME_OVER) renderGameOver();
        if (gameState === STATE.VICTORY) renderVictory();
    }

    ctx.restore();

    // Fullscreen button (rendered outside shake transform, in logical coords)
    renderFullscreenButton();
}

function renderArena() {
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#242438';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    for (const o of OBSTACLES) {
        ctx.fillStyle = '#2e2018';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#5a4428';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#3a2820';
        ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, 8);
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('\u{1F5A5}\uFE0F', o.x + o.w / 2, o.y + o.h / 2 + 7);
    }
}

function renderPickupsAndParticles() {
    const t = Date.now() * 0.004;
    for (const o of xpOrbs) {
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8 + Math.sin(t) * 3;
        ctx.beginPath(); ctx.arc(o.x, o.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
    for (const m of matDrops) {
        ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('\u{1F4B0}', m.x, m.y);
    }
    for (const p of particles) {
        if (p.type === 'aoe') {
            ctx.save(); ctx.globalAlpha = (p.t / 0.5) * 0.5; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else if (p.type === 'death') {
            const alpha = p.t / 0.7;
            ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else if (p.type === 'melee') {
            ctx.save(); ctx.globalAlpha = (p.t / 0.22) * 0.4; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
    }
}

function renderBullets() {
    for (const b of bullets) {
        ctx.save();
        ctx.fillStyle = b.weapon.color;
        ctx.shadowColor = b.weapon.color; ctx.shadowBlur = 6;
        if (b.weapon.id === 'coffeemug') {
            ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('\u2615', b.x, b.y);
        } else if (b.weapon.id === 'tpsreport') {
            ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('\u{1F4C4}', b.x, b.y);
        } else if (b.weapon.id === 'sticky') {
            ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('\u{1F4DD}', b.x, b.y);
        } else {
            ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
    for (const b of enemyBullets) {
        ctx.save(); ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

function renderEnemies() {
    for (const e of enemies) {
        ctx.save();
        if (e.flashT > 0) ctx.filter = 'brightness(4)';
        else if (e.slowT > 0) ctx.filter = 'hue-rotate(200deg) brightness(1.3)';

        ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
        ctx.filter = 'none';

        ctx.font = `${e.radius * 1.4}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(e.emoji, e.x, e.y);

        if (e.hp < e.maxHp) {
            const bw = e.radius * 2, bx = e.x - e.radius, by = e.y - e.radius - 9;
            ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, 5);
            ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#0f0' : e.hp / e.maxHp > 0.25 ? '#ff0' : '#f00';
            ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), 5);
        }
        ctx.restore();
    }
}

function renderDashAfterimages() {
    for (const ai of dashAfterimages) {
        const alpha = ai.t / 0.3;
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#4488ff';
        ctx.beginPath(); ctx.arc(ai.x, ai.y, player.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function renderPlayer() {
    ctx.save();
    if (player.invTimer > 0 && Math.floor(player.invTimer * 12) % 2 === 0) ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#4488ff';
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${player.radius * 1.5}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(selectedChar ? selectedChar.emoji : '\u{1F9D1}\u200D\u{1F4BB}', player.x, player.y);
    ctx.restore();
}

function renderOrbitalWeapons() {
    for (let i = 0; i < player.weapons.length; i++) {
        const w = player.weapons[i];
        if (w.type !== 'orbital') continue;
        const angle = player.orbAngles[i] || 0;
        const ox = player.x + Math.cos(angle) * w.orbitR;
        const oy = player.y + Math.sin(angle) * w.orbitR;
        ctx.save(); ctx.shadowColor = '#0af'; ctx.shadowBlur = 10;
        ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(w.emoji, ox, oy); ctx.restore();
    }
}

function renderFloaters() {
    for (const f of floaters) {
        const alpha = clamp(f.t / f.mt, 0, 1);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color; ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center'; ctx.shadowColor = f.color; ctx.shadowBlur = 4;
        ctx.fillText(f.text, f.x, f.y); ctx.restore();
    }
}

// Danger vignette: red pulsing overlay when HP < 30%
function renderDangerVignette() {
    if (!player || player.hp / player.maxHp >= 0.3) return;
    // Heartbeat rhythm at ~1.2 Hz
    const heartbeat = Math.sin(Date.now() * 0.00754) * 0.5 + 0.5; // 0-1 pulsing
    const intensity = (1 - player.hp / player.maxHp / 0.3) * 0.5; // stronger as HP drops
    const alpha = intensity * (0.3 + heartbeat * 0.4);

    ctx.save();
    const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
    grad.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
}

// Combo display
function renderComboDisplay() {
    if (comboCount < 3) return;
    const scale = 1 + Math.sin(Date.now() * 0.008) * 0.1;
    const mult = getComboXPMultiplier();
    ctx.save();
    ctx.font = `bold ${Math.floor(22 * scale)}px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillStyle = comboCount >= 10 ? '#ff4400' : comboCount >= 5 ? '#ffaa00' : '#ffdd00';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
    ctx.fillText(`x${comboCount} COMBO!`, player.x, player.y - 40);
    ctx.font = '12px Courier New'; ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaf';
    ctx.fillText(`${mult}x XP`, player.x, player.y - 55);
    ctx.restore();
}

// Dash cooldown indicator
function renderDashCooldown() {
    if (!player) return;
    const cdPct = player.dashTimer > 0 ? player.dashTimer / player.dashCooldown : 0;
    const x = 215, y = 10, w = 40, h = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, h);
    if (cdPct > 0) {
        ctx.fillStyle = '#555';
        ctx.fillRect(x, y, w * cdPct, h);
    } else {
        ctx.fillStyle = '#44ddff';
        ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = cdPct > 0 ? '#888' : '#fff';
    ctx.font = '9px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('DASH', x + w / 2, y + 11);
}

// Wave announcement
function renderWaveAnnouncement() {
    if (waveAnnounceTimer <= 0) return;
    const t = waveAnnounceTimer;
    const progress = 1 - t / 2.0; // 0 to 1
    const alpha = t > 1.5 ? (2.0 - t) * 2 : t / 1.5; // fade in then out
    const scale = t > 1.5 ? 0.5 + (2.0 - t) * 1.0 : 1.0; // zoom in during first 0.5s

    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    const isBoss = wave % 5 === 0;
    const fontSize = Math.floor(48 * scale);

    if (isBoss) {
        // Boss wave shake
        const shakeX = Math.sin(Date.now() * 0.05) * 3;
        const shakeY = Math.cos(Date.now() * 0.07) * 2;
        ctx.font = `bold ${fontSize}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff2200';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
        ctx.fillText(`\u26A0 BOSS WAVE \u26A0`, W / 2 + shakeX, H / 2 - 60 + shakeY);
    } else {
        ctx.font = `bold ${fontSize}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 16;
        ctx.fillText(`WAVE ${wave}`, W / 2, H / 2 - 60);
    }
    ctx.restore();
}

function renderHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, 52);

    // HP bar
    const hpPct = player.hp / player.maxHp;
    ctx.fillStyle = '#333'; ctx.fillRect(10, 8, 190, 18);
    ctx.fillStyle = hpPct > 0.5 ? '#22dd44' : hpPct > 0.25 ? '#ffcc00' : '#ff3333';
    ctx.fillRect(10, 8, 190 * hpPct, 18);
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.strokeRect(10, 8, 190, 18);
    ctx.fillStyle = '#fff'; ctx.font = '11px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, 105, 21);

    // XP bar
    ctx.fillStyle = '#222'; ctx.fillRect(10, 29, 190, 7);
    ctx.fillStyle = '#0af'; ctx.fillRect(10, 29, 190 * (player.xp / player.xpToNext), 7);
    ctx.fillStyle = '#8af'; ctx.font = '10px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`Lv ${player.level}`, 204, 37);

    // Wave
    const isBoss = wave % 5 === 0;
    ctx.fillStyle = isBoss ? '#ff4444' : '#eee';
    ctx.font = `bold ${isBoss ? 15 : 16}px Courier New`; ctx.textAlign = 'center';
    ctx.fillText(isBoss ? `\u26A0 BOSS WAVE ${wave}/${MAX_WAVES} \u26A0` : `WAVE ${wave} / ${MAX_WAVES}`, W / 2, 22);
    const remaining = enemies.length + spawnQueue.length;
    ctx.fillStyle = '#f88'; ctx.font = '12px Courier New';
    ctx.fillText(`\u{1F47E} ${remaining} remaining`, W / 2, 40);

    // Materials
    ctx.fillStyle = '#ffdd00'; ctx.font = '16px Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`\u{1F4B0} ${player.materials}`, W - 10, 22);
    ctx.fillStyle = '#8af'; ctx.font = '11px Courier New';
    ctx.fillText(`\u2764 ${Math.ceil(player.hp)}  \u26A1 Lv${player.level}`, W - 10, 40);

    // Weapon bar
    renderWeaponBar();
}

function renderWeaponBar() {
    const sw = 48, sh = 48, pad = 5;
    const total = 6 * (sw + pad) - pad;
    const sx = (W - total) / 2;
    const sy = H - 58;

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(sx - 5, sy - 5, total + 10, sh + 14);

    for (let i = 0; i < 6; i++) {
        const x = sx + i * (sw + pad), y = sy;
        const w = player.weapons[i];
        ctx.fillStyle = w ? '#1e1e40' : '#111';
        ctx.strokeStyle = w ? '#4444aa' : '#2a2a2a'; ctx.lineWidth = 1;
        ctx.fillRect(x, y, sw, sh); ctx.strokeRect(x, y, sw, sh);
        if (w) {
            ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(w.emoji, x + sw / 2, y + sh / 2 - 3);
            for (let l = 0; l < w.level; l++) {
                ctx.fillStyle = '#ffcc00'; ctx.beginPath();
                ctx.arc(x + 8 + l * 12, y + sh - 6, 4, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
}

function renderBossBar() {
    const boss = enemies.find(e => e.isBoss);
    if (!boss) return;
    const bw = 500, bh = 20, bx = (W - bw) / 2, by = 55;
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(bx - 5, by - 3, bw + 10, bh + 20);
    ctx.fillStyle = '#220000'; ctx.fillRect(bx, by, bw, bh);
    const pct = boss.hp / boss.maxHp;
    const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
    grad.addColorStop(0, '#ff2200'); grad.addColorStop(1, '#ff8800');
    ctx.fillStyle = grad; ctx.fillRect(bx, by, bw * pct, bh);
    ctx.strokeStyle = '#f44'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${boss.name}   ${Math.ceil(boss.hp)} / ${boss.maxHp}`, W / 2, by + bh + 13);
}

function renderWaveEnd() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffff00'; ctx.font = 'bold 42px Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0'; ctx.shadowBlur = 20;
    ctx.fillText(`WAVE ${wave} CLEARED!`, W / 2, H / 2 - 20);
    ctx.fillStyle = '#aaf'; ctx.font = '18px Courier New'; ctx.shadowBlur = 0;
    ctx.fillText('Opening shop...', W / 2, H / 2 + 25);
}

function renderShop() {
    ctx.fillStyle = 'rgba(8,8,20,0.95)'; ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#0af'; ctx.shadowBlur = 12;
    ctx.fillText(`\u{1F4CB} WAVE ${wave} SHOP`, W / 2, 36);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffdd00'; ctx.font = '15px Courier New';
    ctx.fillText(`\u{1F4B0} ${player.materials} materials  |  [1-4] buy  [R] reroll  [Enter] continue`, W / 2, 60);

    // Cards
    const cw = 170, ch = 195, gap = 12;
    const totalW = 4 * cw + 3 * gap;
    const sx = (W - totalW) / 2, sy = 74;

    for (let i = 0; i < 4; i++) {
        const u = shopOptions[i];
        const x = sx + i * (cw + gap), y = sy;
        const hover = hoveredCard === i;

        if (!u) {
            ctx.fillStyle = '#0a0a18'; ctx.strokeStyle = '#1a1a30'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('\u2713', x + cw / 2, y + ch / 2);
            continue;
        }

        const canBuy = player.materials >= u.cost;
        ctx.fillStyle = hover ? '#1a2255' : '#0f1530';
        ctx.strokeStyle = hover ? '#66aaff' : (canBuy ? '#334488' : '#1e1e38');
        ctx.lineWidth = hover ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill(); ctx.stroke();
        if (!canBuy) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill(); }

        ctx.font = '36px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(u.emoji, x + cw / 2, y + 48);

        ctx.fillStyle = canBuy ? '#fff' : '#555'; ctx.font = 'bold 11px Courier New';
        ctx.fillText(u.name, x + cw / 2, y + 70);

        ctx.fillStyle = canBuy ? '#88aadd' : '#404060'; ctx.font = '10px Courier New';
        const lines = wrapText(u.desc, cw - 14);
        lines.slice(0, 4).forEach((l, li) => ctx.fillText(l, x + cw / 2, y + 86 + li * 14));

        ctx.fillStyle = canBuy ? '#ffdd00' : '#552200'; ctx.font = 'bold 13px Courier New';
        ctx.fillText(`\u{1F4B0} ${u.cost}`, x + cw / 2, y + ch - 20);
        ctx.fillStyle = '#334'; ctx.font = '11px Courier New';
        ctx.fillText(`[${i + 1}]`, x + cw / 2, y + ch - 6);
    }

    // Bottom button row
    const btnY = sy + ch + 12;

    // Reroll button
    const canReroll = player.materials >= rerollCost;
    const rrX = sx;
    ctx.fillStyle = canReroll ? '#1a3030' : '#111';
    ctx.strokeStyle = canReroll ? '#336655' : '#222'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(rrX, btnY, 180, 40, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = canReroll ? '#66ffaa' : '#444';
    ctx.font = '13px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`\u{1F3B2} Reroll [R]  \u{1F4B0}${rerollCost}`, rrX + 90, btnY + 25);

    // Continue button
    const contX = W - sx - 200;
    ctx.fillStyle = '#102820'; ctx.strokeStyle = '#226644'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(contX, btnY, 200, 40, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#44ff88'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('\u25B6 Continue  [Enter]', contX + 100, btnY + 25);

    // Stats footer
    const statY = btnY + 58;
    ctx.fillStyle = '#445'; ctx.font = '11px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(
        `\u2764 ${Math.ceil(player.hp)}/${player.maxHp}  \u{1F3C3} ${player.stats.speed.toFixed(2)}x  \u2694 ${player.stats.damage.toFixed(2)}x  \u26A1 ${player.stats.atkSpd.toFixed(2)}x  \u{1F6E1} ${player.stats.armor}  \u267B ${player.stats.regen}/s`,
        W / 2, statY
    );
    ctx.fillStyle = '#336'; ctx.font = '11px Courier New';
    ctx.fillText('Weapons: ' + player.weapons.map(w => `${w.emoji}Lv${w.level}`).join('  '), W / 2, statY + 16);
}

function renderMenu() {
    ctx.fillStyle = '#0d0d1e'; ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = '#171730'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Title
    ctx.fillStyle = '#fff'; ctx.font = 'bold 58px Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#4af'; ctx.shadowBlur = 22;
    ctx.fillText('OFFICE WARS', W / 2, 160);

    ctx.font = '20px Courier New'; ctx.fillStyle = '#99aaff'; ctx.shadowBlur = 8;
    ctx.fillText('Survive 20 waves of corporate hell', W / 2, 208);
    ctx.shadowBlur = 0; ctx.fillStyle = '#556'; ctx.font = '15px Courier New';
    ctx.fillText('WASD or hold \u{1F5B1} Left Mouse to move  \u2022  Weapons auto-fire', W / 2, 244);
    ctx.fillText('Collect \u{1F4B0} between waves for upgrades  \u2022  [M] mute music', W / 2, 266);
    ctx.fillText('[Space] dash  \u2022  [F] fullscreen', W / 2, 288);

    // Play button
    const pulse = 0.85 + Math.sin(Date.now() * 0.003) * 0.15;
    ctx.fillStyle = `rgba(0, 170, 255, ${pulse})`;
    ctx.shadowColor = '#0af'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.roundRect(W / 2 - 115, 320, 230, 56, 12); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 22px Courier New'; ctx.shadowBlur = 0;
    ctx.fillText('\u23F1 CLOCK IN', W / 2, 354);

    // Enemy showcase
    const showcase = ['\u{1F9D1}\u200D\u{1F4BC}','\u{1F624}','\u{1F5A8}\uFE0F','\u{1F4CB}','\u{1F4BB}','\u{1F9EE}','\u{1F4B0}','\u{1F451}'];
    showcase.forEach((e, i) => {
        ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(e, 70 + i * 95, 434);
    });
    ctx.fillStyle = '#446'; ctx.font = '12px Courier New'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Intern  Manager  Printer  HR Rep  IT Guy  Accnt   CFO    CEO', W / 2, 456);

    // Controls
    ctx.fillStyle = '#334'; ctx.font = '13px Courier New';
    ctx.fillText('Defeat all enemies each wave \u2022 Collect XP orbs (green) to level up', W / 2, 495);
    ctx.fillText('Avoid touching enemies \u2022 Buy upgrades between waves', W / 2, 515);
}

// Character Select screen
let hoveredCharIdx = -1;

function renderCharSelect() {
    ctx.fillStyle = '#0d0d1e'; ctx.fillRect(0, 0, W, H);
    // Grid bg
    ctx.strokeStyle = '#171730'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Title
    ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#4af'; ctx.shadowBlur = 14;
    ctx.fillText('SELECT YOUR CHARACTER', W / 2, 48);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#667'; ctx.font = '13px Courier New';
    ctx.fillText('Click or press [1-6] to choose', W / 2, 70);

    // 2x3 grid of character cards
    const cw = 230, ch = 160, gapX = 18, gapY = 14;
    const cols = 3, rows = 2;
    const totalW = cols * cw + (cols - 1) * gapX;
    const totalH = rows * ch + (rows - 1) * gapY;
    const startX = (W - totalW) / 2;
    const startY = 88;

    for (let idx = 0; idx < CHAR_ORDER.length; idx++) {
        const ch_def = CHARACTERS[CHAR_ORDER[idx]];
        const col = idx % cols, row = Math.floor(idx / cols);
        const x = startX + col * (cw + gapX);
        const y = startY + row * (ch + gapY);
        const hover = hoveredCharIdx === idx;

        // Card background
        ctx.fillStyle = hover ? '#1a2255' : '#0f1530';
        ctx.strokeStyle = hover ? '#66aaff' : '#334488';
        ctx.lineWidth = hover ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill(); ctx.stroke();

        // Emoji
        ctx.font = '36px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(ch_def.emoji, x + 36, y + 46);

        // Name
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'left';
        ctx.fillText(ch_def.name, x + 68, y + 24);

        // Description
        ctx.fillStyle = '#88aadd'; ctx.font = '10px Courier New';
        ctx.fillText(ch_def.desc, x + 68, y + 40);

        // Stats
        ctx.fillStyle = '#8899aa'; ctx.font = '9px Courier New';
        ctx.fillText(`HP:${ch_def.hp} SPD:${ch_def.speed}x DMG:${ch_def.damage}x`, x + 10, y + 72);
        ctx.fillText(`ATK:${ch_def.atkSpd}x RNG:${ch_def.range}x ARM:${ch_def.armor}`, x + 10, y + 86);
        if (ch_def.lifesteal > 0) ctx.fillText(`LS:${(ch_def.lifesteal * 100).toFixed(0)}%`, x + 10, y + 100);
        if (ch_def.luck > 0) ctx.fillText(`LCK:+${ch_def.luck}`, x + (ch_def.lifesteal > 0 ? 60 : 10), y + 100);

        // Starting weapon
        const sw = WEAPONS[ch_def.startWeapon];
        ctx.fillStyle = '#aab'; ctx.font = '10px Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`Weapon: ${sw.emoji} ${sw.name}`, x + 10, y + 118);

        // Passive
        ctx.fillStyle = '#dd8'; ctx.font = 'bold 10px Courier New';
        ctx.fillText(`\u2605 ${ch_def.passive}`, x + 10, y + 136);
        ctx.fillStyle = '#887'; ctx.font = '9px Courier New';
        ctx.fillText(ch_def.passiveDesc, x + 10, y + 150);

        // Number key hint
        ctx.fillStyle = '#334'; ctx.font = '11px Courier New'; ctx.textAlign = 'right';
        ctx.fillText(`[${idx + 1}]`, x + cw - 8, y + 150);
    }
}

function renderGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff3333'; ctx.font = 'bold 60px Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#f00'; ctx.shadowBlur = 22;
    ctx.fillText('TERMINATED', W / 2, 150);
    ctx.shadowBlur = 0; ctx.fillStyle = '#aaa'; ctx.font = '20px Courier New';
    ctx.fillText('Your employment has been terminated.', W / 2, 200);
    ctx.fillText(`You survived to Wave ${wave} / ${MAX_WAVES}`, W / 2, 235);
    ctx.fillText(`Level reached: ${player.level}`, W / 2, 265);

    // Stats display
    ctx.fillStyle = '#889'; ctx.font = '14px Courier New';
    ctx.fillText(`Kills: ${stats.kills}   Damage Dealt: ${Math.floor(stats.damageDealt)}`, W / 2, 305);
    ctx.fillText(`Highest Combo: ${stats.highestCombo}   Waves Completed: ${stats.wavesCompleted}`, W / 2, 330);

    ctx.fillStyle = '#0af'; ctx.shadowColor = '#0af'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(W / 2 - 120, 368, 240, 52, 10); ctx.fill();
    ctx.fillStyle = '#000'; ctx.shadowBlur = 0; ctx.font = 'bold 21px Courier New';
    ctx.fillText('TRY AGAIN', W / 2, 400);
}

function renderVictory() {
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffdd00'; ctx.font = 'bold 50px Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = '#fd0'; ctx.shadowBlur = 22;
    ctx.fillText('YOU SURVIVED!', W / 2, 140);
    ctx.shadowBlur = 0; ctx.fillStyle = '#0f0'; ctx.font = '20px Courier New';
    ctx.fillText('The company has filed for bankruptcy.', W / 2, 190);
    ctx.fillText('You are free. \u{1F389}', W / 2, 220);
    ctx.fillStyle = '#aaf'; ctx.font = '18px Courier New';
    ctx.fillText(`Final Level: ${player.level}   Materials: ${player.materials}`, W / 2, 260);

    // Stats display
    ctx.fillStyle = '#889'; ctx.font = '14px Courier New';
    ctx.fillText(`Kills: ${stats.kills}   Damage Dealt: ${Math.floor(stats.damageDealt)}`, W / 2, 300);
    ctx.fillText(`Highest Combo: ${stats.highestCombo}   Waves Completed: ${stats.wavesCompleted}`, W / 2, 325);

    ctx.fillStyle = '#0af'; ctx.shadowColor = '#0af'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(W / 2 - 120, 358, 240, 52, 10); ctx.fill();
    ctx.fillStyle = '#000'; ctx.shadowBlur = 0; ctx.font = 'bold 21px Courier New';
    ctx.fillText('PLAY AGAIN', W / 2, 390);
}

// Fullscreen button (top-right corner)
function renderFullscreenButton() {
    const bx = W - 34, by = 4, bw = 28, bh = 22;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#aaa'; ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('\u26F6', bx + bw / 2, by + bh / 2);
    ctx.restore();
}

// ============================================================
// 17. INPUT HANDLERS (click, keydown - with char select, dash, fullscreen)
// ============================================================
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

function isFullscreenBtnHit(mx, my) {
    const bx = W - 34, by = 4, bw = 28, bh = 22;
    return mx >= bx && mx <= bx + bw && my >= by && my <= by + bh;
}

canvas.addEventListener('mousemove', () => {
    if (gameState === STATE.SHOP) {
        const cw = 170, ch = 195, gap = 12;
        const totalW = 4 * cw + 3 * gap;
        const sx = (W - totalW) / 2, sy = 74;
        hoveredCard = -1;
        for (let i = 0; i < 4; i++) {
            const x = sx + i * (cw + gap);
            if (mouse.x >= x && mouse.x <= x + cw && mouse.y >= sy && mouse.y <= sy + ch) hoveredCard = i;
        }
    }
    if (gameState === STATE.CHAR_SELECT) {
        const cw = 230, ch_h = 160, gapX = 18, gapY = 14;
        const cols = 3;
        const totalW = cols * cw + (cols - 1) * gapX;
        const startX = (W - totalW) / 2;
        const startY = 88;
        hoveredCharIdx = -1;
        for (let idx = 0; idx < CHAR_ORDER.length; idx++) {
            const col = idx % cols, row = Math.floor(idx / cols);
            const x = startX + col * (cw + gapX);
            const y = startY + row * (ch_h + gapY);
            if (mouse.x >= x && mouse.x <= x + cw && mouse.y >= y && mouse.y <= y + ch_h) {
                hoveredCharIdx = idx;
            }
        }
    }
});

canvas.addEventListener('click', () => {
    const { x: mx, y: my } = mouse;

    // Fullscreen button (all states)
    if (isFullscreenBtnHit(mx, my)) { toggleFullscreen(); return; }

    if (gameState === STATE.MENU) {
        if (mx >= W / 2 - 115 && mx <= W / 2 + 115 && my >= 320 && my <= 376) {
            getAC(); // init audio on user gesture
            gameState = STATE.CHAR_SELECT;
        }
    } else if (gameState === STATE.CHAR_SELECT) {
        const cw = 230, ch_h = 160, gapX = 18, gapY = 14;
        const cols = 3;
        const totalW = cols * cw + (cols - 1) * gapX;
        const startX = (W - totalW) / 2;
        const startY = 88;
        for (let idx = 0; idx < CHAR_ORDER.length; idx++) {
            const col = idx % cols, row = Math.floor(idx / cols);
            const x = startX + col * (cw + gapX);
            const y = startY + row * (ch_h + gapY);
            if (mx >= x && mx <= x + cw && my >= y && my <= y + ch_h) {
                startNewGame(CHAR_ORDER[idx]);
                return;
            }
        }
    } else if (gameState === STATE.SHOP) {
        const cw = 170, ch = 195, gap = 12;
        const totalW = 4 * cw + 3 * gap;
        const sx = (W - totalW) / 2, sy = 74;
        const btnY = sy + ch + 12;
        for (let i = 0; i < 4; i++) {
            const x = sx + i * (cw + gap);
            if (mx >= x && mx <= x + cw && my >= sy && my <= sy + ch) { buyUpgrade(i); return; }
        }
        if (mx >= sx && mx <= sx + 180 && my >= btnY && my <= btnY + 40) { rerollShop(); return; }
        const contX = W - sx - 200;
        if (mx >= contX && mx <= contX + 200 && my >= btnY && my <= btnY + 40) { beginNextWave(); return; }
    } else if (gameState === STATE.GAME_OVER || gameState === STATE.VICTORY) {
        if (mx >= W / 2 - 120 && mx <= W / 2 + 120 && my >= 358 && my <= 420) {
            gameState = STATE.CHAR_SELECT;
        }
    }
});

window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();

    // Mute toggle
    if (key === 'm') {
        if (musicMuted) resumeBGMusic(); else stopBGMusic();
    }

    // Fullscreen toggle
    if (key === 'f' && gameState !== STATE.SHOP) {
        toggleFullscreen();
    }

    // Dash
    if (key === ' ' && gameState === STATE.PLAYING) {
        e.preventDefault();
        performDash();
        return;
    }

    if (gameState === STATE.MENU && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        getAC();
        gameState = STATE.CHAR_SELECT;
    }

    if (gameState === STATE.CHAR_SELECT) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
            startNewGame(CHAR_ORDER[num - 1]);
        }
    }

    if (gameState === STATE.SHOP) {
        if (e.key === '1') buyUpgrade(0);
        else if (e.key === '2') buyUpgrade(1);
        else if (e.key === '3') buyUpgrade(2);
        else if (e.key === '4') buyUpgrade(3);
        else if (key === 'r') rerollShop();
        else if (e.key === 'Enter') { e.preventDefault(); beginNextWave(); }
    }

    if ((gameState === STATE.GAME_OVER || gameState === STATE.VICTORY) && e.key === 'Enter') {
        gameState = STATE.CHAR_SELECT;
    }
});

// ============================================================
// 18. GAME LOOP
// ============================================================
let lastTime = 0;
function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
