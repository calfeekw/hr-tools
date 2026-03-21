# Office Wars

A Brotato-inspired survival game set in a corporate office. Fight waves of rogue coworkers using office supplies as weapons, level up between rounds, and survive 20 waves to escape the workplace. A full run takes roughly 15–20 minutes — if you can make it out alive.

<!-- Add a gameplay screenshot or GIF here -->
<!-- ![Office Wars gameplay](screenshots/gameplay.gif) -->

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

Regular enemies spawn in increasing numbers each wave:

| Enemy | Behavior |
|-------|----------|
| Intern | Weak, fast, swarms in groups |
| Manager | Tanky, charges at player |
| Printer | Stationary, fires paper jams |
| HR Rep | Heals nearby enemies |
| IT Guy | Teleports, drops debuffs |
| Accountant | Slow, hits hard, high HP |

### Boss Fights

Boss encounters happen every 5 waves, each with unique mechanics:

| Wave | Boss | Description |
|------|------|-------------|
| 5 | CFO | Budget-powered attacks |
| 10 | HR Director | Summons policy enforcers |
| 15 | CTO | Tech-based assault patterns |
| 20 | CEO | Final boss — all abilities combined |

## Progression

- **XP** — Kill enemies to earn XP and level up, unlocking stat upgrades
- **Materials** — Dropped by enemies, spent in the shop between waves
- **Combo System** — Chain kills quickly for XP multipliers (up to 3x)
- **Shop** — Buy new weapons (up to 6), upgrade existing weapons (up to level 3), or boost stats like damage, speed, armor, and lifesteal. Prices increase each wave.

## Tech Stack

- Vanilla JavaScript (ES6+)
- HTML5 Canvas for rendering
- No external dependencies

## Status / Roadmap

- :white_check_mark: Core gameplay loop (movement, shooting, waves)
- :white_check_mark: 6 playable characters with unique stats
- :white_check_mark: 8 weapons with distinct behaviors
- :white_check_mark: Shop system between waves
- :white_check_mark: Boss fights every 5 waves
- :construction: Sound effects & music
- :construction: Visual polish & particle effects
- :memo: Mobile / touch controls
- :memo: Leaderboard / high score persistence
- :memo: Additional characters & weapons

## Running Locally

Open `index.html` in any modern browser, or serve with a static file server:

```bash
npx serve .
# or
python -m http.server 8080
```

Best experienced in Chrome or Firefox on desktop. Mobile is not currently supported.

## Contributing

Pull requests are welcome. If you find a bug or have a feature idea, open an issue first so we can discuss the approach.

## License

<!-- Add your license here, e.g. MIT -->
