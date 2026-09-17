import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(254, "Email is too long");

export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const codeSchema = z
  .string()
  .trim()
  .min(1, "Verification code is required")
  .regex(/^[0-9]{4,8}$/, "Enter the 6-digit code we sent you");

export const signInSchema = z.object({
  emailAddress: emailSchema,
  password: z.string().min(1, "Password is required").max(128, "Password is too long"),
});

export const signUpSchema = z.object({
  emailAddress: emailSchema,
  password: passwordSchema,
});

export const verifyCodeSchema = z.object({
  code: codeSchema,
});

export type SignInForm = z.infer<typeof signInSchema>;
export type SignUpForm = z.infer<typeof signUpSchema>;
export type VerifyCodeForm = z.infer<typeof verifyCodeSchema>;
