/**
 * Where a company's logo comes from.
 *
 * **One resolver, so the two tiers cannot disagree.** A peer card draws a mark from
 * whichever source is available, in a fixed order, and the CARD is handed a finished
 * URL or nothing — the component decides no part of this, on the rule that a chart
 * never chooses its own data source. See "A REAL COMPANY MARK IS PERMITTED ON A PEER
 * CARD" in `.kiro/steering/project.md`.
 *
 * The order, and why it is this way round:
 *
 * 1. **An uploaded mark**, once that exists. Not built yet, and this module is where
 *    it plugs in — see `resolveCompanyMark`'s `uploaded` parameter, which is already
 *    threaded so adding the manifest is a change here and nowhere else.
 * 2. **Brandfetch's Logo API**, hotlinked. Their terms require the link be embedded
 *    rather than the image retrieved, so this returns a URL and nothing in this repo
 *    ever fetches it server-side.
 * 3. **Nothing.** The card draws the name alone, which is a complete card. Brandfetch
 *    resolves roughly 86–95% of brands, and six companies carry no domain at all, so
 *    this branch is ROUTINE rather than defensive.
 *
 * **This module holds no dataset and must never take `server-only`.** The resolved URL
 * is computed server-side and travels on the card, but the client ID is a
 * `NEXT_PUBLIC_` value by necessity — it ships inside an `img src`, which is what the
 * provider's own documentation specifies — so nothing here is a secret being leaked.
 */

/**
 * The client ID, from the environment.
 *
 * **`NEXT_PUBLIC_` because the value is public by construction.** It is a rate-limiting
 * and attribution identifier that appears in the query string of an image request in
 * the visitor's browser; there is no version of this feature where it is hidden. It is
 * still config rather than a literal, so it is never committed — see `.env.example`.
 *
 * Unset means the Brandfetch tier is OFF. That is the safe default and the state
 * production ships in until the trademark question is settled: with no ID, every card
 * falls to the name alone, which is exactly how the screen renders today.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GCC_BRANDFETCH_CLIENT_ID?.trim() ?? "";

/**
 * Whether the fallback tier is available at all.
 *
 * Exported so a spec can assert the off state renders no third-party request, and so
 * the admin coverage view can say "the fallback is not configured" rather than
 * reporting every company as having no mark.
 */
export function brandfetchConfigured(): boolean {
  return CLIENT_ID.length > 0;
}

/**
 * The display box the mark is fitted into, in CSS pixels at 1x.
 *
 * **Both dimensions are requested, and the provider letterboxes inside them.** Asking
 * for a single dimension returns whatever aspect ratio the source mark has, which is
 * the problem the customer strip's dual cap exists to solve: a 4.9:1 wordmark beside a
 * 0.8:1 stacked mark at one common height reads as one company shouting. Fixing the box
 * means every card reserves identical space and no mark can decide the row's rhythm.
 *
 * Requested at 2x so the image is sharp on a retina display; the card's own CSS caps
 * the rendered size.
 */
const MARK_BOX = { width: 128, height: 40 } as const;
const DEVICE_SCALE = 2;

/**
 * A company's mark URL, or null when there is none to draw.
 *
 * `uploaded` is the first tier and is threaded through unused for now — passing the
 * manifest lookup in later is a one-line change at the call site rather than a new
 * branch here, which is what keeps the resolution order in one place from the start.
 */
export function resolveCompanyMark(
  domain: string | undefined,
  uploaded?: string | null,
): string | null {
  if (uploaded) return uploaded;
  if (!domain || !CLIENT_ID) return null;

  /**
   * `encodeURIComponent` on the domain even though `DOMAIN_PATTERN` already refused
   * anything with a slash, a space or a query character.
   *
   * Belt and braces on purpose: this string goes into an attribute the browser will
   * request, and the validation lives in a different module from this one. A future
   * relaxation of the pattern — an internationalised domain, say — must not silently
   * become a way to append a second query parameter.
   */
  const identifier = encodeURIComponent(domain);
  const width = MARK_BOX.width * DEVICE_SCALE;
  const height = MARK_BOX.height * DEVICE_SCALE;

  /**
   * **`fallback` IS A PATH SEGMENT, NOT A QUERY PARAMETER, and getting that wrong is
   * silent.** As `?fallback=404` it is ignored: an unknown brand returns HTTP 200 with a
   * 346-byte placeholder, so every card renders something and nothing reports a problem.
   * As `/fallback/404` an unknown brand returns a real 404 and the `<img>` simply fails,
   * which is the behaviour this product needs. Measured, not assumed — see
   * `docs/traps.md`.
   *
   * **`404` specifically, never `lettermark`.** The provider's lettermark is a generated
   * tile bearing the company's initial, which is precisely the monogram this product
   * refuses to draw. Asking for it would reintroduce the fabricated identity through the
   * back door, dressed as a real logo.
   */
  return (
    `https://cdn.brandfetch.io/${identifier}` +
    `/w/${width}/h/${height}` +
    `/fallback/404` +
    `?c=${encodeURIComponent(CLIENT_ID)}`
  );
}

/** The origin the CSP has to allow while the fallback tier is on. */
export const BRANDFETCH_IMAGE_ORIGIN = "https://cdn.brandfetch.io";
