type SingleClerkError = {
  code?: string;
  message?: string;
  longMessage?: string;
};

type FieldError = {
  code: string;
  message: string;
  longMessage?: string;
} | null;

type HookErrors = {
  fields?: Record<string, unknown>;
  global?: Array<{ message?: string; longMessage?: string; code?: string }> | null;
};

function messageOf(err: SingleClerkError | undefined, fallback: string): string {
  return err?.longMessage ?? err?.message ?? fallback;
}

export function singleErrorMessage(
  error: SingleClerkError | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;
  return messageOf(error, fallback);
}

export function mapSingleErrorToFields(error: SingleClerkError | null | undefined): {
  email?: string;
  password?: string;
  code?: string;
  form?: string;
} {
  if (!error) return {};
  const code = (error.code ?? "").toLowerCase();
  const message = messageOf(error, "Something went wrong. Please try again.");
  if (code.includes("email") || code.includes("identifier")) {
    return { email: message };
  }
  if (code.includes("password")) {
    return { password: message };
  }
  if (code.includes("code") || code.includes("otp") || code.includes("verification")) {
    return { code: message };
  }
  return { form: message };
}

export function mapHookErrorsToFields(hookErrors: unknown): {
  email?: string;
  password?: string;
  code?: string;
  form?: string;
} {
  if (!hookErrors || typeof hookErrors !== "object") return {};
  const out: { email?: string; password?: string; code?: string; form?: string } = {};
  const raw = hookErrors as HookErrors;
  const f = (raw.fields ?? {}) as Record<string, FieldError | undefined>;
  const pick = (v: FieldError | undefined) =>
    v && typeof v === "object" ? (v.longMessage ?? v.message) : undefined;
  const email =
    pick(f.emailAddress as FieldError | undefined) ??
    pick(f.identifier as FieldError | undefined);
  const password = pick(f.password as FieldError | undefined);
  const code = pick(f.code as FieldError | undefined);
  if (email) out.email = email;
  if (password) out.password = password;
  if (code) out.code = code;
  const [firstGlobal] = (raw.global ?? []) as Array<{
    message?: string;
    longMessage?: string;
  }>;
  if (!out.email && !out.password && !out.code && firstGlobal) {
    out.form = firstGlobal.longMessage ?? firstGlobal.message ?? "Something went wrong.";
  }
  return out;
}

export function isRateLimitCode(code: string | undefined): boolean {
  const c = (code ?? "").toLowerCase();
  return c.includes("rate") || c.includes("too_many") || c.includes("throttle");
}

export const clerkErrorMessages = {
  rateLimited: "Too many attempts. Wait a minute, then try again.",
  network: "You're offline. Check your connection and try again.",
};
