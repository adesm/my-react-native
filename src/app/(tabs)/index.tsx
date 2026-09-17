import { Link } from "expo-router";
import { styled } from "nativewind";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="text-xl font-bold text-success">
        Welcome to Nativewind!
      </Text>
      <Link href="/onboarding" className="mt-4 bg-primary text-white p-4">
        Go to oonboarding
      </Link>
      <Link href="/(auth)/sign-in" className="mt-4 bg-primary text-white p-4">
        sign in
      </Link>

      <Link
        href={{
          pathname: "/subscriptions/[id]",
          params: { id: "valude" },
        }}
      >
        Claude
      </Link>
    </SafeAreaView>
  );
}
