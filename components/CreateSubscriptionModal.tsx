import clsx from "clsx";
import dayjs from "dayjs";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { icons } from "../constants/icons";

type Frequency = "Monthly" | "Yearly";

type CategoryOption =
  | "Entertainment"
  | "AI Tools"
  | "Developer Tools"
  | "Design"
  | "Productivity"
  | "Cloud"
  | "Music"
  | "Other";

const FREQUENCIES: Frequency[] = ["Monthly", "Yearly"];

const CATEGORIES: CategoryOption[] = [
  "Entertainment",
  "AI Tools",
  "Developer Tools",
  "Design",
  "Productivity",
  "Cloud",
  "Music",
  "Other",
];

const CATEGORY_COLORS: Record<CategoryOption, string> = {
  Entertainment: "#b8e8d0",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  Design: "#f5c542",
  Productivity: "#f6eecf",
  Cloud: "#e0e7ff",
  Music: "#ffedd5",
  Other: "#fff8e7",
};

type CreateSubscriptionModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (subscription: Subscription) => void;
};

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "subscription";
}

function parsePrice(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

const CreateSubscriptionModal = ({
  visible,
  onClose,
  onCreate,
}: CreateSubscriptionModalProps) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [category, setCategory] = useState<CategoryOption>("Other");
  const [nameError, setNameError] = useState<string | undefined>();
  const [priceError, setPriceError] = useState<string | undefined>();

  const priceValue = parsePrice(price);
  const isValid =
    name.trim().length > 0 &&
    Number.isFinite(priceValue) &&
    priceValue > 0;

  const resetForm = () => {
    setName("");
    setPrice("");
    setFrequency("Monthly");
    setCategory("Other");
    setNameError(undefined);
    setPriceError(undefined);
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const parsedPrice = parsePrice(price);

    let valid = true;
    if (!trimmedName) {
      setNameError("Name is required");
      valid = false;
    } else {
      setNameError(undefined);
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setPriceError("Enter a positive amount");
      valid = false;
    } else {
      setPriceError(undefined);
    }

    if (!valid) return;

    const roundedPrice = Number(parsedPrice.toFixed(2));
    const startDate = dayjs();
    const renewalDate =
      frequency === "Monthly" ? startDate.add(1, "month") : startDate.add(1, "year");

    const subscription: Subscription = {
      id: `${slugify(trimmedName)}-${startDate.valueOf()}`,
      icon: icons.wallet,
      name: trimmedName,
      price: roundedPrice,
      currency: "USD",
      billing: frequency,
      category,
      status: "active",
      startDate: startDate.toISOString(),
      renewalDate: renewalDate.toISOString(),
      color: CATEGORY_COLORS[category],
    };

    onCreate(subscription);
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="modal-overlay">
        <Pressable className="flex-1" onPress={handleClose} />
        <View className="modal-container">
          <View className="modal-header">
            <Text className="modal-title">New Subscription</Text>
            <Pressable
              className="modal-close"
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text className="modal-close-text">×</Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              className="modal-body"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="auth-form">
                <View className="auth-field">
                  <Text className="auth-label">Name</Text>
                  <TextInput
                    className={clsx(
                      "auth-input",
                      nameError && "auth-input-error",
                    )}
                    value={name}
                    onChangeText={(value) => {
                      setName(value);
                      if (nameError) setNameError(undefined);
                    }}
                    placeholder="Enter name"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    accessibilityLabel="Subscription name"
                  />
                  {nameError ? (
                    <Text className="auth-error">{nameError}</Text>
                  ) : null}
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Price</Text>
                  <TextInput
                    className={clsx(
                      "auth-input",
                      priceError && "auth-input-error",
                    )}
                    value={price}
                    onChangeText={(value) => {
                      setPrice(value);
                      if (priceError) setPriceError(undefined);
                    }}
                    placeholder="9.99"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    accessibilityLabel="Subscription price"
                  />
                  {priceError ? (
                    <Text className="auth-error">{priceError}</Text>
                  ) : null}
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Frequency</Text>
                  <View className="picker-row">
                    {FREQUENCIES.map((option) => {
                      const active = frequency === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => setFrequency(option)}
                          className={clsx(
                            "picker-option",
                            active && "picker-option-active",
                          )}
                          accessibilityRole="button"
                          accessibilityLabel={option}
                          accessibilityState={{ selected: active }}
                        >
                          <Text
                            className={clsx(
                              "picker-option-text",
                              active && "picker-option-text-active",
                            )}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Category</Text>
                  <View className="category-scroll">
                    {CATEGORIES.map((option) => {
                      const active = category === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => setCategory(option)}
                          className={clsx(
                            "category-chip",
                            active && "category-chip-active",
                          )}
                          accessibilityRole="button"
                          accessibilityLabel={`Category ${option}`}
                          accessibilityState={{ selected: active }}
                        >
                          <Text
                            className={clsx(
                              "category-chip-text",
                              active && "category-chip-text-active",
                            )}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  className={clsx(
                    "auth-button",
                    !isValid && "auth-button-disabled",
                  )}
                  onPress={handleSubmit}
                  disabled={!isValid}
                  accessibilityRole="button"
                  accessibilityLabel="Create subscription"
                >
                  <Text className="auth-button-text">Create subscription</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

export default CreateSubscriptionModal;
