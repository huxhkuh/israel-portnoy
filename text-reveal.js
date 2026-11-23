(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || !("IntersectionObserver" in window) ||
      !window.CSS?.highlights || !window.Highlight || !Intl.Segmenter) return;

  const segmenter = new Intl.Segmenter("he", { granularity: "grapheme" });
  const untyped = new Highlight();
  CSS.highlights.set("untyped-letters", untyped);
  const active = new Map();

  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      const state = active.get(target);
      if (isIntersecting && !state && target.classList.contains("reveal-pending")) {
        const next = {};
        next.timer = setTimeout(() => typeBlock(target, next), 1000);
        active.set(target, next);
      } else if (!isIntersecting && state) {
        if (state.range) showImmediately(target);
        else {
          clearTimeout(state.timer);
          active.delete(target);
        }
      }
    }
  });

  function typeBlock(block, state) {
    // Move a paint-only range across the original text to preserve RTL layout and links.
    const letters = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement.closest('[aria-hidden="true"], svg')) continue;
      for (const { segment, index } of segmenter.segment(node.data)) {
        if (segment.trim()) letters.push({ node, end: index + segment.length });
      }
    }
    if (!letters.length) return showImmediately(block);

    state.range = document.createRange();
    state.range.selectNodeContents(block);
    untyped.add(state.range);
    block.classList.replace("reveal-pending", "is-typing");

    const started = performance.now();
    const interval = Math.min(36, 3200 / letters.length);
    function advance(now) {
      const index = Math.floor((now - started) / interval);
      if (index >= letters.length) return showImmediately(block);
      const { node, end } = letters[Math.max(0, index)];
      // Reader search can replace a paragraph's text nodes while it is being typed.
      if (!block.contains(node) || end > node.length) return showImmediately(block);
      state.range.setStart(node, end);
      state.frame = requestAnimationFrame(advance);
    }
    advance(started);
  }

  function observeCopy(root) {
    if (reducedMotion.matches) return;
    const blocks = root.querySelectorAll(
      "h1, h2, h3, p, .signature, .hero .actions a, .book-actions a, .book-actions summary, .booklet-invite-actions a, " +
      ".contact-links a, .footer-row > *, .read-toc-summary, .read-page-number"
    );
    for (const block of blocks) {
      if (block.closest('[role="status"], [aria-live], [data-lead-frame-status], noscript') ||
          block.matches(":focus-within")) continue;
      block.classList.add("reveal-pending");
      observer.observe(block);
    }
  }

  function showImmediately(block) {
    const state = active.get(block);
    if (state) {
      clearTimeout(state.timer);
      cancelAnimationFrame(state.frame);
      if (state.range) untyped.delete(state.range);
      active.delete(block);
    }
    observer.unobserve(block);
    block.classList.remove("reveal-pending", "is-typing");
  }

  document.addEventListener("focusin", event => {
    const block = event.target.closest(".reveal-pending, .is-typing");
    if (block) showImmediately(block);
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) document.querySelectorAll(".reveal-pending, .is-typing").forEach(showImmediately);
  });

  observeCopy(document);
  const reader = document.querySelector("#read-text");
  if (reader && !reader.childElementCount) {
    const rendered = new MutationObserver(() => {
      observeCopy(reader);
      rendered.disconnect();
    });
    rendered.observe(reader, { childList: true });
  }
})();
