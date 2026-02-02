import { useRef, useCallback } from "react";

export const useMessageNavigation = () => {
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const setMessageRef = useCallback((index: number, element: HTMLDivElement | null) => {
    if (element) {
      messageRefs.current.set(index, element);
    } else {
      messageRefs.current.delete(index);
    }
  }, []);

  const scrollToMessage = useCallback((index: number) => {
    const element = messageRefs.current.get(index);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      
      // Add a brief highlight effect
      element.classList.add("ring-2", "ring-primary", "ring-offset-2");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      }, 1500);
    }
  }, []);

  return {
    setMessageRef,
    scrollToMessage,
  };
};
