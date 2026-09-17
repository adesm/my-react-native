import { useSyncExternalStore } from "react";
import { HOME_SUBSCRIPTIONS } from "../constants/data";

let subscriptions: Subscription[] = [...HOME_SUBSCRIPTIONS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getSubscriptions(): Subscription[] {
  return subscriptions;
}

export function addSubscription(subscription: Subscription) {
  subscriptions = [subscription, ...subscriptions];
  emit();
}

export function subscribeToSubscriptions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSubscriptions(): Subscription[] {
  return useSyncExternalStore(subscribeToSubscriptions, getSubscriptions);
}
