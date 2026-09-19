# Traps — things that have cost real time here

Code only. Brand lives in `design-stack.md`, visual reasoning in `.tastemaker/style-lock.md`,
invariants in `project.md`. Moved out of `handoff.md` when that file went over its ceiling: a trap is
durable reference rather than current state, so it does not belong in a file that is rewritten every
session. Read on demand, and add to it whenever something costs more than one attempt.

## The tool and the test suite

- **Reach the dev server at `http://localhost:3000`, never `127.0.0.1`.** Next 16 403s React's chunk
  cross-origin and the page renders perfectly with ZERO interactivity. **Check whether one is already
  running before starting another.** **And kill stale Playwright runs before starting a new one**: the
  config's own server binds 3210 and a second run dies with "already used" rather than reusing it.
- **Never touch `.next/` while a dev server holds it.** Deleting `.next/dev` under a running process
  leaves Turbopack looking up `.sst` files that no longer exist: every request 500s,
  `TurbopackInternalError: Failed to lookup task ids` fills
  `.next/dev/logs/next-development.log`, and the process does not recover on its own. Recovery is kill
  the `next dev` AND its `next-server` child, `rm -rf .next`, restart. Cost a full round of
  debugging once, presenting as a working tree that had suddenly stopped serving.
- **`next build` while a `next start` is holding the port serves STALE CHUNKS that 500.** The old server
  keeps answering, so the HTML is 200 and looks fine, but every JS chunk it references was replaced by the
  build — so React never hydrates and the page renders perfectly with zero interactivity. The tell is a
  console full of `500` on resources and `EADDRINUSE` at the bottom of the new server's log, meaning the
  restart never happened. Same presentation as the `127.0.0.1` trap above and a different cause. Kill
  `next start` AND `next-server`, `rm -rf .next`, rebuild, then start. Cost a false "the dropdown stopped
  opening" diagnosis.
- **`sr-only` text is reported by `innerText` and Playwright counts it visible** — its box is 1×1, not
  zero. Assert the geometry, or a "not in visible text" check passes whether the change happened or not.
- **`getByRole("combobox", { name })`, never `getByLabel`**, which matches the open tree. Industry rows
  are labelled by ABBREVIATION ("BFSI"); the `All of {industry}` exit row is a **treeitem**. The submit
  button is "See my results". Screen 2's function tab is **"HR"**, not "Human resources".
- **`await expect(band(page, id)).toBeVisible()` before counting anything in it.** Locators evaluated
  straight after `ask()` sample a page mid-phase-change and every count reads 0.
- **A JS regex `matches?` means "matche" plus an optional s.** A spec asserting a singular/plural pair
  needs `match(es)?`. Cost one full browser run.
- **A throwaway harness under `.cache/review/` needs `main()`** — `tsx` emits CJS here and rejects
  top-level `await` — **and `page.evaluate` must take a STRING, not a closure**: `tsx` rewrites arrow
  functions and the injected code throws `__name is not defined`. Plain `.mjs` under `node` sidesteps
  both.
- **A new admin label that CONTAINS an existing one breaks every spec locating the shorter one.**
  `getByLabel` matches on a substring, so a checkbox labelled "Figures are a floor" resolved to two
  elements beside the scalar control's "Figure" and took four `4-metrics.spec.ts` locators down with it.
  The checkbox is "Shown as a floor" for that reason. Before adding a control to an admin form, check the
  new label is not a superstring of one already on that surface — and give an advisory region no
  `aria-label`, since a named region is one more thing `getByLabel` can reach. The metric editor's
  coupling notices are a bare `role="status"` on those grounds.
- **A leak canary must not also be a customer-logo name.** `LEAK_CANARY` in `tests/browser/helpers.ts` is
  the company name both public specs assert is absent from the HTML, and it only works if its ONLY route
  into the document is the failure it is looking for. It was "Walmart", which was distinctive, in the
  dataset and in neither industry the specs drive — and then the logo strip's list moved out of a client
  module constant into `siteContent.logos`, so the ten marks now cross at the client boundary and sit in
  the RSC payload of every phase. A dataset company name was in the document legitimately and the canary
  tripped on both result screens for a reason that had nothing to do with the dataset. Four properties
  now, the last one being the one that bit: distinctive, in the dataset, off the specs' industries, and
  not a logo.
- **WHILE A RADIX DIALOG IS OPEN OR CLOSING, EVERY ROLE QUERY AGAINST THE PAGE BEHIND IT RETURNS
  NOTHING.** Radix marks the rest of the document `aria-hidden`, and `getByRole` honours that, so
  `getByRole("region")` reads 0 and `getByRole("heading", { name: "…", level: 1 })` never becomes visible
  — on a page whose `h1` and nine landmarks are demonstrably in the DOM. Two separate ways this reads as a
  product bug and is not one: asserting a heading while an editor dialog is open, and asserting anything
  by role in the moment after a dialog closes, because the close is animated and the attribute outlives
  the click. Wait for `[role="dialog"]` to be `detached` before counting roles, or locate by tag
  (`page.locator("h1", { hasText: … })`) when the dialog is meant to be open. Cost an hour chasing a
  stale-`aria-hidden` accessibility defect that did not exist.
- **The admin login limiter is per-process AND per-IP, so a hand-written probe gets four or five logins
  before every attempt 401s** with a correct password. It is the same budget `6-lockout.spec.ts`
  deliberately exhausts. Restarting the dev server is the reset; one login per probe run is the habit.
- **`next dev` refuses cross-origin dev resources, so driving a probe at `127.0.0.1` serves the HTML and
  none of the JavaScript.** The page renders unhydrated, forms submit natively, and a password lands in a
  GET query string in the terminal log. Use `localhost`, which is the origin the server names itself by.
- **`getComputedStyle().transitionProperty` is `all` by default**, so a "no `transition-all`" check must
  also require `transitionDuration > 0` or it flags several hundred innocent elements.
- **`detect.mjs src` times out at 120s.** Pass the two or three component directories instead. And
  `npx eslint src/**` does not finish inside five minutes here — rely on `tsc` plus `next build`.
- **`lucide-react` IN A SERVER-IMPORTED MODULE FAILS FOUR UNIT FILES AT COLLECTION, AND THE ERROR NAMES
  THE LIBRARY RATHER THAN YOUR FILE.** `vitest.config.ts` resolves the `react-server` condition, so
  `lucide-react/src/context.ts` reaching for `createContext` throws before any assertion runs —
  `charts-data`, `peer-overlaps`, `public-copy` and `screen1` all go red with an error pointing into
  `node_modules`, while `tsc` and the browser suite are perfectly happy. One `ChevronDown` in
  `primitives.tsx` was enough. Client components (`screen-header.tsx` imports `Pencil`) are fine; anything
  a server component or a unit test imports draws its own inline `<svg>` instead.

## Markup and CSS

- **A spec reading an inline style gets an EMPTY STRING, not a failure, when the positioning moves to a
  custom property.** `0-screen2.spec.ts` read the finance rail through `style.insetInlineStart` after
  `IndexSpread` moved to `--gcc-at`, and reported nine empty strings against nine expected percentages —
  which reads as a broken chart when the chart was drawing correctly. Read
  `style.getPropertyValue("--gcc-at")` instead. Any spec asserting a position is coupled to HOW the
  position is set, so moving a measurement into CSS means grepping the specs for the old property.

- **TEXT-INK MEASUREMENTS TAKEN IN THE BROWSER ARE WRONG IN TWO SILENT WAYS, AND BOTH COST A PASS ON THE
  HERO'S SPACING.** Canvas `measureText` before `document.fonts.ready` resolves describes the FALLBACK face,
  not the webfont — the numbers look plausible, they are stable across reloads, and every constant derived
  from them was 0.029em out. And measuring a paragraph's last-line ink with an all-capitals sample puts its
  bottom a descender too high, which overstated one junction by 14px and sent the correction the wrong way.
  So: `await document.fonts.ready` inside the page, put a descender in the sample for anything whose bottom
  ink matters, and verify by measuring the INTERVAL the correction produces rather than the correction. A
  calibration loop against a broken instrument converges confidently on the wrong answer.

- **A MARK BESIDE TYPE GROWS THE LINE BOX, AND NEGATIVE BLOCK MARGINS DO NOT BUY IT BACK.** An inline
  replaced box past the strut pushes every following line one for one — on the entry point that is the
  headline's second line, the lead and the form card — and nothing in the component looks wrong, so the
  symptom is spacing further down the page. The textbook fix is a symmetric negative block margin, since
  CSS computes an inline replaced box's line height from its MARGIN box; measured in Chromium at 1440 and
  390 it moves the image DOWN by the margin and reduces the contribution by nothing, so the line grows by
  exactly the excess it was meant to absorb. What works is a `transform: scale()` on a box held at the
  free ceiling, with the origin on the LEADING edge so the mark cannot reach back past the text block's
  own leading edge, and the trailing margin widened by the overhang so the gap to the first letter is
  unchanged. Measured on the entry point's headline, where the mark has since moved OFF the line entirely
  and the mechanism went with it — git holds it under `AnsrSunMark` / `sunGeometry`. The free ceiling
  depends on the heading's leading and the face's metrics, so re-measure by stepping the size and reading
  the following paragraph's top, never by reading the mark.

- **A LITERAL-TOKEN MATCH AGAINST ADMIN-EDITABLE COPY GOES SILENTLY NO-OP WHEN THE STORED STRING SPELLS
  THE TOKEN DIFFERENTLY.** `withCasedGccPlural` in `snapshot.tsx` exempts "GCCs" from the eyebrow's
  `uppercase` so the plural keeps its small s. It split on the literal string while `dataset.json` held
  "GCCS", so the split found nothing, the exemption never applied, and the eyebrow drew exactly the
  corruption the mechanism exists to prevent — with the code reading as though it worked. The match is
  case-insensitive now and always emits the canonical spelling, and a unit test pins the datum. The general
  form: `withBrandMark` and `withProductMark` in `ask-hero.tsx` fail the same way and nothing enforces
  either, so any renderer that finds a token in an editable string needs a test on the shipped value.

- **A PER-CONTROL GEOMETRY RULE CARRIED IN A COMMENT RATHER THAN A TYPE BREAKS WHEN THE LAYOUT MOVES, and
  it breaks without failing.** `SelectField`'s `wide` was a boolean whose offset is only correct for a field
  in the form grid's trailing column — a constraint stated in prose beside the prop. Removing the
  company-name field shifted every control one cell along, both wide controls landed in the leading column,
  and each panel drew a column and a gap off the leading edge of the card. `tsc`, the unit suite and
  `brand_lint` were all clean. It is a union of positions now (`"grid" | "column"`), so the invariant is
  checked at the call site; see `project.md`. Anything positional expressed as a boolean is the same bug
  waiting for the next reflow.

- **`display: flex` on a `<summary>` silently removes the native disclosure marker**, leaving a
  pressable heading with no affordance. `list-inside` then puts the marker ABOVE the heading rather than
  beside it; `list-item list-outside` plus inline padding is the fix, with the flex moved to a wrapper
  inside.
- **Anything mounted outside `tool.tsx` must carry `font-display` itself**, or the whole surface renders
  in Inter including the `h1` lockup. `project.md`'s architecture map explains why it is set once.
- **`.gcc-*` blocks in `globals.css` and `tokens.css` are UNLAYERED** and outrank Tailwind utilities.
  A Tailwind class cannot be interpolated: `lg:col-span-${n}` generates nothing.
- **The consequence, and it fails SILENTLY: a utility loses to any `.gcc-*` rule that sets the same
  property.** `text-accent-teal` on a `.gcc-select-row` rendered `rgb(0, 0, 0)`, because that class sets
  `color`. Nothing warns — the element carries the class and paints the base value. `font-medium` on the
  same element worked, purely because the rule sets no `font-weight`, so a half-working pair looks like a
  colour-token problem rather than a cascade one. If a `.gcc-*` class owns the property, set the variant
  there too; do not reach for `!important`. Same shape as `outline-none` on the filter input.
- **Content inside the card is inset three times** — container gutter, card, zone padding — so both
  content surfaces are on `md:px-8`. The result band's ornaments are SWAPPED at `lg`, not layered, and
  the tab bar takes its corners from `.gcc-result-card`'s radius and must never get one of its own.
- **The land's dot pattern and the blur are coupled.** `filter: blur()` on `.gcc-map-land` above the dot
  spacing merges the field into a flat fill, so the texture silently disappears.
- **`brand_lint.py` rejects a raw hex inside a COMMENT.** Name the token, never quote its value.

- **A gap that has to survive a BLUR must exceed the blur radius.** The close's tile grid at `gap-4`
  (16px) under a 10px blur merged its two rows into one tall panel per column, so an eight-tile grid
  rendered as four columns and read as stripes. `gap-6 md:gap-8` fixed it. Same arithmetic applies to any
  separation behind a filter — a hairline between blurred things does not exist.
- **Putting a DARK band at the foot of `.gcc-result-card` exposes its white hairline ring.** The card
  draws `0 0 0 1px` at 9% white as its edge against the teal-deep page ground, which is invisible while
  the last zone is white or mint. The close is dark, and a blurred bright graphic behind that ring read
  as light seeping out of the card's bottom corners. The ring is not the bug; the fix is to fade the
  band's own graphic before its edges. Anything dark added at the card's foot inherits this.
- **A backdrop's `transform: scale()` pushes its BRIGHTEST content into the corners.** It is the obvious
  way to hide a blur's feathered edge and it moves the problem to wherever the container is rounded or
  clipped. A mask that fades the layer before its edges does the same job without relocating the glow.
- **`preserveAspectRatio="none"` scales the stroke width with the geometry.** A `polyline` came out
  thinner on one axis than the other and vanished into a blur. `vectorEffect="non-scaling-stroke"` is the
  fix, and it is needed on any stretched SVG whose stroke has to stay a constant weight.

## Company marks (Brandfetch Logo API)

- **`curl` against `cdn.brandfetch.io` 302s to their hotlinking guidelines, with OR without a valid
  client ID.** They detect non-browser requests and bounce them, so a shell test reports 414 KB of
  `text/html` for every domain — including invented ones — and looks exactly like a broken URL or a dead
  credential. Both are fine; the request is being refused for its headers. Send a browser
  `User-Agent`, `Accept: image/*`, a `Referer` and `Sec-Fetch-Dest: image` and the same URL returns
  `image/webp`. **Verify marks in a real browser, not from a terminal.**
- **HEADLESS Chromium is bounced the same way, so Playwright cannot see a mark either.** Every request
  from a headless page 302s to that guidelines URL and the redirect is then refused by our own CSP,
  which surfaces as `requestfailed / csp` and `naturalWidth === 0` on every peer card. A headless run
  can measure a mark's BOX and nothing about its artwork; it is also a second reason the suite pins the
  tier off. Judge a mark in a real browser only.
- **`fallback` is a PATH SEGMENT, not a query parameter, and the wrong form fails silently.**
  `?fallback=404` is ignored: an unknown brand returns HTTP 200 with a ~346-byte placeholder, so every
  card renders something and nothing anywhere reports a problem. `/fallback/404` returns a real 404 and
  the `<img>` fails, which is what the peer card needs. Measured on `notarealbrandxyzq.com` against
  `nike.com`.
- **Never ask for `/fallback/lettermark`.** It returns a generated tile bearing the company's initial —
  precisely the monogram the peer-card rule bans — and it arrives looking like a real logo, so nothing
  downstream would catch it.
- **Unset `NEXT_PUBLIC_GCC_BRANDFETCH_CLIENT_ID` is the OFF state and is the safe default.** With no
  value the resolver returns null for every company, the CSP allows no extra origin, and every card
  draws the name alone. A deployment that "lost its logos" almost certainly lost that env var, and
  Vercel applies env vars only to builds created after they were added.

## Verifying a deployment

- **"I cannot see the change on the live URL" is usually the IMMUTABLE CSS cache or a desktop window, not
  a failed deploy.** The stylesheet ships from `/_next/static/immutable/chunks/`, so an ordinary reload may
  reuse the old file, and any change scoped below `lg` renders identically in a desktop-width window.
- **Verify a deploy by reading the deployed CSS and the computed style, never by eye.** `git ls-remote
  origin refs/heads/main` for the commit; then `curl` the `href` the live HTML names and grep for both the
  new value AND the absence of the old one; then load the page with a cache-busting query at the width the
  change applies to and read `getComputedStyle` off the element. Eyeballing a cached page is how a shipped
  change gets debugged as a broken one.
- **`grep -oE` with a `{0,400}` bound fails on macOS** — "maximum repetition exceeds 255". Split the
  pattern or pipe through `tr '}' '}\n'` first.

## Data and the catalogue

- **Do not delete `gccStatus` on the strength of `framing()` having no caller.** Screen 2's
  `functionFraming` still branches its three closing-CTA fields off it. `project.md`'s input table is the
  authority.
- **A chart may never be chosen by parsing a label**, and monotonic values are not a discriminator
  either: latency and the scale curve are both four rising durations. `progression` is authored, and
  `tests/unit/screen2.test.ts` pins the counter-example.
- **Editing the metric catalogue does not change the app.** The seed is only adopted by
  `data:import -- --reseed-metrics`; `data/dataset.json` is the record, so adding, removing or
  re-flagging a metric has to be patched there too. Round-tripping that file through
  `json.dumps(indent=2, ensure_ascii=False)` plus a trailing newline reproduces its formatting exactly,
  so a surgical edit stays a small diff. **Running vitest while that file is mid-write** makes unrelated
  suites fail to collect; re-run before believing it.
- **A metric `note` is capped at 600 characters, and it is the one metric field long enough to reach a
  cap by accretion.** Recording a decision in it rather than in the code comment above it took
  `hr-salary-growth` to 751, which surfaced as "dataset.json failed schema validation" on the browser
  FIXTURE — four minutes into a run, taking every admin spec with it, on a file the failure never names.
  A note is a working record an admin reads in the editor; reasoning belongs in the comment, which is
  uncapped and never shipped. `metrics.test.ts`'s "every metric passes the schema the publish gate runs"
  catches it in two seconds, but only if the unit suite is run AFTER the catalogue edit.
- **A moved profile figure is a two-file commit.** `npm run data:verify -- --accept` rewrites
  `data/verify-baseline.json`; `docs/data-audit.md` has to follow in the same commit.
- **`tsc` covers `scripts/` but `tsx` does not typecheck**, `noUncheckedIndexedAccess` is on,
  `hqCountry` is `"USA"`, the taxonomy holds `"Scotland"`, and there is no "SaaS" business type.

## Rendering and review

- **MODERAT HAS NO SEMIBOLD, AND THE DEFAULT FAILURE IS SILENT AND UPWARD.** The family's real weights
  stop at Medium 500 and resume at Bold 700. Declare only the real ones and a request for 600 does not
  fall back to Medium — the CSS matching algorithm checks weights ABOVE the target first, so
  `font-semibold` lands on Bold and stops being separable from `font-bold`. Nothing errors, and the
  places it matters are the ones where weight is the only signal: `IndexTable`'s base column, the
  anchor cell in `IndexLollipop`, two other emphasised chart rows. `layout.tsx` declares the Medium
  file across `500 600` so the collapse goes the other way. **And a spec cannot catch it**:
  `getComputedStyle(el).fontWeight` reports the DECLARED 600, not the face that drew it, so the browser
  assertion passes either way.
- **MODERAT'S DEFAULT FIGURES ARE SHORT — 0.640/0.651em against capitals at 0.700em** — so a string like
  "50 FTEs" draws the number 8.6% smaller than the letters, which reads as a size bug in the markup and is
  not one. The public surface therefore sets `font-variant-numeric: lining-nums`, whose figures are
  0.700/0.710em and unslashed. Anything that opts out of that inherits the short figures again.
- **`tabular-nums` IS A NO-OP ON THE PUBLIC SURFACE BECAUSE MODERAT'S TABULAR ZERO IS SLASHED, so it is
  NEUTRALISED, and the class is still all over the markup.** The feature substitutes the family's whole
  tabular set — the zero gains a slash and the `1` a footed stem — and all four tabular zero variants are
  slashed, so there was no version to switch to. One rule in `globals.css` therefore turns
  `font-variant-numeric` off under `.font-display`. Two consequences: reading the class and expecting
  aligned digits is wrong on the public screens and right in admin, and deleting that rule puts the slash
  back on every figure in the product. The default figures are PROPORTIONAL (`1` is 369 units against `0`
  at 604), which is what the rule gives up. Decision and measurements: style lock.
- **A GLYPH SUBSTITUTION IS INVISIBLE TO `getComputedStyle` AND TO `textContent`.** A slashed zero, a
  footed `1` and `ss01`'s thin ampersand are all the same character; only a rasterised render shows which
  one drew. Three probe traps go with that. **`ctx.measureText` reads `ctx.font` alone**, so an element's
  `font-variant-numeric` never reaches the canvas and every variant reports one ink height. **A `style`
  attribute built by string interpolation TRUNCATES at the first `"` inside a feature name** like
  `"tnum" 1`, silently dropping the whole rule — and `white-space: pre` after it, which is how the broken
  probe still looked plausible; use `el.style.setProperty` and read the computed value back, after the
  node is in the document. And **a `file://` font URL will not load into a `setContent` page**, so a probe
  built that way measures a serif fallback. Inject into the real page.
- **A UI GLYPH MODERAT DOES NOT HAVE COMES BACK FROM THE OS, VERTICALLY WHEREVER THAT FONT PUT IT.**
  `PanelAction`'s disclosure mark was `⌄` (U+2304), which is not in the family, so it fell through the
  stack and drew high in its own em box — sitting visibly above the label's midline on a row already set
  to `items-center`. No flex property can fix it: the BOX is centred and the ink inside it is not, and
  `getComputedStyle` reports the declared family either way. Draw a UI mark as an inline `<svg>` whose
  `viewBox` is centred on its own stroke; a box that is its ink lands where alignment says it should.
- **MEASURING TEXT INK FROM A SCREENSHOT HAS THREE WAYS TO BE CONFIDENTLY WRONG, and two of them read
  as a small error rather than as a broken instrument.** All three were hit in one session tuning
  `ask-hero.tsx`. **A screenshot of a CONTAINER captures whatever paints over it** — the form card
  overlaps the hero's foot, so rasterising the band finds a white plate and calls it ink, which put one
  interval 50px out. **A clip to an element's own box TRUNCATES ink that hangs outside it** — with a
  negative half-leading the descenders sit below the box, so the clip reported the error as nearly zero
  and the correction as unnecessary. And **`el.style.visibility = "hidden"` does not take on the
  entry point's `h1`**, so hiding neighbours to isolate one element silently measures both; isolate by
  clip geometry instead. `scripts/measure-hero-ink.mjs` encodes all three fixes — run it rather than
  rebuilding the instrument.
- **THE DOM WILL NOT TELL YOU WHERE A LINE OF TEXT'S INK IS, AND TWO OF THE THREE OBVIOUS WAYS TO ASK IT
  DISAGREE WITH EACH OTHER.** Cost three passes on `PanelAction`'s chevron, where the first derived
  correction was 73% too far and would have pushed the mark as far below the letters as it began above
  them. **`measureText(…).fontBoundingBoxAscent` is not reliable across probes** — it reported 1.00em
  ascent / 0.20em descent for Moderat in one page and 0.90em / 0.25em in another, and only the second
  agrees with the box the browser actually laid out. **An inline span's `getBoundingClientRect()` is its
  LINE box, not its content area**, so deriving a baseline from its height and a half-leading is
  arithmetic on the wrong number. What works, and what the fix is measured with: scan a canvas's own
  alpha channel at a large size for the true ink ascent and descent, and get the baseline from a
  zero-height `inline-block` strut inside the text — an element with no height sits ON the baseline, and
  its `rect.top` is the one position nothing has to be inferred from.
- **AND CANVAS IS WRONG ABOUT HORIZONTAL INK TOO, so a sidebearing has to come off the RENDER.**
  `fillText` at a known origin reports Moderat's `G` with a 0.024em left sidebearing; the shipped `h1`
  draws it 0.060em inside its own box, measured at three widths and stable to a thousandth of an em.
  Whatever accounts for the gap, the page is the thing being corrected, so the page is what to scan.
  Third instance in one pass of canvas metrics disagreeing with the pixels — treat the canvas as a
  convenience for ink SHAPE and never as a source for a layout number.
- **A BRIGHTNESS THRESHOLD ON THE LIVE HERO GRADIENT EATS THE LEFT EDGE OF A CURVE, and it does it
  unevenly.** A threshold high enough to reject the dot map also rejects the faint first column of an
  antialiased round letter, and a round letter loses more of that ramp than a flat stem — so the bias is
  per-glyph and reads as a real rag. `scripts/measure-hero-ink.mjs` flattens the ground to `#000` and
  hides `.gcc-hero-map` before scanning, which is what makes "any lift is ink" true. Do that in any new
  probe rather than tuning the threshold.
- **AN INHERITED `em` LETTER-SPACING IS AN ABSOLUTE LENGTH, so `tracking-display` on a parent
  OVER-TRACKS every smaller child.** `-0.02em` resolves against the element it is DECLARED on and
  inherits as the resulting pixels: declared on the entry point's 72px `h1`, it computes to -1.44px, and
  the 28px tagline inside that heading drew the same -1.44px — which is -0.051em, two and a half times
  the brand's display tracking. It cost the tagline 24.6px of width and broke a width match by 6 points
  while every class in the markup looked correct. **Restate the tracking token on any child set at a
  different size**; `ProductName` already does, which is why its own width measured exactly as predicted
  and the sibling's did not. Nothing reports this — `getComputedStyle` shows the inherited pixel value as
  if it had been asked for.
- **`fullPage` screenshots time out on `Group 149.svg`** — 7.4MB, 5,531px tall. Inline it with
  `setContent` at a 1440×1383 viewport, then scroll a viewport at a time and take four shots. Reading
  the board is the only way to settle a card-chrome question; a description of it is not the board.
- **A `fullPage` phone capture at `deviceScaleFactor: 2` is REJECTED by the chat image path, and the
  failure names nothing you can act on.** The message is "At least one of the image dimensions exceed
  max allowed size: 8000 pixels" with a request id and no filename. The arithmetic is the whole story: a
  result screen is ~4,000 CSS pixels tall at 390 wide, and a scale factor of 2 makes that an 8,000+ pixel
  PNG. So a phone probe takes `deviceScaleFactor: 1` for anything `fullPage`, and reserves 2 for a
  viewport-sized or `clip`ped shot. Attaching one of the rejected files fails the whole prompt, not just
  the image, so the file is worthless as well as large.
- **A Tailwind class cannot be interpolated.** `lg:grid-cols-${n}` generates no CSS at all, which
  renders as a single column and looks deliberate. Use a static map keyed by the count.
- **The revenue bands use an EN DASH**, not a hyphen: `$1 Bn – $5 Bn`. A spec or harness typing a
  hyphen waits 30s and fails on a control that is working correctly. The form's label is "Annual
  revenue", not "Revenue band" — the pill on the result band says the latter.
- **`getComputedStyle(el).outlineWidth` on a programmatically focused element reads 0.** `:focus-visible`
  needs keyboard-ish focus, so `el.focus()` from `page.evaluate` reports no ring on a control that has
  one. Drive it with real `Tab`/arrow presses before concluding a focus ring is missing.
- **The HR tab is COMPOSED, so its shape does not follow `layoutArea` like the other three.** Its
  three scalars are bordered summary cards in a `ul` (still `li`s, so `getByRole("listitem")` still
  means a figure cell) and only its four remaining open metrics plus two held ones are
  `section[id^="metric-"]`. So `#function-metrics` holds 3 figures and 6 metric sections on HR, where
  the derived tabs' counts come straight from the view model. Its sections are located by id —
  `hr-velocity`, `hr-analysis`, `hr-held`, plus `#figures-hr-heading` — and never by heading text.
- **Its held group's heading is not `heldHeading`'s wording.** HR uses `HR_HELD_HEADING`, "Figures
  shaped by your roles and cities", where the derived tabs say "depend on". A spec matching
  `/depends? on your roles and cities/` finds nothing on HR. The id is the contract.
- **HR's cards have borders and a 4px radius; the other three tabs' do not.** A spec asserting a
  borderless card, or `rounded-none`, fails on HR and passes everywhere else.
- **"Held back" is inside a lock on HR, not in a chip.** It is `sr-only` text on the padlock disc, so
  it is in the accessibility tree and in `textContent` but has no visible chip to locate.
- **`FLOOR_NOTE` is imported into `0-screen2.spec.ts`, not retyped.** It was spelled out in three
  places, so rewording it — "+ indicates a floor" for "+ is a floor" — failed a spec that was testing
  WHERE the note renders rather than what it says. Import the constant.
- **A `RangeBenchmark` endpoint figure has no element whose exact text is the numeral.** "7" and "days"
  are two children of one span, so `getByText("7", { exact: true })` finds nothing and a non-exact
  match hits "70" as well. Read the card's normalised `textContent` and match a pattern.
- **A `MilestoneTrack` item's text has no separator in it** — `"50 FTEs6"`, not `"50 FTEs 6"` — because
  the milestone and its duration are a `dt` and a `dd` of one pair with no whitespace between them.
- **The milestone positions are read off `--gcc-at`, not off geometry, and the AXIS ROTATES at
  `sm`.** `.gcc-milestones__item` is absolutely positioned at every width now, but below `sm` the
  rail runs down the card and `--gcc-at` is a `top` rather than an `inset-inline-start` — so a spec
  measuring x-positions at 390 measures a column of identical x's and one at 1280 measures the
  progression. The custom property is the same at both widths, which is why reading it is the only
  portable assertion.
- **`npx playwright test` does NOT rebuild the fixture.** Only `npm run test:browser` runs
  `prepare.ts`, which copies `data/dataset.json` into `tests/browser/.tmp`. After a catalogue change,
  running Playwright directly tests the OLD data and the failures point at the wrong thing — a stale
  fixture is how a removed metric turns up as a mystery half-empty grid row.
- **TWO tabs are composed now, HR and OPERATIONS, so "the composed tab" is ambiguous.** Everything
  above about HR's shape applies to operations with its own numbers: `#function-metrics` holds **4
  figures and 5 metric sections** on operations, against HR's 3 and 6 and the derived tabs' own
  view-model counts. Its bands are `ops-velocity` and `ops-supporting`, plus
  `#figures-operations-heading`, and its cards are bordered at 4px like HR's.
- **Three operations metrics have NO `metric-*` section at all.** `ops-grade-a-office-stock`,
  `ops-power-uptime` and `ops-disruption-days` are summary CELLS, so `#metric-ops-power-uptime` does
  not exist and a spec looking for the card finds nothing. The figure is in the first `ul` of the band.
- **The operations summary carries no glyph and HR's carries three.** A spec asserting `svg` count on
  "the composed tab's summary" gets 0 on operations and 3 on HR. Both are deliberate; see
  `project.md`.
- **The disruption cell reads "2 – 6", not "0", and its text contains "to".** The visible en dash is
  `aria-hidden` with an `sr-only` " to " beside it, so `textContent` is `"2–to6"` once whitespace is
  collapsed. Matching `/2\s*–\s*6/` fails; match `/2\s*–\s*to\s*6/` or read the two figures
  separately.
- **`VELOCITY_HEADING` is one constant on two tabs.** "Hiring velocity benchmarks" appears on HR AND
  operations, so `getByRole("heading", { name: "Hiring velocity benchmarks" })` is not tab-specific and
  cannot be used to prove which panel is mounted. Use an exclusive heading — "Supporting operational
  benchmarks" or "Scale and salary analysis" — or a section id.
- **A card's heading LEVEL differs between a derived and a composed tab.** It is `h2` on technology,
  where a card is a top-level section of the panel, and `h3` on HR, operations and finance, where it
  sits under a section heading — except a composed tab's own analytical `Panel`s, which are `h2` with
  their contents at `h3`. A locator pinning `level: 2` silently matches nothing on much of the
  screen — which is exactly what happened to the shared-figures spec, whose own "not every metric is on
  every tab" escape hatch turned the miss into a skip.
- **"the composed tab" now means one of THREE, and none of them is shaped like another.** HR is 3
  summary cells and 6 sections; operations 4 and 5; finance 3 and 5. Three operations metrics have no
  `metric-*` section at all, being summary cells, and finance's three analytical `Panel`s are direct
  children of the zone rather than of a grid.
- **A finance `Panel` is a direct child of the zone's padded container.** Anything measuring a card
  against `cards[0].parentElement` is measuring against a box that includes the surface's horizontal
  padding — a full-width 1120px card inside a 1184px padded box reads as 94.6% full. The part-empty-row
  spec now reads each row's own container CONTENT box; copy that, do not copy the old version.
- **`#function-metrics ul > li` means "a figure-row cell", on all four tabs.** It is the count several
  specs use for how many figures a tab leads on, so a composed tab must not introduce a second list —
  which is why finance's three tier-spread cards are a `div` of `div`s despite being a set.
- **The operations tab renders ONE zone.** Every other tab renders two or three, because it has no
  gated metric and therefore no mint band. A spec asserting "at least two `.gcc-zone` per tab" fails on
  it; the property worth asserting is that adjacent grounds differ.
- **`IndexSpread`'s hidden wrapper holds marks AND axis labels.** `div[aria-hidden="true"] > span` used
  to reach the two rail dots and now reaches nothing, the dots being one level deeper since the "0" and
  base-figure ticks were added. Select `div[aria-hidden="true"] span` and filter on a non-empty inline
  `insetInlineStart`, which is what the dots have and the labels do not.
- **`Dumbbells` and `IndexLollipop` are drawn nowhere.** The finance composition replaced them with
  `IndexSpread` and `IndexTable`, and technology — the only derived tab left — has no index grid. A
  spec looking for a lollipop row or a dumbbell connector is testing a rendering that no longer exists;
  both are still what `metric-card.tsx` would route a derived tab's index grid to.
- **`Journey`'s intervals — "+6", "+12" — are on no screen any more.** All three composed tabs draw the
  progression as a `MilestoneTrack`, and operations was the last tab drawing the staircase. A spec
  looking for a leg, a run-up or an interval on operations is testing a rendering that no longer
  exists; `journeyLegs` is still unit-tested in `screen2.test.ts`.
- **The function tab strip has no `svg` in it.** The four glyphs were removed at ANSR's request, so a
  spec locating a tab by its icon, or counting icons in `tablist`, finds none.
- **`new URL("./out/", import.meta.url).pathname` is PERCENT-ENCODED, and this workspace path has a
  space in it.** A throwaway probe script resolved its output directory to
  `/Users/.../GCC%20Landscape/...` and `mkdirSync` obligingly created a whole sibling tree under a
  directory literally named `GCC%20Landscape` — no error, and the screenshots it wrote were nowhere
  near where the next command looked for them. Use `fileURLToPath`.
- **The capability grid REFLOWS below `md` and the reflow is CSS on one DOM tree**, so a spec that
  locates a cell by column position, or asserts the `thead` is visible, is asserting a desktop-only
  shape. `.gcc-rating-grid` sets `display: block` on the table's parts, the `thead` is visually hidden
  but still in the accessibility tree, and each cell carries its column's name a second time as an
  `aria-hidden` span — so `textContent` on a cell gains the hub's name at phone widths while its
  accessible name does not. The browser projects run at Desktop Chrome 1280, where none of this is
  active; a spec that sets a phone viewport has to know.
- **A HINT INSIDE THE `<label>` BECOMES PART OF THE CONTROL'S ACCESSIBLE NAME, and on a form with two
  related fields that makes both unaddressable.** The obvious admin field is
  `<label><span>Industry</span><select/><span>the hint</span></label>` — three surfaces wrote exactly
  that — and it names the select "Industry The hard boundary. Peer matching never leaves it, so a pinned
  company must be in it too.", which a screen reader reads before every option. It also breaks lookups:
  `getByLabel` matches on SUBSTRING, so on a form holding both "Industry" and "Sub-industry" a lookup for
  the first resolves to two controls and fails on strict mode. `AdminField` in `controls.tsx` now wires
  the hint through `aria-describedby` and clones its single child to inject the ids. Two consequences
  worth carrying: a hint is a DESCRIPTION and never a name, and `getByLabel("Industry")` still needs
  `{ exact: true }` wherever "Sub-industry" is on the same page, because the substring rule is
  Playwright's and not the markup's.
- **A `SEARCH_KINDS` member whose collection is legitimately EMPTY breaks the universal search's coverage
  test, and the test is right to be strict.** `search-index.test.ts` asserts every declared kind has at
  least one entry, because a kind that is not indexed is a thing an admin is told does not exist.
  `peer-override` is the one exemption: pinned peer sets are corrections to the scoring engine and none at
  all is the healthy state, so the assertion for that kind is one entry per row instead. Do not relax the
  rule for a kind that merely happens to be empty in a fixture.
- **`getByLabel("Search")` reaches any control whose name CONTAINS it**, which is why the palette's
  trigger is "Find anything" and why the peer-override editor's candidate filter is "Find a company". A
  second search box on a page that already has one must not use the word.
- **A HAND PLACEMENT IS TUNED TO ONE PLOT WIDTH, and the role map is the chart that proves it.** Its
  bubbles carry percentage coordinates and their labels are pixels, so the two only agree at the width
  the placement was measured at — 1070px, which is the plot at every viewport from 1280 up because the
  result card is capped. At `lg` the plot is 814px, the same labels are 31% wider relative to the axis,
  and seven pairs overlap. A width-specific placement is not something a dataset can express, so the
  field draws from `xl` only and everything narrower reflows. **Never accept a band height, a label size
  or a dot ramp on the role map without running `npm run rolemap:check` at 1280 AND 1440** against real
  rendered geometry: 27.5rem ships because it is the slide's own aspect, and the 18rem before it came
  from a sweep that measured line boxes. The same arithmetic killed a row PACKER before it — see the role
  map's block in `project.md`.
- **A CHART CAN BE FREE OF OVERLAP AND STILL BE READ WRONG, AND "ZERO COLLISIONS" IS WHAT HIDES IT.** A
  label belongs to whichever mark is NEAREST it, so the question a collision check asks is not the
  question a reader asks. The role map shipped at zero collisions with eleven of thirty-six labels sitting
  closer to a foreign bubble than to their own — one at 1.4px against its own 8 — which read as clutter
  and as "I cannot tell which bubble this is". `rolemap:check` now reports `binding=` beside
  `collisions=` and both must be 0. The lever is the dot-to-label GAP rather than the placement, because
  shortening it moves no mark: `--gcc-role-gap`, one value on `[data-role-step]` for the public field, the
  chip flow and the admin canvas, which previously disagreed at 8px and 6px. **A preview that spaces a
  label differently from the live field is worse than no preview** — it clears overlaps that still ship.
- **A SCREENSHOT OF A PUBLIC BAND IS WASHED OUT UNLESS THE CONTEXT SETS `reducedMotion: "reduce"`.**
  `.gcc-enter` staggers each zone by `--gcc-enter-index * duration-fast` and fills `both`, so a shot
  taken before a late zone's keyframe finishes catches the whole band mid-opacity — every ink pale,
  including near-black heading type. It looks exactly like a contrast bug and is not one; the CSS already
  gates the animation on `prefers-reduced-motion`, so emulating it is the deterministic fix and waiting
  longer is the flaky one. Playwright's element screenshot also composites the page, so the Next dev
  overlay's dark badge shows up inside a clipped panel — check whether a stray mark is outside the
  element before debugging the element.
- **`data-tone` and `data-role-step` are UNSCOPED selectors in `globals.css`, deliberately.** They were
  scoped to `.gcc-role-map` and `.gcc-role-legend`, and when the admin placement canvas became a third
  surface drawing the same marks every bubble on it rendered at zero size with no colour —
  `calc(var(--gcc-role-unit) * 1.75)` against an undefined variable is invalid, not zero, and fails
  silently. A CSS custom property that a component contract depends on must be defined on every surface
  that draws the mark, or the selector must not name an ancestor at all.
