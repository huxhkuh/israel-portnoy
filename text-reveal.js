(() => {
  if (!("IntersectionObserver" in window)) return;
  const motion = matchMedia("(prefers-reduced-motion: no-preference) and (forced-colors: none)");
  const remainingInk = window.CSS?.highlights && window.Highlight ? new Highlight() : null;
  if (remainingInk) CSS.highlights.set("remaining-ink", remainingInk);

  const visible = new Map();
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

  function paint() {
    frame = 0;
    const viewports = new Map();
    for (const [block, state] of visible) {
      if (!viewports.has(state.root)) viewports.set(state.root, viewport(state.root));
      const view = viewports.get(state.root);
      const rect = block.getBoundingClientRect();
      const distance = Math.min(view.scroll, view.bottom - view.height * .08 - rect.top);
      const progress = view.scroll >= view.end - 1 ? 1 :
        Math.max(0, Math.min(1, distance / (view.height * .30 + rect.height)));

      if (!state.words) state.words = wordStarts(block);
      const index = Math.round(progress * state.words.length);
      if (index === state.index) continue;
      state.index = index;
      if (index === state.words.length) {
        remainingInk.delete(state.range);
      } else {
        const { node, offset } = state.words[index];
        state.range.selectNodeContents(block);
        state.range.setStart(node, offset);
        remainingInk.add(state.range);
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
          words: wordStarts(target), range: document.createRange(), index: -1
        });
      } else if (!isIntersecting && visible.has(target)) {
        remainingInk.delete(visible.get(target).range);
        visible.delete(target);
      }
    }
    schedulePaint();
  });

  function observeCopy(root) {
    if (!motion.matches) return;
    const selector = remainingInk ? "h1, h2, h3, p, .signature" : "h1, h2, h3";
    for (const block of root.querySelectorAll(selector)) {
      if (!block.closest('[role="status"], [aria-live], [data-lead-frame-status], noscript')) {
        observer.observe(block);
      }
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
        const state = visible.get(target.closest("p"));
        if (state) {
          state.words = null;
          state.index = -1;
        }
      }
      schedulePaint();
    });
    contentChanges.observe(reader, { childList: true, subtree: true });
  }
})();
