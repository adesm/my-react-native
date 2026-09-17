import { useSignIn } from "@clerk/expo";
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
import clsx from "clsx";
import AuthBranding from "../../../components/AuthBranding";
import {
  clerkErrorMessages,
  isRateLimitCode,
  mapHookErrorsToFields,
  mapSingleErrorToFields,
} from "../../../lib/clerk-errors";
import { signInSchema } from "../../../lib/validation";

const SafeAreaView = styled(RNSafeAreaView);

export default function SignIn() {
  const { signIn, errors: hookErrors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const isLoading = isSubmitting || fetchStatus === "fetching";
  const hasEmailError = Boolean(fieldErrors.email);
  const hasPasswordError = Boolean(fieldErrors.password);

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

      const finalizeResult = await signIn.finalize();
      if (finalizeResult?.error) {
        const mapped = mapSingleErrorToFields(finalizeResult.error);
        setFieldErrors(mapped);
        return;
      }

      router.replace("/(tabs)" as never);
    } catch {
      setFieldErrors({ form: clerkErrorMessages.network });
    } finally {
      setIsSubmitting(false);
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
              title="Welcome back"
              subtitle="Sign in to continue managing your subscriptions"
            />

            <View className="auth-card">
              <View className="auth-form">
                <View className="auth-field">
                  <Text className="auth-label">Email</Text>
                  <TextInput
                    className={clsx("auth-input", hasEmailError && "auth-input-error")}
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
                    className={clsx("auth-input", hasPasswordError && "auth-input-error")}
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
                  className={clsx("auth-button", isLoading && "auth-button-disabled")}
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
            </View>

            {/* Required for sign-up/sign-in flows on Expo web */}
            <View nativeID="clerk-captcha" />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
