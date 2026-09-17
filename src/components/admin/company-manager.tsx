"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { CompanyEditor } from "@/components/admin/company-editor";
import { ADMIN_CONTROL } from "@/components/admin/controls";
import { useDraft } from "@/components/admin/draft-provider";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDeepLinkOpen,
  useDeepLinkQuery,
} from "@/components/admin/search-box";
import { fteDisplay } from "@/data/derive";
import { matchesTokens, searchTokens, searchableText } from "@/data/search";
import type { Company } from "@/data/schema";

/**
 * The company table. 1834 rows held in memory, filtered and paged for display.
 *
 * No virtualization library. Filtering runs over the array and only a page of
 * rows is ever in the DOM, which is both less code and less to go wrong than a
 * windowed list — and paging gives a stable, keyboard-reachable structure that
 * a virtualized scroller does not.
 */

const PAGE_SIZE = 25;

export function CompanyManager() {
  const { draft, deleteCompany } = useDraft();
  const searchId = useId();
  const industryId = useId();
  const resultsId = useId();

  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  // Normalised once per keystroke, then tested against 1,834 prebuilt haystacks.
  const tokens = useMemo(() => searchTokens(query), [query]);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ company: Company | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Company | null>(null);

  // Arriving from the universal search: narrow the table to the row, and open its
  // editor. Declared after the state it sets, so the closure cannot run into a TDZ.
  useDeepLinkQuery(setQuery);
  useDeepLinkOpen((id) => {
    const company = draft.companies.find((row) => row.id === id);
    if (company) setEditing({ company });
  });

  /** Id -> name, so the table and the search show labels rather than slugs. */
  const typeNames = useMemo(
    () => new Map(draft.businessTypes.map((type) => [type.id, type.name])),
    [draft.businessTypes],
  );

  /**
   * One searchable string per company, built ONCE per draft change.
   *
   * 1,834 rows rebuilt on every keystroke is work with a visible cost on a slow
   * machine, and none of it changes between keystrokes — the same reason the public
   * dropdown memoises its own haystacks rather than normalising per row per
   * character.
   *
   * What is IN it is the decision worth reading. The company name, its cities and its
   * HQ country are the three things an admin types. Business type goes in by NAME
   * rather than id, so `apparel` pulls up every apparel company and a tagging pass can
   * be spot-checked in bulk rather than a row at a time. The literal words `not set`
   * go in for an untagged company, because untagged is a real state — the company
   * matches on industry and revenue band alone — and has to be findable as one. The
   * two index flags go in as their own names only when set, so `fortune` is a query.
   * Industry is deliberately absent: it has its own select beside the field, and
   * putting it here would make that control look broken by matching rows it excluded.
   */
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of draft.companies) {
      map.set(
        company.id,
        searchableText(
          company.name,
          company.cities,
          company.hqCountry,
          company.revenueBand,
          company.businessTypes.length === 0
            ? "not set"
            : company.businessTypes.map((id) => typeNames.get(id) ?? id),
          company.fortuneGlobal500 && "fortune global 500",
          company.forbesGlobal2000 && "forbes global 2000",
        ),
      );
    }
    return map;
  }, [draft.companies, typeNames]);

  const filtered = useMemo(() => {
    return draft.companies.filter((company) => {
      if (industry && company.industry !== industry) return false;
      return matchesTokens(tokens, haystacks.get(company.id) ?? "");
    });
  }, [draft.companies, tokens, industry, haystacks]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // A filter change can strand the viewer past the end of the new result set.
  useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);

  const start = page * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const filtering = tokens.length > 0 || Boolean(industry);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Companies"
        lead={`${draft.companies.length.toLocaleString()} rows in the draft.`}
      >
        <Button onClick={() => setEditing({ company: null })}>Add a company</Button>
      </AdminPageHeader>

      {/* `rounded-md`, matching `AdminSearch`'s own row and every section card. This was
          the last square box in the admin, which made the one page with a hand-rolled
          filter row look like a different product from the four using the shared one. */}
      <div className="flex flex-wrap items-end gap-4 rounded-md border border-border-subtle bg-surface p-4">
        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
          <Label htmlFor={searchId}>Search</Label>
          <Input
            id={searchId}
            type="search"
            value={query}
            placeholder="Company, city, HQ country, sub-industry"
            aria-describedby={resultsId}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="flex w-64 flex-col gap-1.5">
          <Label htmlFor={industryId}>Industry</Label>
          <select
            id={industryId}
            value={industry}
            onChange={(event) => {
              setIndustry(event.target.value);
              setPage(0);
            }}
            className={ADMIN_CONTROL}
          >
            <option value="">All industries</option>
            {draft.taxonomy.industries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        {filtering ? (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setIndustry("");
              setPage(0);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {/* Polite, and present before its text changes, so repeated result-count
          updates are actually announced. */}
      <p id={resultsId} role="status" className="text-sm text-text-muted">
        {filtered.length === draft.companies.length
          ? `Showing ${rows.length} of ${filtered.length.toLocaleString()}`
          : `${filtered.length.toLocaleString()} match${filtered.length === 1 ? "" : "es"}, showing ${rows.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-surface px-6 py-12 text-center">
          <p className="text-sm text-text">Nothing matches that search.</p>
          <p className="mt-1 text-sm text-text-muted">
            Try a shorter term, or clear the industry filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border-subtle bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Company</TableHead>
                <TableHead scope="col">Industry</TableHead>
                <TableHead scope="col">Sub-industry</TableHead>
                <TableHead scope="col">Revenue band</TableHead>
                <TableHead scope="col">Cities</TableHead>
                <TableHead scope="col">FTE</TableHead>
                <TableHead scope="col">Est.</TableHead>
                <TableHead scope="col">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <span className="font-medium text-text">{company.name}</span>
                    <span className="block text-xs text-text-muted">
                      {company.hqCountry}
                      {company.fortuneGlobal500 ? " · Fortune 500" : ""}
                      {company.forbesGlobal2000 ? " · Forbes 2000" : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-text-muted">{company.industry}</TableCell>
                  {/*
                    Named rather than counted, and untagged called out explicitly.
                    Peer similarity is driven entirely by this column, so an admin
                    checking a row needs to see it without opening the editor — and
                    needs "not set" to look different from a blank cell, because
                    untagged is a real state (the company matches on industry and
                    revenue band only) rather than missing data.
                  */}
                  <TableCell className="text-text-muted">
                    {company.businessTypes.length === 0 ? (
                      <span className="text-xs italic">Not set</span>
                    ) : (
                      company.businessTypes
                        .map(
                          (id) =>
                            typeNames.get(id) ?? `${id} (unknown)`,
                        )
                        .join(" · ")
                    )}
                  </TableCell>
                  <TableCell className="text-text-muted">{company.revenueBand}</TableCell>
                  <TableCell className="text-text-muted">
                    {company.cities.length > 2 ? (
                      <>
                        {company.cities.slice(0, 2).join(", ")}
                        <Badge variant="outline" className="ms-1.5">
                          +{company.cities.length - 2}
                        </Badge>
                      </>
                    ) : (
                      company.cities.join(", ")
                    )}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {fteDisplay(company.fte)}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {company.establishedYear}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing({ company })}
                      >
                        Edit
                        <span className="sr-only"> {company.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ansr-destructive"
                        onClick={() => setConfirmDelete(company)}
                      >
                        Delete
                        <span className="sr-only"> {company.name}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Company pages"
          className="flex items-center justify-between gap-4"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <p className="text-sm text-text-muted">
            Page {page + 1} of {pageCount}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
          >
            Next
          </Button>
        </nav>
      ) : null}

      {editing ? (
        <CompanyEditor
          // Keyed so switching rows resets the form rather than carrying values
          // from the previous one.
          key={editing.company?.id ?? "new"}
          company={editing.company}
          open
          onClose={() => setEditing(null)}
        />
      ) : null}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => (open ? null : setConfirmDelete(null))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {confirmDelete?.name}?</DialogTitle>
            <DialogDescription>
              This only changes your draft. Nothing is removed from the live data
              until you publish, and the diff will show it before you do.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button
              className="ansr-destructive"
              onClick={() => {
                if (confirmDelete) deleteCompany(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Remove from draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
