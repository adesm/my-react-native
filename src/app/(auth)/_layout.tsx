import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View className="auth-screen items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href={"/(tabs)" as never} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
