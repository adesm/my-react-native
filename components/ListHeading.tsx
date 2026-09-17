import { Text, TouchableOpacity, View } from "react-native";

const ListHeading = ({ title, onPress }: ListHeadingProps) => {
  return (
    <View className="list-head">
      <Text className="list-title">{title}</Text>
      {onPress ? (
        <TouchableOpacity
          className="list-action"
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`View all ${title}`}
        >
          <Text className="list-action-text">View All</Text>
        </TouchableOpacity>
      ) : (
        <View className="list-action">
          <Text className="list-action-text">View All</Text>
        </View>
      )}
    </View>
  );
};

export default ListHeading;
