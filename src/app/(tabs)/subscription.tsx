import clsx from "clsx";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import SubsCard from "../../../components/SubsCard";
import { HOME_SUBSCRIPTIONS } from "../../../constants/data";

const SafeAreaView = styled(RNSafeAreaView);

const ALL = "All";

const Subscription = () => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [expandedSubsId, setExpandedSubsId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const sub of HOME_SUBSCRIPTIONS) {
      const category = sub.category?.trim();
      if (category) unique.add(category);
    }
    return [ALL, ...unique];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HOME_SUBSCRIPTIONS.filter((sub) => {
      const matchesCategory =
        selectedCategory === ALL || sub.category?.trim() === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        sub.name.toLowerCase().includes(q) ||
        sub.category?.toLowerCase().includes(q) ||
        sub.plan?.toLowerCase().includes(q)
      );
    });
  }, [query, selectedCategory]);

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="list-title">Subscriptions</Text>
      <Text className="sub-meta">
        {filtered.length} {filtered.length === 1 ? "item" : "items"}
      </Text>

      <View className="auth-field mt-3">
        <TextInput
          className="auth-input"
          value={query}
          onChangeText={setQuery}
          placeholder="Search subscriptions"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search subscriptions"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3 max-h-12"
        contentContainerClassName="category-scroll"
      >
        {categories.map((category) => {
          const active = selectedCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={clsx(
                "category-chip",
                active && "category-chip-active",
              )}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${category}`}
              accessibilityState={{ selected: active }}
            >
              <Text
                className={clsx(
                  "category-chip-text",
                  active && "category-chip-text-active",
                )}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        className="mt-5"
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubsCard
            expanded={expandedSubsId === item.id}
            onPress={() =>
              setExpandedSubsId((current) =>
                current === item.id ? null : item.id,
              )
            }
            {...item}
          />
        )}
        extraData={expandedSubsId}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View className="h-5" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="home-empty-state">
            {query.trim() || selectedCategory !== ALL
              ? `No subscriptions match "${query.trim() || selectedCategory}"`
              : "No subscriptions yet"}
          </Text>
        }
        contentContainerClassName="pb-20"
      />
    </SafeAreaView>
  );
};

export default Subscription;
