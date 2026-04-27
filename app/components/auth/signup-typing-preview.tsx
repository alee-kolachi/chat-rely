"use client";

import { useEffect, useRef } from "react";

const PHRASES = [
  "Where is my order #5492?",
  "I need help with a refund",
  "Can you check product stock?",
  "What's your return policy?",
];

export function SignupTypingPreview() {
  const elRef = useRef<HTMLSpanElement>(null);
  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const run = () => {
      if (cancelled || !elRef.current) return;
      const currentPhrase = PHRASES[phraseIndex.current];
      const typingSpeed = 60;
      const deletingSpeed = 30;
      const pauseTime = 2500;

      if (isDeleting.current) {
        charIndex.current -= 1;
        elRef.current.textContent = currentPhrase.slice(0, charIndex.current);
      } else {
        charIndex.current += 1;
        elRef.current.textContent = currentPhrase.slice(0, charIndex.current);
      }

      if (!isDeleting.current && charIndex.current === currentPhrase.length) {
        isDeleting.current = true;
        timeoutId = setTimeout(run, pauseTime);
      } else if (isDeleting.current && charIndex.current === 0) {
        isDeleting.current = false;
        phraseIndex.current = (phraseIndex.current + 1) % PHRASES.length;
        timeoutId = setTimeout(run, 500);
      } else {
        timeoutId = setTimeout(run, isDeleting.current ? deletingSpeed : typingSpeed);
      }
    };

    timeoutId = setTimeout(run, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return <span ref={elRef} className="typing-cursor-ds" aria-hidden />;
}
