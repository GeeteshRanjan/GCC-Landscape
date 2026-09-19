/**
 * The ANSR wordmark, set inline inside the hero headline where the brand name
 * would otherwise be typed.
 *
 * **NO LIVE CONSUMER, and it is kept deliberately rather than as dead code.** ANSR was
 * removed from the entry point's headline at the project owner's instruction, which was
 * this component's last placement — the impact band draws its own inline lockup and the
 * result screens draw the full one. It stays for two reasons: it is the only home in code
 * for `ANSR Name.svg`'s contours, and the cap-height measurement in it is cited by
 * `screen-header.tsx`, which would otherwise have no source for its `1.7em`. It was cited
 * by the two product-name marks as well until those became type; `product-name.tsx` reads
 * the FACE's own cap height instead, so this file has one citer now rather than three.
 * Restoring ANSR to the headline is one call site.
 *
 * **Its history, before that.** The scale curve's ANSR rail caption on the
 * operations and HR tabs used it for a pass, which moved this file to `public/`; ANSR then
 * asked for the FULL lockup there — the circular mark as well as the wordmark — so that
 * caption serves `public/brand/ansr-logo.svg` as an image and this went back to the one
 * surface that sets the wordmark inline in a line of type.
 *
 * `assets/brand/logo/ANSR Name.svg`, inlined rather than served, and changed in
 * exactly two ways — both required for it to sit in a line of type:
 *
 *   - **`fill="currentColor"` instead of the asset's hardcoded white.** The
 *     wordmark now inherits the ink of the span it is in, so it is the same
 *     decision as the text it replaces rather than a second one. Logos are the one
 *     brand asset used literally, and recolouring a monochrome lockup to the ink
 *     around it is not an adaptation of the mark.
 *   - **Sized in `em` so the mark's LETTERS match the cap height of the words
 *     beside it.** The artboard (158×41) is not tight to the glyphs: the letters
 *     span ~37.86 of its 41 units, so ~8% of the height is clearance. Sizing the
 *     ARTBOARD to the cap height therefore leaves the letters ~8% short, and the
 *     mark reads visibly smaller than the "ATLAS" set next to it — which is exactly
 *     what shipped at `0.72em`. So the artboard is set a step taller, `0.8em`, which
 *     lands the ANSR caps at ~0.74em — matching the display face's cap height so the
 *     mark and the word beside it read at one size.
 *
 * **The baseline shift is the other half of that.** An inline-block sits its own
 * bottom edge on the baseline, and the lockup's artboard has a sliver of clearance
 * under the letters, so it floats. `vertical-align` pulls it back down by that
 * sliver, in `em` so it tracks the size.
 *
 * ACCESSIBILITY. The mark is `aria-hidden` and the name is carried by a visually
 * hidden text node beside it, so the `h1` still has exactly the accessible name it
 * had when the word was typed — including for a screen reader reading the heading
 * out of a landmark list. `role="img"` with a label on the SVG would nearly do the
 * same, but it makes the name depend on how one browser flattens an inline
 * graphic's label into its ancestor's name computation, and the heading is the
 * thing focus is moved to on every phase change.
 */
export function AnsrWordmark({
  className,
  label = "ANSR",
}: {
  className?: string;
  /**
   * The visually hidden text the mark contributes to its ancestor's accessible name.
   *
   * Overridable for one reason: the product lockup is "ANSR." with a period, and the
   * period is typed rather than drawn because the artboard has no punctuation in it.
   * A separate text node for it does not work — name-from-content inserts whitespace
   * at element boundaries, so `<mark/>.` computed to "ANSR . GCC Intelligence", which
   * looked right on screen and read wrong to a screen reader. So the punctuation goes
   * into this string and the visible period is `aria-hidden`. Measured with
   * `ariaSnapshot`, not assumed.
   */
  label?: string;
}) {
  return (
    <span className={className}>
      <span className="sr-only">{label}</span>
      <svg
        viewBox="0 0 158 41"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className="inline-block h-[0.8em] w-auto align-[-0.04em]"
      >
        <path d="M150.4 10.7309C149.59 5.18094 145.01 1.21094 139.43 1.21094H118.21C118.01 1.21094 117.81 1.21094 117.6 1.25094V8.26094C117.6 12.4309 119.1 15.4709 122.66 16.0809V6.36094C122.9 6.36094 123.11 6.32094 123.27 6.32094H139.35C142.35 6.32094 144.74 8.18094 145.3 10.9409C146.03 14.5009 143.52 17.7809 139.91 17.9909C138.98 18.0309 138.01 18.0309 137.03 18.0309H123.34C121.4 18.0309 117.59 18.2709 117.59 23.5809V38.9709H122.65V23.7809C122.65 23.2909 122.77 23.1309 123.3 23.1309C126.5 23.1709 129.7 23.1309 132.94 23.1309C133.34 23.1309 133.55 23.2909 133.79 23.6209C137.11 28.5609 140.47 33.5009 143.79 38.4409C144.03 38.8009 144.32 38.9709 144.76 38.9709C146.3 38.9309 147.8 38.9709 149.34 38.9309C149.54 38.9309 149.7 38.8909 149.99 38.8909C146.47 33.6309 142.98 28.4409 139.5 23.3009C140.55 23.1409 141.52 23.0209 142.46 22.7709C147.6 21.3909 151.17 16.0509 150.4 10.7409V10.7309Z" />
        <path d="M155.221 36.0816C155.671 35.9616 155.991 35.4716 155.911 35.0316C155.831 34.5416 155.421 34.1816 154.941 34.1816H153.121V37.4216H153.691V36.0816H154.461L154.861 36.6916C155.021 36.8916 155.141 37.0916 155.311 37.3416C155.351 37.3816 155.391 37.4216 155.431 37.4216H156.001L155.111 36.1216C155.111 36.1216 155.191 36.0816 155.231 36.0816H155.221ZM154.861 35.5616H153.691V34.7116H154.991C155.191 34.7116 155.391 34.8316 155.441 35.0316C155.481 35.1516 155.441 35.2716 155.361 35.3916C155.281 35.4716 155.161 35.5516 155.041 35.5516C154.961 35.5516 154.921 35.5516 154.881 35.5516L154.861 35.5616Z" />
        <path d="M154.489 32.6016C152.749 32.6016 151.289 34.0216 151.289 35.8016C151.289 37.5816 152.709 39.0016 154.489 39.0016C156.269 39.0016 157.689 37.5816 157.689 35.8016C157.689 34.0216 156.269 32.6016 154.489 32.6016ZM154.489 38.5116C152.989 38.5116 151.779 37.3016 151.779 35.8016C151.779 34.3016 152.989 33.0916 154.489 33.0916C155.989 33.0916 157.199 34.3016 157.199 35.8016C157.199 37.3016 155.989 38.5116 154.489 38.5116Z" />
        <path d="M104.639 18.9907C101.969 17.9807 99.1286 17.6107 96.2986 17.2507C93.9886 16.9707 91.7186 16.6407 89.4586 16.2407C87.7986 15.9607 86.4186 15.1507 85.3686 13.8507C84.1586 12.3507 84.0286 10.5707 85.2886 9.07074C85.8986 8.34074 86.6286 7.65074 87.4386 7.25074C92.5786 4.50074 97.8486 4.46074 103.069 6.97074C104.849 7.82074 106.309 9.12075 106.589 11.3007C106.589 11.3407 106.629 11.3407 106.669 11.3807H111.689C111.689 9.68074 111.199 8.22074 110.389 6.84074C108.809 4.29074 106.499 2.67074 103.789 1.58074C99.7786 -0.0392553 95.6086 -0.359256 91.3586 0.370744C88.0786 0.940744 85.0786 2.19074 82.6086 4.46074C78.6786 8.02074 78.2786 13.3707 81.5586 17.2607C83.5386 19.6507 86.1786 20.9507 89.1686 21.4307C91.9586 21.8807 94.7986 22.2007 97.5886 22.6007C99.6086 22.8807 101.639 23.2507 103.539 24.0607C106.779 25.4407 107.589 29.8907 105.119 32.0007C104.629 32.4507 104.109 32.8907 103.539 33.1707C98.6386 35.8007 93.6186 35.9607 88.5586 33.7807C86.4486 32.8907 84.6686 31.5907 84.3886 29.0407H79.3686C79.2086 30.2507 79.7286 32.1207 80.6286 33.5407C82.2086 36.0907 84.5186 37.6707 87.2286 38.8007C90.9186 40.3007 94.7186 40.6207 98.6086 40.1407C101.809 39.7407 104.809 38.6807 107.439 36.7407C111.289 33.8607 112.619 29.5707 111.039 25.0407C109.989 21.9607 107.639 20.1407 104.639 19.0107V18.9907Z" />
        <path d="M18.75 1.26172H13.2L8.99001 12.9617C7.65001 17.0917 8.79 20.4517 11.87 20.8617L18.15 3.00172L24.87 22.2017H11.26C10.17 22.2017 5.51001 22.6017 3.85001 27.7117L3.77 27.9117C3.77 27.9117 3.77 27.9517 3.73 27.9917L0 39.0117H5.55L9.68 27.3517H26.65L30.74 39.0117H36.29L23.09 1.27172H18.76L18.75 1.26172Z" />
        <path d="M68.32 37.3817L50.17 1.26172H45.43H44.54H40.25V39.1217H45.43V3.04172L63.58 39.1217H68.32H69.21H73.54V1.26172H68.32V37.3817Z" />
      </svg>
    </span>
  );
}
