import { Children, useCallback, useEffect, useRef, useState } from "react";

/**
 * Presentation deck: each child becomes a full-height section. Navigate with the
 * buttons (bottom right) or ↑/↓ — one section at a time, so a demo never has to
 * scroll past clutter.
 */
export default function SectionDeck({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    const target = Math.max(0, Math.min(items.length - 1, i));
    refs.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIndex(target);
  }, [items.length]);

  // ↑/↓ (and PageUp/PageDown) move one section
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const down = e.key === "ArrowDown" || e.key === "PageDown";
      const up = e.key === "ArrowUp" || e.key === "PageUp";
      if (!down && !up) return;
      e.preventDefault();
      goTo(index + (down ? 1 : -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo]);

  // keep the counter honest when the user scrolls by hand
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const i = refs.current.indexOf(visible.target as HTMLElement);
        if (i >= 0) setIndex(i);
      },
      { threshold: [0.35, 0.6] }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <>
      {items.map((child, i) => (
        <section
          className="deck-section"
          key={i}
          ref={(el) => { refs.current[i] = el; }}
        >
          {child}
        </section>
      ))}

      <nav className="deck-nav" aria-label="Sections">
        <button
          className="deck-btn"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous section"
        >
          ▲
        </button>
        <span className="deck-count">{index + 1}/{items.length}</span>
        <button
          className="deck-btn"
          onClick={() => goTo(index + 1)}
          disabled={index === items.length - 1}
          aria-label="Next section"
        >
          ▼
        </button>
      </nav>
    </>
  );
}
