import { useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import CreateSubscriptionModal from "../../../components/CreateSubscriptionModal";
import ListHeading from "../../../components/ListHeading";
import SubsCard from "../../../components/SubsCard";
import UpcommingSubsCard from "../../../components/UpcommingSubsCard";
import {
  HOME_BALANCE,
  HOME_USER,
  UPCOMING_SUBSCRIPTIONS,
} from "../../../constants/data";
import { icons } from "../../../constants/icons";
import images from "../../../constants/images";
import { addSubscription, useSubscriptions } from "../../../lib/subscriptions";
import { formatCurrency } from "../../../lib/utils";

const SafeAreaView = styled(RNSafeAreaView);

export default function Index() {
  const [expandedSubsId, setExpandedSubsId] = useState<string | null>(null);
  const subscriptions = useSubscriptions();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user } = useUser();
  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    HOME_USER.name;

  const handleCreateSubscription = (subscription: Subscription) => {
    addSubscription(subscription);
    setExpandedSubsId(null);
  };
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <FlatList
        ListHeaderComponent={() => (
          <>
            <View className="home-header">
              <View className="home-user">
                <Image
                  source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
                  className="home-avatar"
                />
                <Text className="home-user-name">{displayName}</Text>
              </View>

              <Pressable
                onPress={() => setIsCreateOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Create subscription"
              >
                <Image source={icons.add} className="home-add-icon" />
              </Pressable>
            </View>

            <View className="home-balance-card">
              <Text className="home-balance-label">Balance</Text>
              <View className="home-balance-row">
                <Text className="home-balance-amount">
                  {formatCurrency(HOME_BALANCE.amount)}
                </Text>
                <Text className="home-balance-date">
                  {dayjs(HOME_BALANCE.nextRenewalDate).format("MM/DD")}
                </Text>
              </View>
            </View>

            <View className="mb-5">
              <ListHeading title="Upcoming" />
              <FlatList
                data={UPCOMING_SUBSCRIPTIONS}
                renderItem={({ item }) => <UpcommingSubsCard {...item} />}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
                  <Text className="home-empty-state">No data</Text>
                }
              />
            </View>

            <ListHeading title="All Subs" />
          </>
        )}
        data={subscriptions}
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
        ItemSeparatorComponent={() => <View className="h-5" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text className="home-empty-state">no data</Text>}
        contentContainerClassName="pb-20"
      />
      <CreateSubscriptionModal
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateSubscription}
      />
    </SafeAreaView>
  );
}
