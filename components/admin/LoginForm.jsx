"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { handleLogin } from "@/app/admin/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await handleLogin(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      // No error = success; use full navigation so cookie is sent reliably
      window.location.href = "/admin";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel>
            <Label htmlFor="admin-email">Email</Label>
          </FieldLabel>
          <Input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@orion.com"
            required
            disabled={false}
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
        </Field>
        <Field>
          <FieldLabel>
            <Label htmlFor="admin-password">Password</Label>
          </FieldLabel>
          <Input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            disabled={false}
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
        </Field>
      </FieldGroup>

      {error && (
        <div
          id="login-error"
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
