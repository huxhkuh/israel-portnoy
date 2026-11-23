(() => {
  if (!("IntersectionObserver" in window)) return;
  const motion = matchMedia("(prefers-reduced-motion: no-preference) and (forced-colors: none)");
  const remainingInk = window.CSS?.highlights && window.Highlight ? new Highlight() : null;
  if (remainingInk) CSS.highlights.set("remaining-ink", remainingInk);

  const visible = new Map();
  const flowSelector = ".intro, .service-text, .approach-text, .book-copy, .newsletter-copy, .read-text-content, .policy, dialog";
  const copySelector = "p, .signature";
  const ignored = '[role="status"], [aria-live], [data-lead-frame-status], noscript';
  let frame = 0;

  // Keep the original text and inline links intact. Only the unfilled words change colour.
  function wordStarts(block) {
    const words = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const match of node.data.matchAll(/\S+/gu)) {
        words.push({ node, offset: match.index });
      }
    }
    return words;
  }

  function viewport(root) {
    const scroller = root || document.scrollingElement;
    const height = root ? root.clientHeight : window.innerHeight;
    const bottom = root ? root.getBoundingClientRect().top + root.clientTop + height : height;
    return { height, bottom, scroll: scroller.scrollTop, end: scroller.scrollHeight - height };
  }

  function paragraphs(block) {
    const copy = block.matches(copySelector) ? [block] : block.querySelectorAll(copySelector);
    return Array.from(copy).filter(el => !el.closest(ignored)).map(el => ({
      el, words: wordStarts(el), range: document.createRange(), filled: -1
    }));
  }

  function clearRanges(state) {
    for (const part of state.parts || []) remainingInk.delete(part.range);
    state.parts = null;
  }

  function paint() {
    frame = 0;
    const viewports = new Map();
    for (const [block, state] of visible) {
      if (!viewports.has(state.root)) viewports.set(state.root, viewport(state.root));
      const view = viewports.get(state.root);
      if (!state.parts) state.parts = paragraphs(block);
      const parts = state.parts.filter(part => part.el.getClientRects().length && part.words.length);
      if (!parts.length) continue;
      const top = parts[0].el.getBoundingClientRect().top;
      const bottom = parts[parts.length - 1].el.getBoundingClientRect().bottom;
      const distance = Math.min(view.scroll, view.bottom - view.height * .08 - top);
      const progress = view.scroll >= view.end - 1 ? 1 :
        Math.max(0, Math.min(1, distance / (view.height * .30 + bottom - top)));

      // One scroll position for the whole card. Spend it on paragraphs in reading order.
      const total = parts.reduce((sum, part) => sum + part.words.length, 0);
      let remaining = Math.round(progress * total);
      for (const part of parts) {
        const filled = Math.min(remaining, part.words.length);
        remaining -= filled;
        if (filled === part.filled) continue;
        part.filled = filled;
        if (filled === part.words.length) {
          remainingInk.delete(part.range);
        } else {
          const { node, offset } = part.words[filled];
          part.range.selectNodeContents(part.el);
          part.range.setStart(node, offset);
          remainingInk.add(part.range);
        }
      }
    }
  }

  function schedulePaint() {
    if (!frame && visible.size) frame = requestAnimationFrame(paint);
  }

  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting && target.matches("h1, h2, h3")) {
        target.classList.add("heading-arrives");
        observer.unobserve(target);
      } else if (isIntersecting && remainingInk && !visible.has(target)) {
        visible.set(target, {
          root: target.closest(".read-scroll, .read-contents, dialog"),
          parts: null
        });
      } else if (!isIntersecting && visible.has(target)) {
        clearRanges(visible.get(target));
        visible.delete(target);
      }
    }
    schedulePaint();
  });

  function observeCopy(root) {
    if (!motion.matches) return;
    const selector = remainingInk ? "h1, h2, h3, p, .signature" : "h1, h2, h3";
    for (const block of root.querySelectorAll(selector)) {
      if (block.closest(ignored)) continue;
      const flow = block.matches(copySelector) && block.closest(flowSelector);
      observer.observe(flow || block);
    }
  }

  document.addEventListener("scroll", schedulePaint, { capture: true, passive: true });
  window.addEventListener("resize", schedulePaint);
  motion.addEventListener("change", () => {
    observer.disconnect();
    remainingInk?.clear();
    visible.clear();
    observeCopy(document);
  });
  observeCopy(document);

  const reader = document.querySelector("#read-text");
  if (reader) {
    const contentChanges = new MutationObserver(records => {
      // The reader inserts its pages, then replaces individual paragraphs during search.
      for (const { target } of records) {
        if (target === reader) observeCopy(reader);
        const state = visible.get(target.closest(flowSelector) || target.closest(copySelector));
        if (state) clearRanges(state);
      }
      schedulePaint();
    });
    contentChanges.observe(reader, { childList: true, subtree: true });
  }
})();
