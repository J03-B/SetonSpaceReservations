# Campus master map — AI image generation brief

Use this when converting the Google Maps satellite screenshot into a simplified master map for **Seton Spaces**.

## How to use

1. Upload your satellite screenshot as the **reference image**.
2. Use **image-to-image** or **edit with reference** mode (not text-only).
3. Paste the **Primary prompt** below.
4. Add the **Negative prompt** if the tool supports it.
5. Export using the **Output specs** so it works in the app.

---

## Primary prompt (copy this)

```
Transform this satellite campus screenshot into a simplified, user-friendly TOP-DOWN orthographic campus master map for a school space-reservation web app.

GOAL: Keep every building footprint, road, sidewalk, parking area, and lawn exactly where they are in the reference — same layout and proportions — but redraw it in a clean flat illustration style that is easy to read at a glance.

STYLE:
- Flat 2D bird's-eye view (no 3D perspective, no isometric tilt)
- Clean vector-like illustration, NOT photorealistic, NOT satellite texture
- Institutional and calm — like Apple Maps simplified view meets a campus wayfinding map
- Soft rounded building corners, crisp outer edges on each building
- Minimal detail inside building roofs (no windows, no HVAC clutter, no shadows on roofs)
- Subtle drop shadow optional only under building edges for separation

COLOR PALETTE (match Seton School branding):
- Building roofs: light warm gray #E8ECF0 with slightly darker outline #B8C0CE
- Main/accent buildings may use muted royal blue #1E4D8C fill with gold #C9A227 accent stripe on one edge (sparingly — 2–3 key buildings max)
- Roads: medium gray #9CA3AF, clearly wider than sidewalks
- Sidewalks / paths: lighter gray #D1D5DB, distinct from roads
- Grass / lawns / fields: soft green #C8E6C9 (flat, no texture noise)
- Parking lots: light gray #E5E7EB with optional faint stall lines
- Trees: simplified round green blobs in clusters, not individual leaf detail
- Water (if any): calm blue #BFDBFE
- Background outside campus: off-white #F7F8FA

COMPOSITION REQUIREMENTS:
- Every building must be a SEPARATE closed shape with a visible border so developers can click each building in the app
- Leave small gaps or outline contrast between adjacent buildings — do not merge touching structures
- Preserve road network connectivity exactly as reference
- Preserve sidewalk paths along building fronts
- Do NOT add people, cars, buses, labels, icons, legend, compass rose, or UI chrome
- Do NOT add text labels on buildings — the app will overlay names
- Do NOT crop or reframe — keep full campus bounds from reference
- Center the campus; minimal empty margin (about 3% padding)

TECHNICAL:
- High resolution, sharp edges, suitable for web zoom
- Even lighting, no dramatic shadows, no night mode
- Horizontal landscape orientation, roughly 16:10 aspect ratio

This image is Level 1 of a drill-down map: users click a building here, then later see an interior floor plan. Each building footprint must read clearly as its own clickable zone.
```

---

## Negative prompt (if supported)

```
satellite photo, photorealistic, aerial photography, Google Maps screenshot, blurry, noisy texture, 3D render, isometric, perspective tilt, fish-eye, dark shadows, night, fog, rain, people, cars, traffic, street labels, watermarks, logos, text, numbers, building names, legend, compass, north arrow, arrows, pins, markers, emoji, cartoon characters, excessive detail, roof windows, solar panels, chimneys, trees covering buildings, merged buildings, melted shapes, low resolution, jpeg artifacts, gradient banding, neon colors, playful style, game map, fantasy map
```

---

## Output specs (for this app)

| Setting | Value |
|---|---|
| **Aspect ratio** | 16:10 (e.g. 2400×1500 or 3200×2000) |
| **Format** | PNG (preferred) or high-quality WebP |
| **Min width** | 2400 px |
| **Background** | Solid off-white `#F7F8FA` — not transparent (unless you need transparency) |
| **Save path** | `public/map/MainMap.png` |
| **Future building maps** | Same style, same palette, 16:10, one building per image |

After export, update `src/lib/map/room-regions.ts` with building hotspot percentages.

---

## Tool-specific tips

### ChatGPT / Gemini (image + prompt)
- Upload satellite screenshot first.
- Say: *"Edit this image using the following instructions. Preserve exact layout."*
- Paste Primary prompt.
- Ask for 1536×1024 or widest available, then upscale if needed.

### Midjourney
- Use `--iw 1.5` or higher to lock layout to reference.
- Add: `--style raw --stylize 50` for less artistic drift.
- Example: `[Primary prompt] --ar 16:10 --iw 2 --style raw --stylize 50`

### DALL·E / Copilot
- Use **image edit** with reference, not generate from scratch.
- Emphasize: *"Do not move buildings. Only simplify visual style."*

### Stable Diffusion (img2img)
- Denoise strength: **0.35–0.55** (lower = closer to layout; higher = more stylized)
- ControlNet: Canny or Lineart on reference for layout lock

---

## Follow-up prompt — individual building (Level 2)

Use after master map is approved. Upload a cropped building from satellite + reference master style.

```
Create a simplified TOP-DOWN floor-plan style map of this single school building, matching the flat illustration style of the Seton campus master map.

Show individual rooms, hallways, gymnasium, auditorium, or offices as separate closed shapes with clear borders (for click targets). Use the same palette: gray rooms, lighter gray corridors, green outdoor adjacency, gray-blue outlines.

Preserve exact wall layout from reference. No furniture, no people, no text labels. Each reservable space must be its own distinct shape. 16:10 aspect ratio, PNG, institutional wayfinding style.
```

---

## Buildings to identify (initial reservation spaces)

When labeling hotspots in code after the image is ready:

| App slug | Display name |
|---|---|
| `dmc` | DMC |
| `faustina-hall` | Faustina Hall |
| `gym` | Gym |

Add every other building on campus as clickable regions even if not reservable yet — they can drill down or show "No reservable spaces."

---

## Quality checklist before using in app

- [ ] Every building footprint matches satellite reference position
- [ ] Roads and sidewalks still connect logically
- [ ] Buildings do not blur together — clear borders
- [ ] No text baked into image
- [ ] Readable when scaled to mobile width (~375 px)
- [ ] File saved as `public/map/MainMap.png`
- [ ] Hotspots updated in `room-regions.ts`
