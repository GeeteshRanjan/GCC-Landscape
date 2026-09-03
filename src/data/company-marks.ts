/**
 * Which companies have a mark committed to this repo, and which file it is.
 *
 * This is tier 1 of `resolveCompanyMark` — the tier that wins over the provider. It is
 * wired end to end and **deliberately EMPTY**: the peer cards and the largest-centres
 * ranking draw their marks from Brandfetch, and adding an entry below is the only step
 * needed to override that for one company.
 *
 * **IT IS EMPTY BY DECISION, NOT BECAUSE IT IS UNFINISHED, at the project owner's
 * instruction.** Twenty companies were mapped here and then removed. The reason is worth
 * keeping, because the same idea will look obvious again: a provider mark is letterboxed
 * into the box the resolver ASKS for, so every mark arrives at ONE ratio no matter what
 * the artwork is. A committed file is cropped to its own ink, so its ratio is the
 * artwork's — 0.78:1 to 5.18:1 across the twenty-two we serve — and the moment those
 * mixed ratios reached a layout built around a uniform one, the marks stopped agreeing:
 * the footprint ran 25px to 112px on a card, and on a ranking row, where the mark leads
 * the name, every row started its name at a different x. Each fix cost more than it
 * bought. **So the rule is: a committed mark must be letterboxed to the resolver's own
 * box BEFORE it lands here, or the placement has to be redesigned around variable
 * ratios.** Neither is done, and until one is, this table stays empty.
 *
 * **The strip is UNAFFECTED and keeps all twenty-two marks.** `siteContent.logos` is a
 * different band making a different claim — companies ANSR has worked with — and its
 * layout was built for ink-cropped files from the start: it caps height AND width, so a
 * 5.18:1 wordmark and a 0.78:1 stacked mark land at comparable weight. Nothing about
 * that band changed, and `public/logos/` is still where its files live.
 *
 * When entries do come back, three rules already hold and are asserted in
 * `tests/unit/company-marks.test.ts`:
 *
 * **IT IS CODE RATHER THAN DATA, on `COMPANY_NAME_FIXES`' argument.** The entry is
 * worthless without the FILE, and the file is a commit — so a table an admin could edit
 * would let a publish name a mark that is not served, and the failure would be an
 * invisible one: a card silently falling back to the provider or to the name alone, which
 * is the routine case and therefore reports nothing. **There is no admin UI for this and
 * that is deliberate**; admin's logo picker belongs to the customer strip, where the
 * files are already served and the only choice is which appear.
 *
 * **Keyed by company `id`, never by name.** Company names are not unique in this dataset
 * even with case folded — the reason `business-type-map.ts` is keyed `industry||name` and
 * the reason `COMPANY_NAME_FIXES` corrects a name in exactly one place. An id is the only
 * stable handle, and it survives the name corrections `canonicalCompanyName` applies on
 * import.
 *
 * **A path under `/logos/` reuses the strip's own file; `/logos/companies/` is for a mark
 * whose company is NOT in the strip.** One file per trademark either way — a second copy
 * is how two placements start drawing different marks, which is the lesson
 * `public/badges/` records about the Fortune badge. The strip's `src` pattern excludes the
 * subdirectory, so a file there can never be offered to a band that would imply a
 * customer relationship it does not have.
 */
export const COMPANY_MARKS: Readonly<Record<string, string>> = {};

/**
 * The committed mark for a company, or null.
 *
 * Null for every company today, which is why the provider tier behind it is what the peer
 * sections actually draw. That is not a failure path: `resolveCompanyMark` tries
 * Brandfetch next and the name alone after that, and a name-alone card is a complete card.
 *
 * Kept wired rather than deleted, at the project owner's instruction, so restoring a
 * committed mark is one line in the table above and no change anywhere else.
 */
export function uploadedCompanyMark(companyId: string): string | null {
  return COMPANY_MARKS[companyId] ?? null;
}
