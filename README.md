# Office Wars

A Brotato-inspired survival game set in a corporate office. Fight waves of rogue coworkers using office supplies as weapons, level up between rounds, and survive 20 waves to escape the workplace.

## How to Play

- **WASD / Arrow Keys** — Move
- **Mouse** — Aim (weapons auto-fire toward cursor)
- **Space** — Dash (short invincible dodge)

Survive each wave, collect XP and materials from defeated enemies, then spend materials in the shop between waves to buy upgrades and new weapons.

## Characters

| Character | Style | Starting Weapon |
|-----------|-------|-----------------|
| The Developer | Balanced all-rounder | Stapler |
| The Intern | Fast & fragile | Rubber Band |
| The Manager | Tanky bruiser | Coffee Mug |
| IT Admin | Range specialist | Laser Pointer |
| The Accountant | Slow powerhouse | TPS Report |
| HR Rep | Sustain fighter | Sticky Note |

## Weapons

| Weapon | Type | Description |
|--------|------|-------------|
| Stapler | Ranged | Reliable mid-range shots |
| Rubber Band | Ranged | Rapid-fire, low damage |
| Coffee Mug | Ranged | Slow AOE splash |
| Keyboard | Melee | Close-range smash |
| USB Drive | Orbital | Orbits around player |
| Laser Pointer | Ranged | Fast piercing shots |
| Sticky Note | Ranged | Slows enemies + poison DOT |
| TPS Report | Ranged | Massive AOE slam, very slow |

## Enemies

Regular enemies (Interns, Managers, Printers, HR Reps, IT Guys, Accountants) spawn in increasing numbers. Boss fights occur every 5 waves:

- **Wave 5** — CFO
- **Wave 10** — HR Director
- **Wave 15** — CTO
- **Wave 20** — CEO

## Progression

- **XP** — Kill enemies to earn XP and level up, unlocking stat upgrades
- **Materials** — Dropped by enemies, spent in the shop between waves
- **Combo System** — Chain kills quickly for XP multipliers (up to 3x)
- **Shop** — Buy new weapons (up to 6), upgrade existing weapons (up to level 3), or boost stats like damage, speed, armor, and lifesteal. Prices increase each wave.

## Running Locally

Open `index.html` in a browser, or serve with any static file server:

```bash
npx serve .
# or
python -m http.server 8080
```
