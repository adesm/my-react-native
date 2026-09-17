import { useSignIn } from "@clerk/expo";
import clsx from "clsx";
import { Link, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
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
import AuthBranding from "../../../components/AuthBranding";
import {
  clerkErrorMessages,
  isRateLimitCode,
  mapHookErrorsToFields,
  mapSingleErrorToFields,
} from "../../../lib/clerk-errors";
import { passwordSchema, signInSchema } from "../../../lib/validation";

const SafeAreaView = styled(RNSafeAreaView);

type SecondFactorStrategy =
  | "email_code"
  | "phone_code"
  | "totp"
  | "backup_code";

type SignInFieldErrors = {
  email?: string;
  password?: string;
  code?: string;
  newPassword?: string;
  form?: string;
};

const SECOND_FACTOR_LABELS: Record<SecondFactorStrategy, string> = {
  email_code: "Email code",
  phone_code: "Text message",
  totp: "Authenticator",
  backup_code: "Backup code",
};

function isSupportedSecondFactor(value: string): value is SecondFactorStrategy {
  return value in SECOND_FACTOR_LABELS;
}

export default function SignIn() {
  const { signIn, errors: hookErrors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedSecondFactor, setSelectedSecondFactor] =
    useState<SecondFactorStrategy>();
  const [codeSent, setCodeSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({});

  const isLoading = isSubmitting || fetchStatus === "fetching";
  const status = signIn?.status;
  const needsSecondFactor =
    status === "needs_second_factor" || status === "needs_client_trust";
  const availableSecondFactors = Array.from(
    new Set(
      (signIn?.supportedSecondFactors ?? [])
        .map((factor) => factor.strategy)
        .filter(isSupportedSecondFactor),
    ),
  );
  const activeSecondFactor =
    selectedSecondFactor && availableSecondFactors.includes(selectedSecondFactor)
      ? selectedSecondFactor
      : availableSecondFactors[0];

  const finishSignIn = async () => {
    if (!signIn || signIn.status !== "complete") return false;

    const { error } = await signIn.finalize();
    if (error) {
      setFieldErrors(mapSingleErrorToFields(error));
      return false;
    }

    router.replace("/(tabs)" as never);
    return true;
  };

  const handleSignIn = async () => {
    if (isSubmitting) return;

    const parsed = signInSchema.safeParse({ emailAddress, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.emailAddress?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    if (!signIn) {
      setFieldErrors({ form: clerkErrorMessages.network });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const { error } = await signIn.password({
        identifier: parsed.data.emailAddress,
        password: parsed.data.password,
      });

      if (error) {
        const mapped = mapSingleErrorToFields(error);
        if (isRateLimitCode(error.code)) mapped.form = clerkErrorMessages.rateLimited;
        const hookMapped = mapHookErrorsToFields(hookErrors);
        setFieldErrors({
          email: mapped.email ?? hookMapped.email,
          password: mapped.password ?? hookMapped.password,
          form: mapped.form ?? hookMapped.form,
        });
        return;
      }

      switch (signIn.status) {
        case "complete":
          await finishSignIn();
          break;
        case "needs_second_factor":
        case "needs_client_trust":
          setSelectedSecondFactor(undefined);
          setVerificationCode("");
          setCodeSent(false);
          break;
        case "needs_protect_check":
        case "needs_new_password":
          break;
        default:
          setFieldErrors({
            form: "This sign-in requires an unsupported authentication step.",
          });
      }
    } catch {
      setFieldErrors({ form: clerkErrorMessages.network });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendSecondFactorCode = async () => {
    if (!signIn || isSubmitting || !activeSecondFactor) return;
    if (activeSecondFactor !== "email_code" && activeSecondFactor !== "phone_code") {
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const { error } =
        activeSecondFactor === "email_code"
          ? await signIn.mfa.sendEmailCode()
          : await signIn.mfa.sendPhoneCode();
      if (error) {
        const mapped = mapSingleErrorToFields(error);
        setFieldErrors({ form: mapped.form ?? mapped.code });
        return;
      }
      setCodeSent(true);
    } catch {
      setFieldErrors({ form: clerkErrorMessages.network });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySecondFactor = async () => {
    const code = verificationCode.trim();
    if (!signIn || isSubmitting || !activeSecondFactor) return;
    if (!code) {
      setFieldErrors({ code: "Enter your verification code." });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const result =
        activeSecondFactor === "email_code"
          ? await signIn.mfa.verifyEmailCode({ code })
          : activeSecondFactor === "phone_code"
            ? await signIn.mfa.verifyPhoneCode({ code })
            : activeSecondFactor === "totp"
              ? await signIn.mfa.verifyTOTP({ code })
              : await signIn.mfa.verifyBackupCode({ code });

      if (result.error) {
        const mapped = mapSingleErrorToFields(result.error);
        setFieldErrors({ code: mapped.code ?? mapped.form ?? "Invalid code." });
        return;
      }

      setVerificationCode("");
      setCodeSent(false);
      if (signIn.status === "complete") {
        await finishSignIn();
      } else if (
        signIn.status !== "needs_second_factor" &&
        signIn.status !== "needs_client_trust" &&
        signIn.status !== "needs_protect_check" &&
        signIn.status !== "needs_new_password"
      ) {
        setFieldErrors({ form: "This sign-in could not be completed." });
      }
    } catch {
      setFieldErrors({ code: clerkErrorMessages.network });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitNewPassword = async () => {
    if (!signIn || isSubmitting) return;

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setFieldErrors({ newPassword: parsed.error.issues[0]?.message });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFieldErrors({ newPassword: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const usesPhoneReset =
        signIn.firstFactorVerification.strategy === "reset_password_phone_code";
      const { error } = usesPhoneReset
        ? await signIn.resetPasswordPhoneCode.submitPassword({
            password: parsed.data,
          })
        : await signIn.resetPasswordEmailCode.submitPassword({
            password: parsed.data,
          });

      if (error) {
        const mapped = mapSingleErrorToFields(error);
        setFieldErrors({
          newPassword: mapped.password,
          form: mapped.form,
        });
        return;
      }

      if (signIn.status === "complete") {
        await finishSignIn();
      } else {
        setFieldErrors({ form: "Your password was updated, but sign-in is incomplete." });
      }
    } catch {
      setFieldErrors({ form: clerkErrorMessages.network });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProtectCheck = async () => {
    if (!signIn?.protectCheck || isSubmitting) return;
    if (Platform.OS !== "web" || typeof document === "undefined") {
      setFieldErrors({
        form: "This security check must be completed in a supported browser.",
      });
      return;
    }

    const container = document.getElementById(
      "clerk-protect-check",
    ) as HTMLDivElement | null;
    if (!container) {
      setFieldErrors({ form: "The security check could not be loaded." });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const { executeProtectCheck } = await import(
        "@clerk/shared/internal/clerk-js/protectCheck"
      );
      const proofToken = await executeProtectCheck(signIn.protectCheck, container);
      const { error } = await signIn.submitProtectCheck({ proofToken });
      if (error) {
        const mapped = mapSingleErrorToFields(error);
        setFieldErrors({ form: mapped.form ?? "Security verification failed." });
        return;
      }

      if (signIn.status === "complete") {
        await finishSignIn();
      }
    } catch {
      setFieldErrors({ form: "The security check could not be completed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = async () => {
    if (!signIn || isSubmitting) return;
    await signIn.reset();
    setVerificationCode("");
    setSelectedSecondFactor(undefined);
    setCodeSent(false);
    setNewPassword("");
    setConfirmNewPassword("");
    setFieldErrors({});
  };

  const renderStartOver = () => (
    <Pressable
      className="auth-secondary-button"
      onPress={handleStartOver}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel="Start sign-in over"
    >
      <Text className="auth-secondary-button-text">Start over</Text>
    </Pressable>
  );

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
              title={
                needsSecondFactor
                  ? status === "needs_client_trust"
                    ? "Verify this device"
                    : "Two-step verification"
                  : status === "needs_new_password"
                    ? "Choose a new password"
                    : status === "needs_protect_check"
                      ? "Security check"
                      : "Welcome back"
              }
              subtitle={
                needsSecondFactor
                  ? "Complete one more step to finish signing in"
                  : status === "needs_new_password"
                    ? "Set a secure password to continue"
                    : status === "needs_protect_check"
                      ? "Confirm this sign-in request to continue"
                      : "Sign in to continue managing your subscriptions"
              }
            />

            <View className="auth-card">
              {needsSecondFactor ? (
                <View className="auth-form">
                  {availableSecondFactors.length > 1 ? (
                    <View className="auth-field">
                      <Text className="auth-label">Verification method</Text>
                      <View className="picker-row">
                        {availableSecondFactors.map((factor) => {
                          const active = factor === activeSecondFactor;
                          return (
                            <Pressable
                              key={factor}
                              className={clsx(
                                "picker-option",
                                active && "picker-option-active",
                              )}
                              onPress={() => {
                                setSelectedSecondFactor(factor);
                                setVerificationCode("");
                                setCodeSent(false);
                                setFieldErrors({});
                              }}
                              accessibilityRole="button"
                              accessibilityState={{ selected: active }}
                            >
                              <Text
                                className={clsx(
                                  "picker-option-text",
                                  active && "picker-option-text-active",
                                )}
                              >
                                {SECOND_FACTOR_LABELS[factor]}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {activeSecondFactor ? (
                    <>
                      {(activeSecondFactor === "email_code" ||
                        activeSecondFactor === "phone_code") && (
                        <Pressable
                          className="auth-secondary-button"
                          onPress={handleSendSecondFactorCode}
                          disabled={isLoading}
                          accessibilityRole="button"
                        >
                          <Text className="auth-secondary-button-text">
                            {codeSent ? "Send a new code" : "Send code"}
                          </Text>
                        </Pressable>
                      )}

                      <View className="auth-field">
                        <Text className="auth-label">
                          {activeSecondFactor === "backup_code"
                            ? "Backup code"
                            : "Verification code"}
                        </Text>
                        <TextInput
                          className={clsx(
                            "auth-input",
                            fieldErrors.code && "auth-input-error",
                          )}
                          value={verificationCode}
                          onChangeText={(value) => {
                            const nextValue =
                              activeSecondFactor === "backup_code"
                                ? value.slice(0, 32)
                                : value.replace(/[^0-9]/g, "").slice(0, 6);
                            setVerificationCode(nextValue);
                            if (fieldErrors.code) {
                              setFieldErrors((current) => ({
                                ...current,
                                code: undefined,
                              }));
                            }
                          }}
                          keyboardType={
                            activeSecondFactor === "backup_code" ? "default" : "numeric"
                          }
                          autoComplete="one-time-code"
                          textContentType="oneTimeCode"
                          maxLength={activeSecondFactor === "backup_code" ? 32 : 6}
                          editable={!isLoading}
                          accessibilityLabel="Verification code"
                        />
                        {fieldErrors.code ? (
                          <Text className="auth-error">{fieldErrors.code}</Text>
                        ) : null}
                      </View>

                      {fieldErrors.form ? (
                        <Text className="auth-error">{fieldErrors.form}</Text>
                      ) : null}

                      <Pressable
                        className={clsx(
                          "auth-button",
                          isLoading && "auth-button-disabled",
                        )}
                        onPress={handleVerifySecondFactor}
                        disabled={isLoading || !verificationCode.trim()}
                        accessibilityRole="button"
                        accessibilityLabel="Verify code"
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <Text className="auth-button-text">Verify</Text>
                        )}
                      </Pressable>
                    </>
                  ) : (
                    <Text className="auth-error">
                      No supported verification method is available.
                    </Text>
                  )}

                  {renderStartOver()}
                </View>
              ) : status === "needs_new_password" ? (
                <View className="auth-form">
                  <View className="auth-field">
                    <Text className="auth-label">New password</Text>
                    <TextInput
                      className={clsx(
                        "auth-input",
                        fieldErrors.newPassword && "auth-input-error",
                      )}
                      value={newPassword}
                      onChangeText={(value) => {
                        setNewPassword(value);
                        setFieldErrors((current) => ({
                          ...current,
                          newPassword: undefined,
                        }));
                      }}
                      secureTextEntry
                      autoComplete="password-new"
                      textContentType="newPassword"
                      editable={!isLoading}
                      accessibilityLabel="New password"
                    />
                  </View>

                  <View className="auth-field">
                    <Text className="auth-label">Confirm password</Text>
                    <TextInput
                      className={clsx(
                        "auth-input",
                        fieldErrors.newPassword && "auth-input-error",
                      )}
                      value={confirmNewPassword}
                      onChangeText={(value) => {
                        setConfirmNewPassword(value);
                        setFieldErrors((current) => ({
                          ...current,
                          newPassword: undefined,
                        }));
                      }}
                      secureTextEntry
                      autoComplete="password-new"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmitNewPassword}
                      editable={!isLoading}
                      accessibilityLabel="Confirm new password"
                    />
                    {fieldErrors.newPassword ? (
                      <Text className="auth-error">{fieldErrors.newPassword}</Text>
                    ) : null}
                  </View>

                  {fieldErrors.form ? (
                    <Text className="auth-error">{fieldErrors.form}</Text>
                  ) : null}

                  <Pressable
                    className={clsx(
                      "auth-button",
                      isLoading && "auth-button-disabled",
                    )}
                    onPress={handleSubmitNewPassword}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Save new password"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="auth-button-text">Save password</Text>
                    )}
                  </Pressable>
                  {renderStartOver()}
                </View>
              ) : status === "needs_protect_check" ? (
                <View className="auth-form">
                  <View nativeID="clerk-protect-check" />
                  {fieldErrors.form ? (
                    <Text className="auth-error">{fieldErrors.form}</Text>
                  ) : null}
                  <Pressable
                    className={clsx(
                      "auth-button",
                      isLoading && "auth-button-disabled",
                    )}
                    onPress={handleProtectCheck}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Start security check"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="auth-button-text">Start security check</Text>
                    )}
                  </Pressable>
                  {renderStartOver()}
                </View>
              ) : (
                <View className="auth-form">
                  <View className="auth-field">
                    <Text className="auth-label">Email</Text>
                    <TextInput
                      className={clsx(
                        "auth-input",
                        fieldErrors.email && "auth-input-error",
                      )}
                      value={emailAddress}
                      onChangeText={(value) => {
                        setEmailAddress(value);
                        if (fieldErrors.email) {
                          setFieldErrors((current) => ({
                            ...current,
                            email: undefined,
                          }));
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
                      className={clsx(
                        "auth-input",
                        fieldErrors.password && "auth-input-error",
                      )}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        if (fieldErrors.password) {
                          setFieldErrors((current) => ({
                            ...current,
                            password: undefined,
                          }));
                        }
                      }}
                      placeholder="Enter your password"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      returnKeyType="done"
                      onSubmitEditing={handleSignIn}
                      editable={!isSubmitting}
                      accessibilityLabel="Password"
                    />
                    {fieldErrors.password ? (
                      <Text className="auth-error">{fieldErrors.password}</Text>
                    ) : null}
                  </View>

                  {fieldErrors.form ? (
                    <Text className="auth-error">{fieldErrors.form}</Text>
                  ) : null}

                  <Pressable
                    className={clsx(
                      "auth-button",
                      isLoading && "auth-button-disabled",
                    )}
                    onPress={handleSignIn}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text className="auth-button-text">Sign in</Text>
                    )}
                  </Pressable>

                  <View className="auth-link-row">
                    <Text className="auth-link-copy">New to Recurly? </Text>
                    <Link href="/(auth)/sign-up" className="auth-link">
                      Create an account
                    </Link>
                  </View>
                </View>
              )}
            </View>

            {/* Required for sign-up/sign-in flows on Expo web */}
            <View nativeID="clerk-captcha" />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
