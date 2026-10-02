# i18n (EN/KO/JA/ZH) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tarot-web`'s UI and card content, and `tarot-reader`'s card data, become readable in English, Korean, Japanese, and Chinese, switchable live from the top-bar language selector with no redraw and no reload.

**Architecture:** Translated card content (name/upright/reversed for all 78 cards) is added as an additive `translations` field to `tarot-reader/src/data/deck.json` — the shared data source `tarot-web` already fetches directly. UI chrome and spread/position labels live in a new `tarot-web/i18n/translations.json`, fetched alongside `deck.json`. `app.js` is restructured to track the current reading as logical data (card name + orientation key) separate from rendered text, so a language switch re-resolves display strings in place.

**Tech Stack:** Plain JS/HTML/CSS (no framework, no build step), static JSON data files, Python 3 stdlib `json` for `tarot-reader`'s existing data; verification throughout uses one-off `node -e`/`python3 -c` scripts and `tarot-reader`'s existing `pytest`/`unittest` suite — this project has no test framework or build tooling of its own (see both repos' `CLAUDE.md`), and this plan follows that existing convention rather than introducing one.

**Spec:** `docs/superpowers/specs/2026-10-02-i18n-design.md`

## Global Constraints

- `tarot-reader/src/data/deck.json` changes must be purely additive — every existing key (`name`, `arcana`, `number`, `suit`, `upright`, `reversed`, `images`) keeps its exact current value and type. Verified by running `tarot-reader`'s existing test suite unmodified after the change.
- `tarot-reader`'s CLI and REST API are out of scope — no changes to `cli.py`, `text_formatter.py`, `core.py`, or `api/`.
- No new languages beyond `en`/`ko`/`ja`/`zh`; no server-side state — `localStorage` only, per-viewer.
- Switching language while a reading is on screen must re-render the **same** cards in place — never reshuffle, never replay the flip animation.
- Card translations keyed by the exact English `name` string already in `deck.json` (the stable key) — never by array index.

## Review Focus

- A card missing a `translations` entry for the selected language must fall back to the English top-level fields, not render `undefined` or crash — every rendering lookup needs an explicit fallback, tested with a deliberately incomplete fixture.
- Switching language with a reading already on screen must preserve the exact same drawn cards (same names, same orientations) — only their displayed text changes. Tested by asserting the logical reading array is unchanged before/after a simulated language switch.
- `tarot-reader`'s own test suite (`pytest` / `python -m unittest discover tests`) must still pass, unmodified, after the `deck.json` change — this is the hard backward-compatibility requirement from the spec, not just an inspection claim.
- `localStorage` access can throw (private browsing, blocked storage) — reading or writing the saved language preference must not crash page load or the language switch itself.
- The Single Card spread has no position (`positions: [null]`) — the language-switch re-render path must handle a `null` position without throwing, same as the existing draw path already does.

---

## File Structure

- Modify: `tarot-reader/src/data/deck.json` — add `translations: {ko, ja, zh}` to all 78 card entries (Tasks 1–5).
- Create: `tarot-web/i18n/translations.json` — UI strings (title, buttons, spread names, orientation labels, position labels/descriptions) for all 4 languages (Task 8).
- Modify: `tarot-web/index.html` — add stable element ids the language switch needs to target (`app-title`, `app-subtitle`, `spread-select-label`) (Task 9).
- Modify: `tarot-web/app.js` — i18n loading, logical reading state, language-switch rendering, `localStorage` persistence, `SPREADS` restructured to source labels from `translations.json` (Task 10).
- Modify (submodule pointer only): `tarot-web`'s tracked `tarot-reader` commit (Task 7).

---

## Card Name Translation Reference (used by Tasks 1–5)

Minor Arcana card names are fully mechanical: `{suit} {rank}` (language-specific
word order/joiner below). This table is exact and complete — no judgment calls
needed when composing the 56 minor arcana names.

**Suits:**

| Suit | KO | JA | ZH |
|---|---|---|---|
| Wands | 완드 | ワンド | 权杖 |
| Cups | 컵 | カップ | 圣杯 |
| Swords | 소드 | ソード | 宝剑 |
| Pentacles | 펜타클 | ペンタクル | 星币 |

**Ranks:**

| Rank | KO | JA | ZH |
|---|---|---|---|
| Ace | 에이스 | エース | A |
| Two | 2 | 2 | 2 |
| Three | 3 | 3 | 3 |
| Four | 4 | 4 | 4 |
| Five | 5 | 5 | 5 |
| Six | 6 | 6 | 6 |
| Seven | 7 | 7 | 7 |
| Eight | 8 | 8 | 8 |
| Nine | 9 | 9 | 9 |
| Ten | 10 | 10 | 10 |
| Page | 시종 | ペイジ | 侍从 |
| Knight | 기사 | ナイト | 骑士 |
| Queen | 여왕 | クイーン | 王后 |
| King | 왕 | キング | 国王 |

**Composition formula per language** (e.g. Wands + Page):

- KO: `"{suit} {rank}"` → `"완드 시종"`
- JA: `"{suit}の{rank}"` → `"ワンドのペイジ"`
- ZH: `"{suit}{rank}"` (no separator) → `"权杖侍从"`

**Major Arcana names (fully enumerated, all 22):**

| English | KO | JA | ZH |
|---|---|---|---|
| The Fool | 바보 | 愚者 | 愚者 |
| The Magician | 마법사 | 魔術師 | 魔术师 |
| The High Priestess | 여사제 | 女教皇 | 女祭司 |
| The Empress | 여황제 | 女帝 | 女皇 |
| The Emperor | 황제 | 皇帝 | 皇帝 |
| The Hierophant | 교황 | 法王 | 教皇 |
| The Lovers | 연인 | 恋人 | 恋人 |
| The Chariot | 전차 | 戦車 | 战车 |
| Strength | 힘 | 力 | 力量 |
| The Hermit | 은둔자 | 隠者 | 隐士 |
| Wheel of Fortune | 운명의 수레바퀴 | 運命の輪 | 命运之轮 |
| Justice | 정의 | 正義 | 正义 |
| The Hanged Man | 매달린 사람 | 吊られた男 | 倒吊人 |
| Death | 죽음 | 死神 | 死神 |
| Temperance | 절제 | 節制 | 节制 |
| The Devil | 악마 | 悪魔 | 恶魔 |
| The Tower | 탑 | 塔 | 高塔 |
| The Star | 별 | 星 | 星星 |
| The Moon | 달 | 月 | 月亮 |
| The Sun | 태양 | 太陽 | 太阳 |
| Judgement | 심판 | 審判 | 审判 |
| The World | 세계 | 世界 | 世界 |

## Verification Script (used by Tasks 1–6)

Every translation task ends with this exact check (adjust the `require_names`
list per task — shown here for Task 1 / Major Arcana; later tasks swap the
list). It fails loudly on any missing or empty field — this is the "test" for
a content-authoring task, in place of a unit test:

```python
import json, sys

deck = json.load(open("tarot-reader/src/data/deck.json"))
by_name = {c["name"]: c for c in deck}

require_names = [  # Task 1: all 22 Major Arcana names, in order, from the table above
    "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
    "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
    "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
    "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
]

errors = []
for name in require_names:
    card = by_name.get(name)
    if card is None:
        errors.append(f"{name}: not found in deck.json at all")
        continue
    t = card.get("translations")
    if not isinstance(t, dict):
        errors.append(f"{name}: missing 'translations' key")
        continue
    for lang in ("ko", "ja", "zh"):
        block = t.get(lang)
        if not isinstance(block, dict):
            errors.append(f"{name}/{lang}: missing translation block")
            continue
        for field in ("name", "upright", "reversed"):
            val = block.get(field)
            if not isinstance(val, str) or not val.strip():
                errors.append(f"{name}/{lang}/{field}: missing or empty")

if errors:
    print(f"FAILED: {len(errors)} problem(s)")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print(f"OK: all {len(require_names)} cards have complete ko/ja/zh translations")
```

---

### Task 1: Translate Major Arcana into `deck.json`

**Files:**
- Modify: `tarot-reader/src/data/deck.json`

**Interfaces:**
- Produces: each of the 22 Major Arcana entries in `deck.json` gains
  `"translations": {"ko": {"name","upright","reversed"}, "ja": {...}, "zh": {...}}`,
  using the exact card names from the Major Arcana table above.

- [ ] **Step 1: Add the `translations` block to all 22 Major Arcana entries**

For each of the 22 cards, add a `translations` key using the name from the
table above and a translation of that card's existing `upright`/`reversed`
English text into Korean, Japanese, and Chinese. Two fully worked examples to
match format, register, and length (short comma-separated keyword phrases,
same style as the existing English text — not full sentences):

```json
{
  "name": "The Fool",
  "upright": "New beginnings, innocence, spontaneity, free spirit",
  "reversed": "Recklessness, lack of direction, poor judgment, folly",
  "translations": {
    "ko": {
      "name": "바보",
      "upright": "새로운 시작, 순수함, 자유로운 영혼, 즉흥성",
      "reversed": "무모함, 방향 상실, 판단력 부족, 어리석음"
    },
    "ja": {
      "name": "愚者",
      "upright": "新たな始まり、純粋さ、自由な精神、無邪気さ",
      "reversed": "無謀さ、方向性の喪失、判断力の欠如、愚行"
    },
    "zh": {
      "name": "愚者",
      "upright": "新的开始、纯真、自由奔放、率性而为",
      "reversed": "鲁莽、迷失方向、判断失误、愚蠢"
    }
  }
}
```

```json
{
  "name": "The Tower",
  "upright": "Sudden change, upheaval, chaos, revelation",
  "reversed": "Avoiding disaster, fear of change, delaying the inevitable",
  "translations": {
    "ko": {
      "name": "탑",
      "upright": "갑작스러운 변화, 격변, 혼돈, 깨달음",
      "reversed": "재난 회피, 변화에 대한 두려움, 불가피한 일의 지연"
    },
    "ja": {
      "name": "塔",
      "upright": "突然の変化、激変、混乱、啓示",
      "reversed": "災難の回避、変化への恐れ、避けられないことの先延ばし"
    },
    "zh": {
      "name": "高塔",
      "upright": "突如其来的变化、剧变、混乱、启示",
      "reversed": "逃避灾难、害怕改变、拖延无法避免之事"
    }
  }
}
```

Apply the same pattern to the remaining 20 Major Arcana cards, translating
each card's actual existing `upright`/`reversed` text (read it from the
current `deck.json` before translating — don't invent new meanings).

- [ ] **Step 2: Verify completeness**

Save the verification script above as a scratch file (e.g.
`/tmp/verify_major.py`) with the Task 1 `require_names` list (already shown
above), then run:

```bash
python3 /tmp/verify_major.py
```

Expected: `OK: all 22 cards have complete ko/ja/zh translations`

- [ ] **Step 3: Confirm `deck.json` is still valid JSON and existing fields are untouched**

```bash
cd tarot-reader && python3 -c "
import json
deck = json.load(open('src/data/deck.json'))
assert len(deck) == 78, f'expected 78 cards, got {len(deck)}'
fool = next(c for c in deck if c['name'] == 'The Fool')
assert fool['upright'] == 'New beginnings, innocence, spontaneity, free spirit'
print('OK: 78 cards, existing English fields unchanged')
"
```

- [ ] **Step 4: Commit (within the `tarot-reader` submodule checkout)**

```bash
cd tarot-reader
git add src/data/deck.json
git commit -m "Add Korean/Japanese/Chinese translations for Major Arcana"
```

(This commit stays local to the submodule checkout for now — Task 6 pushes
it once all five translation tasks are done.)

---

### Task 2: Translate Wands suit into `deck.json`

**Files:**
- Modify: `tarot-reader/src/data/deck.json`

**Interfaces:**
- Produces: all 14 Wands entries gain a `translations` block, names composed
  via the Wands row of the Suits table + the Ranks table using each
  language's composition formula above.

- [ ] **Step 1: Add the `translations` block to all 14 Wands entries**

Worked example (Ace of Wands — note the composed names: KO "완드 에이스", JA
"ワンドのエース", ZH "权杖A", per the formula above):

```json
{
  "name": "Ace of Wands",
  "upright": "Inspiration, new opportunities, growth, potential",
  "reversed": "Delays, lack of motivation, missed opportunities",
  "translations": {
    "ko": {
      "name": "완드 에이스",
      "upright": "영감, 새로운 기회, 성장, 가능성",
      "reversed": "지연, 의욕 부족, 놓친 기회"
    },
    "ja": {
      "name": "ワンドのエース",
      "upright": "インスピレーション、新たな機会、成長、可能性",
      "reversed": "遅延、意欲の欠如、逃した機会"
    },
    "zh": {
      "name": "权杖A",
      "upright": "灵感、新的机会、成长、潜力",
      "reversed": "延误、缺乏动力、错失良机"
    }
  }
}
```

Apply the same pattern to the remaining 13 Wands cards (Two through Ten,
Page, Knight, Queen, King of Wands), composing each name from the Suits/Ranks
tables and translating each card's actual existing `upright`/`reversed` text.

- [ ] **Step 2: Verify completeness**

Same script as Task 1, with `require_names` replaced by the 14 Wands card
names (`"Ace of Wands"`, `"Two of Wands"`, ... `"King of Wands"`). Run:

```bash
python3 /tmp/verify_wands.py
```

Expected: `OK: all 14 cards have complete ko/ja/zh translations`

- [ ] **Step 3: Confirm `deck.json` still has 78 valid entries**

```bash
cd tarot-reader && python3 -c "
import json
deck = json.load(open('src/data/deck.json'))
assert len(deck) == 78
print('OK: 78 cards')
"
```

- [ ] **Step 4: Commit**

```bash
cd tarot-reader
git add src/data/deck.json
git commit -m "Add Korean/Japanese/Chinese translations for Wands suit"
```

---

### Task 3: Translate Cups suit into `deck.json`

**Files:**
- Modify: `tarot-reader/src/data/deck.json`

**Interfaces:**
- Produces: all 14 Cups entries gain a `translations` block, same pattern as
  Task 2 using the Cups row (KO 컵 / JA カップ / ZH 圣杯).

- [ ] **Step 1: Add the `translations` block to all 14 Cups entries**

Worked example (Queen of Cups — KO "컵 여왕", JA "カップのクイーン", ZH "圣杯王后"):

```json
{
  "name": "Queen of Cups",
  "upright": "Compassion, calm, comfort, emotional security",
  "reversed": "Emotional insecurity, co-dependency, smothering",
  "translations": {
    "ko": {
      "name": "컵 여왕",
      "upright": "연민, 평온함, 위안, 정서적 안정",
      "reversed": "정서적 불안정, 의존성, 과잉보호"
    },
    "ja": {
      "name": "カップのクイーン",
      "upright": "思いやり、落ち着き、安らぎ、情緒的な安定",
      "reversed": "情緒不安定、共依存、過保護"
    },
    "zh": {
      "name": "圣杯王后",
      "upright": "同情、平静、安慰、情感安全感",
      "reversed": "情感不安、相互依赖、过度保护"
    }
  }
}
```

Apply the same pattern to the remaining 13 Cups cards, composing names from
the Suits/Ranks tables and translating each card's actual existing text.

- [ ] **Step 2: Verify completeness** — same script, `require_names` = the 14
  Cups card names. Expected: `OK: all 14 cards have complete ko/ja/zh translations`

- [ ] **Step 3: Confirm `deck.json` still has 78 valid entries** — same check as Task 2 Step 3.

- [ ] **Step 4: Commit**

```bash
cd tarot-reader
git add src/data/deck.json
git commit -m "Add Korean/Japanese/Chinese translations for Cups suit"
```

---

### Task 4: Translate Swords suit into `deck.json`

**Files:**
- Modify: `tarot-reader/src/data/deck.json`

**Interfaces:**
- Produces: all 14 Swords entries gain a `translations` block, same pattern
  using the Swords row (KO 소드 / JA ソード / ZH 宝剑).

- [ ] **Step 1: Add the `translations` block to all 14 Swords entries**

Worked example (Ten of Swords — KO "소드 10", JA "ソードの10", ZH "宝剑10"):

```json
{
  "name": "Ten of Swords",
  "upright": "Painful endings, deep wounds, betrayal, loss, crisis",
  "reversed": "Recovery, regeneration, resisting an inevitable end",
  "translations": {
    "ko": {
      "name": "소드 10",
      "upright": "고통스러운 끝맺음, 깊은 상처, 배신, 상실, 위기",
      "reversed": "회복, 재생, 피할 수 없는 끝에 대한 저항"
    },
    "ja": {
      "name": "ソードの10",
      "upright": "苦痛を伴う終わり、深い傷、裏切り、喪失、危機",
      "reversed": "回復、再生、避けられない終わりへの抵抗"
    },
    "zh": {
      "name": "宝剑10",
      "upright": "痛苦的结束、深深的创伤、背叛、失落、危机",
      "reversed": "恢复、重生、抗拒无法避免的结局"
    }
  }
}
```

Apply the same pattern to the remaining 13 Swords cards, composing names
from the Suits/Ranks tables and translating each card's actual existing text.

- [ ] **Step 2: Verify completeness** — same script, `require_names` = the 14
  Swords card names. Expected: `OK: all 14 cards have complete ko/ja/zh translations`

- [ ] **Step 3: Confirm `deck.json` still has 78 valid entries** — same check as Task 2 Step 3.

- [ ] **Step 4: Commit**

```bash
cd tarot-reader
git add src/data/deck.json
git commit -m "Add Korean/Japanese/Chinese translations for Swords suit"
```

---

### Task 5: Translate Pentacles suit into `deck.json`

**Files:**
- Modify: `tarot-reader/src/data/deck.json`

**Interfaces:**
- Produces: all 14 Pentacles entries gain a `translations` block, same
  pattern using the Pentacles row (KO 펜타클 / JA ペンタクル / ZH 星币).

- [ ] **Step 1: Add the `translations` block to all 14 Pentacles entries**

Worked example (King of Pentacles — KO "펜타클 왕", JA "ペンタクルのキング", ZH "星币国王"):

```json
{
  "name": "King of Pentacles",
  "upright": "Wealth, business acumen, security, discipline, abundance",
  "reversed": "Financial recklessness, greed, poor financial decisions",
  "translations": {
    "ko": {
      "name": "펜타클 왕",
      "upright": "부, 사업 수완, 안정, 절제, 풍요",
      "reversed": "재정적 무모함, 탐욕, 잘못된 재정 결정"
    },
    "ja": {
      "name": "ペンタクルのキング",
      "upright": "富、商才、安定、規律、豊かさ",
      "reversed": "財政的な無謀さ、強欲、誤った財務判断"
    },
    "zh": {
      "name": "星币国王",
      "upright": "财富、商业头脑、安全感、自律、富足",
      "reversed": "financial 鲁莽、贪婪、错误的财务决策"
    }
  }
}
```

(If any machine-translated artifact like a stray English word slips into a
draft phrase — as very deliberately left in the "financial 鲁莽" example
above — Step 2's verification won't catch wrong-language text within a
non-empty string, so proofread each phrase by eye before committing, the way
you would for Tasks 1–4 too.)

Apply the same pattern to the remaining 13 Pentacles cards, composing names
from the Suits/Ranks tables and translating each card's actual existing text.

- [ ] **Step 2: Verify completeness** — same script, `require_names` = the 14
  Pentacles card names. Expected: `OK: all 14 cards have complete ko/ja/zh translations`

- [ ] **Step 3: Confirm `deck.json` still has 78 valid entries** — same check as Task 2 Step 3.

- [ ] **Step 4: Commit**

```bash
cd tarot-reader
git add src/data/deck.json
git commit -m "Add Korean/Japanese/Chinese translations for Pentacles suit"
```

---

### Task 6: Full-deck verification, run `tarot-reader` test suite, push

**Files:**
- Read only: `tarot-reader/src/data/deck.json`, `tarot-reader/tests/`

**Interfaces:**
- Consumes: the completed `deck.json` from Tasks 1–5 (all 78 entries with
  `translations`).
- Produces: a pushed `tarot-reader` commit history on its own `main` branch,
  ready for Task 7 to pin `tarot-web`'s submodule to.

- [ ] **Step 1: Verify all 78 cards have complete translations**

```bash
cd tarot-reader && python3 -c "
import json
deck = json.load(open('src/data/deck.json'))
assert len(deck) == 78, len(deck)
errors = []
for card in deck:
    t = card.get('translations')
    if not isinstance(t, dict):
        errors.append(f\"{card['name']}: missing translations\")
        continue
    for lang in ('ko', 'ja', 'zh'):
        block = t.get(lang, {})
        for field in ('name', 'upright', 'reversed'):
            if not isinstance(block.get(field), str) or not block.get(field, '').strip():
                errors.append(f\"{card['name']}/{lang}/{field}: missing or empty\")
if errors:
    print(f'FAILED: {len(errors)} problems')
    for e in errors[:20]:
        print(' -', e)
    raise SystemExit(1)
print('OK: all 78 cards fully translated')
"
```

Expected: `OK: all 78 cards fully translated`

- [ ] **Step 2: Run `tarot-reader`'s existing test suite — must pass unmodified**

```bash
cd tarot-reader && python -m unittest discover tests
```

Expected: all tests pass (this is the Global Constraint / Review Focus item
confirming the additive schema change breaks nothing — if anything fails,
stop and investigate before proceeding; do not edit the tests to make them
pass).

- [ ] **Step 3: Push the `tarot-reader` commits to its own remote**

```bash
cd tarot-reader
git log --oneline -6   # sanity check: the 5 translation commits from Tasks 1-5, on top of the existing HEAD
git push origin HEAD:main
```

(`tarot-reader` is checked out at a detached HEAD on top of the commit
`tarot-web` currently pins — pushing `HEAD:main` fast-forwards its `main`
branch with the 5 new commits, same as any detached-HEAD-to-branch push.)

---

### Task 7: Bump `tarot-web`'s submodule pointer

**Files:**
- Modify (submodule pointer): `tarot-web`'s git index entry for `tarot-reader`

**Interfaces:**
- Consumes: the pushed `tarot-reader` commit from Task 6.
- Produces: `tarot-web`'s `app.js` (Task 10) can now rely on every card in
  `tarot-reader/src/data/deck.json` having a `translations` block.

- [ ] **Step 1: Confirm the submodule's working tree is at the new commit**

```bash
cd /home/baruna/playground/public/tarot-web
git -C tarot-reader log --oneline -1
```

Expected: shows the last translation commit from Task 6 (Pentacles).

- [ ] **Step 2: Stage and commit the submodule pointer bump in `tarot-web`**

```bash
cd /home/baruna/playground/public/tarot-web
git add tarot-reader
git commit -m "Update tarot-reader submodule: add KO/JA/ZH card translations"
```

- [ ] **Step 3: Verify the pointer bump is the only change**

```bash
git show --stat HEAD
```

Expected: exactly one file changed, `tarot-reader` (mode 160000 pointer
update) — no other files.

---

### Task 8: Create `tarot-web/i18n/translations.json`

**Files:**
- Create: `tarot-web/i18n/translations.json`

**Interfaces:**
- Produces: a JSON object with top-level keys `en`, `ko`, `ja`, `zh`, each
  holding the exact shape consumed by Task 10's `app.js` changes:
  `{ title, subtitle, spreadLabel, spreads: {single, three, celtic}, draw,
  reset, orientation: {Upright, Reversed}, positions: {three: [...3 items],
  celtic: [...10 items]} }`, each position item `{label, description}`.

- [ ] **Step 1: Write the complete file**

```bash
mkdir -p i18n
```

Create `i18n/translations.json` with this exact content (all four languages
fully written out — this is UI chrome text, small enough to specify
completely rather than by example):

```json
{
  "en": {
    "title": "Tarot Web",
    "subtitle": "For entertainment purposes only.",
    "spreadLabel": "Spread",
    "spreads": {
      "single": "Single Card",
      "three": "Three-Card (Past / Present / Future)",
      "celtic": "Celtic Cross"
    },
    "draw": "Draw",
    "reset": "Reset",
    "orientation": { "Upright": "Upright", "Reversed": "Reversed" },
    "positions": {
      "three": [
        { "label": "Past", "description": "What has led to the current situation." },
        { "label": "Present", "description": "The heart of the matter right now." },
        { "label": "Future", "description": "Where things are heading if the current path continues." }
      ],
      "celtic": [
        { "label": "Present Situation", "description": "The heart of the matter — your current circumstances." },
        { "label": "Challenge", "description": "What crosses you — the immediate obstacle or tension." },
        { "label": "Distant Past/Foundation", "description": "The root cause or foundation this situation is built on." },
        { "label": "Recent Past", "description": "What's recently passed or is now fading from influence." },
        { "label": "Possible Outcome", "description": "A potential direction if things continue as they are." },
        { "label": "Near Future", "description": "What's approaching next." },
        { "label": "Your Approach", "description": "How you're approaching the situation." },
        { "label": "External Influences", "description": "People, environment, and outside forces at play." },
        { "label": "Hopes and Fears", "description": "What you hope for — or secretly fear." },
        { "label": "Final Outcome", "description": "The likely culmination of the reading." }
      ]
    }
  },
  "ko": {
    "title": "타로 웹",
    "subtitle": "오락 목적으로만 이용해 주세요.",
    "spreadLabel": "스프레드",
    "spreads": {
      "single": "한 장 뽑기",
      "three": "쓰리 카드 (과거 / 현재 / 미래)",
      "celtic": "켈틱 크로스"
    },
    "draw": "뽑기",
    "reset": "초기화",
    "orientation": { "Upright": "정방향", "Reversed": "역방향" },
    "positions": {
      "three": [
        { "label": "과거", "description": "현재 상황을 만든 배경입니다." },
        { "label": "현재", "description": "지금 이 순간의 핵심입니다." },
        { "label": "미래", "description": "지금의 흐름이 이어질 경우의 방향입니다." }
      ],
      "celtic": [
        { "label": "현재 상황", "description": "지금 겪고 있는 상황의 핵심입니다." },
        { "label": "장애물", "description": "당신을 가로막는 즉각적인 문제나 긴장입니다." },
        { "label": "먼 과거/근원", "description": "이 상황이 만들어진 근본 원인입니다." },
        { "label": "가까운 과거", "description": "최근에 지나갔거나 영향력이 옅어지고 있는 일입니다." },
        { "label": "가능한 결과", "description": "지금 흐름이 이어질 때의 잠재적 방향입니다." },
        { "label": "가까운 미래", "description": "곧 다가올 일입니다." },
        { "label": "당신의 태도", "description": "상황에 접근하는 당신의 방식입니다." },
        { "label": "외부 영향", "description": "주변 사람과 환경, 외부 요인입니다." },
        { "label": "희망과 두려움", "description": "바라는 것, 혹은 은밀히 두려워하는 것입니다." },
        { "label": "최종 결과", "description": "리딩이 향하는 가장 가능성 높은 결말입니다." }
      ]
    }
  },
  "ja": {
    "title": "タロット ウェブ",
    "subtitle": "娯楽目的のみでご利用ください。",
    "spreadLabel": "スプレッド",
    "spreads": {
      "single": "ワンカード",
      "three": "スリーカード（過去 / 現在 / 未来）",
      "celtic": "ケルト十字"
    },
    "draw": "引く",
    "reset": "リセット",
    "orientation": { "Upright": "正位置", "Reversed": "逆位置" },
    "positions": {
      "three": [
        { "label": "過去", "description": "現在の状況につながった背景です。" },
        { "label": "現在", "description": "今まさに起きていることの核心です。" },
        { "label": "未来", "description": "今の流れが続いた場合の行き先です。" }
      ],
      "celtic": [
        { "label": "現在の状況", "description": "今の状況の核心です。" },
        { "label": "障害", "description": "あなたを阻む直接的な課題や緊張です。" },
        { "label": "遠い過去・土台", "description": "この状況の根本原因や土台です。" },
        { "label": "最近の過去", "description": "最近過ぎ去った、または影響が薄れつつあることです。" },
        { "label": "可能な結果", "description": "今の流れが続いた場合に考えられる方向です。" },
        { "label": "近い未来", "description": "まもなく訪れることです。" },
        { "label": "あなたの姿勢", "description": "状況への向き合い方です。" },
        { "label": "周囲の影響", "description": "周囲の人・環境・外的要因です。" },
        { "label": "希望と不安", "description": "望んでいること、あるいはひそかに恐れていることです。" },
        { "label": "最終結果", "description": "リーディングが行き着く可能性の高い結末です。" }
      ]
    }
  },
  "zh": {
    "title": "塔罗网页",
    "subtitle": "仅供娱乐之用。",
    "spreadLabel": "牌阵",
    "spreads": {
      "single": "单张牌",
      "three": "三张牌（过去 / 现在 / 未来）",
      "celtic": "凯尔特十字"
    },
    "draw": "抽牌",
    "reset": "重置",
    "orientation": { "Upright": "正位", "Reversed": "逆位" },
    "positions": {
      "three": [
        { "label": "过去", "description": "导致当前状况的原因。" },
        { "label": "现在", "description": "当下事情的核心。" },
        { "label": "未来", "description": "若按当前走向发展，事情将走向何方。" }
      ],
      "celtic": [
        { "label": "当前处境", "description": "当前状况的核心。" },
        { "label": "挑战", "description": "横亘在你面前的直接阻碍或紧张关系。" },
        { "label": "远因/根基", "description": "这一状况形成的根本原因或基础。" },
        { "label": "近期过去", "description": "刚刚过去、影响正在减弱的事情。" },
        { "label": "可能结果", "description": "若延续当前走向，可能出现的方向。" },
        { "label": "近期未来", "description": "即将到来的事情。" },
        { "label": "你的态度", "description": "你面对这一状况的方式。" },
        { "label": "外部影响", "description": "周围的人、环境及外部因素。" },
        { "label": "希望与恐惧", "description": "你所期望的，或暗自担心的事情。" },
        { "label": "最终结果", "description": "这次占卜最可能指向的结局。" }
      ]
    }
  }
}
```

- [ ] **Step 2: Verify valid JSON and identical key shape across all 4 languages**

```bash
node -e "
const t = require('./i18n/translations.json');
const langs = ['en','ko','ja','zh'];
function keysOf(obj) {
  return JSON.stringify(Object.keys(obj).sort());
}
const base = t.en;
for (const lang of langs) {
  if (!t[lang]) throw new Error(lang + ': missing entirely');
  if (keysOf(t[lang]) !== keysOf(base)) throw new Error(lang + ': top-level keys differ from en');
  if (keysOf(t[lang].spreads) !== keysOf(base.spreads)) throw new Error(lang + ': spreads keys differ');
  if (keysOf(t[lang].orientation) !== keysOf(base.orientation)) throw new Error(lang + ': orientation keys differ');
  if (t[lang].positions.three.length !== 3) throw new Error(lang + ': expected 3 three-card positions');
  if (t[lang].positions.celtic.length !== 10) throw new Error(lang + ': expected 10 celtic positions');
  for (const p of [...t[lang].positions.three, ...t[lang].positions.celtic]) {
    if (!p.label || !p.description) throw new Error(lang + ': position missing label/description: ' + JSON.stringify(p));
  }
}
console.log('OK: all 4 languages present with identical structure');
"
```

Expected: `OK: all 4 languages present with identical structure`

- [ ] **Step 3: Commit**

```bash
git add i18n/translations.json
git commit -m "Add tarot-web UI translations (en/ko/ja/zh)"
```

---

### Task 9: Add stable element ids to `index.html`

**Files:**
- Modify: `tarot-web/index.html`

**Interfaces:**
- Produces: element ids `app-title`, `app-subtitle`, `spread-select-label`
  that Task 10's `app.js` targets to re-render static text on language
  switch. All other existing ids (`language-select`, `reset-button`,
  `spread-select`, `card-view`, `draw-button`) are unchanged.

- [ ] **Step 1: Add the three new ids**

Current relevant lines:

```html
<main>
    <h1>Tarot Web</h1>
    <p class="subtitle">For entertainment purposes only.</p>

    <label for="spread-select" class="spread-label">Spread</label>
```

Change to:

```html
<main>
    <h1 id="app-title">Tarot Web</h1>
    <p id="app-subtitle" class="subtitle">For entertainment purposes only.</p>

    <label for="spread-select" id="spread-select-label" class="spread-label">Spread</label>
```

- [ ] **Step 2: Verify the ids are present**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
for (const id of ['app-title','app-subtitle','spread-select-label','language-select','reset-button','spread-select','card-view','draw-button']) {
  if (!html.includes('id=\"' + id + '\"')) throw new Error('missing #' + id);
}
console.log('OK: all element ids present');
"
```

Expected: `OK: all element ids present`

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add element ids needed for language-switch re-rendering"
```

---

### Task 10: Wire i18n into `app.js`

**Files:**
- Modify: `tarot-web/app.js`

**Interfaces:**
- Consumes: `tarot-reader/src/data/deck.json`'s new `translations` field
  (Task 7), `i18n/translations.json` (Task 8), the new `index.html` ids
  (Task 9).
- Produces: `currentLanguage` (module-level string, one of `"en"|"ko"|"ja"|"zh"`),
  `currentReading` (module-level `{spreadKey, cards: [{englishName,
  orientation}]} | null`), `resolveCardText(englishName, orientation, lang)`
  → `{name, meaning}`, `applyLanguage(lang)` (re-renders static UI + current
  reading, if any, without redrawing).

This is the largest task — broken into sub-steps, each independently
verifiable via Node (no DOM available in this environment; verify the pure
logic functions directly, then do a manual browser pass per the spec's
testing plan).

- [ ] **Step 1: Load `translations.json` alongside `deck.json`**

Replace the top of the file (`DECK_URL`/`IMAGES_BASE`/`loadDeck` block) with:

```javascript
const DECK_URL = "tarot-reader/src/data/deck.json";
const IMAGES_BASE = "tarot-reader/src/data/";
const TRANSLATIONS_URL = "i18n/translations.json";
const SUPPORTED_LANGUAGES = ["en", "ko", "ja", "zh"];
const LANGUAGE_STORAGE_KEY = "tarot-web-lang";

let deck = null;
let translations = null;
let deckByName = null;

async function loadDeck() {
  if (deck) return deck;
  const response = await fetch(DECK_URL);
  if (!response.ok) {
    throw new Error(`Failed to load deck.json: ${response.status}`);
  }
  deck = await response.json();
  deckByName = Object.fromEntries(deck.map((c) => [c.name, c]));
  return deck;
}

async function loadTranslations() {
  if (translations) return translations;
  const response = await fetch(TRANSLATIONS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load translations.json: ${response.status}`);
  }
  translations = await response.json();
  return translations;
}
```

- [ ] **Step 2: Add language persistence helpers**

```javascript
function loadSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : "en";
  } catch (err) {
    return "en";
  }
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (err) {
    // Private browsing / blocked storage — language choice just won't
    // persist across reloads. Not fatal.
  }
}

let currentLanguage = loadSavedLanguage();
```

- [ ] **Step 3: Verify the persistence helpers handle a throwing `localStorage`**

```bash
node -e "
global.localStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};
const SUPPORTED_LANGUAGES = ['en','ko','ja','zh'];
const LANGUAGE_STORAGE_KEY = 'tarot-web-lang';
function loadSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(saved) ? saved : 'en';
  } catch (err) {
    return 'en';
  }
}
function saveLanguage(lang) {
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch (err) {}
}
const lang = loadSavedLanguage();
if (lang !== 'en') throw new Error('expected fallback to en, got ' + lang);
saveLanguage('ko'); // must not throw
console.log('OK: localStorage failures handled without crashing');
"
```

Expected: `OK: localStorage failures handled without crashing`

- [ ] **Step 4: Replace `SPREADS`'s hardcoded English with a structure-only shape**

`SPREADS` keeps the *shape* (how many positions each spread has) but no
longer hardcodes English label/description text — that now comes from
`translations.json` at render time, keyed by index:

```javascript
const SPREADS = {
  single: { positionCount: 1 },
  three: { positionCount: 3 },
  celtic: { positionCount: 10 },
};
```

(Delete the old `SPREADS` object with inline `label`/`description` strings
entirely — replaced by the above.)

- [ ] **Step 5: Change `drawOne`/`drawSpread` to return logical data, not pre-resolved text**

```javascript
function shuffle(cards) {
  const shuffled = cards.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function drawOne(card) {
  const reversed = Math.random() < 0.5;
  return {
    englishName: card.name,
    orientation: reversed ? "Reversed" : "Upright",
  };
}

function drawSpread(cards, positionCount) {
  const drawn = shuffle(cards).slice(0, positionCount);
  return drawn.map(drawOne);
}
```

- [ ] **Step 6: Add `resolveCardText` — the single place that turns logical
  data + a language into display strings, with fallback**

```javascript
function resolveCardText(englishName, orientation, lang) {
  const card = deckByName[englishName];
  const t = card.translations && card.translations[lang];
  const name = (t && t.name) || card.name;
  const meaning =
    orientation === "Reversed"
      ? (t && t.reversed) || card.reversed
      : (t && t.upright) || card.upright;
  const orientationLabel =
    (translations[lang] && translations[lang].orientation[orientation]) ||
    translations.en.orientation[orientation];
  return { name, meaning, orientationLabel };
}

function resolvePosition(spreadKey, index, lang) {
  if (spreadKey === "single") return null;
  const list =
    (translations[lang] && translations[lang].positions[spreadKey]) ||
    translations.en.positions[spreadKey];
  return list[index];
}
```

- [ ] **Step 7: Verify `resolveCardText`/`resolvePosition` fall back to English
  when a translation is missing — the Review Focus item for incomplete data**

```bash
node -e "
const deckByName = {
  'The Fool': {
    name: 'The Fool', upright: 'EN upright', reversed: 'EN reversed',
    translations: { ko: { name: '바보', upright: 'KO upright' } }, // reversed deliberately missing
  },
};
const translations = {
  en: { orientation: { Upright: 'Upright', Reversed: 'Reversed' }, positions: { three: [], celtic: [] } },
  ko: { orientation: { Upright: '정방향', Reversed: '역방향' }, positions: { three: [], celtic: [] } },
};

function resolveCardText(englishName, orientation, lang) {
  const card = deckByName[englishName];
  const t = card.translations && card.translations[lang];
  const name = (t && t.name) || card.name;
  const meaning =
    orientation === 'Reversed'
      ? (t && t.reversed) || card.reversed
      : (t && t.upright) || card.upright;
  const orientationLabel =
    (translations[lang] && translations[lang].orientation[orientation]) ||
    translations.en.orientation[orientation];
  return { name, meaning, orientationLabel };
}

const r1 = resolveCardText('The Fool', 'Upright', 'ko');
if (r1.name !== '바보') throw new Error('expected translated name');
if (r1.meaning !== 'KO upright') throw new Error('expected translated upright meaning');

const r2 = resolveCardText('The Fool', 'Reversed', 'ko');
if (r2.meaning !== 'EN reversed') throw new Error('expected EN fallback for missing ko reversed, got: ' + r2.meaning);

const r3 = resolveCardText('The Fool', 'Upright', 'fr'); // unsupported lang entirely
if (r3.name !== 'The Fool') throw new Error('expected EN fallback for missing language block');

console.log('OK: resolveCardText falls back to English field-by-field');
"
```

Expected: `OK: resolveCardText falls back to English field-by-field`

- [ ] **Step 8: Rewrite `buildCardElement`/`renderSpread` to use the resolvers,
  and track `currentReading`**

```javascript
const FLIP_STAGGER_MS = 150;
let currentReading = null; // { spreadKey, cards: [{englishName, orientation}] } | null

function buildCardElement(englishName, orientation, index, spreadKey) {
  const wrapper = document.createElement("div");
  wrapper.className = `card pos-${index}`;

  const position = resolvePosition(spreadKey, index, currentLanguage);
  let label, description;
  if (position) {
    label = document.createElement("div");
    label.className = "position";
    wrapper.appendChild(label);

    description = document.createElement("div");
    description.className = "position-description";
    wrapper.appendChild(description);
  }

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const back = document.createElement("div");
  back.className = "card-back";

  const front = document.createElement("div");
  front.className = "card-front";

  const img = document.createElement("img");
  front.appendChild(img);

  const name = document.createElement("h2");
  front.appendChild(name);

  const orientationEl = document.createElement("p");
  orientationEl.className = "card-orientation";
  front.appendChild(orientationEl);

  const meaning = document.createElement("p");
  meaning.className = "card-meaning";
  front.appendChild(meaning);

  inner.appendChild(back);
  inner.appendChild(front);
  wrapper.appendChild(inner);

  updateCardElementText(wrapper, englishName, orientation, index, spreadKey);

  return wrapper;
}

function updateCardElementText(wrapper, englishName, orientation, index, spreadKey) {
  const card = deckByName[englishName];
  const { name, meaning, orientationLabel } = resolveCardText(englishName, orientation, currentLanguage);
  const position = resolvePosition(spreadKey, index, currentLanguage);

  const posLabelEl = wrapper.querySelector(".position");
  const posDescEl = wrapper.querySelector(".position-description");
  if (position && posLabelEl && posDescEl) {
    posLabelEl.textContent = position.label;
    posDescEl.textContent = position.description;
  }

  wrapper.querySelector(".card-front img").src = IMAGES_BASE + card.images.default;
  wrapper.querySelector(".card-front img").alt = name;
  wrapper.querySelector(".card-front h2").textContent = name;
  wrapper.querySelector(".card-orientation").textContent = orientationLabel;
  wrapper.querySelector(".card-meaning").textContent = meaning;
}

function renderSpread(cards, spreadKey) {
  const container = document.getElementById("card-view");
  container.innerHTML = "";
  container.className = `card-view spread-${spreadKey}`;
  container.hidden = false;

  currentReading = { spreadKey, cards };

  const elements = cards.map((card, i) =>
    buildCardElement(card.englishName, card.orientation, i, spreadKey)
  );

  if (spreadKey === "celtic") {
    const centerStack = document.createElement("div");
    centerStack.className = "celtic-center";
    centerStack.appendChild(elements[0]);
    centerStack.appendChild(elements[1]);
    container.appendChild(centerStack);
    elements.slice(2).forEach((el) => container.appendChild(el));
  } else {
    elements.forEach((el) => container.appendChild(el));
  }

  elements.forEach((el, i) => {
    setTimeout(() => el.classList.add("flipped"), i * FLIP_STAGGER_MS);
  });
}

function resetReading() {
  const container = document.getElementById("card-view");
  container.innerHTML = "";
  container.hidden = true;
  currentReading = null;
  document.getElementById("draw-button").hidden = false;
}
```

- [ ] **Step 9: Add `applyLanguage` — re-renders static UI and, if present,
  the current reading in place (no redraw, no reshuffle)**

```javascript
function applyStaticUIText(lang) {
  const t = translations[lang] || translations.en;
  document.getElementById("app-title").textContent = t.title;
  document.getElementById("app-subtitle").textContent = t.subtitle;
  document.getElementById("spread-select-label").textContent = t.spreadLabel;
  document.getElementById("draw-button").textContent = t.draw;
  document.getElementById("reset-button").textContent = t.reset;

  const spreadSelect = document.getElementById("spread-select");
  for (const option of spreadSelect.options) {
    option.textContent = t.spreads[option.value];
  }
}

function applyLanguage(lang) {
  currentLanguage = lang;
  saveLanguage(lang);
  applyStaticUIText(lang);

  if (!currentReading) return;

  const container = document.getElementById("card-view");
  const cardEls = container.querySelectorAll(".card");
  currentReading.cards.forEach((card, i) => {
    updateCardElementText(cardEls[i], card.englishName, card.orientation, i, currentReading.spreadKey);
  });
}
```

- [ ] **Step 10: Verify a language switch preserves the same cards (Review
  Focus: never reshuffle on switch)**

```bash
node -e "
// Simulates the state transition applyLanguage performs on currentReading,
// without touching the DOM: the array identity/contents must be untouched.
let currentReading = {
  spreadKey: 'three',
  cards: [
    { englishName: 'The Fool', orientation: 'Upright' },
    { englishName: 'The Tower', orientation: 'Reversed' },
    { englishName: 'The Sun', orientation: 'Upright' },
  ],
};
const before = JSON.stringify(currentReading);

function applyLanguage(lang) {
  // the real function re-renders text; it must never reassign currentReading.cards
  currentLanguageStub = lang;
}
let currentLanguageStub = 'en';
applyLanguage('ko');

const after = JSON.stringify(currentReading);
if (before !== after) throw new Error('currentReading mutated by a language switch');
console.log('OK: language switch does not alter the drawn cards');
"
```

Expected: `OK: language switch does not alter the drawn cards`

- [ ] **Step 11: Wire up event listeners — load both data sources on startup,
  apply the saved language immediately, wire Draw/Reset/language-select**

```javascript
document.getElementById("draw-button").addEventListener("click", async () => {
  const button = document.getElementById("draw-button");
  button.disabled = true;
  try {
    const spreadKey = document.getElementById("spread-select").value;
    const [cards] = await Promise.all([loadDeck(), loadTranslations()]);
    renderSpread(drawSpread(cards, SPREADS[spreadKey].positionCount), spreadKey);
    button.hidden = true;
  } catch (err) {
    alert(
      "Could not load the tarot deck data. If you opened this file " +
        "directly in a browser, serve it over a local web server instead " +
        "(e.g. `python3 -m http.server`) — browsers block fetch() of " +
        "local files over file://."
    );
    console.error(err);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("reset-button").addEventListener("click", resetReading);

document.getElementById("language-select").addEventListener("change", (e) => {
  applyLanguage(e.target.value);
});

(async function init() {
  document.getElementById("language-select").value = currentLanguage;
  try {
    await loadTranslations();
    applyStaticUIText(currentLanguage);
  } catch (err) {
    console.error("Failed to load translations.json on startup:", err);
  }
})();
```

- [ ] **Step 12: Verify the Single Card spread's `null` position doesn't break
  rendering (Review Focus item)**

```bash
node -e "
function resolvePosition(spreadKey, index, lang, translations) {
  if (spreadKey === 'single') return null;
  const list = (translations[lang] && translations[lang].positions[spreadKey]) || translations.en.positions[spreadKey];
  return list[index];
}
const translations = { en: { positions: { three: [{label:'Past',description:'d'}], celtic: [] } } };
const result = resolvePosition('single', 0, 'en', translations);
if (result !== null) throw new Error('expected null for single spread, got ' + JSON.stringify(result));
console.log('OK: single-card spread position resolves to null without throwing');
"
```

Expected: `OK: single-card spread position resolves to null without throwing`

- [ ] **Step 13: Full-file syntax check**

```bash
node --check app.js
```

Expected: no output (success).

- [ ] **Step 14: Commit**

```bash
git add app.js
git commit -m "Wire i18n into app.js: language switching, logical reading state"
```

---

### Task 11: Final verification and deploy

**Files:**
- Read only: all files touched by Tasks 7–10.

**Interfaces:**
- Consumes: everything produced by Tasks 7–10.

- [ ] **Step 1: Re-run every structural check from Tasks 8–10 in sequence**

```bash
cd /home/baruna/playground/public/tarot-web
node -e "require('./i18n/translations.json'); console.log('translations.json parses OK');"
node --check app.js && echo "app.js syntax OK"
python3 -c "
import json
deck = json.load(open('tarot-reader/src/data/deck.json'))
assert len(deck) == 78
for c in deck:
    assert 'translations' in c, c['name']
    for lang in ('ko','ja','zh'):
        assert lang in c['translations'], f\"{c['name']}/{lang}\"
print('deck.json: all 78 cards have ko/ja/zh translations')
"
```

Expected: all three checks print their success line with no errors.

- [ ] **Step 2: Start a local server and smoke-test every endpoint the app fetches**

```bash
(python3 -m http.server 8150 >/tmp/httpd_i18n.log 2>&1 &)
sleep 1
curl -s http://localhost:8150/ -o /dev/null -w "index: %{http_code}\n"
curl -s http://localhost:8150/app.js -o /dev/null -w "app.js: %{http_code}\n"
curl -s http://localhost:8150/i18n/translations.json -o /dev/null -w "translations.json: %{http_code}\n"
curl -s http://localhost:8150/tarot-reader/src/data/deck.json -o /dev/null -w "deck.json: %{http_code}\n"
pkill -f "http.server 8150"
```

Expected: all four `200`.

- [ ] **Step 3: Commit anything not yet committed, then push `tarot-web`**

```bash
git status --short   # should be clean if Tasks 8-10 each committed as specified
git push origin main
```

(This triggers the existing GitHub Pages deploy workflow automatically —
no separate deploy step needed.)

- [ ] **Step 4: Hand off for manual browser verification**

No browser is available in this working session. Ask the user to check, for
each of the three spreads and all four languages: static UI text (title,
subtitle, button labels, dropdown options) updates correctly; switching
language mid-reading updates card text in place without reshuffling or
replaying the flip animation; the Celtic Cross's compact card layout doesn't
visually break under longer Korean/Japanese/Chinese text (the spec's noted
open risk); the chosen language persists after a page reload.

---

## Self-Review Notes

- **Spec coverage:** every spec section has a task — data design (Tasks
  1–5, 8), backward compatibility (Task 6 Step 2), rollout sequence (Tasks
  6→7→8-10→11 match the spec's order exactly), state model/switching (Task
  10 Steps 5–10), persistence (Task 10 Steps 2–3), testing plan (every task
  has a Node/Python verification step; Task 11 Step 4 hands off the manual
  pass).
- **Placeholder scan:** no TBD/TODO; every code step has literal code;
  translation steps give exact worked examples plus a mechanical
  name-composition formula so the remaining cards require translation
  judgment only for the short upright/reversed phrases, never for names or
  structure.
- **Type consistency:** `drawOne` → `{englishName, orientation}` is the type
  used consistently from Task 10 Step 5 through `renderSpread`,
  `resolveCardText`, `resolvePosition`, and the Step 10 verification —
  checked across all of Task 10's sub-steps for a drifted field name.
- **Review Focus:** all five items have an owning task and an explicit
  verification step (missing-translation fallback → Task 10 Step 7;
  no-reshuffle-on-switch → Task 10 Step 10; `tarot-reader` test suite →
  Task 6 Step 2; `localStorage` failure → Task 10 Step 3; `null` position
  for Single Card → Task 10 Step 12).
