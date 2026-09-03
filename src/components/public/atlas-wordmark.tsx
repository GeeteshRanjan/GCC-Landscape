import { cn } from "@/lib/utils";

/**
 * `ATLAS` — the product name, drawn, set inline wherever the word would otherwise
 * be typed.
 *
 * **Supplied as an outlined SVG by the project owner and carried over VERBATIM.**
 * The letters are the file's own contours, unchanged; nothing here is traced,
 * re-drawn or refitted. Three things were done to it, and only these three:
 *
 *   - **The dark plate is gone.** The supplied file is a full-bleed 1024x512
 *     rectangle with the letters knocked out of it and painted over in white — a
 *     picture of the wordmark on a ground rather than the wordmark. A plate cannot
 *     sit in a line of type, and it would have put a second ground inside a band
 *     that already has one, so what is kept is the letter contours alone.
 *   - **The REGISTERED MARK is removed**, at the project owner's instruction. It was
 *     four subpaths trailing the S at descender depth; at the size this sets, its
 *     ring and its R stop resolving and it reads as a speck beside the final letter.
 *     Dropping it also keeps the wordmark's own trailing sidebearing as the block's
 *     trailing edge, so the mark ends on a letter.
 *   - **`fill="currentColor"` instead of the file's white**, so the wordmark is the
 *     same ink decision as the type it replaces rather than a second one. That is
 *     the one change `AnsrWordmark` makes to its own asset, for the same reason:
 *     recolouring a monochrome lockup to the ink around it is not an adaptation of
 *     the mark.
 *
 * **The `viewBox` is the letters' own bounds, and it is deliberately NOT the
 * artboard.** The supplied artboard is 1024x512 with the wordmark occupying a strip
 * across its middle, so sizing the artboard to the line would set the letters at
 * roughly two fifths of the type beside them — the same trap `AnsrWordmark` and the
 * result screens' lockup each document. The box is cropped to the ink instead, and
 * the paths keep their original coordinates: the crop is expressed as the `viewBox`
 * offset, so no contour is moved and what ships stays comparable to what was
 * supplied.
 *
 * **It is sized off the CAP HEIGHT, so it matches the word it replaces.** Measured
 * off this file by flattening the curves rather than reading the coordinates —
 * traced outlines put control points outside the ink, so the numbers in the path are
 * not the numbers on screen. The caps run 136.36 to 366.78, which is 230.42 of the
 * box's 242.343 units, or 0.9508 of it.
 *
 * **The cap height it is matched to is the ANSR LOCKUP'S, not the type's, and the
 * two are 2 percent apart.** `ansr-logo-on-dark.svg` sets its wordmark's caps at
 * 0.712em where the result screens' `h1` draws it — see `ProductIdentity` for that
 * arithmetic — against Hanken Grotesk's own 0.697em. The lockup is what this sits
 * beside, and a product name half a percent off its own brand mark is the mismatch
 * a reader sees; half a percent off the sentence it is embedded in is not. So
 * `0.749em` of box lands these caps at 0.712em. Measured in a browser at 4x rather
 * than assumed: the two marks' cap bands agree to within a device pixel and their
 * baselines to within a fifth of one.
 *
 * **The box is vertically SYMMETRIC about the cap band, which is what makes it
 * centre correctly.** The S overshoots the cap line above and the baseline below by
 * different amounts, so the crop pads the shorter side back out and the cap band's
 * midline is the box's midline. That means `items-center` in a flex row lands these
 * caps on the ANSR lockup's, whose own wordmark is centred in its artboard to within
 * half a unit — so the lockup needs no baseline shift to tune, and both halves are
 * aligned by the same property.
 *
 * **It is a FRAGMENT rather than a wrapping span, and that is what makes the
 * centring true.** Wrapped, the flex item is a span whose line box positions the
 * mark against the FONT's strut, so `items-center` centred the span and the strut
 * placed the mark inside it — measured 1.1px high against the lockup at 30px. The
 * `sr-only` node is absolutely positioned, so it is out of flow and the mark is the
 * flex item itself.
 *
 * **`vertical-align` is for the INLINE case**, which is the entry point's headline.
 * An inline-block sits its own bottom edge on the baseline, and this box's bottom
 * edge is the S's overshoot rather than the baseline, so it floats by that
 * overshoot: 0.0246 of the box, which is 0.018em at this size. Stated in `em` so it
 * tracks the size.
 *
 * ACCESSIBILITY. The mark is `aria-hidden` and the word is carried by a visually
 * hidden text node beside it, so a heading containing this computes exactly the
 * accessible name it had when the word was typed. Same construction as
 * `AnsrWordmark`, and for the same reason: the alternative depends on how a browser
 * flattens an inline graphic's label into its ancestor's name.
 */
export function AtlasWordmark({
  className,
  label = "ATLAS",
}: {
  className?: string;
  /** The visually hidden text the mark contributes to its ancestor's accessible name. */
  label?: string;
}) {
  return (
    <>
      <span className="sr-only">{label}</span>
      <svg
        // x/y are the crop off the supplied artboard; see the block comment. The
        // path below carries the file's own coordinates, unmoved.
        viewBox="35.37 130.399 940.551 242.343"
        fill="currentColor"
        fillRule="evenodd"
        aria-hidden="true"
        focusable="false"
        className={cn(
          "inline-block h-[0.749em] w-auto shrink-0 align-[-0.018em]",
          className,
        )}
      >
        <path d="M972.65 198.89C961.73 198.89 950.8 198.89 939.87 198.89C938.52 192.22 937.62 185.77 933.46 180.1C918.81 160.11 880.76 159.86 859.06 163.88C837.79 167.83 818.54 178.35 821.82 203.27C824.69 225.14 859.75 229.12 876.91 231.17C911.49 235.28 959.41 240.69 972.85 278.81C975.41 286.09 975.96 294.14 975.92 301.78C975.89 310.05 974.44 318.3 971.5 326.03C954.76 370.04 894.77 375.63 855.06 369.73C845.71 368.34 836.64 365.91 827.87 362.4C808.15 354.5 792.6 338.64 786.99 317.99C785.72 313.3 784.41 307.77 785.02 302.97C795.86 302.97 806.69 302.97 817.53 302.97C820.76 309.6 820.15 315.29 825.62 321.68C842.33 341.22 875 341.73 898.36 338.8C922.79 335.73 945.14 324.98 942.17 296.49C939.78 273.54 912.93 270.21 894.78 266.97C860.36 260.82 801.25 259.9 790.44 217.3C788.7 210.44 787.92 203.75 788.07 196.67C788.25 188.26 789.96 179.95 793.34 172.24C810.6 132.94 866.3 126.77 903.42 131.99C912.9 133.32 922.34 135.65 931.17 139.41C949.45 147.19 964.88 160.74 970.07 180.59C971.59 186.38 973.47 192.87 972.65 198.89ZM175.71 136.36C178.97 142.08 180.42 149.29 182.69 155.49C187.68 169.11 192.57 182.83 197.04 196.63C207.97 230.37 221.14 263.38 232.06 297.12C237.26 313.19 243.03 329.25 248.89 345.09C251.34 351.71 255.49 359.74 255.84 366.78C244.49 366.78 233.14 366.78 221.79 366.78C213.2 342.74 204.6 318.69 196.01 294.65C162.51 294.65 129.02 294.65 95.52 294.65C86.93 318.68 78.34 342.72 69.74 366.75C58.28 366.75 46.83 366.75 35.37 366.75C35.42 360.12 44.54 339.96 47.06 332.23C51.74 317.87 58.44 293.76 66.62 281.79C78 265.14 97.15 261.65 116.02 261.62C131.66 261.59 147.31 261.66 162.95 261.6C169.87 261.58 177.27 262.35 184.11 261.38C184.34 257.75 182.04 253.95 180.83 250.49C178.33 243.3 175.88 236.09 173.42 228.89C167.75 212.36 162.1 195.83 156.13 179.41C152.62 169.74 150.41 159.06 145.77 149.88C133.65 184.2 121.53 218.51 109.41 252.83C94.77 254.47 84.26 238.01 85.7 225.08C86.92 214.17 92.26 203.62 95.73 193.28C102.11 174.25 108.93 155.37 115.36 136.36C135.47 136.36 155.59 136.36 175.71 136.36ZM398.14 136.37C398.14 147.16 398.14 157.94 398.14 168.73C340.69 168.73 283.23 168.73 225.78 168.73C225.07 161.62 225.67 154.24 225.64 147.09C225.62 143.67 224.95 139.5 226.3 136.37C283.58 136.37 340.86 136.37 398.14 136.37ZM454.26 136.4C454.26 202.26 454.26 268.12 454.26 333.98C484.08 333.98 513.91 333.98 543.73 333.98C539.99 344.91 536.24 355.85 532.49 366.78C495.54 366.78 458.58 366.78 421.62 366.78C421.62 289.99 421.62 213.19 421.62 136.4C432.5 136.4 443.38 136.4 454.26 136.4ZM697.23 136.36C699.66 140.27 700.59 145.28 702.2 149.6C706.44 160.97 710.06 172.53 714.14 183.95C722.65 207.73 730.53 231.72 739.09 255.47C743.84 268.64 748.79 281.77 753.02 295.13C758.23 311.56 764.28 327.86 770.1 344.09C772.58 351.02 777.11 359.45 777.33 366.77C765.94 366.77 754.54 366.77 743.15 366.77C734.63 342.73 726.11 318.69 717.59 294.65C683.88 294.65 650.16 294.65 616.45 294.65C607.94 318.69 599.44 342.72 590.93 366.75C579.61 366.75 568.28 366.75 556.95 366.75C557.06 362.47 559.58 357.87 560.99 353.81C563.66 346.14 566.45 338.48 569.03 330.77C574.05 315.76 580.59 290.64 590.41 278.75C602.91 263.62 621.83 261.65 640.25 261.64C654.57 261.62 668.89 261.64 683.22 261.63C690.66 261.62 698.3 262.04 705.72 261.45C705.96 256.12 698.47 239.07 696.35 232.86C690.21 214.83 683.42 196.97 677.52 178.84C674.92 170.85 671.4 156.62 667.35 149.84C655.11 184.18 642.87 218.52 630.63 252.86C616.83 253.23 605.91 239.27 607.21 226.15C608.11 217.08 611.76 208.51 614.94 200.05C617.78 192.44 620.18 184.61 622.91 176.96C627.66 163.63 630.98 149.17 636.94 136.36C657.04 136.36 677.13 136.36 697.23 136.36ZM327.85 366.78C317.1 366.78 306.35 366.78 295.6 366.78C295.6 303.68 295.6 240.59 295.6 177.5C308.01 176.65 322.13 179.06 326.76 192.55C328.86 198.68 328.21 205.49 328.21 211.87C328.21 222.45 328.2 233.03 328.2 243.6C328.22 271.37 328.1 299.14 328.23 326.9C328.27 335.71 328.26 344.53 328.25 353.34C328.24 357.62 328.98 362.68 327.85 366.78Z" />
      </svg>
    </>
  );
}
