const ONBOARDING_KEY = "oursync-onboarding";
const ONBOARDING_EVENT = "oursync-onboarding-change";

function storageKey(userId: string) {
  return `${ONBOARDING_KEY}:${userId}`;
}

export function readOnboardingDone(userId: string) {
  return window.localStorage.getItem(storageKey(userId)) === "1";
}

export function writeOnboardingDone(userId: string) {
  window.localStorage.setItem(storageKey(userId), "1");
  window.dispatchEvent(new Event(ONBOARDING_EVENT));
}

export function subscribeOnboarding(onChange: () => void) {
  window.addEventListener(ONBOARDING_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
