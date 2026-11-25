import { useEffect } from "react";

/** Lightweight stand-in so we don't need react-navigation yet. */
export function useFocusEffect(effect: () => void | (() => void)) {
  useEffect(() => {
    return effect();
  }, [effect]);
}
