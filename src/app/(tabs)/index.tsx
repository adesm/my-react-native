import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
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
    </View>
  );
}
