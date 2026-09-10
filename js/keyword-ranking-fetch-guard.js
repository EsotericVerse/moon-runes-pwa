(() => {
  const originalFetch = window.fetch.bind(window);
  const KEYWORD_ENDPOINT = '/analysis/keywords';
  const TIMEOUT_MS = 10000;

  window.fetch = function guardedFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (!url.includes(KEYWORD_ENDPOINT)) return originalFetch(input, init);

    const controller = new AbortController();
    const upstreamSignal = init.signal;
    let upstreamAbort = null;

    if (upstreamSignal) {
      if (upstreamSignal.aborted) controller.abort(upstreamSignal.reason);
      else {
        upstreamAbort = () => controller.abort(upstreamSignal.reason);
        upstreamSignal.addEventListener('abort', upstreamAbort, { once: true });
      }
    }

    const timer = setTimeout(() => {
      controller.abort(new DOMException('Keyword ranking request timed out', 'TimeoutError'));
    }, TIMEOUT_MS);

    return originalFetch(input, { ...init, signal: controller.signal })
      .finally(() => {
        clearTimeout(timer);
        if (upstreamSignal && upstreamAbort) upstreamSignal.removeEventListener('abort', upstreamAbort);
      });
  };
})();
