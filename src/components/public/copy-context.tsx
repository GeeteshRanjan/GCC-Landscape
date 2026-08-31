"use client";

import { createContext, useContext } from "react";

import { DEFAULT_PUBLIC_COPY, type PublicCopy } from "@/data/schema";

/**
 * The published static strings, reachable from anywhere on the public surface.
 *
 * **A context rather than props, and the depth is the whole reason.** Thirty
 * headings and labels are spread over four levels of component — `tool.tsx` holds the
 * phase, `peer-view.tsx` and `function-view.tsx` compose the screens, `evidence.tsx`
 * and the three composed tabs draw the sections, and `PeerCardBody` draws one card's
 * three labels. Threading a `copy` prop through that would put a parameter on eleven
 * components which do nothing with it but pass it on, and the first one that forgot
 * would be a compile error in a file that has no interest in copy at all. The strings
 * are ambient to the surface, so they are supplied the way ambient things are.
 *
 * **The default value is `DEFAULT_PUBLIC_COPY`, which is what makes the provider
 * optional rather than load-bearing.** Every component here renders correctly with no
 * provider above it — it renders the shipped wording — so a component tested or
 * previewed in isolation is not a runtime crash, and a fifth phase added to
 * `tool.tsx` cannot silently render empty headings. The provider's only job is to
 * substitute the PUBLISHED strings for the shipped ones, and the two are identical
 * until an admin edits something.
 *
 * **It carries the copy and nothing else.** `logos` is threaded as a prop instead,
 * because it has exactly one consumer — a context for a value read in one place is
 * indirection bought for nothing, and the strip's list is data the entry point owns
 * rather than something the whole surface reads.
 *
 * The dataset itself still never crosses: what a provider receives is
 * `dataset.siteContent.copy`, which is thirty strings.
 */
const PublicCopyContext = createContext<PublicCopy>(DEFAULT_PUBLIC_COPY);

export function PublicCopyProvider({
  copy,
  children,
}: {
  copy: PublicCopy;
  children: React.ReactNode;
}) {
  return (
    <PublicCopyContext.Provider value={copy}>{children}</PublicCopyContext.Provider>
  );
}

/**
 * The published strings for the surface this component is rendering inside.
 *
 * Returns `DEFAULT_PUBLIC_COPY` with no provider above it, so the return type has no
 * null in it and no caller has a fallback branch to get wrong. See the note on the
 * context.
 */
export function usePublicCopy(): PublicCopy {
  return useContext(PublicCopyContext);
}
