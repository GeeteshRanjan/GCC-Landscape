"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * One field, one button. Nothing here names the product, the client or what is
 * behind the door — /admin is reached by typing the URL, and a page that
 * advertises itself is a page that gets found.
 *
 * The error text is deliberately the same for a wrong password, a malformed
 * request and a misconfigured environment. The server logs the difference.
 */
export function LoginForm({ totpRequired }: { totpRequired: boolean }) {
  const router = useRouter();
  const passwordId = useId();
  const codeId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });

      if (response.ok) {
        // Replace rather than push: the login form should not be a back-button
        // destination once the session exists.
        router.replace("/admin");
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        lockedOut?: boolean;
        remainingAttempts?: number;
      };
      setLockedOut(Boolean(body.lockedOut));
      const remaining =
        typeof body.remainingAttempts === "number" && body.remainingAttempts > 0
          ? ` ${body.remainingAttempts} attempt${body.remainingAttempts === 1 ? "" : "s"} left before a temporary lockout.`
          : "";
      setError(`${body.error ?? "That password is not correct."}${remaining}`);
      setPassword("");
      setCode("");
      inputRef.current?.focus();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>Password</Label>
        <Input
          id={passwordId}
          ref={inputRef}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={lockedOut}
          autoFocus
        />
      </div>

      {totpRequired ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={codeId}>Authenticator code</Label>
          <Input
            id={codeId}
            // `text` with a numeric inputMode, not `type="number"`: a leading
            // zero matters here and a spinner does not belong on a six-digit code.
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            disabled={lockedOut}
            className="w-32 font-mono tracking-caps"
          />
        </div>
      ) : null}

      {/* Rendered only on failure, as an alert, so it is announced rather than
          silently appearing beneath the field. */}
      {error ? (
        <p id={errorId} role="alert" className="ansr-field-error text-sm">
          {error}
        </p>
      ) : null}

      {/* Enabled until the request starts, per the forms rule: a submit that
          disables on invalid input hides why it will not work. */}
      <Button type="submit" disabled={pending || lockedOut} className="w-full">
        {pending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}
