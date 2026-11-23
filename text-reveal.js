(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle("reveal-in-view", entry.isIntersecting);
    }
  });

  function observeCopy(root) {
    if (reducedMotion.matches) return;
    const blocks = root.querySelectorAll(
      "h1, h2, h3, p, .signature, .hero .actions, .book-actions, .booklet-invite-actions, " +
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
    observer.unobserve(block);
    block.classList.remove("reveal-pending", "reveal-in-view");
  }

  // A block that leaves during the delay can try again. Once the fade starts, let it finish.
  document.addEventListener("animationstart", event => {
    if (event.animationName === "reveal-copy") observer.unobserve(event.target);
  });
  document.addEventListener("animationend", event => {
    if (event.animationName === "reveal-copy") showImmediately(event.target);
  });
  document.addEventListener("focusin", event => {
    const block = event.target.closest(".reveal-pending");
    if (block) showImmediately(block);
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) document.querySelectorAll(".reveal-pending").forEach(showImmediately);
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
