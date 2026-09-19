import { describe, expect, it } from "vitest";

import {
  ASK,
  CUSTOMERS,
  FUNCTIONS_TITLE,
  IMPACT,
  INDUSTRY_BASIS_NOTE,
  INDUSTRY_TITLE,
  peersTitle,
  SCALE,
  signals,
  snapshotLabels,
  SNAPSHOT_LABELS,
} from "@/components/screen1/copy";
import {
  FIGURES_HEADING,
  figuresHeadings,
  HR_SECTIONS,
  hrSections,
  OPS_SECTIONS,
  opsSections,
  SOURCE_LINE,
  VELOCITY_HEADING,
} from "@/components/screen2/copy";
import {
  COPY_PLACEHOLDERS,
  COPY_TEMPLATES,
  copyFieldMax,
  DEFAULT_PUBLIC_COPY,
  fillTemplate,
  isCopyTemplate,
  METRIC_FUNCTIONS,
  publicCopySchema,
  type PublicCopy,
} from "@/data/schema";
import { getDataset } from "@/data/dataset";
import { buildPeerView, type PeerViewInput } from "@/data/screen1";

/**
 * The seam between the published copy and the code that used to hold it.
 *
 * **What this file is actually protecting is that there is ONE shipped value per
 * string.** The public screens render `dataset.siteContent.copy`; the two `copy.ts`
 * files still carry the reasoning for every wording decision, and each of their
 * constants is now derived from the matching `DEFAULT_PUBLIC_COPY` key rather than
 * restating its string. Derivation is what makes drift impossible, and these
 * assertions are what stop the derivation being quietly replaced by a literal —
 * which is the one edit that would reintroduce two defaults, look correct in review,
 * and leave the unrendered one as the one the next reader edits.
 *
 * The assertions are deliberately identity checks against the schema key rather than
 * checks against a quoted string. A quoted string here would BE the second copy.
 *
 * **What this file CANNOT reach: `screen-header.tsx`, and therefore `headerLines` and
 * `HEADER_LINES`.** The unit suite resolves the `react-server` condition — which is the
 * only reason it can import a `server-only` module at all — and React's server build does
 * not export `createContext`. So every module that transitively reaches a client-side
 * React API throws on IMPORT here, before a single assertion runs: `copy-context.tsx`
 * creates the context at module scope, and `lucide-react` does the same thing for its own.
 * The band's two keys are therefore checked as DATA below rather than through the shape
 * that reads them, and the pair's wiring is asserted by `0-screen1.spec.ts` and
 * `0-screen2.spec.ts`, which drive a real browser. Do not "fix" this by moving
 * `headerLines` into a screen's `copy.ts`: it belongs to neither screen, and the whole
 * reason it exists is that one line must not be able to drift out of construction with
 * the other.
 */

/**
 * A copy block with every value replaced by a marker naming its own key.
 *
 * This is what turns "does the component read the published value" into a checkable
 * property without a browser: a derived shape built from this block can only contain
 * markers, so an assertion on a marker proves the value travelled from the key it
 * names — and a hardcoded literal surviving anywhere in the chain fails visibly
 * rather than passing because the shipped wording happened to match.
 */
const MARKED: PublicCopy = Object.fromEntries(
  Object.keys(DEFAULT_PUBLIC_COPY).map((key) => [key, `<<${key}>>`]),
) as PublicCopy;

describe("the shipped wording is defined once", () => {
  it("derives Screen 1's static constants from the schema defaults", () => {
    expect(ASK.panelTitle).toBe(DEFAULT_PUBLIC_COPY.askTitle);
    expect(ASK.panelLead).toBe(DEFAULT_PUBLIC_COPY.askLead);
    expect(ASK.submit).toBe(DEFAULT_PUBLIC_COPY.askSubmit);
    expect(CUSTOMERS.label).toBe(DEFAULT_PUBLIC_COPY.customersLabel);
    expect(IMPACT.titleLead).toBe(DEFAULT_PUBLIC_COPY.impactTitleLead);
    expect(INDUSTRY_TITLE).toBe(DEFAULT_PUBLIC_COPY.industryTitle);
    expect(SCALE.title).toBe(DEFAULT_PUBLIC_COPY.scaleTitle);
    expect(SCALE.fortuneLabel).toBe(DEFAULT_PUBLIC_COPY.scaleFortuneLabel);
    expect(SCALE.forbesLabel).toBe(DEFAULT_PUBLIC_COPY.scaleForbesLabel);
    expect(SCALE.peopleLabel).toBe(DEFAULT_PUBLIC_COPY.scalePeopleLabel);
  });

  it("derives Screen 2's static headings from the schema defaults", () => {
    expect(FIGURES_HEADING.tech).toBe(DEFAULT_PUBLIC_COPY.figuresTech);
    expect(FIGURES_HEADING.operations).toBe(DEFAULT_PUBLIC_COPY.figuresOperations);
    expect(FIGURES_HEADING.hr).toBe(DEFAULT_PUBLIC_COPY.figuresHr);
    expect(FIGURES_HEADING.finance).toBe(DEFAULT_PUBLIC_COPY.figuresFinance);
    expect(VELOCITY_HEADING).toBe(DEFAULT_PUBLIC_COPY.velocityHeading);
    expect(HR_SECTIONS.analysis).toBe(DEFAULT_PUBLIC_COPY.hrAnalysisHeading);
    expect(OPS_SECTIONS.supporting).toBe(DEFAULT_PUBLIC_COPY.opsSupportingHeading);
    expect(SOURCE_LINE).toBe(DEFAULT_PUBLIC_COPY.sourceLine);
  });

  /**
   * The band's pair, checked as data because the shape that reads it cannot be imported
   * here — see the file comment.
   *
   * Both properties are the one-line constraint written as assertions rather than as
   * wording. `HeaderFinding` sets at 48px capped at the lead measure, so past roughly 36
   * characters a line wraps, and a two-line band beside a one-line band puts back the
   * height jump across the tab switch that the pair exists to remove. And neither line may
   * hold a placeholder: nothing interpolates on this band, so a brace in the field renders
   * as a brace.
   */
  it("holds both band lines to one line, with nothing interpolated", () => {
    for (const line of [
      DEFAULT_PUBLIC_COPY.headerPeers,
      DEFAULT_PUBLIC_COPY.headerFunctions,
    ]) {
      expect(line.length).toBeLessThanOrEqual(40);
      expect(line).not.toMatch(/[{}]/);
      // Sentence case with a capital first letter, both of them. The peer line used to
      // open on a digit, which is the count this pair exists not to state.
      expect(line).toMatch(/^[A-Z]/);
    }
  });

  it("derives the snapshot's three static labels from the schema defaults", () => {
    expect(SNAPSHOT_LABELS.headcount).toBe(DEFAULT_PUBLIC_COPY.snapshotHeadcountLabel);
    expect(SNAPSHOT_LABELS.cities).toBe(DEFAULT_PUBLIC_COPY.snapshotCitiesLabel);
    expect(SNAPSHOT_LABELS.leadingCity).toBe(
      DEFAULT_PUBLIC_COPY.snapshotLeadingCityLabel,
    );
  });

  /**
   * **The one heading on either result screen that is deliberately NOT data**, and it is
   * worth an assertion because it is the one a future pass will reach for: it looks like
   * the four section titles around it.
   *
   * Its exact phrasing is what stops eight function tags being read as a claim about the
   * five companies above them — "most GCCs" is a statement about India GCCs in general,
   * and there is no per-company function record in this dataset to support anything
   * narrower. A field an admin could reword is a field that can be reworded into a claim
   * the data cannot carry.
   */
  it("keeps the functions heading out of the published copy", () => {
    expect(Object.values(DEFAULT_PUBLIC_COPY)).not.toContain(FUNCTIONS_TITLE);
    // The wording it had before ANSR shortened it. Asserted so a revert cannot land
    // half-done, with the old string back in code and the new one still in the data.
    expect(Object.values(DEFAULT_PUBLIC_COPY)).not.toContain(
      "Functions most GCCs run from India",
    );
  });

  /**
   * **The containment chart's basis line is PUBLISHED copy, and this assertion is the
   * inverse of the one it replaces.** It shipped in code for one pass on the argument
   * that a sentence which is the only thing between three exact counts and a claim about
   * the market must not be rewordable; the project owner overruled that, and what
   * survives of it is `nonEmpty` — the note can be reworded and cannot be emptied.
   *
   * So what is asserted is the SHIPPED value rather than the field: it names the scope
   * rather than the uncertainty, which is the register the wording rule fixes and the one
   * an edit is held to. `industryBasisNote` is in `PUBLIC_COPY_LABELS`, so `diff.test.ts`
   * covers it reaching the publish preview.
   */
  it("publishes the industry chart's basis line and keeps it out of the hedging register", () => {
    expect(INDUSTRY_BASIS_NOTE).toBe(DEFAULT_PUBLIC_COPY.industryBasisNote);
    expect(INDUSTRY_BASIS_NOTE).not.toMatch(/\b(approximate|estimate[sd]?)\b/i);
    expect(INDUSTRY_BASIS_NOTE).toMatch(/\bIndicative\b/);
  });

  /**
   * **The comparable-companies heading is a FLAT key again, and this assertion is the
   * inverse of the one it replaces.**
   *
   * It was a template for one pass, carrying `{company}` beside a `peersTitleFallback`,
   * because the company name was optional and the heading therefore had two branches. The
   * form no longer asks for a name, so there is one branch and one key — and what is
   * asserted is the whole of that collapse: the key is present, it interpolates NOTHING,
   * the fallback key is gone, and `{company}` is not a placeholder any part of this
   * object may still reach for.
   */
  it("publishes the comparable-companies heading as one flat key", () => {
    expect(Object.keys(DEFAULT_PUBLIC_COPY)).toContain("peersTitle");
    // No slot of any kind. A `{company}` left in the value would render as literal
    // braces in the heading over the primary evidence, which is exactly what a stale
    // draft would have carried.
    expect(DEFAULT_PUBLIC_COPY.peersTitle).not.toMatch(/[{}]/);
    expect(Object.keys(COPY_TEMPLATES)).not.toContain("peersTitle");
    expect(Object.keys(COPY_PLACEHOLDERS)).not.toContain("company");
    // Both siblings the two-branch shape needed are gone, not merely unread.
    expect(Object.keys(DEFAULT_PUBLIC_COPY)).not.toContain("peersTitleFallback");
    expect(Object.keys(DEFAULT_PUBLIC_COPY)).not.toContain("pillCompany");
    expect(Object.keys(DEFAULT_PUBLIC_COPY)).not.toContain("askCompanyLabel");
    expect(Object.values(DEFAULT_PUBLIC_COPY)).not.toContain(
      "India GCCs closest to your profile",
    );
  });

  /**
   * **The snapshot's opening label is still NOT a key, and templates do not change
   * that.** It is the one place the two rules meet: `peersTitle` came back because its
   * branches differ by a VALUE dropped into one slot, and this label's branches differ
   * by which NOUN the sentence uses ("your industry" / "your sub-industry"). A template
   * cannot express that, and inventing a slot to fake it would hand an admin the choice
   * of noun — which is a claim about which population the figure was measured over.
   */
  /**
   * **"GCCs" is the house spelling and neither "GCCS" nor "GCC's" may be stored, however
   * forgiving the renderer is.** The snapshot eyebrow is drawn `uppercase`, so
   * `withCasedGccPlural` in `snapshot.tsx` exempts the plural and returns its small s —
   * and that mechanism was a silent no-op for a while precisely because it matched the
   * token literally while the published heading said "GCCS". The match is
   * case-insensitive now, which fixes the drawing; this fixes the datum, because a
   * renderer that tolerates the wrong spelling is not a reason to keep it, and every other
   * place a published string is drawn has no such exemption.
   *
   * Asserted over the whole block rather than the one key: any heading may gain the
   * plural, and "GCC's" is banned everywhere on ANSR's own instruction.
   */
  it("spells the plural GCCs everywhere, never GCCS and never GCC's", () => {
    for (const [key, value] of Object.entries(DEFAULT_PUBLIC_COPY)) {
      expect(value, key).not.toMatch(/GCC(?:'s|\u2019s|S)\b/);
    }
  });

  /**
   * **The sweep is scoped to the SNAPSHOT's own keys, and it used to be the whole object
   * by accident.** It read every published value, which passed only because the shipped
   * `peersNarrowNote` happened to capitalise "Your sub-industry" and the pattern is
   * case-sensitive — so the guard was one reword away from firing on a string it was never
   * about. The rule is that a snapshot LABEL may not name the sub-industry, because three
   * of the four cells are measured over the industry; `peersNarrowNote` names the visitor's
   * sub-industry correctly, that being the scope which shortened their peer set.
   */
  it("keeps the snapshot's opening label out of the published copy", () => {
    const keys = Object.keys(DEFAULT_PUBLIC_COPY);
    expect(keys).not.toContain("snapshotComparableLabel");
    for (const [key, value] of Object.entries(DEFAULT_PUBLIC_COPY)) {
      if (!key.startsWith("snapshot")) continue;
      expect(value, key).not.toMatch(/your sub-industry/i);
    }
  });
});

/**
 * The template contract: every key in `COPY_TEMPLATES` is a real template field, its
 * shipped default satisfies its own slots, and deleting a slot is REFUSED.
 *
 * The refine is the whole reason templates are safe to hand an admin, so it is pinned
 * per key rather than once — a table this small is exactly where one entry silently
 * losing its guard would go unnoticed.
 */
describe("copy templates keep their placeholders", () => {
  it("ships a default that satisfies every declared slot", () => {
    for (const [key, config] of Object.entries(COPY_TEMPLATES)) {
      const shipped = DEFAULT_PUBLIC_COPY[key as keyof PublicCopy];
      for (const slot of config.slots) {
        expect(shipped, key).toContain(COPY_PLACEHOLDERS[slot]);
      }
      expect(shipped.length, key).toBeLessThanOrEqual(config.filledMax);
      expect(isCopyTemplate(key)).toBe(true);
      expect(copyFieldMax(key as keyof PublicCopy)).toBe(config.filledMax);
    }
  });

  it("refuses a template whose slot has been deleted", () => {
    for (const [key, config] of Object.entries(COPY_TEMPLATES)) {
      let stripped = DEFAULT_PUBLIC_COPY[key as keyof PublicCopy];
      for (const slot of config.slots) {
        stripped = stripped.split(COPY_PLACEHOLDERS[slot]).join("");
      }
      const result = publicCopySchema.safeParse({
        ...DEFAULT_PUBLIC_COPY,
        [key]: stripped,
      });
      expect(result.success, key).toBe(false);
    }
  });

  it("fills every slot and leaves an unsupplied one visible", () => {
    expect(
      fillTemplate(DEFAULT_PUBLIC_COPY.snapshotHeading, { industry: "Retail" }),
    ).toBe("Snapshot of Retail GCCs in India");
    // A slot with nothing supplied stays as typed, so a caller that forgets one shows
    // a visible `{industry}` rather than an empty gap reading as intended copy.
    expect(fillTemplate(DEFAULT_PUBLIC_COPY.snapshotHeading, {})).toContain(
      COPY_PLACEHOLDERS.industry,
    );
  });

  /**
   * The cap is measured on the FILLED string, so a template that validates must still
   * fit once the widest real industry is substituted. 41 characters is the taxonomy's
   * longest name ("Architecture, Engineering, & Construction").
   */
  it("holds the filled cap against the taxonomy's longest industry", async () => {
    const dataset = await getDataset();
    const longest = [...dataset.taxonomy.industries].sort(
      (a, b) => b.length - a.length,
    )[0];

    for (const [key, config] of Object.entries(COPY_TEMPLATES)) {
      // Widened because each entry's `slots` is a tuple of its OWN literals, so
      // `includes` narrows the argument to `never` for the entries that lack it.
      const slots: readonly string[] = config.slots;
      if (!slots.includes("industry")) continue;
      const filled = fillTemplate(DEFAULT_PUBLIC_COPY[key as keyof PublicCopy], {
        industry: longest,
      });
      expect(filled.length, `${key} with "${longest}"`).toBeLessThanOrEqual(
        config.filledMax,
      );
    }
  });
});

/**
 * The derived shapes read their values from the keys they claim to.
 *
 * These are the three places a mapping could be wrong in a way an equality check
 * against the shipped wording would miss — `figuresHeadings` translates a `MetricFunction`
 * into a `figures*` field name, and the two section pairs both read `velocityHeading`.
 */
describe("the derived shapes read the keys they name", () => {
  it("maps every function area onto its own figure-row heading", () => {
    const headings = figuresHeadings(MARKED);
    expect(headings.tech).toBe("<<figuresTech>>");
    expect(headings.operations).toBe("<<figuresOperations>>");
    expect(headings.hr).toBe("<<figuresHr>>");
    expect(headings.finance).toBe("<<figuresFinance>>");
    // Every area the screen can render has a heading, and no area shares one with
    // another — a transposed pair would put the wrong tab's subject on a tab.
    const values = METRIC_FUNCTIONS.map((area) => headings[area]);
    expect(new Set(values).size).toBe(METRIC_FUNCTIONS.length);
  });

  it("gives both composed tabs the same velocity heading, from one key", () => {
    expect(hrSections(MARKED).velocity).toBe("<<velocityHeading>>");
    expect(opsSections(MARKED).velocity).toBe("<<velocityHeading>>");
    expect(hrSections(MARKED).analysis).toBe("<<hrAnalysisHeading>>");
    expect(opsSections(MARKED).supporting).toBe("<<opsSupportingHeading>>");
  });

  it("reads the snapshot's three labels from their own keys", () => {
    expect(snapshotLabels(MARKED)).toEqual({
      headcount: "<<snapshotHeadcountLabel>>",
      cities: "<<snapshotCitiesLabel>>",
      leadingCity: "<<snapshotLeadingCityLabel>>",
    });
  });
});

/**
 * `signals` takes its labels rather than reading a context, and this is the property
 * that keeps it a pure function the suite can run 24 times with no React tree.
 */
describe("the snapshot's labels are an argument", () => {
  const input = (industry: string): PeerViewInput => ({
    industry,
    revenueBand: "$1 Bn - $5 Bn",
    hqCountry: "United States",
    gccStatus: "evaluating",
  });

  it("uses the labels it is handed for three of the four cells", async () => {
    const dataset = await getDataset();
    const view = buildPeerView(dataset, input("BFSI"));
    const labels = snapshotLabels(MARKED);
    const cells = signals(view, labels);

    expect(cells).toHaveLength(4);
    expect(cells[1]!.label).toBe(labels.headcount);
    expect(cells[2]!.label).toBe(labels.cities);
    expect(cells[3]!.label).toBe(labels.leadingCity);
  });

  it("falls back to the shipped wording when a caller states nothing", async () => {
    const dataset = await getDataset();
    const view = buildPeerView(dataset, input("BFSI"));
    const cells = signals(view);

    expect(cells[1]!.label).toBe(DEFAULT_PUBLIC_COPY.snapshotHeadcountLabel);
    expect(cells[2]!.label).toBe(DEFAULT_PUBLIC_COPY.snapshotCitiesLabel);
    expect(cells[3]!.label).toBe(DEFAULT_PUBLIC_COPY.snapshotLeadingCityLabel);
  });

  /**
   * The opening cell keeps its label in code, and this is the assertion that says why
   * rather than leaving a gap somebody closes by adding a field.
   *
   * It is COMPOSED over the visitor's own scope, so a flat schema string could hold
   * only one of its two branches — and the branch it dropped would be the one most
   * visitors see, since most leave sub-industry blank. A fourth `snapshotShareLabel`
   * key existed briefly and was removed rather than left unread: an editable field
   * nothing draws is a change an admin makes and cannot see.
   */
  it("composes the opening label from the visitor's scope, and states no share", async () => {
    const dataset = await getDataset();

    for (const industry of dataset.taxonomy.industries) {
      const view = buildPeerView(dataset, input(industry));
      const labels = signals(view).map((cell) => cell.label);

      expect(labels[0], industry).toMatch(
        /^companies in this (industry|sub-industry) have a GCC in India$/,
      );
      // The wording this cell used when it stated a share. `0-screen1.spec.ts`
      // asserts its absence from the rendered strip; this asserts no industry can
      // produce it.
      expect(labels).not.toContain("Of every GCC in India");
    }
  });

  it("has no copy key that nothing renders", () => {
    // The rule the removed fourth label broke. Every key in the schema is read by
    // one of the derived shapes above or by a component asserted in the browser
    // suite; the count is the cheap guard that a new key arrived with a consumer.
    // 68 after the copy audit moved forty strings out of code: form field labels,
    // control placeholders and hints, two error strings, the answer pills shared by
    // both screens, the function panel's name, four city-map toggle labels, the
    // snapshot's missing-figure text, and the templates. 69 with the containment
    // chart's basis line, which moved out of code one pass after it was written in
    // it. 70 with the peer grid's sub-industry note, the one branch of
    // `shortfallLine` that states no count and so may be edited.
    //
    // **67 once the company name left the form.** Three keys went with the control:
    // `askCompanyLabel`, which labelled it; `pillCompany`, which echoed it on both
    // result screens; and `peersTitleFallback`, which existed only because the
    // heading had a no-name branch. That is this test's own rule applied to a
    // removal rather than an addition — a key whose consumer is gone is a change an
    // admin can make and never see.
    //
    // **68 with the broadened-set note**, `peersBroadenedNote` — `broadenedLine`'s
    // wording made editable, the mirror of the sub-industry note: a derived quantity
    // (here the axis) injected through a slot, the frame around it left to an admin.
    //
    // **69 with `pillSubIndustry`**, the answer pills' fourth label. It is a CONDITIONAL
    // pill, which is the shape `pillCompany` had — and it is not that key returning: a
    // company name was read by nothing, where a sub-industry is the primary ordering
    // signal behind the peer set, so the row was echoing every answer except the one that
    // most changed the screen. Its consumer is `answerFacts` in `screen-header.tsx`, drawn
    // on both result screens.
    //
    // **74 with the dropdowns' own five strings** — `askGroupCommon`,
    // `askGroupIndustriesAll`, `askGroupCountriesAll`, `askGroupRevenue` and
    // `askSubIndustryPlural`, the last visitor-facing strings on the form that an admin
    // could not touch. Four are tier headings and one is the word the industry popup uses
    // for its second level, in three places at once. All five are drawn by
    // `input-panel.tsx` and `select-field.tsx`.
    //
    // **`askGroupRevenue` IS THE ONE DELIBERATE EXCEPTION TO THIS TEST'S OWN RULE, and it
    // is worth knowing why rather than being told it passes.** A popup with a single group
    // draws no tier heading — one label above one flat list is a redundant heading — so the
    // revenue list's group name reaches the component and is not painted. It is a key
    // anyway so the four group names are one decision in one place, and it becomes visible
    // the moment that list gains a second tier. That is the difference from
    // `snapshotShareLabel`, which was deleted under this rule: that string had no consumer
    // at all, where this one has a consumer whose current contents happen not to need it.
    expect(Object.keys(DEFAULT_PUBLIC_COPY)).toHaveLength(82);
  });
});

/**
 * The heading over the primary evidence, which used to compose over the visitor's own
 * answer and no longer composes over anything.
 *
 * **The two-branch tests are deleted rather than adapted, because there is one branch.**
 * What replaces them is the property that made the removal safe: whatever a visitor
 * answered, and whatever an admin publishes, the heading names no company and presumes no
 * India centre.
 */
describe("the comparable-companies heading", () => {
  const base: PeerViewInput = {
    industry: "BFSI",
    revenueBand: "$1 Bn - $5 Bn",
    hqCountry: "United States",
    gccStatus: "evaluating",
  };

  it("reads the published key and interpolates nothing", async () => {
    const dataset = await getDataset();
    const view = buildPeerView(dataset, base);
    expect(peersTitle(view)).toBe("GCC details of your closest peers");
    expect(peersTitle(view)).toBe(DEFAULT_PUBLIC_COPY.peersTitle);
  });

  /**
   * **The heading is the same string for every visitor, and that is the assertion.** It
   * interpolated a company name for one pass; the field is gone, so a heading that varied
   * with the answers would mean something had started reading an input again.
   */
  it("says the same thing whatever was answered", async () => {
    const dataset = await getDataset();
    const industries = ["BFSI", "Retail", "Software & Internet"];
    for (const industry of industries) {
      const view = buildPeerView(dataset, { ...base, industry });
      expect(peersTitle(view), industry).toBe(DEFAULT_PUBLIC_COPY.peersTitle);
    }
  });

  /**
   * It must not presume the visitor already runs an India centre. "Closest to yours" has
   * to refer to something, and the only candidate on the page is a GCC — which most
   * readers of this screen do not have, and `gccStatus` is a constant the form never asks
   * for, so the tool cannot know either way.
   */
  it("claims nothing about what the visitor already runs", async () => {
    const dataset = await getDataset();
    const view = buildPeerView(dataset, base);
    expect(peersTitle(view)).not.toMatch(/closest to yours/);
  });
});

/**
 * The shipped block is a legal one.
 *
 * Every cap in `publicCopySchema` is a render limit measured on the real layout, so a
 * shipped string that overran one would be a heading that wraps where the composition
 * assumes it cannot. Parsing the default is the cheapest way to hold that: it also
 * proves the default satisfies its own schema, which `siteContentSchema` relies on when
 * it uses `DEFAULT_PUBLIC_COPY` as a `.default()`.
 */
describe("the shipped copy block", () => {
  it("parses against its own schema", () => {
    expect(publicCopySchema.parse(DEFAULT_PUBLIC_COPY)).toEqual(DEFAULT_PUBLIC_COPY);
  });
});
