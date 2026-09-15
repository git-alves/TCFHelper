// The class name is duplicated as a plain string in globals.css's
// `html.reveal-ready` rule (CSS can't import this) -- keep both in sync if
// it ever changes.
export const REVEAL_READY_CLASS = "reveal-ready";

// useReveal's hidden-until-scrolled-into-view treatment depends on
// IntersectionObserver, an API a no-JS visitor, a failed-hydration visitor,
// or an old browser will never have. React's own visible state can't fix
// that: the server has no way to know the client's capabilities, so
// whatever it renders is also what the very first client render must
// produce, on pain of a hydration mismatch -- there is no "detect the API,
// then render hidden" available to a React component itself.
//
// So the hidden state lives in CSS instead, gated behind this class, and
// this class is only ever added by this blocking, pre-paint script -- never
// by React. Confirms IntersectionObserver exists before opting in; nothing
// happens for prefers-reduced-motion here because that's a plain CSS media
// query in globals.css, which (unlike this one-shot script) keeps reacting
// if the OS preference changes while the page stays open. The safe default,
// with this script never having run at all, is always fully visible content
// -- exactly the no-JS/old-browser case this exists to protect.
export const REVEAL_INIT_SCRIPT = `
(function () {
  try {
    if (window.IntersectionObserver) {
      document.documentElement.classList.add(${JSON.stringify(REVEAL_READY_CLASS)});
    }
  } catch (e) {}
})();
`;
