import { useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import clsx from "clsx";
import AuthBranding from "../../../components/AuthBranding";
import {
  clerkErrorMessages,
  isRateLimitCode,
  mapHookErrorsToFields,
  mapSingleErrorToFields,
} from "../../../lib/clerk-errors";
import { codeSchema, signUpSchema } from "../../../lib/validation";

const SafeAreaView = styled(RNSafeAreaView);
const RESEND_COOLDOWN_SECONDS = 30;

export default function SignUp() {
  const { signUp, errors: hookErrors, fetchStatus } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    code?: string;
    form?: string;
  }>({});

  const isLoading = isSubmitting || fetchStatus === "fetching";

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSignUp = async () => {
    if (isSubmitting) return;

    const parsed = signUpSchema.safeParse({ emailAddress, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.emailAddress?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    if (!signUp) {
      setFieldErrors({ form: clerkErrorMessages.network });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const { error } = await signUp.password({
        emailAddress: parsed.data.emailAddress,
        password: parsed.data.password,
      });
      if (error) {
        const mapped = mapSingleErrorToFields(error);
        if (isRateLimitCode(error.code)) mapped.form = clerkErrorMessages.rateLimited;
        const hookMapped = mapHookErrorsToFields(hookErrors);
        setFieldErrors({
          email: mapped.email ?? hookMapped.email,
          password: mapped.password ?? hookMapped.password,
          form: mapped.form ?? hookMapped.form ?? mapped.code,
        });
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        const mapped = mapSingleErrorToFields(sendError);
        setFieldErrors({
          form: mapped.form ?? mapped.email ?? "Could not send verification code.",
        });
        return;
      }

      setIsVerifying(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setFieldErrors({ form: clerkErrorMessages.network });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (isSubmitting) return;

    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) {
      setFieldErrors({ code: parsed.error.issues[0]?.message ?? "Enter the code." });
      return;
    }

    if (!signUp) {
      setFieldErrors({ code: clerkErrorMessages.network });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const { error } = await signUp.verifications.verifyEmailCode({
        code: parsed.data,
      });
      if (error) {
        const mapped = mapSingleErrorToFields(error);
        setFieldErrors({ code: mapped.code ?? mapped.form ?? "Invalid code." });
        return;
      }

      const finalizeResult = await signUp.finalize();
      if (finalizeResult?.error) {
        setFieldErrors(mapSingleErrorToFields(finalizeResult.error));
        return;
      }

      router.replace("/(tabs)" as never);
    } catch {
      setFieldErrors({ code: clerkErrorMessages.network });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (isResending || cooldown > 0 || !signUp) return;
    setIsResending(true);
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        const mapped = mapSingleErrorToFields(error);
        setFieldErrors((p) => ({
          ...p,
          code: mapped.form ?? "Could not resend code.",
        }));
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setFieldErrors((p) => ({ ...p, code: undefined }));
    } catch {
      setFieldErrors((p) => ({ ...p, code: clerkErrorMessages.network }));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView className="auth-safe-area">
      <View className="auth-screen">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="auth-scroll"
            contentContainerClassName="auth-content"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthBranding
              title={isVerifying ? "Check your email" : "Create account"}
              subtitle={
                isVerifying
                  ? `We sent a verification code to ${emailAddress}`
                  : "Join Recurly to track every subscription in one place"
              }
            />

            <View className="auth-card">
              {isVerifying ? (
                <View className="auth-form">
                  <View className="auth-field">
                    <Text className="auth-label">Verification code</Text>
                    <TextInput
                      className={clsx("auth-input", fieldErrors.code && "auth-input-error")}
                      value={code}
                      onChangeText={(v) => {
                        setCode(v.replace(/[^0-9]/g, "").slice(0, 6));
                        if (fieldErrors.code) {
                          setFieldErrors((p) => ({ ...p, code: undefined }));
                        }
                      }}
                      placeholder="Enter your verification code"
                      keyboardType="numeric"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      maxLength={6}
                      returnKeyType="done"
                      onSubmitEditing={handleVerify}
                      editable={!isSubmitting}
                      accessibilityLabel="Verification code"
                    />
                    {fieldErrors.code ? (
                      <Text className="auth-error">{fieldErrors.code}</Text>
                    ) : (
                      <Text className="auth-helper">
                        Enter the 6-digit code from your inbox.
                      </Text>
                    )}
                  </View>

                  {fieldErrors.form ? (
                    <Text className="auth-error">{fieldErrors.form}</Text>
                  ) : null}

                  <Pressable
                    className={clsx("auth-button", isLoading && "auth-button-disabled")}
                    onPress={handleVerify}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Verify email"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="auth-button-text">Verify</Text>
                    )}
                  </Pressable>

                  <Pressable
                    className="auth-secondary-button"
                    onPress={handleResend}
                    disabled={isResending || cooldown > 0}
                    accessibilityRole="button"
                    accessibilityLabel="Resend verification code"
                  >
                    {isResending ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="auth-secondary-button-text">
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                      </Text>
                    )}
                  </Pressable>

                  <View className="auth-link-row">
                    <Text className="auth-link-copy">Already have an account? </Text>
                    <Link href="/(auth)/sign-in" className="auth-link">
                      Sign in
                    </Link>
                  </View>
                </View>
              ) : (
                <View className="auth-form">
                  <View className="auth-field">
                    <Text className="auth-label">Email</Text>
                    <TextInput
                      className={clsx("auth-input", fieldErrors.email && "auth-input-error")}
                      value={emailAddress}
                      onChangeText={(v) => {
                        setEmailAddress(v);
                        if (fieldErrors.email) {
                          setFieldErrors((p) => ({ ...p, email: undefined }));
                        }
                      }}
                      placeholder="Enter your email"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      editable={!isSubmitting}
                      accessibilityLabel="Email address"
                    />
                    {fieldErrors.email ? (
                      <Text className="auth-error">{fieldErrors.email}</Text>
                    ) : null}
                  </View>

                  <View className="auth-field">
                    <Text className="auth-label">Password</Text>
                    <TextInput
                      className={clsx("auth-input", fieldErrors.password && "auth-input-error")}
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        if (fieldErrors.password) {
                          setFieldErrors((p) => ({ ...p, password: undefined }));
                        }
                      }}
                      placeholder="Enter your password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password-new"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={handleSignUp}
                      editable={!isSubmitting}
                      accessibilityLabel="Password"
                    />
                    {fieldErrors.password ? (
                      <Text className="auth-error">{fieldErrors.password}</Text>
                    ) : (
                      <Text className="auth-helper">At least 8 characters.</Text>
                    )}
                  </View>

                  {fieldErrors.form ? (
                    <Text className="auth-error">{fieldErrors.form}</Text>
                  ) : null}

                  <Pressable
                    className={clsx("auth-button", isLoading && "auth-button-disabled")}
                    onPress={handleSignUp}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Create account"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="auth-button-text">Create account</Text>
                    )}
                  </Pressable>

                  <View className="auth-link-row">
                    <Text className="auth-link-copy">Already have an account? </Text>
                    <Link href="/(auth)/sign-in" className="auth-link">
                      Sign in
                    </Link>
                  </View>
                </View>
              )}
            </View>

            {/* Required for sign-up flows on Expo web */}
            <View nativeID="clerk-captcha" />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
