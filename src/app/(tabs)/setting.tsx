import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import clsx from "clsx";
import images from "../../../constants/images";

const SafeAreaView = styled(RNSafeAreaView);

const Setting = () => {
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Recurly member";
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? "No email on file";

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          if (isSigningOut) return;
          setIsSigningOut(true);
          try {
            await signOut();
            router.replace("/(auth)/sign-in");
          } catch {
            Alert.alert("Sign out failed", "Please try again.");
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="list-title">Settings</Text>

      <View className="auth-card mt-5">
        <View className="auth-form">
          <View className="home-user">
            <Image
              source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
              className="home-avatar"
            />
            <View className="sub-copy ml-3">
              <Text className="sub-title" numberOfLines={1}>
                {userLoaded ? displayName : "Loading…"}
              </Text>
              <Text className="sub-meta" numberOfLines={1}>
                {userLoaded ? displayEmail : "Loading account"}
              </Text>
            </View>
          </View>

          <Pressable
            className={clsx("auth-secondary-button", isSigningOut && "opacity-60")}
            onPress={handleSignOut}
            disabled={isSigningOut || !userLoaded}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="auth-secondary-button-text">Sign out</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Setting;
