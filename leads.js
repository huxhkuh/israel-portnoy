'use strict';

(() => {
  const config = window.ISRAEL_LEADS_CONFIG;
  let endpoint;
  try {
    endpoint = new URL(config?.webAppUrl);
    if (endpoint.origin !== 'https://script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(endpoint.pathname) || endpoint.username || endpoint.password || endpoint.hash) throw new Error('Invalid deployment');
  } catch {
    return;
  }

  const dialogElement = document.createElement('dialog');
  dialogElement.id = 'updates-dialog';
  dialogElement.setAttribute('aria-labelledby', 'updates-title');
  dialogElement.innerHTML = `
    <button class="updates-close" type="button" data-updates-close aria-label="סגירה" autofocus>×</button>
    <h2 id="updates-title">מכתבים מהשטח</h2>
    <p class="updates-invite">רוצים לקבל ממני את הסיפור הבא במייל?</p>
    <div class="subscription-form" data-updates-form data-updates-source="exit" hidden></div>
    <button class="updates-later" type="button" data-updates-close>אולי בפעם אחרת</button>
    <a class="updates-continue" hidden>להמשיך לקישור שבחרתי</a>`;
  const notice = document.createElement('p');
  notice.className = 'updates-notice';
  notice.setAttribute('role', 'status');
  notice.tabIndex = -1;
  notice.hidden = true;
  document.body.append(dialogElement, notice);
  const dialog = typeof dialogElement?.showModal === 'function' ? dialogElement : null;
  const shownKey = 'israel-portnoy:updates-shown:v1';
  const subscribedKey = 'israel-updates:subscribed:v1';
  const successMessage = 'נרשמתם לעדכונים מישראל. שמחים שתישארו בקשר.';
  let shown = readSession(shownKey);
  let subscribed = readSession(subscribedKey);

  function readSession(key) {
    try { return window.sessionStorage?.getItem(key) === '1'; }
    catch { return false; }
  }
  function writeSession(key) {
    try { window.sessionStorage?.setItem(key, '1'); }
    catch { /* In-memory flags still suppress repetition when storage is blocked. */ }
  }
  function rememberShown() { shown = true; writeSession(shownKey); }
  function googleScriptOrigin(origin) {
    try {
      const value = new URL(origin);
      return value.protocol === 'https:' && value.port === '' &&
        (['script.google.com', 'script.googleusercontent.com'].includes(value.hostname) || /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(value.hostname));
    } catch { return false; }
  }
  function belongsToFrame(source, frame) {
    if (!source || !frame.contentWindow) return false;
    try {
      let current = source;
      for (let depth = 0; depth < 8; depth++) {
        if (current === frame.contentWindow) return true;
        if (current.parent === current) return false;
        current = current.parent;
      }
    } catch { /* Ignore frame ancestry that cannot be verified. */ }
    return false;
  }

  function embed(shell) {
    shell.innerHTML = `
      <p data-lead-frame-status role="status">טוענים את טופס ההרשמה…</p>
      <iframe title="הצטרפות לרשימת התפוצה של ישראל פורטנוי" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <button type="button" class="updates-retry" hidden>לטעון את הטופס מחדש</button>`;
    const frame = shell.querySelector('iframe');
    const status = shell.querySelector('[data-lead-frame-status]');
    const retry = shell.querySelector('.updates-retry');
    const popup = shell.closest('#updates-dialog') === dialogElement;
    const url = new URL(endpoint.href);
    url.search = '';
    url.searchParams.set('mode', 'updates');
    url.searchParams.set('source', popup ? 'exit' : 'updates');
    url.searchParams.set('embed', '1');
    const context = { shell, frame, status, retry, popup, sender: null, nonce: null, loaded: false, initialized: false, failed: false, timer: null };
    context.initialize = () => {
      if (context.initialized && !context.failed) return;
      clearTimeout(context.timer);
      context.initialized = true;
      context.failed = false;
      context.loaded = false;
      context.sender = null;
      context.nonce = null;
      retry.hidden = true;
      status.hidden = false;
      status.textContent = 'טוענים את טופס ההרשמה…';
      status.setAttribute('role', 'status');
      frame.hidden = false;
      frame.classList.remove?.('lead-frame-ready');
      shell.classList.remove('lead-frame-unavailable');
      shell.hidden = false;
      context.timer = setTimeout(() => {
        if (context.loaded) return;
        context.failed = true;
        status.hidden = false;
        status.textContent = 'טופס ההרשמה לא נטען.';
        retry.hidden = false;
        status.setAttribute('role', 'alert');
        shell.classList.add('lead-frame-unavailable');
        frame.hidden = true;
      }, Math.min(60000, Math.max(5000, Number(config.loadTimeoutMs) || 25000)));
      frame.src = url.href;
    };
    retry.addEventListener('click', context.initialize);
    return context;
  }

  const contexts = [...document.querySelectorAll('[data-updates-form]')].map(embed);
  const popupContexts = contexts.filter(context => context.popup);
  const inlineContexts = contexts.filter(context => !context.popup);

  function displaySubscription() {
    inlineContexts.forEach(context => {
      clearTimeout(context.timer);
      context.shell.hidden = false;
      context.shell.classList.add('updates-subscribed');
      context.frame.hidden = true;
      context.retry.hidden = true;
      context.status.textContent = successMessage;
      context.status.setAttribute('role', 'status');
      context.status.hidden = false;
    });
  }
  function completeSubscription() {
    subscribed = true;
    rememberShown();
    writeSession(subscribedKey);
    displaySubscription();
    if (dialog?.open) dialog.close();
    if (notice) {
      notice.textContent = successMessage;
      notice.hidden = false;
      notice.focus({ preventScroll: true });
    }
  }

  addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object' || !googleScriptOrigin(event.origin)) return;
    const context = contexts.find(candidate => candidate.initialized && belongsToFrame(event.source, candidate.frame));
    if (!context) return;
    if (subscribed) return;
    if (data.type === 'israel-leads:hello') {
      if (typeof data.nonce !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(data.nonce)) return;
      context.sender = event.source;
      context.nonce = data.nonce;
      context.sender.postMessage({ type: 'israel-leads:authorize', nonce: context.nonce }, event.origin);
      return;
    }
    if (event.source !== context.sender || data.nonce !== context.nonce) return;
    if (data.type === 'israel-leads:ready') {
      context.loaded = true;
      context.failed = false;
      clearTimeout(context.timer);
      context.frame.hidden = false;
      context.retry.hidden = true;
      context.shell.classList.remove('lead-frame-unavailable');
      context.status.hidden = true;
      context.frame.classList.add('lead-frame-ready');
    }
    if (context.loaded && ['israel-leads:ready', 'israel-leads:height'].includes(data.type) && Number.isFinite(data.height)) {
      context.frame.style.height = String(Math.min(1800, Math.max(350, Math.ceil(data.height)))) + 'px';
    }
    if (context.loaded && data.type === 'israel-leads:subscribed') completeSubscription();
  });

  function editing() {
    const active = document.activeElement;
    return Boolean(active && (active.isContentEditable || active.tagName === 'IFRAME' || active.closest?.('input, textarea, select, [contenteditable="true"]')));
  }
  function openBanner(destination) {
    if (!dialog || shown || dialog.open || subscribed || document.hidden || editing()) return;
    const openDialog = document.querySelector('dialog[open]');
    if (openDialog && openDialog !== dialog) return;
    const onward = dialog.querySelector('.updates-continue');
    onward.hidden = !destination;
    if (destination) onward.href = destination;
    try { dialog.showModal(); }
    catch { return; }
    rememberShown();
    popupContexts.forEach(context => context.initialize());
  }
  function closeBanner() { if (dialog?.open) dialog.close(); }
  function exitIntent(event) {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches || event.relatedTarget || !Number.isFinite(event.clientY) || event.clientY > 0 || event.buttons) return;
    openBanner();
  }

  if (dialog) {
    dialog.querySelectorAll('[data-updates-close]').forEach(button => button.addEventListener('click', closeBanner));
    dialog.addEventListener('cancel', rememberShown);
    dialog.addEventListener('close', rememberShown);
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeBanner();
    });
    addEventListener('mouseout', exitIntent);
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      if (link.origin === location.origin || !['http:', 'https:'].includes(link.protocol)) return;
      if (shown || subscribed || dialog.open) return;
      openBanner(link.href);
      if (dialog.open) event.preventDefault();
    });
    // On touch screens, a deliberate swipe back to the beginning after reading.
    let touchScroll = null;
    document.addEventListener('touchstart', event => {
      touchScroll = null;
      if (shown || subscribed || event.touches.length !== 1) return;
      const container = event.target.closest?.('.read-scroll') || document.scrollingElement;
      if (container && container.scrollTop > window.innerHeight) touchScroll = container;
    }, { passive: true });
    document.addEventListener('scroll', event => {
      if (!touchScroll || (event.target !== document && event.target !== touchScroll)) return;
      if (touchScroll.scrollTop <= 2) {
        touchScroll = null;
        openBanner();
      }
    }, { capture: true, passive: true });
    document.addEventListener('touchcancel', () => { touchScroll = null; }, { passive: true });
  }
  if (subscribed) displaySubscription();
  else inlineContexts.forEach(context => context.initialize());
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    shown = shown || readSession(shownKey);
    subscribed = subscribed || readSession(subscribedKey);
    if (subscribed) displaySubscription();
    if (shown) closeBanner();
  });
})();
