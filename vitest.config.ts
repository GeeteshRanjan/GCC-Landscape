import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Node environment throughout. Everything under test here is server-side or
 * pure: hashing, session signing, TOTP, the rate limiter, the diff, the schema,
 * the cleaning primitives and the GitHub store against a stubbed `fetch`.
 *
 * There is deliberately no jsdom. Rendering React components under a simulated
 * DOM would test the simulation as much as the component, and the things that
 * actually break in this admin — draft autosave, restore after a reload, the
 * stale-baseline conflict — depend on real localStorage and a real navigation.
 * Those belong in tests/browser/, driven by a real browser, not here.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    /**
     * `server-only` throws from its default entry point and resolves to an empty
     * module under the `react-server` condition, which is what Next uses for a
     * server component. Asking for that condition is how these tests import
     * `session.ts` and `dataset.ts` at all.
     *
     * This is the real condition the package publishes, not a stub — so the
     * marker keeps doing its job in the app bundle. It is also the same trap
     * that breaks `tsx`, which is why scripts import from `constants.ts`.
     */
    conditions: ["react-server", "node", "import", "default"],
  },
  // Vitest runs in Vite's SSR pipeline, and SSR resolution has its own condition
  // list. Setting only `resolve.conditions` leaves `server-only` to be
  // externalized and loaded by Node, which reads `main` and throws.
  ssr: {
    resolve: {
      conditions: ["react-server", "node", "import", "default"],
      externalConditions: ["react-server", "node", "import", "default"],
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Each file gets a fresh module registry. The rate limiter holds process
    // state on purpose, so leaking it between files would make the order of
    // tests part of the result.
    isolate: true,
    restoreMocks: true,
    unstubEnvs: true,
  },
});
