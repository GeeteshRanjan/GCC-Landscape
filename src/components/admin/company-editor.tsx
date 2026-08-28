"use client";

import { useMemo, useState } from "react";

import {
  CheckboxField,
  CheckboxGroupField,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import { previewSlug, useDraft } from "@/components/admin/draft-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fteDisplay, hasTier2Presence } from "@/data/derive";
import { companySchema, type Company } from "@/data/schema";

/**
 * Full row editor. Every stored field is here and nothing else is — location
 * count, tier-2 presence and the FTE display string are shown as computed
 * readouts, never as inputs, because storing them is how two fields start
 * disagreeing.
 *
 * Validation runs on submit, against the same zod schema the publish endpoint
 * uses. That is the point: a row that passes here cannot fail the publish gate
 * for a shape reason, and the messages the admin reads are the schema's own.
 */

type Draft = {
  name: string;
  hqCountry: string;
  industry: string;
  revenueBand: string;
  establishedYear: string;
  cities: string[];
  fteMin: string;
  fteMax: string;
  fortuneGlobal500: boolean;
  forbesGlobal2000: boolean;
  /** Business type ids. Scoped to the company's industry; see the control below. */
  businessTypes: string[];
};

type Errors = Partial<Record<keyof Draft | "form", string>>;

const EMPTY: Draft = {
  name: "",
  hqCountry: "",
  industry: "",
  revenueBand: "",
  establishedYear: "",
  cities: [],
  fteMin: "",
  fteMax: "",
  fortuneGlobal500: false,
  forbesGlobal2000: false,
  businessTypes: [],
};

function toDraft(company: Company): Draft {
  return {
    name: company.name,
    hqCountry: company.hqCountry,
    industry: company.industry,
    revenueBand: company.revenueBand,
    establishedYear: String(company.establishedYear),
    cities: [...company.cities],
    fteMin: String(company.fte.min),
    fteMax: String(company.fte.max),
    fortuneGlobal500: company.fortuneGlobal500,
    forbesGlobal2000: company.forbesGlobal2000,
    businessTypes: [...company.businessTypes],
  };
}

export function CompanyEditor({
  company,
  open,
  onClose,
}: {
  /** null means a new company. */
  company: Company | null;
  open: boolean;
  onClose: () => void;
}) {
  const { draft: dataset, addCompany, updateCompany } = useDraft();
  const { taxonomy } = dataset;

  const [form, setForm] = useState<Draft>(() =>
    company ? toDraft(company) : EMPTY,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [cityFilter, setCityFilter] = useState("");
  // Remounting on a different row is what resets the form; keyed by the caller.
  const isNew = company === null;

  const visibleCities = useMemo(() => {
    const needle = cityFilter.trim().toLowerCase();
    if (!needle) return taxonomy.cities;
    return taxonomy.cities.filter((city) =>
      city.toLowerCase().includes(needle),
    );
  }, [cityFilter, taxonomy.cities]);

  /**
   * Only business types belonging to the currently selected industry.
   *
   * The schema rejects a company carrying a type from another industry, so offering
   * the full catalogue here would let an admin build a row the publish gate then
   * refuses — with an error naming a constraint the form never mentioned. Filtering
   * the options is how the rule gets explained: the wrong ones are simply not there.
   */
  const availableBusinessTypes = useMemo(
    () => dataset.businessTypes.filter((type) => type.industry === form.industry),
    [dataset.businessTypes, form.industry],
  );

  /**
   * Changing industry drops any selection that no longer belongs.
   *
   * Same reason as the public form's dependent select, with a sharper edge here:
   * left in place it is a referential-integrity failure at publish rather than a
   * rejected request, and the admin would have to work out which of 1834 rows was
   * at fault from a zod path.
   */
  function setIndustry(industry: string) {
    setForm((current) => ({
      ...current,
      industry,
      businessTypes: current.businessTypes.filter((id) =>
        dataset.businessTypes.some(
          (type) => type.id === id && type.industry === industry,
        ),
      ),
    }));
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: Errors = {};
    const year = Number(form.establishedYear);
    const min = Number(form.fteMin);
    const max = Number(form.fteMax);

    if (!form.name.trim()) next.name = "A company name is required.";
    if (!form.industry) next.industry = "Choose an industry.";
    if (!form.revenueBand) next.revenueBand = "Choose a revenue band.";
    if (!form.hqCountry) next.hqCountry = "Choose an HQ country.";
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      next.establishedYear = "Enter a four-digit year between 1900 and 2100.";
    }
    if (form.cities.length === 0) {
      next.cities = "Select at least one India city.";
    }
    if (!Number.isInteger(min) || min < 0 || form.fteMin.trim() === "") {
      next.fteMin = "Enter a whole number, 0 or more.";
    }
    if (!Number.isInteger(max) || max < 0 || form.fteMax.trim() === "") {
      next.fteMax = "Enter a whole number, 0 or more.";
    }
    if (!next.fteMin && !next.fteMax && max < min) {
      next.fteMax = "The upper end cannot be below the lower end.";
    }

    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }

    const candidate = {
      id: company?.id ?? (previewSlug(form.name) || "company"),
      name: form.name.trim(),
      hqCountry: form.hqCountry,
      industry: form.industry,
      revenueBand: form.revenueBand,
      establishedYear: year,
      cities: form.cities,
      fte: { min, max },
      fortuneGlobal500: form.fortuneGlobal500,
      forbesGlobal2000: form.forbesGlobal2000,
      businessTypes: form.businessTypes,
    };

    // The same schema the publish gate runs. Anything it catches that the
    // field-level checks above missed is reported rather than swallowed.
    const parsed = companySchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors({
        form: parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`)
          .join(" · "),
      });
      return;
    }

    if (company) {
      const { id: _id, ...patch } = parsed.data;
      updateCompany(company.id, patch);
    } else {
      const { id: _id, ...withoutId } = parsed.data;
      addCompany(withoutId);
    }
    onClose();
  }

  const derivedFte =
    form.fteMin.trim() && form.fteMax.trim() && Number(form.fteMax) >= Number(form.fteMin)
      ? fteDisplay({ min: Number(form.fteMin), max: Number(form.fteMax) })
      : "—";

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add a company" : form.name || "Edit company"}</DialogTitle>
          <DialogDescription>
            {isNew
              ? "Everything except the two index flags is required."
              : `Row id ${company?.id}. The id never changes, so peer links stay stable.`}
          </DialogDescription>
        </DialogHeader>

        {/* Single column throughout: two columns disrupt reading order and make
            field sequence ambiguous. The FTE pair is the one exception, because
            the two halves are one value. */}
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <TextField
            label="Company name"
            value={form.name}
            onChange={(value) => set("name", value)}
            error={errors.name}
            hint={
              isNew && previewSlug(form.name)
                ? `Row id will be "${previewSlug(form.name)}".`
                : undefined
            }
          />

          <SelectField
            label="Industry"
            value={form.industry}
            options={taxonomy.industries}
            onChange={setIndustry}
            error={errors.industry}
            hint="The primary peer match key."
          />

          {/*
            Lines of business. Checkboxes rather than a multi-select listbox: there
            are at most 28 in any one industry, every option needs its own label for
            a screen reader, and a native multiple-select is close to unusable with a
            keyboard.
          */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-[length:var(--ansr-text-sm)] font-[var(--ansr-weight-medium)] text-[var(--ansr-text-primary)]">
              Lines of business
            </legend>
            <p className="text-[length:var(--ansr-text-xs)] text-[var(--ansr-text-muted)]">
              {form.industry
                ? "Drives peer similarity. Most companies have one; pick two only for a genuinely dual business."
                : "Choose an industry first."}
            </p>
            {form.industry && availableBusinessTypes.length === 0 ? (
              <p className="text-[length:var(--ansr-text-xs)] text-[var(--ansr-text-muted)]">
                No business types are defined for {form.industry} yet. This company
                will match on industry and revenue band only.
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {availableBusinessTypes.map((type) => {
                const checked = form.businessTypes.includes(type.id);
                return (
                  <label
                    key={type.id}
                    className="flex min-h-[var(--ansr-space-8)] items-center gap-2 text-[length:var(--ansr-text-sm)] text-[var(--ansr-text-primary)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          businessTypes: checked
                            ? current.businessTypes.filter((id) => id !== type.id)
                            : [...current.businessTypes, type.id],
                        }))
                      }
                      className="size-4 shrink-0 accent-[var(--ansr-accent)]"
                    />
                    <span>{type.name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <SelectField
            label="Revenue band"
            value={form.revenueBand}
            options={taxonomy.revenueBands}
            onChange={(value) => set("revenueBand", value)}
            error={errors.revenueBand}
            hint="Bands only. There is no revenue figure anywhere in this data."
          />

          <SelectField
            label="HQ country"
            value={form.hqCountry}
            options={taxonomy.hqCountries}
            onChange={(value) => set("hqCountry", value)}
            error={errors.hqCountry}
            hint="A sort preference for peers, never a filter."
          />

          <TextField
            label="GCC established"
            value={form.establishedYear}
            onChange={(value) => set("establishedYear", value)}
            error={errors.establishedYear}
            inputMode="numeric"
            placeholder="2019"
            widthClass="w-28"
          />

          <CheckboxGroupField
            legend="India cities"
            hint="Drives the heatmap and the derived location count."
            error={errors.cities}
            options={visibleCities}
            selected={form.cities}
            filterLabel="Find a city"
            filter={cityFilter}
            onFilterChange={setCityFilter}
            emptyMessage="No city matches that. Add it in Taxonomy first."
            onToggle={(city, checked) =>
              set(
                "cities",
                checked
                  ? [...form.cities, city]
                  : form.cities.filter((c) => c !== city),
              )
            }
          />

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-text">FTE range</legend>
            <p className="text-xs text-text-muted">
              The only headcount field. Stored as a closed pair and always shown
              as a band, never as a point figure.
            </p>
            <div className="flex items-start gap-3">
              <TextField
                label="Lower"
                value={form.fteMin}
                onChange={(value) => set("fteMin", value)}
                error={errors.fteMin}
                inputMode="numeric"
                widthClass="w-24"
              />
              <TextField
                label="Upper"
                value={form.fteMax}
                onChange={(value) => set("fteMax", value)}
                error={errors.fteMax}
                inputMode="numeric"
                widthClass="w-24"
              />
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <CheckboxField
              label="Fortune Global 500"
              checked={form.fortuneGlobal500}
              onChange={(checked) => set("fortuneGlobal500", checked)}
            />
            <CheckboxField
              label="Forbes Global 2000"
              checked={form.forbesGlobal2000}
              onChange={(checked) => set("forbesGlobal2000", checked)}
            />
          </div>

          {/* Read-only readouts of what the stored fields derive, so the effect
              of an edit is visible without saving it. */}
          <dl className="grid grid-cols-3 gap-3 border-t border-border-subtle pt-4 text-sm">
            <div>
              <dt className="text-xs text-text-muted">Locations</dt>
              <dd className="text-text">{form.cities.length || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Tier-2 presence</dt>
              <dd className="text-text">
                {form.cities.length
                  ? hasTier2Presence({ cities: form.cities })
                    ? "Yes"
                    : "No"
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Shown as</dt>
              <dd className="text-text">{derivedFte}</dd>
            </div>
          </dl>

          {errors.form ? (
            <p role="alert" className="ansr-field-error text-sm">
              {errors.form}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isNew ? "Add to draft" : "Save to draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
