/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./assets/src/shared/phone.js"
/*!************************************!*\
  !*** ./assets/src/shared/phone.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   COUNTRIES: () => (/* binding */ COUNTRIES),
/* harmony export */   findCountry: () => (/* binding */ findCountry),
/* harmony export */   flagEmoji: () => (/* binding */ flagEmoji),
/* harmony export */   resolveDefault: () => (/* binding */ resolveDefault)
/* harmony export */ });
/* harmony import */ var _data_countries_json__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../data/countries.json */ "./assets/data/countries.json");
/**
 * Shared phone/country helpers used by both the admin builder (live preview)
 * and the storefront runtime, so the country list, flag rendering and default
 * resolution stay identical on both sides.
 *
 * The country dataset (iso2 / name / dial) lives in a single JSON file; flag
 * glyphs are derived from the iso2 code as Unicode regional-indicator pairs
 * (no flag images bundled).
 *
 * @package
 */



/**
 * Full country list, sorted by display name.
 *
 * @type {Array<{iso2:string,name:string,dial:string}>}
 */
const COUNTRIES = [..._data_countries_json__WEBPACK_IMPORTED_MODULE_0__].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Render the emoji flag for an ISO-3166 alpha-2 code (e.g. "bd" → 🇧🇩).
 *
 * @param {string} iso2 Two-letter country code.
 * @return {string} The emoji flag, or '' for an invalid code.
 */
function flagEmoji(iso2) {
  const code = String(iso2 || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return '';
  }
  return String.fromCodePoint(...[...code].map(c => 0x1f1e6 - 65 + c.charCodeAt(0)));
}

/**
 * Look up a country by ISO-2 code.
 *
 * @param {string} iso2 Two-letter country code.
 * @return {Object|undefined} The country record.
 */
function findCountry(iso2) {
  const code = String(iso2 || '').trim().toLowerCase();
  return COUNTRIES.find(c => c.iso2 === code);
}

/**
 * Resolve the country to show first: the preferred code when valid, otherwise
 * the United States as a safe, universally-known fallback.
 *
 * @param {string} preferred Preferred ISO-2 code (may be empty/invalid).
 * @return {Object} The resolved country record.
 */
function resolveDefault(preferred) {
  return findCountry(preferred) || findCountry('us') || COUNTRIES[0];
}

/***/ },

/***/ "./assets/src/store/analytics.js"
/*!***************************************!*\
  !*** ./assets/src/store/analytics.js ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initAnalytics: () => (/* binding */ initAnalytics)
/* harmony export */ });
/**
 * Storefront analytics pings.
 *
 * Fires POST `restUrl + 'analytics/hit'` with { setId, metric }:
 *   - 'impressions' once per set when it scrolls into view (IntersectionObserver).
 *                   Deduped via localStorage with an 18h window so a customer
 *                   reloading the same product page rapidly doesn't inflate it.
 *   - 'clicks'      on the first interaction within a set (any click / change
 *                   / input). Deduped via sessionStorage so each browser
 *                   session counts once — closing the tab/browser starts a
 *                   new session and the next click is recorded again.
 *
 * Cookie fallback is used when storage is blocked (private mode, etc.).
 *
 * @package
 */

const IMPRESSION_WINDOW = 18 * 60 * 60 * 1000;

/**
 * Read the localised store config defensively.
 *
 * @return {Object} optsetStore global or {}.
 */
function store() {
  return typeof window !== 'undefined' && window.optsetStore || {};
}

/**
 * Throttle key for a set + metric.
 *
 * @param {number} setId  Set id.
 * @param {string} metric Metric.
 * @return {string} Storage key.
 */
function key(setId, metric) {
  return 'optset_a_' + metric + '_' + setId;
}

/**
 * Read a stored value from a web Storage (localStorage / sessionStorage).
 *
 * @param {Storage} storage Storage object.
 * @param {string}  k       Key.
 * @return {string} The value, or '' when absent / blocked.
 */
function readStore(storage, k) {
  try {
    return storage.getItem(k) || '';
  } catch (e) {
    return '';
  }
}

/**
 * Write a value to a web Storage (no-op when blocked).
 *
 * @param {Storage} storage Storage object.
 * @param {string}  k       Key.
 * @param {string}  v       Value.
 * @return {boolean} True when stored successfully.
 */
function writeStore(storage, k, v) {
  try {
    storage.setItem(k, v);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Whether a session cookie marker exists for this key (used as a fallback
 * when storage is blocked, mirroring the sessionStorage semantics — the
 * cookie has no expires attribute so it lives only for the browser session).
 *
 * @param {string} k Key.
 * @return {boolean} True when the marker is present.
 */
function hasCookieMarker(k) {
  return new RegExp('(?:^|; )' + k + '=').test(document.cookie);
}

/**
 * Set a session-scoped cookie marker (no Expires → session cookie).
 *
 * @param {string} k Key.
 * @return {void}
 */
function setCookieMarker(k) {
  document.cookie = k + '=1; path=/; SameSite=Lax';
}

/**
 * Impression throttle — localStorage timestamp + 18h window. Falls back to a
 * dated cookie when storage is blocked.
 *
 * @param {number} setId Set id.
 * @return {boolean} True when within the window (skip ping).
 */
function impressionThrottled(setId) {
  const k = key(setId, 'impressions');
  const v = readStore(window.localStorage, k);
  if (v) {
    const last = parseInt(v, 10) || 0;
    if (last > 0 && Date.now() - last < IMPRESSION_WINDOW) {
      return true;
    }
  }
  const m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]+)'));
  if (m) {
    const last = parseInt(decodeURIComponent(m[1]), 10) || 0;
    return last > 0 && Date.now() - last < IMPRESSION_WINDOW;
  }
  return false;
}

/**
 * Record that an impression ping was sent (localStorage; cookie fallback).
 *
 * @param {number} setId Set id.
 * @return {void}
 */
function impressionMark(setId) {
  const k = key(setId, 'impressions');
  const ts = Date.now();
  if (writeStore(window.localStorage, k, String(ts))) {
    return;
  }
  const expires = new Date(ts + IMPRESSION_WINDOW).toUTCString();
  document.cookie = k + '=' + encodeURIComponent(ts) + '; expires=' + expires + '; path=/; SameSite=Lax';
}

/**
 * Click throttle — once per browser session via sessionStorage. Cookie
 * fallback is a session cookie (no Expires) so it also clears on browser
 * close, matching the sessionStorage semantics.
 *
 * @param {number} setId Set id.
 * @return {boolean} True when already counted this session.
 */
function clickThrottled(setId) {
  const k = key(setId, 'clicks');
  if (readStore(window.sessionStorage, k)) {
    return true;
  }
  return hasCookieMarker(k);
}

/**
 * Record that a click was already counted this session.
 *
 * @param {number} setId Set id.
 * @return {void}
 */
function clickMark(setId) {
  const k = key(setId, 'clicks');
  if (writeStore(window.sessionStorage, k, '1')) {
    return;
  }
  setCookieMarker(k);
}

/**
 * Send a metric ping (best-effort; failures are silent).
 *
 * @param {number} setId  Set id.
 * @param {string} metric Metric ('impressions' | 'clicks').
 * @return {void}
 */
function ping(setId, metric) {
  const cfg = store();
  const url = (cfg.restUrl || '') + 'analytics/hit';
  if (!cfg.restUrl || !setId) {
    return;
  }
  // X-WP-Nonce satisfies WP core's REST cookie check (action `wp_rest`).
  // `optset_nonce` satisfies our route's own verify_nonce body-fallback
  // (action `optset_rest`) — required because public_nonce() opens the gate
  // but the callback still re-checks the body nonce before recording.
  const body = JSON.stringify({
    setId,
    metric,
    optset_nonce: cfg.uploadNonce || ''
  });
  const headers = {
    'Content-Type': 'application/json',
    'X-WP-Nonce': cfg.nonce || ''
  };
  try {
    if (navigator.sendBeacon && metric === 'impressions') {
      const blob = new Blob([body], {
        type: 'application/json'
      });
      navigator.sendBeacon(url, blob);
    } else {
      window.fetch(url, {
        method: 'POST',
        headers,
        body,
        credentials: 'same-origin',
        keepalive: true
      }).catch(() => {});
    }
  } catch (e) {
    /* never break the page on analytics. */
  }
  if (metric === 'clicks') {
    clickMark(setId);
  } else {
    impressionMark(setId);
  }
}

/**
 * Attach impression + click tracking for every set under a root.
 *
 * @param {HTMLElement} root `.optset-options` wrapper.
 * @return {Function} Cleanup function.
 */
function initAnalytics(root) {
  const sets = root.querySelectorAll('.optset-set[data-set-id]');
  const cleanups = [];
  sets.forEach(setEl => {
    const setId = parseInt(setEl.getAttribute('data-set-id') || '0', 10);
    if (!setId) {
      return;
    }

    // Impressions via IntersectionObserver (fallback: immediate).
    const fireImpression = () => {
      if (!impressionThrottled(setId)) {
        ping(setId, 'impressions');
      }
    };
    if (typeof window.IntersectionObserver === 'function') {
      const io = new window.IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            fireImpression();
            io.disconnect();
          }
        });
      }, {
        threshold: 0.25
      });
      io.observe(setEl);
      cleanups.push(() => io.disconnect());
    } else {
      fireImpression();
    }

    // First interaction → click. Listen for `click` too so non-form
    // interactions (popup triggers, image / colour swatches, button
    // groups) count alongside `change` / `input` on real form controls.
    const events = ['click', 'change', 'input'];
    const onInteract = () => {
      if (!clickThrottled(setId)) {
        ping(setId, 'clicks');
      }
      events.forEach(ev => setEl.removeEventListener(ev, onInteract));
    };
    events.forEach(ev => setEl.addEventListener(ev, onInteract));
    cleanups.push(() => {
      events.forEach(ev => setEl.removeEventListener(ev, onInteract));
    });
  });
  return () => cleanups.forEach(fn => fn());
}

/***/ },

/***/ "./assets/src/store/collect.js"
/*!*************************************!*\
  !*** ./assets/src/store/collect.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   collectField: () => (/* binding */ collectField),
/* harmony export */   collectLinkedProducts: () => (/* binding */ collectLinkedProducts),
/* harmony export */   fieldMeta: () => (/* binding */ fieldMeta)
/* harmony export */ });
/* harmony import */ var _shared_phone__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shared/phone */ "./assets/src/shared/phone.js");
/**
 * DOM → selection-entry reader.
 *
 * For each field type slug (ARCHITECTURE §7) this reads the rendered
 * control(s) (DOM contract §8) into a normalised selection entry whose
 * `value` follows the §9 shapes:
 *   - scalar                text/textarea/email/url/tel/number/range/
 *                            select/toggle/colorpicker/font
 *   - [labels]              checkbox/radio/buttongroup/colorswatch/imageswatch
 *   - [{label,count}]       choice groups with a per-choice qty input
 *   - {date,time}           datetime
 *   - [{name,path}]         fileupload (decoded from the hidden JSON input)
 *   - "#hex"                colorpicker
 *
 * @package
 */



/**
 * Field types whose value is a single scalar from one input.
 *
 * @type {string[]}
 */
const SCALAR_INPUT_TYPES = ['text', 'textarea', 'email', 'url', 'tel', 'number', 'range'];

/**
 * Choice group types (multi/single radio/checkbox-style inputs).
 *
 * @type {string[]}
 */
const CHOICE_TYPES = ['checkbox', 'radio', 'buttongroup', 'colorswatch', 'imageswatch'];

/**
 * Read the field-level metadata from the wrapper element.
 *
 * @param {HTMLElement} fieldEl `.optset-field` wrapper.
 * @return {Object} { id, type, setId, label }.
 */
function fieldMeta(fieldEl) {
  const id = fieldEl.getAttribute('data-field-id') || '';
  const type = fieldEl.getAttribute('data-type') || '';
  const setId = parseInt(fieldEl.getAttribute('data-set-id') || '0', 10);
  let label = '';
  const labelEl = fieldEl.querySelector('.optset-field__label-text');
  if (labelEl) {
    label = labelEl.textContent.replace(/\*\s*$/, '').trim();
  }
  return {
    id,
    type,
    setId: setId || 0,
    label
  };
}

/**
 * Collect a per-choice quantity for a selected choice input, if present.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {string}      fieldId Field id.
 * @param {string}      index   Choice index.
 * @return {number} Quantity (0 when absent).
 */
function choiceQty(fieldEl, fieldId, index) {
  const qty = fieldEl.querySelector('[name="optset_qty_' + fieldId + '_' + index + '"]');
  if (!qty) {
    return 0;
  }
  const n = parseFloat(qty.value);
  return isFinite(n) ? n : 0;
}

/**
 * Build the selection entry for a choice-group field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectChoice(fieldEl, meta) {
  const inputs = fieldEl.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked');
  const labels = [];
  const indexes = [];
  let hasQty = false;
  const withCount = [];
  inputs.forEach(input => {
    const idx = input.value;
    const label = input.getAttribute('data-label') || (input.nextElementSibling ? input.nextElementSibling.textContent.trim() : idx);
    indexes.push(parseInt(idx, 10));
    labels.push(label);
    const qty = choiceQty(fieldEl, meta.id, idx);
    if (qty > 0) {
      hasQty = true;
    }
    withCount.push({
      label,
      count: qty > 0 ? qty : 1
    });
  });
  return {
    type: meta.type,
    setId: meta.setId,
    label: meta.label,
    value: hasQty ? withCount : labels,
    choiceIndexes: indexes,
    dynamics: {}
  };
}

/**
 * Build the selection entry for a toggle field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectToggle(fieldEl, meta) {
  const input = fieldEl.querySelector('.optset-toggle__input');
  const on = !!(input && input.checked);

  // Off → no choice selected, so an empty value. This keeps the field out of
  // the single-value pricing fallback (which would otherwise charge the
  // flat price even while the switch is off).
  if (!on) {
    return {
      type: meta.type,
      setId: meta.setId,
      label: meta.label,
      value: '',
      choiceIndexes: [],
      dynamics: {}
    };
  }

  // On → behave like a single selected choice. Carry the count (default 1)
  // so per-unit pricing and the quantity box work like the other choices.
  const label = input && input.getAttribute('data-label') || '';
  const qty = choiceQty(fieldEl, meta.id, '0');
  return {
    type: meta.type,
    setId: meta.setId,
    label: meta.label,
    value: [{
      label,
      count: qty > 0 ? qty : 1
    }],
    choiceIndexes: [0],
    dynamics: {}
  };
}

/**
 * Build the selection entry for select / fontpicker (hidden value input).
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectSelect(fieldEl, meta) {
  const hidden = fieldEl.querySelector('.optset-select__value');
  const raw = hidden ? hidden.value : '';
  const indexes = [];
  let label = '';
  if (raw !== '' && !isNaN(parseInt(raw, 10))) {
    const idx = parseInt(raw, 10);
    indexes.push(idx);
    const opt = fieldEl.querySelector('.optset-select__opt[data-index="' + idx + '"]');
    if (opt) {
      label = opt.getAttribute('data-label') || '';
    }
  }
  return {
    type: meta.type,
    setId: meta.setId,
    label: meta.label,
    value: label,
    choiceIndexes: indexes,
    dynamics: {}
  };
}

/**
 * Build the selection entry for a single scalar input field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectScalar(fieldEl, meta) {
  const input = fieldEl.querySelector('input[name="optset_input_' + meta.id + '"], textarea[name="optset_input_' + meta.id + '"]');
  return {
    type: meta.type,
    setId: meta.setId,
    label: meta.label,
    value: input ? input.value : '',
    choiceIndexes: [],
    dynamics: {}
  };
}

/**
 * Build the selection entry for a phone field. Reads the number input and, when
 * the country selector shows the dial code (flag_dial style), prefixes the
 * selected country's dial code so the stored/order value is a complete number
 * ("+880 1712…"). Other flag styles store the typed number as-is.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectPhone(fieldEl, meta) {
  const input = fieldEl.querySelector('input[name="optset_input_' + meta.id + '"]');
  let value = input ? input.value : '';
  const box = fieldEl.querySelector('.optset-phone');
  if (box && value.trim() !== '') {
    const style = box.getAttribute('data-flag-style');
    if (style === 'flag_dial') {
      const isoEl = box.querySelector('.optset-phone__iso');
      const country = isoEl ? (0,_shared_phone__WEBPACK_IMPORTED_MODULE_0__.findCountry)(isoEl.value) : null;
      if (country) {
        value = '+' + country.dial + ' ' + value;
      }
    }
  }
  return {
    type: meta.type,
    setId: meta.setId,
    label: meta.label,
    value,
    choiceIndexes: [],
    dynamics: {}
  };
}

/**
 * Build the selection entry for the color picker (returns "#hex").
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectColor(fieldEl, meta) {
  const input = fieldEl.querySelector('.optset-colorpicker__input');
  return {
    type: meta.type,
    setId: meta.setId,
    label: meta.label,
    value: input ? input.value : '',
    choiceIndexes: [],
    dynamics: {}
  };
}

/**
 * Build the selection entry for datetime ({ date, time }).
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectDatetime(fieldEl, meta) {
  const dateEl = fieldEl.querySelector('[name="optset_input_' + meta.id + '_date"]');
  const timeEl = fieldEl.querySelector('[name="optset_input_' + meta.id + '_time"]');
  return {
    type: meta.type,
    setId: meta.setId,
    label: meta.label,
    value: {
      date: dateEl ? dateEl.value : '',
      time: timeEl ? timeEl.value : ''
    },
    choiceIndexes: [],
    dynamics: {}
  };
}

/**
 * Build the selection entry for fileupload ([{ name, path }]).
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectUpload(fieldEl, meta) {
  const hidden = fieldEl.querySelector('.optset-upload__data');
  let files = [];
  if (hidden && hidden.value) {
    try {
      const parsed = JSON.parse(hidden.value);
      if (Array.isArray(parsed)) {
        files = parsed;
      }
    } catch (e) {
      files = [];
    }
  }
  return {
    type: meta.type,
    setId: meta.setId,
    label: meta.label,
    value: files,
    choiceIndexes: [],
    dynamics: {}
  };
}

/**
 * Build the linked-products list for a linkedproducts field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {Array<object>} [{ id, count, variation }].
 */
function collectLinkedProducts(fieldEl) {
  const selected = fieldEl.querySelectorAll('.optset-linked__native:checked');
  const list = [];
  selected.forEach(input => {
    const pid = parseInt(input.getAttribute('data-product-id') || input.value || '0', 10);
    // A merged variable product carries its chosen variation in a sibling
    // <select>; otherwise the variation id is baked onto the input.
    const card = input.closest('.optset-linked__card');
    const varSel = card && card.querySelector('.optset-linked__varsel');
    let variation = parseInt(input.getAttribute('data-variation') || '0', 10);
    if (varSel && varSel.value) {
      variation = parseInt(varSel.value, 10) || variation;
    }
    // Per-card quantity stepper, when the field enables quantity.
    const qtyEl = card && card.querySelector('.optset-linked__qty');
    const count = qtyEl ? Math.max(1, parseInt(qtyEl.value, 10) || 1) : 1;

    // Effective unit price for the on-page total. A merged variable card
    // reads the price of its selected variation <option>; otherwise the
    // price is baked onto the native input. WooCommerce already resolves
    // sale prices, so this is the real per-unit cost.
    let price = 0;
    if (varSel && varSel.selectedOptions && varSel.selectedOptions[0]) {
      price = parseFloat(varSel.selectedOptions[0].getAttribute('data-price') || '0');
    } else {
      price = parseFloat(input.getAttribute('data-lp-price') || '0');
    }
    if (!isFinite(price)) {
      price = 0;
    }
    if (pid > 0) {
      list.push({
        id: pid,
        count,
        variation: variation > 0 ? variation : 0,
        price
      });
    }
  });
  return list;
}

/**
 * Read one field wrapper into its selection entry.
 *
 * Layout-only / non-value types (heading, html, divider, spacer, section,
 * popup, shortcode, formula, advancedformula, linkedproducts) return null —
 * they carry no `optset_field_data` value (formula prices are computed in
 * pricing.js, linked products tracked separately).
 *
 * @param {HTMLElement} fieldEl `.optset-field` wrapper.
 * @return {object|null} Selection entry or null.
 */
function collectField(fieldEl) {
  const meta = fieldMeta(fieldEl);
  const type = meta.type;
  if (CHOICE_TYPES.indexOf(type) !== -1) {
    return collectChoice(fieldEl, meta);
  }
  if (type === 'toggle') {
    return collectToggle(fieldEl, meta);
  }
  if (type === 'select' || type === 'fontpicker') {
    return collectSelect(fieldEl, meta);
  }
  if (type === 'tel') {
    return collectPhone(fieldEl, meta);
  }
  if (SCALAR_INPUT_TYPES.indexOf(type) !== -1) {
    return collectScalar(fieldEl, meta);
  }
  if (type === 'colorpicker') {
    return collectColor(fieldEl, meta);
  }
  if (type === 'datetime') {
    return collectDatetime(fieldEl, meta);
  }
  if (type === 'date' || type === 'time') {
    return collectScalar(fieldEl, meta);
  }
  if (type === 'fileupload') {
    return collectUpload(fieldEl, meta);
  }

  // formula / advancedformula / layout-only types: no DOM value.
  return null;
}

/***/ },

/***/ "./assets/src/store/conditions.js"
/*!****************************************!*\
  !*** ./assets/src/store/conditions.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyVisibility: () => (/* binding */ applyVisibility),
/* harmony export */   isVisible: () => (/* binding */ isVisible),
/* harmony export */   readLogic: () => (/* binding */ readLogic)
/* harmony export */ });
/* harmony import */ var _money__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./money */ "./assets/src/store/money.js");
/**
 * Conditional-logic engine.
 *
 * Reads each field's `data-logic-rules` JSON
 * ({ action:'show'|'hide', match:'all'|'any',
 *    rules:[{ source, operator, value }] }) and toggles `.optset-hidden` on the
 * field wrapper. Operators per ARCHITECTURE §6:
 * is, is_not, empty, not_empty, contains, not_contains, gt, lt, gte, lte,
 * starts_with, between, checked.
 *
 * `action` decides what a satisfied condition does:
 *   - 'show' (default): field is hidden until the rules match.
 *   - 'hide': field is visible until the rules match, then hidden.
 *
 * Hidden fields are excluded from pricing and required validation by the
 * controller, which reads the visibility map produced here.
 *
 * Sentinel rule values let a Toggle/boolean source be matched without knowing
 * its choice label: `__checked__` / `__unchecked__` compare the field's
 * checked state directly.
 *
 * @package
 */



/**
 * Reduce a selection entry to a comparable scalar string for operators.
 *
 * @param {object|undefined} entry Selection entry for the source field.
 * @return {string} Comparable string ('' when nothing chosen).
 */
function sourceScalar(entry) {
  if (!entry) {
    return '';
  }
  const v = entry.value;
  if (v === null || v === undefined) {
    return '';
  }
  if (Array.isArray(v)) {
    return v.map(x => x && typeof x === 'object' ? String(x.label !== undefined ? x.label : x.name || '') : String(x)).join(',');
  }
  if (typeof v === 'object') {
    // datetime { date, time } etc.
    return Object.keys(v).map(k => String(v[k])).join(' ').trim();
  }
  return String(v);
}

/**
 * Reduce a selection entry to the list of comparable scalar strings. A choice
 * group yields one string per selected choice (so membership operators can
 * match a single chosen option); a scalar field yields a single-element list.
 *
 * @param {object|undefined} entry Selection entry for the source field.
 * @return {string[]} Comparable strings (empty array when nothing chosen).
 */
function sourceValues(entry) {
  if (!entry) {
    return [];
  }
  const v = entry.value;
  if (v === null || v === undefined || v === '') {
    return [];
  }
  if (Array.isArray(v)) {
    return v.map(x => x && typeof x === 'object' ? String(x.label !== undefined ? x.label : x.name || '') : String(x));
  }
  const s = sourceScalar(entry);
  return s === '' ? [] : [s];
}

/**
 * Whether the source field currently has any selection/value.
 *
 * @param {object|undefined} entry Source selection entry.
 * @return {boolean} True when non-empty.
 */
function sourceChecked(entry) {
  if (!entry) {
    return false;
  }
  if (Array.isArray(entry.choiceIndexes) && entry.choiceIndexes.length) {
    return true;
  }
  const s = sourceScalar(entry);
  return s !== '' && s !== '0';
}

/**
 * Evaluate one rule against the live selections map.
 *
 * @param {Object} rule       { source, operator, value }.
 * @param {Object} selections fieldId → selection entry.
 * @return {boolean} Rule outcome.
 */
function evalRule(rule, selections) {
  const entry = selections[rule.source];
  const left = sourceScalar(entry);
  const values = sourceValues(entry);
  const right = rule.value === undefined ? '' : String(rule.value);
  const op = rule.operator;

  // Boolean sentinels (Toggle "Checked"/"Unchecked"): compare the checked
  // state directly, regardless of the chosen operator.
  if (right === '__checked__') {
    return op === 'is_not' ? !sourceChecked(entry) : sourceChecked(entry);
  }
  if (right === '__unchecked__') {
    return op === 'is_not' ? sourceChecked(entry) : !sourceChecked(entry);
  }
  switch (op) {
    case 'is':
      // Match when ANY selected value equals the target (works for both
      // single-value fields and multi-select choice groups).
      return values.indexOf(right) !== -1;
    case 'is_not':
      return values.indexOf(right) === -1;
    case 'empty':
      return values.length === 0;
    case 'not_empty':
      return values.length > 0;
    case 'contains':
      return values.some(v => v.indexOf(right) !== -1);
    case 'not_contains':
      return !values.some(v => v.indexOf(right) !== -1);
    case 'gt':
      return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(left) > (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(right);
    case 'lt':
      return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(left) < (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(right);
    case 'gte':
      return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(left) >= (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(right);
    case 'lte':
      return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(left) <= (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(right);
    case 'starts_with':
      return left.indexOf(right) === 0;
    case 'between':
      {
        const parts = right.split(',').map(p => (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(p));
        const n = (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(left);
        if (parts.length < 2) {
          return false;
        }
        const lo = Math.min(parts[0], parts[1]);
        const hi = Math.max(parts[0], parts[1]);
        return n >= lo && n <= hi;
      }
    case 'checked':
      return sourceChecked(entry);
    default:
      return true;
  }
}

/**
 * Parse a field's logic rules from its wrapper.
 *
 * @param {HTMLElement} fieldEl `.optset-field` wrapper.
 * @return {object|null} { match, rules } or null when no logic.
 */
function readLogic(fieldEl) {
  if (fieldEl.getAttribute('data-logic') !== 'yes') {
    return null;
  }
  const raw = fieldEl.getAttribute('data-logic-rules');
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.rules) && parsed.rules.length) {
      return {
        action: parsed.action === 'hide' ? 'hide' : 'show',
        match: parsed.match === 'any' ? 'any' : 'all',
        rules: parsed.rules
      };
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Decide a field's visibility from its logic + the live selections.
 *
 * @param {Object} logic      { action, match, rules } (from readLogic).
 * @param {Object} selections fieldId → selection entry.
 * @return {boolean} True = the field should be visible.
 */
function isVisible(logic, selections) {
  if (!logic) {
    return true;
  }
  const results = logic.rules.map(r => evalRule(r, selections));
  const matched = logic.match === 'any' ? results.some(Boolean) : results.every(Boolean);

  // 'hide' inverts: matched → hidden. 'show' (default): matched → visible.
  return logic.action === 'hide' ? !matched : matched;
}

/**
 * Apply a visibility decision to a field wrapper.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {boolean}     visible Visible flag.
 * @return {void}
 */
function applyVisibility(fieldEl, visible) {
  if (visible) {
    fieldEl.classList.remove('optset-hidden');
  } else {
    fieldEl.classList.add('optset-hidden');
  }
}

/***/ },

/***/ "./assets/src/store/controller.js"
/*!****************************************!*\
  !*** ./assets/src/store/controller.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Controller)
/* harmony export */ });
/* harmony import */ var _state__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./state */ "./assets/src/store/state.js");
/* harmony import */ var _collect__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./collect */ "./assets/src/store/collect.js");
/* harmony import */ var _pricing__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pricing */ "./assets/src/store/pricing.js");
/* harmony import */ var _conditions__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./conditions */ "./assets/src/store/conditions.js");
/* harmony import */ var _upload__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./upload */ "./assets/src/store/upload.js");
/* harmony import */ var _widgets__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./widgets */ "./assets/src/store/widgets.js");
/* harmony import */ var _analytics__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./analytics */ "./assets/src/store/analytics.js");
/* harmony import */ var _variations__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./variations */ "./assets/src/store/variations.js");
/* harmony import */ var _validate__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./validate */ "./assets/src/store/validate.js");
/**
 * Per-form orchestrator.
 *
 * One Controller owns a single `.optset-options` wrapper (its product
 * `form.cart`). It: discovers fields, wires change/widget/upload events,
 * recomputes conditions + pricing on every change, writes the hidden inputs
 * the server reads, syncs variation prices, fires analytics, and validates
 * on submit (blocking native + theme ajax add-to-cart when invalid).
 *
 * Defensive throughout: a thrown error must never break add-to-cart.
 *
 * @package
 */











/**
 * Find the owning WooCommerce form for an options wrapper.
 *
 * @param {HTMLElement} root `.optset-options` element.
 * @return {HTMLElement|null} The `form.cart`, or null.
 */
function ownerForm(root) {
  return root.closest('form.cart') || root.closest('form') || document.querySelector('form.cart');
}

/**
 * Orchestrates one product form's option set(s).
 */
class Controller {
  /**
   * @param {HTMLElement} root `.optset-options` wrapper.
   */
  constructor(root) {
    this.root = root;
    this.form = ownerForm(root);
    this.state = new _state__WEBPACK_IMPORTED_MODULE_0__["default"]();
    this.fields = {};
    this.logic = {};
    this.cleanups = [];
    this._raf = 0;
  }

  /**
   * Boot the controller (idempotent per element).
   *
   * @return {void}
   */
  init() {
    if (this.root.__optsetBound) {
      return;
    }
    this.root.__optsetBound = true;
    try {
      this.discoverFields();
      this.bindEvents();
      const base = (0,_variations__WEBPACK_IMPORTED_MODULE_7__.readBase)(this.root);
      this.state.setBase(base.base, base.pct);
      this.cleanups.push((0,_variations__WEBPACK_IMPORTED_MODULE_7__.initVariations)(this.root, this.form, b => {
        this.state.setBase(b.base, b.pct);
        this.recompute();
      }));
      this.cleanups.push((0,_analytics__WEBPACK_IMPORTED_MODULE_6__.initAnalytics)(this.root));
      this.recompute();
      this.root.classList.remove('optset-loading');
    } catch (e) {
      // Never leave the form unusable.
      this.root.classList.remove('optset-loading');
    }
  }

  /**
   * Index every `.optset-field` wrapper and prepare its logic + widgets.
   *
   * @return {void}
   */
  discoverFields() {
    const els = this.root.querySelectorAll('.optset-field[data-field-id]');
    els.forEach(el => {
      const id = el.getAttribute('data-field-id');
      if (!id) {
        return;
      }
      this.fields[id] = el;
      const logic = (0,_conditions__WEBPACK_IMPORTED_MODULE_3__.readLogic)(el);
      if (logic) {
        this.logic[id] = logic;
      }
      (0,_widgets__WEBPACK_IMPORTED_MODULE_5__.initWidgets)(el, () => this.scheduleRecompute());
      if (el.getAttribute('data-type') === 'fileupload') {
        this.cleanups.push((0,_upload__WEBPACK_IMPORTED_MODULE_4__.initUpload)(el, () => this.scheduleRecompute()));
      }
    });
  }

  /**
   * Bind delegated change/input + submit handlers.
   *
   * @return {void}
   */
  bindEvents() {
    const onChange = () => this.scheduleRecompute();
    this.root.addEventListener('change', onChange);
    this.root.addEventListener('input', onChange);
    this.cleanups.push(() => {
      this.root.removeEventListener('change', onChange);
      this.root.removeEventListener('input', onChange);
    });
    if (this.form) {
      const onSubmit = e => {
        if (!this.validate()) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };
      this.form.addEventListener('submit', onSubmit, true);
      this.cleanups.push(() => this.form.removeEventListener('submit', onSubmit, true));

      // Theme / WC ajax add-to-cart buttons.
      const btnSelector = '.single_add_to_cart_button, [name="add-to-cart"], .ajax_add_to_cart';
      const onClick = e => {
        const btn = e.target.closest(btnSelector);
        if (!btn) {
          return;
        }
        if (!this.validate()) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };
      this.form.addEventListener('click', onClick, true);
      this.cleanups.push(() => this.form.removeEventListener('click', onClick, true));
    }
  }

  /**
   * Coalesce rapid changes into a single recompute on the next frame.
   *
   * @return {void}
   */
  scheduleRecompute() {
    if (this._raf) {
      return;
    }
    const run = () => {
      this._raf = 0;
      this.recompute();
    };
    this._raf = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(run) : window.setTimeout(run, 16);
  }

  /**
   * Re-read the DOM, evaluate conditions, price, and write hidden inputs.
   *
   * @return {void}
   */
  recompute() {
    try {
      // 1. Collect raw selections from every value field.
      const selections = {};
      Object.keys(this.fields).forEach(id => {
        const entry = (0,_collect__WEBPACK_IMPORTED_MODULE_1__.collectField)(this.fields[id]);
        if (entry) {
          selections[id] = entry;
          this.state.setSelection(id, entry);
        } else {
          this.state.setSelection(id, null);
        }
      });

      // 2. Evaluate conditional visibility (iterate twice so chained
      //    rules settle against the latest selections).
      const visibility = {};
      for (let pass = 0; pass < 2; pass++) {
        Object.keys(this.fields).forEach(id => {
          const logic = this.logic[id];
          const vis = (0,_conditions__WEBPACK_IMPORTED_MODULE_3__.isVisible)(logic, selections);
          visibility[id] = vis;
        });
      }
      Object.keys(this.fields).forEach(id => {
        (0,_conditions__WEBPACK_IMPORTED_MODULE_3__.applyVisibility)(this.fields[id], visibility[id]);
        this.state.setCondition(id, visibility[id]);
      });

      // 3. Price each visible field.
      const formulaVars = (0,_pricing__WEBPACK_IMPORTED_MODULE_2__.collectFormulaVars)(selections, this.fields);
      const dynamics = this.shippingDynamics();
      let optionsTotal = 0;
      Object.keys(this.fields).forEach(id => {
        const el = this.fields[id];
        const type = el.getAttribute('data-type') || '';
        if (visibility[id] === false) {
          this.state.clearOptionPrice(id);
          return;
        }
        let price = 0;
        if (type === 'formula' || type === 'advancedformula') {
          price = (0,_pricing__WEBPACK_IMPORTED_MODULE_2__.priceFormula)(el, type, this.state.data.basePricePct, formulaVars, dynamics);
        } else if (selections[id]) {
          price = (0,_pricing__WEBPACK_IMPORTED_MODULE_2__.priceField)(el, selections[id], this.state.data.basePricePct);
        }
        this.state.setOptionPrice(id, price);
        optionsTotal += price;
      });

      // 4. Linked products. They become their own cart lines, but their
      //    cost is reflected in the on-page total so the preview matches
      //    what the shopper actually pays.
      const linked = [];
      Object.keys(this.fields).forEach(id => {
        if (this.fields[id].getAttribute('data-type') === 'linkedproducts' && visibility[id] !== false) {
          (0,_collect__WEBPACK_IMPORTED_MODULE_1__.collectLinkedProducts)(this.fields[id]).forEach(p => linked.push(p));
        }
      });
      this.state.setLinkedProducts(linked);

      // 5. Derived totals + price spans (display = converted).
      this.state.recomputeTotals();
      (0,_pricing__WEBPACK_IMPORTED_MODULE_2__.renderPriceSpans)(this.root, optionsTotal, this.state.data.basePrice, this.state.data.linkedPrice);

      // 6. Serialise raw (base, non-converted) values for the server.
      this.writeHiddenInputs(selections, linked, visibility);
      this.state.emit();
    } catch (e) {
      /* recompute must never throw. */
    }
  }

  /**
   * Build the advancedformula shipping/dynamics variable bag from the
   * `optset_shipping_dynamics` hidden input + current product price.
   *
   * @return {Object} Dynamic variable map.
   */
  shippingDynamics() {
    const out = {
      product_price: this.state.data.basePricePct,
      product_quantity: 1
    };
    try {
      const el = this.form ? this.form.querySelector('[name="optset_shipping_dynamics"]') : null;
      if (el && el.value) {
        const s = JSON.parse(el.value);
        if (s && typeof s === 'object') {
          out.product_weight = parseFloat(s.weight) || 0;
          out.product_length = parseFloat(s.length) || 0;
          out.product_width = parseFloat(s.width) || 0;
          out.product_height = parseFloat(s.height) || 0;
        }
      }
      const qty = this.form ? this.form.querySelector('input.qty, [name="quantity"]') : null;
      if (qty) {
        out.product_quantity = Math.max(1, parseInt(qty.value, 10) || 1);
      }
    } catch (e) {
      /* ignore — fall back to base map. */
    }
    return out;
  }

  /**
   * Write the §8 hidden inputs (raw selection, linked products).
   *
   * @param {Object} selections fieldId → entry.
   * @param {Array}  linked     Linked-product list.
   * @param {Object} visibility fieldId → boolean.
   * @return {void}
   */
  writeHiddenInputs(selections, linked, visibility) {
    if (!this.form) {
      return;
    }
    // Only visible fields are submitted (hidden-by-logic excluded).
    const payload = {};
    Object.keys(selections).forEach(id => {
      if (visibility[id] === false) {
        return;
      }
      payload[id] = selections[id];
    });
    const set = (name, value) => {
      const el = this.form.querySelector('[name="' + name + '"]');
      if (el) {
        el.value = value;
      }
    };
    set('optset_field_data', JSON.stringify(payload));
    set('optset_linked_products', JSON.stringify(linked));
  }

  /**
   * Run validation across visible fields.
   *
   * @return {boolean} True when the form may submit.
   */
  validate() {
    try {
      const selections = this.state.data.selections;
      const visibility = this.state.data.conditions;
      const res = (0,_validate__WEBPACK_IMPORTED_MODULE_8__.validateAll)(this.root, selections, this.fields, visibility);
      this.state.setErrors(res.required, res.minmax);
      this.state.emit();
      return res.ok;
    } catch (e) {
      // On internal failure, do not block the customer.
      return true;
    }
  }

  /**
   * Detach all listeners + observers.
   *
   * @return {void}
   */
  destroy() {
    this.cleanups.forEach(fn => {
      try {
        fn();
      } catch (e) {
        /* ignore */
      }
    });
    this.cleanups = [];
    this.root.__optsetBound = false;
  }
}

/***/ },

/***/ "./assets/src/store/date.js"
/*!**********************************!*\
  !*** ./assets/src/store/date.js ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   wireDate: () => (/* binding */ wireDate)
/* harmony export */ });
/* harmony import */ var flatpickr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! flatpickr */ "./node_modules/flatpickr/dist/esm/index.js");
/* harmony import */ var flatpickr_dist_flatpickr_min_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! flatpickr/dist/flatpickr.min.css */ "./node_modules/flatpickr/dist/flatpickr.min.css");
/**
 * Storefront date-field enhancement.
 *
 * Turns the readonly `.optset-date-input` rendered by DateField.php into a
 * flatpickr calendar, honouring every restriction the builder can set:
 * display format, earliest/latest bounds (none | today | a custom date),
 * blocked today, blocked specific dates, blocked weekdays and blocked
 * days-of-the-month. Calls `onChange` on every pick so the pricing/validation
 * layer re-runs (a flat-priced date still adds its cost like any value field).
 *
 * @package
 */




/**
 * Parse a JSON data-* attribute into an array, tolerating empty/malformed.
 *
 * @param {HTMLElement} el   Element.
 * @param {string}      name Attribute name.
 * @return {Array} Parsed array (empty on failure).
 */
function jsonAttr(el, name) {
  const raw = el.getAttribute(name);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Whether two dates fall on the same calendar day.
 *
 * @param {Date} a First date.
 * @param {Date} b Second date.
 * @return {boolean} Same day.
 */
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Resolve a min/max bound to a flatpickr-acceptable value.
 *
 * @param {string} mode   none | today | custom.
 * @param {string} value  Stored formatted date (custom mode).
 * @param {string} format flatpickr/PHP token.
 * @return {string|Date|undefined} Bound, or undefined when unbounded.
 */
function resolveBound(mode, value, format) {
  if (mode === 'today') {
    return 'today';
  }
  if (mode === 'custom' && value) {
    const parsed = flatpickr__WEBPACK_IMPORTED_MODULE_0__["default"].parseDate(value, format);
    return parsed || undefined;
  }
  return undefined;
}

/**
 * Wire one date field.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
function wireDate(fieldEl, onChange) {
  const input = fieldEl.querySelector('.optset-date-input');
  if (!input || input.__optsetDate) {
    return;
  }
  input.__optsetDate = true;
  const format = input.getAttribute('data-format') || 'd/m/Y';

  // Blocked specific dates → Date objects for a robust same-day compare.
  const blockedDates = jsonAttr(input, 'data-disable-dates').map(s => flatpickr__WEBPACK_IMPORTED_MODULE_0__["default"].parseDate(String(s), format)).filter(Boolean);
  const blockedWeekdays = jsonAttr(input, 'data-disable-weekdays').map(Number);
  const blockedMonthDays = jsonAttr(input, 'data-disable-monthdays').map(Number);
  const blockToday = input.getAttribute('data-disable-today') === 'yes';
  const disable = [date => {
    if (blockToday && sameDay(date, new Date())) {
      return true;
    }
    if (blockedWeekdays.indexOf(date.getDay()) !== -1) {
      return true;
    }
    if (blockedMonthDays.indexOf(date.getDate()) !== -1) {
      return true;
    }
    return blockedDates.some(d => sameDay(d, date));
  }];
  try {
    (0,flatpickr__WEBPACK_IMPORTED_MODULE_0__["default"])(input, {
      dateFormat: format,
      allowInput: false,
      disableMobile: true,
      minDate: resolveBound(input.getAttribute('data-min-mode') || 'none', input.getAttribute('data-min-date') || '', format),
      maxDate: resolveBound(input.getAttribute('data-max-mode') || 'none', input.getAttribute('data-max-date') || '', format),
      disable,
      onChange: () => onChange()
    });
  } catch (e) {
    /* a broken picker must never wedge the product form. */
  }
}

/***/ },

/***/ "./assets/src/store/formula.js"
/*!*************************************!*\
  !*** ./assets/src/store/formula.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   evaluateAdvanced: () => (/* binding */ evaluateAdvanced),
/* harmony export */   evaluateFormula: () => (/* binding */ evaluateFormula),
/* harmony export */   evaluateSimple: () => (/* binding */ evaluateSimple)
/* harmony export */ });
/**
 * Client-side formula evaluators — faithful ports of the PHP engines.
 *
 * - `simple`  : mirrors OptionSetBuilder\Formula\ArithmeticEvaluator ({{var}} + trailing
 *               percent sugar, four-function arithmetic, result clamped >= 0).
 * - `advanced`: mirrors OptionSetBuilder\Formula\Ast\ExpressionEngine ([var] placeholders,
 *               comparisons, logical &/||, whitelisted functions
 *               if/abs/ceil/floor/round/pow/min/max, precedence per the PHP
 *               recursive-descent parser).
 *
 * These exist only for the live storefront preview — the server recomputes
 * authoritatively from the raw selection on add-to-cart.
 *
 * @package
 */

/* -------------------------------------------------------------------------- */
/* Simple arithmetic evaluator (ArithmeticEvaluator)                          */
/* -------------------------------------------------------------------------- */

/**
 * Evaluate a parenthesis-free expression: * / first, then + - (LTR).
 *
 * @param {string} expr Flat expression.
 * @return {number} Result.
 */
function evaluateFlat(expr) {
  const num = '(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
  let work = expr;
  const mul = new RegExp(num + '([*/])' + num);
  let m = work.match(mul);
  while (m) {
    const left = parseFloat(m[1]);
    const right = parseFloat(m[3]);
    let value;
    if (m[2] === '*') {
      value = left * right;
    } else {
      if (right === 0) {
        throw new Error('Division by zero.');
      }
      value = left / right;
    }
    work = spliceFirst(work, m[0], value);
    m = work.match(mul);
  }
  const add = new RegExp(num + '([+-])' + num);
  m = work.match(add);
  while (m) {
    const left = parseFloat(m[1]);
    const right = parseFloat(m[3]);
    const value = m[2] === '+' ? left + right : left - right;
    work = spliceFirst(work, m[0], value);
    m = work.match(add);
  }
  if (!isNumericString(work)) {
    throw new Error('Invalid expression result.');
  }
  return parseFloat(work);
}

/**
 * Replace only the first occurrence of `search` in `haystack`.
 *
 * @param {string} haystack Source.
 * @param {string} search   Substring.
 * @param {number} value    Replacement number.
 * @return {string} Result.
 */
function spliceFirst(haystack, search, value) {
  const at = haystack.indexOf(search);
  if (at === -1) {
    return haystack;
  }
  return haystack.slice(0, at) + numberToString(value) + haystack.slice(at + search.length);
}

/**
 * Render a float without exponent notation (mirrors %.14F + trim).
 *
 * @param {number} value Number.
 * @return {string} String form.
 */
function numberToString(value) {
  let str = value.toFixed(14);
  str = str.replace(/0+$/, '').replace(/\.$/, '');
  return str === '' || str === '-' ? '0' : str;
}

/**
 * Strict numeric-string test (PHP is_numeric parity for our alphabet).
 *
 * @param {string} str Candidate.
 * @return {boolean} True when fully numeric.
 */
function isNumericString(str) {
  return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(str);
}

/**
 * Verify every "(" has a matching ")".
 *
 * @param {string} expr Sanitised expression.
 * @return {boolean} True when balanced.
 */
function balancedParens(expr) {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') {
      depth++;
    } else if (expr[i] === ')') {
      depth--;
      if (depth < 0) {
        return false;
      }
    }
  }
  return depth === 0;
}

/**
 * Evaluate the simple {{var}} arithmetic formula.
 *
 * @param {string} expression Raw formula.
 * @param {Object} vars       name => numeric value map.
 * @return {number} Result clamped to >= 0 (0 on any failure).
 */
function evaluateSimple(expression, vars) {
  try {
    let expr = String(expression == null ? '' : expression);
    const bag = vars || {};
    expr = expr.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_all, key) => {
      const v = bag[key];
      return v !== undefined && v !== '' && v !== null ? String(v) : '0';
    });
    expr = expr.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    expr = expr.replace(/\s+/g, '');
    if (expr === '' || !/^[0-9+\-*/().]+$/.test(expr)) {
      return 0;
    }
    if (!balancedParens(expr)) {
      return 0;
    }

    // Collapse innermost parentheses repeatedly.
    let guard = 0;
    while (expr.indexOf('(') !== -1 && guard < 1000) {
      expr = expr.replace(/\(([^()]+)\)/g, (_all, inner) => numberToString(evaluateFlat(inner)));
      guard++;
    }
    const result = evaluateFlat(expr);
    return isFinite(result) && result >= 0 ? result : 0;
  } catch (e) {
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/* Advanced AST engine (ExpressionEngine / Lexer / Parser / Nodes)            */
/* -------------------------------------------------------------------------- */

const T_NUMBER = 1;
const T_VAR = 2;
const T_IDENT = 3;
const T_OP = 4;
const T_LPAREN = 5;
const T_RPAREN = 6;
const T_COMMA = 7;
const T_EOF = 8;
const FUNCTIONS = ['if', 'abs', 'ceil', 'floor', 'round', 'pow', 'min', 'max'];

/**
 * Coerce any value to a float for arithmetic (engine->toNumber parity).
 *
 * @param {*} value Value.
 * @return {number} Float.
 */
function toNum(value) {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  const n = parseFloat(value);
  return isFinite(n) ? n : 0;
}

/**
 * Coerce any value to a boolean (engine->toBool parity).
 *
 * @param {*} value Value.
 * @return {boolean} Boolean.
 */
function toBool(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value !== '' && isFinite(parseFloat(value))) {
    return parseFloat(value) !== 0;
  }
  return !!value;
}

/**
 * Tokenize an advanced expression. Mirrors Ast\Lexer exactly.
 *
 * @param {string} src Source.
 * @return {Array<object>} Token list ending with a T_EOF token.
 */
function tokenize(src) {
  const tokens = [];
  const len = src.length;
  let i = 0;
  const isSpace = c => /\s/.test(c);
  const isDigit = c => c >= '0' && c <= '9';
  const isAlpha = c => /[a-zA-Z]/.test(c);
  while (i < len) {
    const ch = src[i];
    if (isSpace(ch)) {
      i++;
      continue;
    }
    if (ch === '[') {
      const start = i;
      i++;
      let name = '';
      while (i < len && src[i] !== ']') {
        name += src[i];
        i++;
      }
      if (i >= len || src[i] !== ']') {
        throw new Error('Unclosed variable placeholder at position ' + start);
      }
      i++;
      name = name.trim();
      if (name === '') {
        throw new Error('Empty variable placeholder at position ' + start);
      }
      tokens.push({
        type: T_VAR,
        value: name,
        pos: start
      });
      continue;
    }
    if (isDigit(ch) || ch === '.') {
      const start = i;
      let number = '';
      let dots = 0;
      while (i < len) {
        const c = src[i];
        if (c === '.') {
          dots++;
          if (dots > 1) {
            break;
          }
          number += c;
          i++;
          continue;
        }
        if (isDigit(c)) {
          number += c;
          i++;
          continue;
        }
        break;
      }
      if (number === '.' || number === '') {
        throw new Error('Invalid number at position ' + start);
      }
      tokens.push({
        type: T_NUMBER,
        value: parseFloat(number),
        pos: start
      });
      continue;
    }
    if (isAlpha(ch)) {
      const start = i;
      let ident = '';
      while (i < len && isAlpha(src[i])) {
        ident += src[i];
        i++;
      }
      tokens.push({
        type: T_IDENT,
        value: ident,
        pos: start
      });
      continue;
    }
    if (ch === '(') {
      tokens.push({
        type: T_LPAREN,
        value: '(',
        pos: i
      });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({
        type: T_RPAREN,
        value: ')',
        pos: i
      });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({
        type: T_COMMA,
        value: ',',
        pos: i
      });
      i++;
      continue;
    }
    const two = i + 1 < len ? ch + src[i + 1] : '';
    if (two === '>=' || two === '<=' || two === '!=' || two === '||') {
      tokens.push({
        type: T_OP,
        value: two,
        pos: i
      });
      i += 2;
      continue;
    }
    if ('+-*/><=&'.indexOf(ch) !== -1) {
      tokens.push({
        type: T_OP,
        value: ch,
        pos: i
      });
      i++;
      continue;
    }
    throw new Error('Unexpected character "' + ch + '" at position ' + i);
  }
  tokens.push({
    type: T_EOF,
    value: null,
    pos: len
  });
  return tokens;
}

/**
 * Recursive-descent parser producing evaluable closures.
 * Precedence mirrors Ast\Parser: || , & , comparisons , +- , * / , unary.
 *
 * @param {Array<object>} tokens Token list.
 * @return {Function} Root evaluator (ctx) => value.
 */
function parse(tokens) {
  let pos = 0;
  const current = () => tokens[pos];
  const advance = () => tokens[pos++];
  const match = (type, value) => {
    const tok = current();
    if (tok.type !== type) {
      return null;
    }
    if (value !== undefined && value !== null && tok.value !== value) {
      return null;
    }
    return advance();
  };
  const expect = (type, value) => {
    const tok = match(type, value);
    if (tok === null) {
      throw new Error('Unexpected token at position ' + current().pos + '.');
    }
    return tok;
  };
  const binary = (op, left, right) => ctx => {
    if (op === '||') {
      return toBool(left(ctx)) || toBool(right(ctx));
    }
    if (op === '&') {
      return toBool(left(ctx)) && toBool(right(ctx));
    }
    const ln = toNum(left(ctx));
    const rn = toNum(right(ctx));
    switch (op) {
      case '>':
        return ln > rn;
      case '<':
        return ln < rn;
      case '>=':
        return ln >= rn;
      case '<=':
        return ln <= rn;
      case '!=':
        /* eslint-disable-next-line eqeqeq */
        return ln != rn;
      case '=':
        /* eslint-disable-next-line eqeqeq */
        return ln == rn;
      case '+':
        return ln + rn;
      case '-':
        return ln - rn;
      case '*':
        return ln * rn;
      case '/':
        if (rn === 0) {
          throw new Error('Division by zero.');
        }
        return ln / rn;
      default:
        throw new Error('Unsupported operator: ' + op);
    }
  };
  const unary = (op, operand) => ctx => {
    const v = toNum(operand(ctx));
    if (op === '+') {
      return +v;
    }
    if (op === '-') {
      return -v;
    }
    throw new Error('Unsupported unary operator: ' + op);
  };
  function parseOr() {
    let node = parseAnd();
    while (match(T_OP, '||') !== null) {
      node = binary('||', node, parseAnd());
    }
    return node;
  }
  function parseAnd() {
    let node = parseComparison();
    while (match(T_OP, '&') !== null) {
      node = binary('&', node, parseComparison());
    }
    return node;
  }
  function parseComparison() {
    let node = parseAdditive();
    const ops = ['>', '<', '>=', '<=', '!=', '='];
    while (true) {
      const tok = current();
      if (tok.type !== T_OP || ops.indexOf(tok.value) === -1) {
        break;
      }
      const op = String(tok.value);
      advance();
      node = binary(op, node, parseAdditive());
    }
    return node;
  }
  function parseAdditive() {
    let node = parseMultiplicative();
    while (true) {
      if (match(T_OP, '+') !== null) {
        node = binary('+', node, parseMultiplicative());
        continue;
      }
      if (match(T_OP, '-') !== null) {
        node = binary('-', node, parseMultiplicative());
        continue;
      }
      break;
    }
    return node;
  }
  function parseMultiplicative() {
    let node = parseUnary();
    while (true) {
      if (match(T_OP, '*') !== null) {
        node = binary('*', node, parseUnary());
        continue;
      }
      if (match(T_OP, '/') !== null) {
        node = binary('/', node, parseUnary());
        continue;
      }
      break;
    }
    return node;
  }
  function parseUnary() {
    if (match(T_OP, '+') !== null) {
      return unary('+', parseUnary());
    }
    if (match(T_OP, '-') !== null) {
      return unary('-', parseUnary());
    }
    return parsePrimary();
  }
  function callFunction(name, argFns) {
    return ctx => {
      const argc = argFns.length;
      if (name === 'if') {
        if (argc !== 3) {
          throw new Error('if() expects exactly 3 arguments.');
        }
        return toBool(argFns[0](ctx)) ? argFns[1](ctx) : argFns[2](ctx);
      }
      const v = argFns.map(fn => toNum(fn(ctx)));
      switch (name) {
        case 'abs':
          if (argc !== 1) {
            throw new Error('abs() expects exactly 1 argument.');
          }
          return Math.abs(v[0]);
        case 'ceil':
          if (argc !== 1) {
            throw new Error('ceil() expects exactly 1 argument.');
          }
          return Math.ceil(v[0]);
        case 'floor':
          if (argc !== 1) {
            throw new Error('floor() expects exactly 1 argument.');
          }
          return Math.floor(v[0]);
        case 'round':
          {
            if (argc < 1 || argc > 2) {
              throw new Error('round() expects 1 or 2 arguments.');
            }
            const p = argc === 2 ? Math.trunc(v[1]) : 0;
            const f = Math.pow(10, p);
            return Math.round(v[0] * f) / f;
          }
        case 'pow':
          if (argc !== 2) {
            throw new Error('pow() expects exactly 2 arguments.');
          }
          return Math.pow(v[0], v[1]);
        case 'min':
          if (argc < 1) {
            throw new Error('min() expects at least 1 argument.');
          }
          return Math.min.apply(null, v);
        case 'max':
          if (argc < 1) {
            throw new Error('max() expects at least 1 argument.');
          }
          return Math.max.apply(null, v);
        default:
          throw new Error('Unknown function "' + name + '".');
      }
    };
  }
  function parsePrimary() {
    const tok = current();
    if (tok.type === T_NUMBER) {
      advance();
      const val = tok.value;
      return () => val;
    }
    if (tok.type === T_VAR) {
      advance();
      const name = String(tok.value);
      return ctx => {
        const v = ctx && ctx[name];
        return v === undefined ? 0 : v;
      };
    }
    if (tok.type === T_IDENT) {
      advance();
      const name = String(tok.value).toLowerCase();
      if (FUNCTIONS.indexOf(name) === -1) {
        throw new Error('Unknown function "' + tok.value + '".');
      }
      expect(T_LPAREN);
      const args = [];
      if (match(T_RPAREN) === null) {
        args.push(parseOr());
        while (match(T_COMMA) !== null) {
          args.push(parseOr());
        }
        expect(T_RPAREN);
      }
      return callFunction(name, args);
    }
    if (match(T_LPAREN) !== null) {
      const node = parseOr();
      expect(T_RPAREN);
      return node;
    }
    throw new Error('Unexpected token at position ' + tok.pos + '.');
  }
  const root = parseOr();
  expect(T_EOF);
  return root;
}

/**
 * Normalise a numeric result (collapse whole floats), 1e-9 tolerance.
 *
 * @param {*} value Value.
 * @return {number} Normalised number.
 */
function normalizeNumber(value) {
  const num = parseFloat(value);
  if (!isFinite(num)) {
    return 0;
  }
  const rounded = Math.round(num);
  if (Math.abs(num - rounded) < 1e-9) {
    return rounded;
  }
  return num;
}

/**
 * Evaluate an advanced AST expression (soft-fail → 0).
 *
 * @param {string} expression Source.
 * @param {Object} vars       [name] => value context.
 * @return {number} Numeric result (booleans become 1/0), 0 on failure.
 */
function evaluateAdvanced(expression, vars) {
  try {
    const tokens = tokenize(String(expression == null ? '' : expression));
    const root = parse(tokens);
    const result = root(vars || {});
    if (typeof result === 'boolean') {
      return result ? 1 : 0;
    }
    if (isFinite(parseFloat(result))) {
      return normalizeNumber(result);
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Public facade: evaluate a formula by mode (mirrors the two PHP engines).
 *
 * @param {string} expr Expression text.
 * @param {Object} vars Variable map.
 * @param {string} mode 'simple' | 'advanced'.
 * @return {number} Numeric result, 0 on any failure.
 */
function evaluateFormula(expr, vars, mode) {
  return mode === 'advanced' ? evaluateAdvanced(expr, vars) : evaluateSimple(expr, vars);
}

/***/ },

/***/ "./assets/src/store/money.js"
/*!***********************************!*\
  !*** ./assets/src/store/money.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   convertForDisplay: () => (/* binding */ convertForDisplay),
/* harmony export */   formatMoney: () => (/* binding */ formatMoney),
/* harmony export */   parseMoney: () => (/* binding */ parseMoney),
/* harmony export */   roundMoney: () => (/* binding */ roundMoney),
/* harmony export */   toNumber: () => (/* binding */ toNumber)
/* harmony export */ });
/**
 * Currency formatting + numeric parse helpers.
 *
 * Honours the `window.optsetStore.currency` shape
 * ({ symbol, pos, decimals, decimalSep, thousandSep }) and the optional
 * `conversion` block ({ active, rate, extra }). Conversion is applied for
 * DISPLAY only — the raw, base-currency amounts are what get serialised to
 * the hidden inputs so the server recomputes authoritatively.
 *
 * @package
 */

/**
 * Read the localised store config defensively.
 *
 * @return {Object} The optsetStore global, or a safe default.
 */
function cfg() {
  return typeof window !== 'undefined' && window.optsetStore || {};
}

/**
 * Coerce any numeric-ish value to a finite float (mirrors Support\Money::f).
 *
 * @param {*} value Raw value.
 * @return {number} Parsed float, 0 when not numeric.
 */
function toNumber(value) {
  if (typeof value === 'number') {
    return isFinite(value) ? value : 0;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  let str = String(value).trim();
  if (str === '') {
    return 0;
  }
  // Strip grouping commas the same way the PHP helper does.
  str = str.replace(/,/g, '');
  const n = parseFloat(str);
  return isFinite(n) ? n : 0;
}

/**
 * Parse a user-typed money string using the active decimal separator.
 *
 * @param {string} value Raw input value.
 * @return {number} Parsed float.
 */
function parseMoney(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const c = cfg().currency || {};
  const dec = c.decimalSep || '.';
  const tho = c.thousandSep || ',';
  let str = String(value).trim();
  if (tho) {
    str = str.split(tho).join('');
  }
  if (dec && dec !== '.') {
    str = str.split(dec).join('.');
  }
  str = str.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(str);
  return isFinite(n) ? n : 0;
}

/**
 * Apply the active currency conversion for display only.
 *
 * @param {number} amount Base-currency amount.
 * @return {number} Display amount.
 */
function convertForDisplay(amount) {
  const conv = cfg().conversion || {};
  let out = toNumber(amount);
  if (conv && conv.active) {
    out = out * toNumber(conv.rate || 1) + toNumber(conv.extra || 0);
  }
  return out;
}

/**
 * Format a number with fixed decimals and the active separators.
 *
 * @param {number} amount   Amount.
 * @param {number} decimals Decimal places.
 * @param {string} decSep   Decimal separator.
 * @param {string} thoSep   Thousand separator.
 * @return {string} Formatted numeric string (no symbol).
 */
function numberFormat(amount, decimals, decSep, thoSep) {
  const neg = amount < 0;
  const fixed = Math.abs(toNumber(amount)).toFixed(Math.max(0, decimals));
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thoSep || '');
  const joined = parts.join(decSep || '.');
  return (neg ? '-' : '') + joined;
}

/**
 * Format a base-currency amount into a display HTML/string honouring the
 * WooCommerce currency position. Applies conversion when active.
 *
 * @param {number}  amount     Base-currency amount.
 * @param {boolean} [skipConv] When true, do not currency-convert.
 * @return {string} Formatted price string with symbol.
 */
function formatMoney(amount, skipConv) {
  const c = cfg().currency || {};
  const symbol = c.symbol || '';
  const pos = c.pos || 'left';
  const decimals = c.decimals === undefined || c.decimals === null ? 2 : parseInt(c.decimals, 10);
  const value = skipConv ? toNumber(amount) : convertForDisplay(amount);
  const num = numberFormat(value, isFinite(decimals) ? decimals : 2, c.decimalSep || '.', c.thousandSep || ',');
  switch (pos) {
    case 'right':
      return num + symbol;
    case 'left_space':
      return symbol + ' ' + num;
    case 'right_space':
      return num + ' ' + symbol;
    case 'left':
    default:
      return symbol + num;
  }
}

/**
 * Round to a sane number of decimal places to avoid float drift.
 *
 * @param {number} amount Amount.
 * @return {number} Rounded amount.
 */
function roundMoney(amount) {
  return Math.round((toNumber(amount) + Number.EPSILON) * 1e6) / 1e6;
}

/***/ },

/***/ "./assets/src/store/phone.js"
/*!***********************************!*\
  !*** ./assets/src/store/phone.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   wirePhone: () => (/* binding */ wirePhone)
/* harmony export */ });
/* harmony import */ var _shared_phone__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shared/phone */ "./assets/src/shared/phone.js");
/**
 * Storefront phone-field enhancement.
 *
 * Turns the `.optset-phone` wrapper rendered by TelField.php into an intl-style
 * control: a flag (+ dial code) button that opens a searchable country list.
 * Picking a country updates the button and the hidden `.optset-phone__iso` input
 * (read back by collect.js, which prefixes the dial code to the submitted
 * number when the dial code is shown). The country list is built here from the
 * shared dataset so the markup PHP emits stays tiny.
 *
 * @package
 */



/**
 * Build the dropdown panel (search + scrollable country list) once.
 *
 * @param {boolean} showDial Whether the dial code is part of this control.
 * @return {HTMLElement} The dropdown element.
 */
function buildDropdown(showDial) {
  const drop = document.createElement('div');
  drop.className = 'optset-phone__drop';
  drop.hidden = true;
  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'optset-phone__search';
  search.setAttribute('placeholder', 'Search');
  drop.appendChild(search);
  const list = document.createElement('div');
  list.className = 'optset-phone__list';
  drop.appendChild(list);
  _shared_phone__WEBPACK_IMPORTED_MODULE_0__.COUNTRIES.forEach(c => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'optset-phone__opt';
    opt.setAttribute('data-iso', c.iso2);
    opt.setAttribute('data-dial', c.dial);
    opt.setAttribute('data-name', c.name.toLowerCase());
    opt.innerHTML = '<span class="optset-phone__flag">' + (0,_shared_phone__WEBPACK_IMPORTED_MODULE_0__.flagEmoji)(c.iso2) + '</span>' + '<span class="optset-phone__name"></span>' + (showDial ? '<span class="optset-phone__dial">+' + c.dial + '</span>' : '');
    // Name is set via textContent to avoid injecting markup.
    opt.querySelector('.optset-phone__name').textContent = c.name;
    list.appendChild(opt);
  });
  return drop;
}

/**
 * Wire one phone field's country selector.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
function wirePhone(fieldEl, onChange) {
  const box = fieldEl.querySelector('.optset-phone');
  if (!box || box.__optsetPhone) {
    return;
  }
  box.__optsetPhone = true;
  const button = box.querySelector('.optset-phone__country');
  const iso = box.querySelector('.optset-phone__iso');
  const flag = box.querySelector('.optset-phone__flag');
  const dial = box.querySelector('.optset-phone__dial');
  if (!button || !iso) {
    return;
  }
  const showDial = box.getAttribute('data-flag-style') === 'flag_dial';
  const drop = buildDropdown(showDial);
  box.appendChild(drop);
  const search = drop.querySelector('.optset-phone__search');
  const opts = Array.prototype.slice.call(drop.querySelectorAll('.optset-phone__opt'));
  const close = () => {
    drop.hidden = true;
    box.classList.remove('optset-phone--open');
    button.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    drop.hidden = false;
    box.classList.add('optset-phone--open');
    button.setAttribute('aria-expanded', 'true');
    search.value = '';
    filter('');
    search.focus();
  };
  const filter = q => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    opts.forEach(opt => {
      const name = opt.getAttribute('data-name') || '';
      const code = opt.getAttribute('data-iso') || '';
      const d = opt.getAttribute('data-dial') || '';
      const match = !needle || name.indexOf(needle) !== -1 || code.indexOf(needle) !== -1 || digits && d.indexOf(digits) !== -1;
      opt.hidden = !match;
    });
  };
  button.addEventListener('click', e => {
    e.preventDefault();
    if (drop.hidden) {
      open();
    } else {
      close();
    }
  });
  search.addEventListener('input', () => filter(search.value));
  opts.forEach(opt => {
    opt.addEventListener('click', () => {
      const code = opt.getAttribute('data-iso') || '';
      iso.value = code;
      if (flag) {
        flag.textContent = (0,_shared_phone__WEBPACK_IMPORTED_MODULE_0__.flagEmoji)(code);
      }
      if (dial) {
        dial.textContent = '+' + (opt.getAttribute('data-dial') || '');
      }
      opts.forEach(o => o.classList.remove('is-active'));
      opt.classList.add('is-active');
      close();
      onChange();
    });
  });
  document.addEventListener('click', e => {
    if (!box.contains(e.target)) {
      close();
    }
  });
}

/***/ },

/***/ "./assets/src/store/pricing.js"
/*!*************************************!*\
  !*** ./assets/src/store/pricing.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   collectFormulaVars: () => (/* binding */ collectFormulaVars),
/* harmony export */   priceField: () => (/* binding */ priceField),
/* harmony export */   priceFormula: () => (/* binding */ priceFormula),
/* harmony export */   renderPriceSpans: () => (/* binding */ renderPriceSpans)
/* harmony export */ });
/* harmony import */ var _money__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./money */ "./assets/src/store/money.js");
/* harmony import */ var _formula__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./formula */ "./assets/src/store/formula.js");
/**
 * Client-side option pricing — mirrors OptionSetBuilder\Pricing\PriceCalculator (§13).
 *
 * This is a LIVE PREVIEW computation only. The raw selection (base values,
 * never currency-converted) is what gets serialised to the hidden inputs so
 * the server recomputes the authoritative price.
 *
 * Per choice, cost = sale !== '' ? sale : regular:
 *   none             → 0
 *   flat             → cost
 *   percent          → percentBase * cost / 100
 *   per_unit         → unitCount * cost
 *   per_char         → mb-len(value) * cost
 *   per_char_nospace → mb-len(value w/o spaces) * cost
 *   per_word         → wordCount(value) * cost
 *
 * Choice price data is read from data-* attributes the PHP renderers put on
 * each choice input/option: `data-price-mode`, plus `data-cost` (regular) and
 * `data-cost-sale` (sale). Absent → treated as 0 (see report assumptions).
 *
 * @package
 */




/**
 * Resolve the effective price mode.
 *
 * @param {string} mode Raw price mode.
 * @return {string} Effective mode.
 */
function gatedMode(mode) {
  return mode || 'none';
}

/**
 * Effective cost for a choice input element. Sale price takes priority
 * whenever it is set — mirrors the PHP PriceCalculator + the badge display
 * so the live price preview agrees with the cart line.
 *
 * @param {HTMLElement} el Choice input / option element.
 * @return {number} Cost.
 */
function choiceCost(el) {
  const regular = el.getAttribute('data-cost');
  const sale = el.getAttribute('data-cost-sale');
  if (sale !== null && sale !== '') {
    return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(sale);
  }
  return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(regular);
}

/**
 * Word count parity with PHP str_word_count (whitespace-split, non-empty).
 *
 * @param {string} str Source.
 * @return {number} Word count.
 */
function wordCount(str) {
  const trimmed = String(str || '').trim();
  if (trimmed === '') {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/**
 * Flatten a selection value into a string for char/word counting.
 *
 * @param {*} value Selection value.
 * @return {string} Flattened string.
 */
function scalar(value) {
  if (Array.isArray(value)) {
    return value.map(v => v && typeof v === 'object' ? String(v.label || '') : String(v == null ? '' : v)).join(' ');
  }
  if (value && typeof value === 'object') {
    return '';
  }
  return value == null ? '' : String(value);
}

/**
 * Whether a single-value selection counts as "not provided" — used to gate
 * value-field surcharges so an untouched optional control adds nothing.
 *
 * @param {*} value Selection value.
 * @return {boolean} True when empty.
 */
function isEmptyValue(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).every(k => String(value[k] == null ? '' : value[k]).trim() === '');
  }
  return false;
}

/**
 * Determine the per_unit multiplier (choice count, else numeric value).
 *
 * @param {*}      value Selection value.
 * @param {number} slot  Slot index.
 * @return {number} Count.
 */
function unitCount(value, slot) {
  if (Array.isArray(value)) {
    const at = value[slot];
    if (at && typeof at === 'object' && at.count !== undefined && at.count !== '') {
      return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(at.count);
    }
    return 1;
  }
  if (value && typeof value === 'object') {
    if (value.count !== undefined && value.count !== '') {
      return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(value.count);
    }
    return 1;
  }
  return (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(value);
}

/**
 * Apply one choice's price mode.
 *
 * @param {string} mode        Effective (gated) mode.
 * @param {number} cost        Choice cost.
 * @param {*}      value       Selection value.
 * @param {number} percentBase Percent base.
 * @param {number} slot        Slot index for per_unit.
 * @return {number} Price contribution.
 */
function modePrice(mode, cost, value, percentBase, slot) {
  switch (mode) {
    case 'none':
      return 0;
    case 'flat':
      return cost;
    case 'percent':
      return percentBase * cost / 100;
    case 'per_unit':
      return unitCount(value, slot) * cost;
    case 'per_char':
      return scalar(value).length * cost;
    case 'per_char_nospace':
      return scalar(value).replace(/\s/g, '').length * cost;
    case 'per_word':
      return wordCount(scalar(value)) * cost;
    default:
      return cost;
  }
}

/**
 * Locate the choice input/option elements for a field, in index order.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {HTMLElement[]} Choice elements indexed by choice index.
 */
function choiceElements(fieldEl) {
  const opts = fieldEl.querySelectorAll('.optset-select__opt[data-index]');
  if (opts.length) {
    const out = [];
    opts.forEach(o => {
      out[parseInt(o.getAttribute('data-index'), 10)] = o;
    });
    return out;
  }
  const inputs = fieldEl.querySelectorAll('input[type="checkbox"], input[type="radio"]');
  const arr = [];
  inputs.forEach(input => {
    const idx = parseInt(input.value, 10);
    if (!isNaN(idx)) {
      arr[idx] = input;
    }
  });
  return arr;
}

/**
 * The single value-driven control (text/number/range/etc.) for a field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {HTMLElement|null} The control bearing data-price-mode.
 */
function valueControl(fieldEl) {
  return fieldEl.querySelector('[data-price-mode]');
}

/**
 * Compute the price contribution for one (non-formula) field.
 *
 * @param {HTMLElement} fieldEl     Field wrapper.
 * @param {Object}      entry       Selection entry.
 * @param {number}      percentBase Percent base.
 * @return {number} Price.
 */
function priceField(fieldEl, entry, percentBase) {
  if (!entry) {
    return 0;
  }
  const indexes = Array.isArray(entry.choiceIndexes) ? entry.choiceIndexes : [];

  // Choice-driven fields: sum each selected choice's mode price.
  if (indexes.length) {
    const els = choiceElements(fieldEl);
    let total = 0;
    indexes.forEach((idx, slot) => {
      const el = els[idx];
      if (!el) {
        return;
      }
      const mode = gatedMode(el.getAttribute('data-price-mode') || 'none');
      total += modePrice(mode, choiceCost(el), entry.value, percentBase, slot);
    });
    return total;
  }

  // Single value-driven control: price against its own data-price-mode.
  const ctrl = valueControl(fieldEl);
  if (!ctrl) {
    return 0;
  }
  const mode = gatedMode(ctrl.getAttribute('data-price-mode') || 'none');
  if (mode === 'none') {
    return 0;
  }
  // No surcharge until the customer actually provides a value (e.g. picks a
  // date / types text). Empty optional value-fields must not pre-charge.
  if (isEmptyValue(entry.value)) {
    return 0;
  }
  // A bare value control has no per-choice cost attribute by default;
  // renderers that price a single control attach data-cost to it.
  const cost = choiceCost(ctrl);
  return modePrice(mode, cost, entry.value, percentBase, 0);
}

/**
 * Collect numeric variables for simple-formula evaluation, keyed by field
 * id (mirrors PriceCalculator::collectFormulaVars): number/range values and
 * resolved select choice costs.
 *
 * @param {Object} selections    State selections map.
 * @param {Object} fieldElements fieldId → wrapper element map.
 * @return {Object} name → number map.
 */
function collectFormulaVars(selections, fieldElements) {
  const vars = {};
  Object.keys(selections).forEach(fieldId => {
    const entry = selections[fieldId];
    if (!entry || !entry.type) {
      return;
    }
    if (entry.type === 'number' || entry.type === 'range') {
      vars[fieldId] = (0,_money__WEBPACK_IMPORTED_MODULE_0__.toNumber)(entry.value);
      return;
    }
    if (entry.type === 'select') {
      const indexes = entry.choiceIndexes || [];
      if (!indexes.length) {
        return;
      }
      const el = fieldElements[fieldId];
      if (!el) {
        return;
      }
      const opt = el.querySelector('.optset-select__opt[data-index="' + indexes[0] + '"]');
      if (!opt) {
        return;
      }
      const mode = gatedMode(opt.getAttribute('data-price-mode') || 'flat');
      vars[fieldId] = mode === 'none' ? 0 : choiceCost(opt);
    }
  });
  return vars;
}

/**
 * Price a formula / advancedformula field from its DOM node.
 *
 * @param {HTMLElement} fieldEl     Field wrapper.
 * @param {string}      type        'formula' | 'advancedformula'.
 * @param {number}      percentBase Product percent base.
 * @param {Object}      simpleVars  Numeric vars for the simple engine.
 * @param {Object}      dynamics    Dynamic vars for the advanced engine.
 * @return {number} Computed price.
 */
function priceFormula(fieldEl, type, percentBase, simpleVars, dynamics) {
  const node = fieldEl.querySelector('.optset-formula');
  if (!node) {
    return 0;
  }
  const expr = node.getAttribute('data-expression') || '';
  if (expr.trim() === '') {
    return 0;
  }
  if (type === 'advancedformula') {
    let bidMap = {};
    const raw = node.getAttribute('data-bidmap');
    if (raw) {
      try {
        bidMap = JSON.parse(raw) || {};
      } catch (e) {
        bidMap = {};
      }
    }
    return (0,_formula__WEBPACK_IMPORTED_MODULE_1__.evaluateAdvanced)(expr, Object.assign({}, bidMap, dynamics));
  }
  const vars = Object.assign({
    product_price: percentBase
  }, simpleVars || {});
  return (0,_formula__WEBPACK_IMPORTED_MODULE_1__.evaluateSimple)(expr, vars);
}

/**
 * Render the price spans (#optset-options-price / #optset-options-total).
 * Display amounts honour currency + conversion; the values written to the
 * hidden inputs elsewhere remain raw/base.
 *
 * @param {HTMLElement} root          `.optset-options` wrapper.
 * @param {number}      optionsPrice  Sum of option prices (base ccy).
 * @param {number}      basePrice     Product base price (base ccy).
 * @param {number}      [linkedPrice] Sum of selected linked-product prices.
 * @return {void}
 */
function renderPriceSpans(root, optionsPrice, basePrice, linkedPrice) {
  const priceEl = root.querySelector('#optset-options-price');
  const totalEl = root.querySelector('#optset-options-total');
  if (priceEl) {
    priceEl.innerHTML = (0,_money__WEBPACK_IMPORTED_MODULE_0__.formatMoney)(optionsPrice);
  }
  if (totalEl) {
    totalEl.innerHTML = (0,_money__WEBPACK_IMPORTED_MODULE_0__.formatMoney)((Number(basePrice) || 0) + (Number(optionsPrice) || 0) + (Number(linkedPrice) || 0));
  }
}

/***/ },

/***/ "./assets/src/store/state.js"
/*!***********************************!*\
  !*** ./assets/src/store/state.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ State)
/* harmony export */ });
/**
 * Per-form reactive pricing state.
 *
 * Each product `form.cart` gets its own State instance. The most recently
 * touched instance is mirrored onto `window.optsetPricingState` so theme code
 * and integrations can introspect it (read ARCHITECTURE §1 public surface).
 *
 * Shape (window.optsetPricingState):
 * {
 *   basePrice:        number,                 // product/variation base (base ccy)
 *   basePricePct:     number,                 // base used for percent math
 *   optionPrices:     { [fieldId]: number },  // per-field price contribution
 *   selections:       { [fieldId]: {          // §9 selection entry
 *                         type, setId, label, value,
 *                         choiceIndexes:[int], dynamics:{} } },
 *   linkedProducts:   [ { id, count, variation } ],
 *   conditions:       { [fieldId]: boolean },  // true = visible
 *   requiredErrors:   [ fieldId ],
 *   minmaxErrors:     [ fieldId ],
 *   optionsPrice:     number,                  // sum of optionPrices
 *   total:            number                   // basePrice + optionsPrice
 * }
 *
 * @package
 */

/**
 * Build a fresh empty state object.
 *
 * @return {Object} Default state.
 */
function emptyState() {
  return {
    basePrice: 0,
    basePricePct: 0,
    optionPrices: {},
    selections: {},
    linkedProducts: [],
    linkedPrice: 0,
    conditions: {},
    requiredErrors: [],
    minmaxErrors: [],
    optionsPrice: 0,
    total: 0
  };
}

/**
 * Reactive per-form state container with a tiny subscribe() emitter.
 */
class State {
  /**
   * Create a state instance.
   */
  constructor() {
    this.data = emptyState();
    this._subs = [];
    this._publish();
  }

  /**
   * Mirror this instance onto the global public surface.
   *
   * @return {void}
   */
  _publish() {
    try {
      window.optsetPricingState = this.data;
    } catch (e) {
      /* read-only window — ignore. */
    }
  }

  /**
   * Subscribe to state changes.
   *
   * @param {Function} fn Listener invoked with the state object.
   * @return {Function} Unsubscribe function.
   */
  subscribe(fn) {
    if (typeof fn === 'function') {
      this._subs.push(fn);
    }
    return () => {
      this._subs = this._subs.filter(s => s !== fn);
    };
  }

  /**
   * Notify all subscribers (defensive — a bad listener never breaks others).
   *
   * @return {void}
   */
  emit() {
    this._publish();
    this._subs.forEach(fn => {
      try {
        fn(this.data);
      } catch (e) {
        /* swallow: never break add-to-cart. */
      }
    });
  }

  /* --------------------------------------------------------------- */
  /* Mutators                                                          */
  /* --------------------------------------------------------------- */

  /**
   * Set the product/variation base price.
   *
   * @param {number} base Base price (base currency).
   * @param {number} pct  Percent-math base.
   * @return {void}
   */
  setBase(base, pct) {
    this.data.basePrice = Number(base) || 0;
    this.data.basePricePct = pct === undefined || pct === null ? this.data.basePrice : Number(pct) || 0;
  }

  /**
   * Replace the selection entry for a field.
   *
   * @param {string}      fieldId Field id.
   * @param {object|null} entry   Selection entry, or null to clear.
   * @return {void}
   */
  setSelection(fieldId, entry) {
    if (entry === null || entry === undefined) {
      delete this.data.selections[fieldId];
      return;
    }
    this.data.selections[fieldId] = entry;
  }

  /**
   * Record a field's computed price contribution.
   *
   * @param {string} fieldId Field id.
   * @param {number} amount  Price.
   * @return {void}
   */
  setOptionPrice(fieldId, amount) {
    this.data.optionPrices[fieldId] = Number(amount) || 0;
  }

  /**
   * Drop a field's price contribution (used when hidden by logic).
   *
   * @param {string} fieldId Field id.
   * @return {void}
   */
  clearOptionPrice(fieldId) {
    delete this.data.optionPrices[fieldId];
  }

  /**
   * Replace the linked-products list.
   *
   * @param {Array<object>} list [{ id, count, variation }].
   * @return {void}
   */
  setLinkedProducts(list) {
    this.data.linkedProducts = Array.isArray(list) ? list : [];
    // Linked products are added as their own cart lines; their cost is
    // surfaced in the on-page total (base + options + linked) so the
    // preview matches what the shopper will actually pay.
    this.data.linkedPrice = this.data.linkedProducts.reduce((sum, item) => sum + (Number(item.price) || 0) * Math.max(1, Number(item.count) || 1), 0);
  }

  /**
   * Record a field visibility decision (true = visible).
   *
   * @param {string}  fieldId Field id.
   * @param {boolean} visible Visible flag.
   * @return {void}
   */
  setCondition(fieldId, visible) {
    this.data.conditions[fieldId] = !!visible;
  }

  /**
   * Replace the validation error lists.
   *
   * @param {string[]} required Required-error field ids.
   * @param {string[]} minmax   Min/max-error field ids.
   * @return {void}
   */
  setErrors(required, minmax) {
    this.data.requiredErrors = Array.isArray(required) ? required : [];
    this.data.minmaxErrors = Array.isArray(minmax) ? minmax : [];
  }

  /**
   * Recompute the derived totals from current option prices.
   *
   * @return {void}
   */
  recomputeTotals() {
    let sum = 0;
    Object.keys(this.data.optionPrices).forEach(id => {
      sum += Number(this.data.optionPrices[id]) || 0;
    });
    this.data.optionsPrice = sum;
    this.data.total = (Number(this.data.basePrice) || 0) + sum + (Number(this.data.linkedPrice) || 0);
  }
}

/***/ },

/***/ "./assets/src/store/time.js"
/*!**********************************!*\
  !*** ./assets/src/store/time.js ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   wireTime: () => (/* binding */ wireTime)
/* harmony export */ });
/* harmony import */ var flatpickr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! flatpickr */ "./node_modules/flatpickr/dist/esm/index.js");
/* harmony import */ var flatpickr_dist_flatpickr_min_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! flatpickr/dist/flatpickr.min.css */ "./node_modules/flatpickr/dist/flatpickr.min.css");
/**
 * Storefront time-field enhancement.
 *
 * Turns the readonly `.optset-time-input` rendered by TimeField.php into a
 * flatpickr time-only picker, honouring the builder settings: 12/24-hour
 * display, earliest/latest bounds and the minute step. Bounds are stored as
 * 24-hour "HH:MM" strings; "00:00" (or empty) means "no limit". Calls
 * `onChange` on every pick so pricing/validation re-run (the surcharge is only
 * applied once a time is actually chosen — see pricing.js).
 *
 * @package
 */




/**
 * Normalise a stored bound: treat '' / '00:00' as unset.
 *
 * @param {string} raw Stored "HH:MM".
 * @return {string|undefined} Bound or undefined.
 */
function bound(raw) {
  const v = (raw || '').trim();
  if (v === '' || v === '00:00') {
    return undefined;
  }
  return v;
}

/**
 * Wire one time field.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
function wireTime(fieldEl, onChange) {
  const input = fieldEl.querySelector('.optset-time-input');
  if (!input || input.__optsetTime) {
    return;
  }
  input.__optsetTime = true;
  const hour12 = input.getAttribute('data-hour12') !== 'no';
  const step = parseInt(input.getAttribute('data-step') || '0', 10);
  try {
    (0,flatpickr__WEBPACK_IMPORTED_MODULE_0__["default"])(input, {
      enableTime: true,
      noCalendar: true,
      time_24hr: !hour12,
      dateFormat: hour12 ? 'h:i K' : 'H:i',
      minTime: bound(input.getAttribute('data-min-time')),
      maxTime: bound(input.getAttribute('data-max-time')),
      minuteIncrement: step > 0 ? step : 5,
      disableMobile: true,
      onChange: () => onChange()
    });
  } catch (e) {
    /* a broken picker must never wedge the product form. */
  }
}

/***/ },

/***/ "./assets/src/store/upload.js"
/*!************************************!*\
  !*** ./assets/src/store/upload.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initUpload: () => (/* binding */ initUpload)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/**
 * File-upload field behaviour.
 *
 * On file select/drop: validate count + size against the data-* limits the
 * renderer put on `.optset-upload__input`, POST each file as FormData (field
 * `optset_file`, plus `optset_nonce` = optsetStore.uploadNonce) to
 * `optsetStore.restUrl + 'upload'` with an XMLHttpRequest progress bar, then
 * store the accumulated `[{ name, path }]` JSON in the hidden input
 * (`.optset-upload__data`, name `optset_input_{id}`) and render the item list.
 *
 * The upload REST route returns `{ ok:true, file:{ url, name } }`; we map
 * `path = file.url` for the §9 [{name,path}] contract.
 *
 * @package
 */


const TD = 'option-set-builder';

/**
 * Read the localised store config defensively.
 *
 * @return {Object} optsetStore global or {}.
 */
function store() {
  return typeof window !== 'undefined' && window.optsetStore || {};
}

/**
 * Wire one fileupload field. Returns a cleanup function.
 *
 * @param {HTMLElement} fieldEl  `.optset-field` wrapper (type=fileupload).
 * @param {Function}    onChange Called after the file list changes.
 * @return {Function} Detach handler.
 */
function initUpload(fieldEl, onChange) {
  const root = fieldEl.querySelector('.optset-upload');
  if (!root) {
    return () => {};
  }
  const input = root.querySelector('.optset-upload__input');
  const hidden = root.querySelector('.optset-upload__data');
  const progress = root.querySelector('.optset-upload__progress');
  const bar = root.querySelector('.optset-upload__bar');
  const result = root.querySelector('.optset-upload__result');
  const dropzone = root.querySelector('.optset-dropzone');
  if (!input || !hidden) {
    return () => {};
  }
  const maxSizeMb = parseInt(input.getAttribute('data-max-size') || '0', 10) || 0;
  const maxBytes = maxSizeMb > 0 ? maxSizeMb * 1024 * 1024 : 0;
  const minCount = parseInt(input.getAttribute('data-min') || '0', 10) || 0;
  const maxCount = parseInt(input.getAttribute('data-max') || '0', 10) || 0;
  const errSize = input.getAttribute('data-error-size') || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('A file exceeds the size limit.', TD);
  const errMax = input.getAttribute('data-error-max') || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Too many files selected.', TD);
  let files = [];
  try {
    files = hidden.value ? JSON.parse(hidden.value) || [] : [];
  } catch (e) {
    files = [];
  }

  /**
   * Persist the list to the hidden input + repaint, then notify.
   *
   * @return {void}
   */
  const sync = () => {
    hidden.value = files.length ? JSON.stringify(files) : '';
    paint();
    if (typeof onChange === 'function') {
      onChange();
    }
  };

  /**
   * Show an error message inside the result region.
   *
   * @param {string} msg Message.
   * @return {void}
   */
  const showError = msg => {
    const errEl = fieldEl.querySelector('.optset-field__error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.add('optset-field__error--visible');
    }
  };

  /**
   * Format a byte count as a human-readable size.
   *
   * @param {number} bytes Size in bytes.
   * @return {string} Formatted size (e.g. "136.31 KB").
   */
  const formatSize = bytes => {
    const n = Number(bytes) || 0;
    if (n <= 0) {
      return '';
    }
    if (n < 1024) {
      return n + ' B';
    }
    if (n < 1024 * 1024) {
      return (n / 1024).toFixed(2) + ' KB';
    }
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  };

  /**
   * Whether a path/name points at a previewable image.
   * @param path
   */
  const isImage = path => /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(String(path || ''));

  /**
   * Repaint the uploaded-file list: thumbnail, name, size, a completed
   * progress bar and a remove control.
   *
   * @return {void}
   */
  function paint() {
    if (!result) {
      return;
    }
    result.innerHTML = '';
    files.forEach((file, i) => {
      const item = document.createElement('div');
      item.className = 'optset-upload-item';
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'optset-upload-item__remove';
      rm.setAttribute('aria-label', (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Remove file', TD));
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        files.splice(i, 1);
        sync();
      });
      const thumb = document.createElement('span');
      thumb.className = 'optset-upload-item__thumb';
      if (isImage(file.path || file.name) && file.path) {
        const img = document.createElement('img');
        img.src = file.path;
        img.alt = '';
        thumb.appendChild(img);
      } else {
        thumb.classList.add('is-file');
      }
      const body = document.createElement('span');
      body.className = 'optset-upload-item__body';
      const top = document.createElement('span');
      top.className = 'optset-upload-item__top';
      const name = document.createElement('span');
      name.className = 'optset-upload-item__name';
      name.textContent = file.name || '';
      const size = document.createElement('span');
      size.className = 'optset-upload-item__size';
      size.textContent = formatSize(file.size);
      top.appendChild(name);
      top.appendChild(size);
      const track = document.createElement('span');
      track.className = 'optset-upload-item__bar';
      const fill = document.createElement('span');
      fill.className = 'optset-upload-item__bar-fill';
      fill.style.width = '100%';
      track.appendChild(fill);
      body.appendChild(top);
      body.appendChild(track);
      item.appendChild(rm);
      item.appendChild(thumb);
      item.appendChild(body);
      result.appendChild(item);
    });
  }

  /**
   * Upload a single File via XHR with progress.
   *
   * @param {File} file Selected file.
   * @return {Promise<object>} Resolves with { name, path }.
   */
  const uploadOne = file => new Promise((resolve, reject) => {
    const cfg = store();
    const url = (cfg.restUrl || '') + 'upload';
    const fd = new FormData();
    fd.append('optset_file', file);
    fd.append('optset_nonce', cfg.uploadNonce || '');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    if (cfg.nonce) {
      xhr.setRequestHeader('X-WP-Nonce', cfg.nonce);
    }
    if (progress) {
      progress.hidden = false;
    }
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && bar) {
        bar.style.width = Math.round(e.loaded / e.total * 100) + '%';
      }
    };
    xhr.onload = () => {
      if (progress) {
        progress.hidden = true;
      }
      if (bar) {
        bar.style.width = '0%';
      }
      let json = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch (e) {
        json = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && json && json.ok && json.file) {
        resolve({
          name: json.file.name || file.name,
          path: json.file.url || json.file.path || '',
          size: file.size || 0
        });
      } else {
        reject(new Error(json && json.message || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Upload failed.', TD)));
      }
    };
    xhr.onerror = () => {
      if (progress) {
        progress.hidden = true;
      }
      reject(new Error((0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Upload failed.', TD)));
    };
    xhr.send(fd);
  });

  /**
   * Validate + upload a FileList.
   *
   * @param {FileList} list Selected files.
   * @return {void}
   */
  const handleFiles = list => {
    const incoming = Array.prototype.slice.call(list || []);
    if (!incoming.length) {
      return;
    }
    if (maxCount > 0 && files.length + incoming.length > maxCount) {
      showError(errMax);
      return;
    }
    const valid = [];
    for (let i = 0; i < incoming.length; i++) {
      const f = incoming[i];
      if (maxBytes > 0 && f.size > maxBytes) {
        showError(errSize);
        continue;
      }
      valid.push(f);
    }
    valid.reduce((chain, f) => chain.then(() => uploadOne(f)).then(rec => {
      files.push(rec);
      sync();
    }).catch(err => {
      showError(err && err.message ? err.message : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Upload failed.', TD));
    }), Promise.resolve());
  };
  const onInput = () => handleFiles(input.files);
  const onDragOver = e => {
    e.preventDefault();
    if (dropzone) {
      dropzone.classList.add('optset-dropzone--over');
    }
  };
  const onDragLeave = () => {
    if (dropzone) {
      dropzone.classList.remove('optset-dropzone--over');
    }
  };
  const onDrop = e => {
    e.preventDefault();
    if (dropzone) {
      dropzone.classList.remove('optset-dropzone--over');
    }
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };
  input.addEventListener('change', onInput);
  if (dropzone) {
    dropzone.addEventListener('dragover', onDragOver);
    dropzone.addEventListener('dragleave', onDragLeave);
    dropzone.addEventListener('drop', onDrop);
  }

  // Expose min for validate.js (it reads data-min directly off input).
  void minCount;
  paint();
  return () => {
    input.removeEventListener('change', onInput);
    if (dropzone) {
      dropzone.removeEventListener('dragover', onDragOver);
      dropzone.removeEventListener('dragleave', onDragLeave);
      dropzone.removeEventListener('drop', onDrop);
    }
  };
}

/***/ },

/***/ "./assets/src/store/validate.js"
/*!**************************************!*\
  !*** ./assets/src/store/validate.js ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   validateAll: () => (/* binding */ validateAll)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _money__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./money */ "./assets/src/store/money.js");
/**
 * Submit-time validation.
 *
 * Runs on `form.cart` submit and on clicks of the WooCommerce add-to-cart
 * button (including theme ajax-add buttons). Enforces, for VISIBLE fields
 * only:
 *   - required: non-empty selection/value
 *   - min/max selection count (choice groups, fileupload count)
 *   - number/range min & max
 *   - char limits (data-minlength / data-maxlength on the control)
 * Shows `.optset-field__error` messages + a single dismissible toast and blocks
 * the submit when invalid. Never throws — a runtime error must not wedge the
 * native add-to-cart flow.
 *
 * @package
 */



const TD = 'option-set-builder';

/**
 * Set or clear a field's inline error.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {string}      msg     Message ('' clears).
 * @return {void}
 */
function setError(fieldEl, msg) {
  const el = fieldEl.querySelector('.optset-field__error');
  if (!el) {
    return;
  }
  el.textContent = msg || '';
  if (msg) {
    el.classList.add('optset-field__error--visible');
    fieldEl.classList.add('optset-field--invalid');
  } else {
    el.classList.remove('optset-field__error--visible');
    fieldEl.classList.remove('optset-field--invalid');
  }
}

/**
 * Show a transient toast inside the options wrapper.
 *
 * @param {HTMLElement} root `.optset-options` wrapper.
 * @param {string}      msg  Toast text.
 * @return {void}
 */
function toast(root, msg) {
  let el = root.querySelector('.optset-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'optset-toast';
    el.setAttribute('role', 'alert');
    root.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('optset-toast--visible');
  window.clearTimeout(el._t);
  el._t = window.setTimeout(() => {
    el.classList.remove('optset-toast--visible');
  }, 4000);
}

/**
 * Whether a selection entry counts as "filled".
 *
 * @param {object|null} entry Selection entry.
 * @return {boolean} True when non-empty.
 */
function isFilled(entry) {
  if (!entry) {
    return false;
  }
  const v = entry.value;
  if (v === null || v === undefined) {
    return false;
  }
  if (Array.isArray(v)) {
    return v.length > 0;
  }
  if (typeof v === 'object') {
    return Object.keys(v).some(k => String(v[k]).trim() !== '');
  }
  return String(v).trim() !== '';
}

/**
 * Validate one visible field. Returns an error message or ''.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {object|null} entry   Selection entry (may be null).
 * @return {string} Error message or empty string.
 */
function validateField(fieldEl, entry) {
  const type = fieldEl.getAttribute('data-type') || '';
  const required = fieldEl.getAttribute('data-required') === 'yes';
  if (required && !isFilled(entry)) {
    return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This field is required.', TD);
  }

  // Choice-group min/max selection bounds.
  const group = fieldEl.querySelector('[data-min-select], [data-max-select]');
  if (group && entry && Array.isArray(entry.choiceIndexes)) {
    const count = entry.choiceIndexes.length;
    const min = parseInt(group.getAttribute('data-min-select') || '', 10);
    const max = parseInt(group.getAttribute('data-max-select') || '', 10);
    if (!isNaN(min) && min > 0 && count > 0 && count < min) {
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Select at least', TD) + ' ' + min + '.';
    }
    if (!isNaN(max) && max > 0 && count > max) {
      return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Select at most', TD) + ' ' + max + '.';
    }
  }

  // Number / range bounds.
  if ((type === 'number' || type === 'range') && entry) {
    const ctrl = fieldEl.querySelector('input[name="optset_input_' + fieldEl.getAttribute('data-field-id') + '"]');
    if (ctrl && String(entry.value).trim() !== '') {
      const n = (0,_money__WEBPACK_IMPORTED_MODULE_1__.toNumber)(entry.value);
      const min = ctrl.getAttribute('min');
      const max = ctrl.getAttribute('max');
      if (min !== null && min !== '' && n < (0,_money__WEBPACK_IMPORTED_MODULE_1__.toNumber)(min)) {
        return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Value is below the minimum.', TD);
      }
      if (max !== null && max !== '' && n > (0,_money__WEBPACK_IMPORTED_MODULE_1__.toNumber)(max)) {
        return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Value is above the maximum.', TD);
      }
    }
  }

  // Char limits for text-ish controls.
  if (entry && typeof entry.value === 'string') {
    const ctrl = fieldEl.querySelector('[name="optset_input_' + fieldEl.getAttribute('data-field-id') + '"]');
    if (ctrl) {
      const minLen = parseInt(ctrl.getAttribute('data-minlength') || ctrl.getAttribute('minlength') || '', 10);
      const maxLen = parseInt(ctrl.getAttribute('data-maxlength') || ctrl.getAttribute('maxlength') || '', 10);
      const len = entry.value.length;
      if (!isNaN(minLen) && minLen > 0 && len > 0 && len < minLen) {
        return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Entry is too short.', TD);
      }
      if (!isNaN(maxLen) && maxLen > 0 && len > maxLen) {
        return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Entry is too long.', TD);
      }
    }
  }

  // File count bounds.
  if (type === 'fileupload') {
    const fileInput = fieldEl.querySelector('.optset-upload__input');
    const count = entry && Array.isArray(entry.value) ? entry.value.length : 0;
    if (fileInput) {
      const min = parseInt(fileInput.getAttribute('data-min') || '', 10);
      const max = parseInt(fileInput.getAttribute('data-max') || '', 10);
      if (!isNaN(min) && min > 0 && count < min) {
        return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please upload the required files.', TD);
      }
      if (!isNaN(max) && max > 0 && count > max) {
        return (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Too many files uploaded.', TD);
      }
    }
  }
  return '';
}

/**
 * Validate every visible field for a form.
 *
 * @param {HTMLElement} root          `.optset-options` wrapper.
 * @param {Object}      selections    fieldId → selection entry.
 * @param {Object}      fieldElements fieldId → wrapper element.
 * @param {Object}      visibility    fieldId → boolean (true = visible).
 * @return {{ ok:boolean, required:string[], minmax:string[] }} Result.
 */
function validateAll(root, selections, fieldElements, visibility) {
  const required = [];
  const minmax = [];
  let firstInvalid = null;
  Object.keys(fieldElements).forEach(fieldId => {
    const fieldEl = fieldElements[fieldId];
    if (visibility[fieldId] === false) {
      setError(fieldEl, '');
      return;
    }
    const msg = function () {
      try {
        return validateField(fieldEl, selections[fieldId] || null);
      } catch (e) {
        return '';
      }
    }();
    if (msg) {
      setError(fieldEl, msg);
      if (msg === (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('This field is required.', TD)) {
        required.push(fieldId);
      } else {
        minmax.push(fieldId);
      }
      if (!firstInvalid) {
        firstInvalid = fieldEl;
      }
    } else {
      setError(fieldEl, '');
    }
  });
  const ok = required.length === 0 && minmax.length === 0;
  if (!ok) {
    toast(root, (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Please complete the required product options.', TD));
    if (firstInvalid && firstInvalid.scrollIntoView) {
      try {
        firstInvalid.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      } catch (e) {
        /* ignore */
      }
    }
  }
  return {
    ok,
    required,
    minmax
  };
}

/***/ },

/***/ "./assets/src/store/variations.js"
/*!****************************************!*\
  !*** ./assets/src/store/variations.js ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initVariations: () => (/* binding */ initVariations),
/* harmony export */   readBase: () => (/* binding */ readBase)
/* harmony export */ });
/**
 * Variable-product price syncing.
 *
 * Listens for WooCommerce's jQuery `found_variation` / `reset_data` events
 * on the variations form and updates the controller's base price /
 * percent-base from the `#optset-variation-prices` and
 * `#optset-variation-prices-pct` holder maps (keyed by variation id), then
 * triggers a recompute.
 *
 * @package
 */

/**
 * Parse a holder span's JSON `data-value`.
 *
 * @param {HTMLElement} root `.optset-options` wrapper.
 * @param {string}      id   Holder element id.
 * @return {Object} Parsed map (empty on failure).
 */
function holderMap(root, id) {
  const el = root.querySelector('#' + id);
  if (!el) {
    return {};
  }
  const raw = el.getAttribute('data-value');
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

/**
 * Read the static (non-variation) base price holders.
 *
 * @param {HTMLElement} root `.optset-options` wrapper.
 * @return {{ base:number, pct:number }} Static base values.
 */
function readBase(root) {
  const baseEl = root.querySelector('#optset-base-price');
  const pctEl = root.querySelector('#optset-base-price-pct');
  const num = el => el ? parseFloat(el.getAttribute('data-value') || '0') || 0 : 0;
  return {
    base: num(baseEl),
    pct: num(pctEl)
  };
}

/**
 * Wire WooCommerce variation events to a base-price setter.
 *
 * @param {HTMLElement} root  `.optset-options` wrapper.
 * @param {HTMLElement} form  The product `form.cart`.
 * @param {Function}    apply Called with ({ base, pct }) to set + recompute.
 * @return {Function} Cleanup function.
 */
function initVariations(root, form, apply) {
  const jq = window.jQuery;
  const staticBase = readBase(root);

  // Non-variable products: nothing to wire, base is already static.
  if (!form || !jq) {
    return () => {};
  }
  const $form = jq(form);
  const onFound = (_e, variation) => {
    if (!variation || !variation.variation_id) {
      return;
    }
    const vid = String(variation.variation_id);
    const prices = holderMap(root, 'optset-variation-prices');
    const pcts = holderMap(root, 'optset-variation-prices-pct');
    const base = prices[vid] !== undefined ? parseFloat(prices[vid]) || 0 : staticBase.base;
    const pct = pcts[vid] !== undefined ? parseFloat(pcts[vid]) || 0 : base;
    apply({
      base,
      pct
    });
  };
  const onReset = () => {
    apply({
      base: staticBase.base,
      pct: staticBase.pct
    });
  };
  $form.on('found_variation', onFound);
  $form.on('reset_data', onReset);
  return () => {
    $form.off('found_variation', onFound);
    $form.off('reset_data', onReset);
  };
}

/***/ },

/***/ "./assets/src/store/widgets.js"
/*!*************************************!*\
  !*** ./assets/src/store/widgets.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initWidgets: () => (/* binding */ initWidgets)
/* harmony export */ });
/* harmony import */ var _date__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./date */ "./assets/src/store/date.js");
/* harmony import */ var _time__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./time */ "./assets/src/store/time.js");
/* harmony import */ var _phone__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./phone */ "./assets/src/store/phone.js");
/**
 * Custom-control interaction wiring.
 *
 * The PHP renders styled markup for a few controls that need JS behaviour
 * (custom select / fontpicker dropdown, color picker hex mirror + reset,
 * range slider ↔ number mirror, popup modal, image-swatch product-image
 * swap). This module attaches that behaviour and calls `onChange` whenever
 * a value the pricing/selection layer cares about changes.
 *
 * No business logic lives here — collection + pricing read the resulting DOM
 * state through collect.js / pricing.js.
 *
 * @package
 */





/**
 * Wire a custom `.optset-select` / `.optset-fontpicker` dropdown.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
function wireSelect(fieldEl, onChange) {
  const box = fieldEl.querySelector('.optset-select');
  if (!box) {
    return;
  }
  const toggle = box.querySelector('.optset-select__toggle');
  const list = box.querySelector('.optset-select__list');
  const hidden = box.querySelector('.optset-select__value');
  if (!toggle || !list || !hidden) {
    return;
  }
  const placeholder = box.querySelector('.optset-select__placeholder');
  const placeholderText = placeholder ? placeholder.textContent : '';
  const close = () => box.classList.remove('optset-select--open');
  toggle.addEventListener('click', e => {
    e.preventDefault();
    box.classList.toggle('optset-select--open');
  });
  list.querySelectorAll('.optset-select__opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const idx = opt.getAttribute('data-index');
      const label = opt.getAttribute('data-label') || '';
      hidden.value = idx;
      if (placeholder) {
        placeholder.textContent = label || placeholderText;
        // Font Picker: reflect the chosen font in the closed control.
        const font = opt.getAttribute('data-font');
        if (font !== null) {
          placeholder.style.fontFamily = font || '';
        }
      }
      list.querySelectorAll('.optset-select__opt--active').forEach(o => o.classList.remove('optset-select__opt--active'));
      opt.classList.add('optset-select__opt--active');
      close();
      onChange();
    });
  });
  document.addEventListener('click', e => {
    if (!box.contains(e.target)) {
      close();
    }
  });
}

/**
 * Wire the color picker hex mirror + reset.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
function wireColorPicker(fieldEl, onChange) {
  const box = fieldEl.querySelector('.optset-colorpicker');
  if (!box) {
    return;
  }
  const input = box.querySelector('.optset-colorpicker__input');
  if (!input) {
    return;
  }
  const hex = box.querySelector('.optset-colorpicker__hex');
  const reset = box.querySelector('.optset-colorpicker__reset');
  input.addEventListener('input', () => {
    if (hex) {
      hex.value = input.value;
    }
    onChange();
  });
  if (hex) {
    hex.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) {
        input.value = hex.value;
        onChange();
      }
    });
  }
  if (reset) {
    reset.addEventListener('click', () => {
      const def = input.getAttribute('data-default') || '#000000';
      input.value = def;
      if (hex) {
        hex.value = def;
      }
      onChange();
    });
  }
}

/**
 * Wire the range slider ↔ number mirror + readout postfix.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
function wireRange(fieldEl, onChange) {
  const slider = fieldEl.querySelector('.optset-range__slider');
  if (!slider) {
    return;
  }
  const mirror = fieldEl.querySelector('.optset-range__mirror');
  slider.addEventListener('input', () => {
    if (mirror) {
      mirror.value = slider.value;
    }
    onChange();
  });
  if (mirror) {
    mirror.addEventListener('input', () => {
      slider.value = mirror.value;
      onChange();
    });
  }
}

/**
 * Wire toggle on/off text labels.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {void}
 */
function wireToggle(fieldEl) {
  const input = fieldEl.querySelector('.optset-toggle__input');
  const text = fieldEl.querySelector('.optset-toggle__text');
  if (!input || !text) {
    return;
  }
  const paint = () => {
    text.textContent = input.checked ? text.getAttribute('data-on') || '' : text.getAttribute('data-off') || '';
  };
  input.addEventListener('change', paint);
  paint();
}

/**
 * Wire a popup-trigger field's modal open/close.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {void}
 */
function wirePopup(fieldEl) {
  const trigger = fieldEl.querySelector('.optset-popup__trigger');
  const modal = fieldEl.querySelector('.optset-popup__modal');
  if (!trigger || !modal) {
    return;
  }
  const open = () => {
    modal.hidden = false;
  };
  const close = () => {
    modal.hidden = true;
  };
  trigger.addEventListener('click', open);
  modal.querySelectorAll('[data-popup-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) {
      close();
    }
  });
}

/**
 * Wire the Linked Products field. The variation dropdown and quantity stepper
 * live inside the selectable card <label>; their clicks must not toggle the
 * native checkbox/radio. Changing either still bubbles a change event up to the
 * controller (which recomputes linked products + totals).
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {void}
 */
function wireLinked(fieldEl) {
  fieldEl.querySelectorAll('.optset-linked__varsel, .optset-linked__qty').forEach(el => {
    el.addEventListener('click', e => e.stopPropagation());
  });
}

/**
 * Wire an accordion Section — clicking the header collapses/expands the body
 * and keeps aria-expanded in sync. Plain (non-accordion) sections have no
 * header button and are left untouched.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {void}
 */
function wireSection(fieldEl) {
  const section = fieldEl.querySelector('.optset-section--accordion');
  if (!section) {
    return;
  }
  const header = section.querySelector('.optset-section__header');
  if (!header) {
    return;
  }
  header.addEventListener('click', e => {
    e.preventDefault();
    const collapsed = section.classList.toggle('is-collapsed');
    header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
}

/**
 * Wire the image-swatch product-image swap when enabled.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {void}
 */
function wireImageSwatchSwap(fieldEl) {
  const wrap = fieldEl.querySelector('.optset-swatches--image[data-update-image="yes"]');
  if (!wrap) {
    return;
  }
  wrap.querySelectorAll('.optset-swatch-item__native').forEach(input => {
    input.addEventListener('change', () => {
      const img = fieldEl.querySelector('input.optset-swatch-item__native:checked')?.closest('.optset-swatch-item')?.querySelector('img');
      const gallery = document.querySelector('.woocommerce-product-gallery__image img, .wp-post-image');
      if (img && gallery && img.src) {
        gallery.src = img.src;
        if (gallery.srcset) {
          gallery.srcset = img.src;
        }
      }
    });
  });
}

/**
 * Attach all custom-control behaviours for one field.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
function initWidgets(fieldEl, onChange) {
  const type = fieldEl.getAttribute('data-type') || '';
  try {
    if (type === 'select' || type === 'fontpicker') {
      wireSelect(fieldEl, onChange);
    } else if (type === 'colorpicker') {
      wireColorPicker(fieldEl, onChange);
    } else if (type === 'range') {
      wireRange(fieldEl, onChange);
    } else if (type === 'toggle') {
      wireToggle(fieldEl);
    } else if (type === 'popup') {
      wirePopup(fieldEl);
    } else if (type === 'imageswatch') {
      wireImageSwatchSwap(fieldEl);
    } else if (type === 'linkedproducts') {
      wireLinked(fieldEl);
    } else if (type === 'section') {
      wireSection(fieldEl);
    } else if (type === 'date') {
      (0,_date__WEBPACK_IMPORTED_MODULE_0__.wireDate)(fieldEl, onChange);
    } else if (type === 'time') {
      (0,_time__WEBPACK_IMPORTED_MODULE_1__.wireTime)(fieldEl, onChange);
    } else if (type === 'tel') {
      (0,_phone__WEBPACK_IMPORTED_MODULE_2__.wirePhone)(fieldEl, onChange);
    } else if (type === 'datetime') {
      // Combined field reuses both pickers (date control + time control).
      (0,_date__WEBPACK_IMPORTED_MODULE_0__.wireDate)(fieldEl, onChange);
      (0,_time__WEBPACK_IMPORTED_MODULE_1__.wireTime)(fieldEl, onChange);
    }
  } catch (e) {
    /* a broken widget must never wedge the page. */
  }
}

/***/ },

/***/ "./node_modules/flatpickr/dist/esm/index.js"
/*!**************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/index.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _types_options__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./types/options */ "./node_modules/flatpickr/dist/esm/types/options.js");
/* harmony import */ var _l10n_default__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./l10n/default */ "./node_modules/flatpickr/dist/esm/l10n/default.js");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils */ "./node_modules/flatpickr/dist/esm/utils/index.js");
/* harmony import */ var _utils_dom__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/dom */ "./node_modules/flatpickr/dist/esm/utils/dom.js");
/* harmony import */ var _utils_dates__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils/dates */ "./node_modules/flatpickr/dist/esm/utils/dates.js");
/* harmony import */ var _utils_formatting__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils/formatting */ "./node_modules/flatpickr/dist/esm/utils/formatting.js");
/* harmony import */ var _utils_polyfills__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils/polyfills */ "./node_modules/flatpickr/dist/esm/utils/polyfills.js");
/* harmony import */ var _utils_polyfills__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_utils_polyfills__WEBPACK_IMPORTED_MODULE_6__);
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (undefined && undefined.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};







var DEBOUNCED_CHANGE_MS = 300;
function FlatpickrInstance(element, instanceConfig) {
    var self = {
        config: __assign(__assign({}, _types_options__WEBPACK_IMPORTED_MODULE_0__.defaults), flatpickr.defaultConfig),
        l10n: _l10n_default__WEBPACK_IMPORTED_MODULE_1__["default"],
    };
    self.parseDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateParser)({ config: self.config, l10n: self.l10n });
    self._handlers = [];
    self.pluginElements = [];
    self.loadedPlugins = [];
    self._bind = bind;
    self._setHoursFromDate = setHoursFromDate;
    self._positionCalendar = positionCalendar;
    self.changeMonth = changeMonth;
    self.changeYear = changeYear;
    self.clear = clear;
    self.close = close;
    self.onMouseOver = onMouseOver;
    self._createElement = _utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement;
    self.createDay = createDay;
    self.destroy = destroy;
    self.isEnabled = isEnabled;
    self.jumpToDate = jumpToDate;
    self.updateValue = updateValue;
    self.open = open;
    self.redraw = redraw;
    self.set = set;
    self.setDate = setDate;
    self.toggle = toggle;
    function setupHelperFunctions() {
        self.utils = {
            getDaysInMonth: function (month, yr) {
                if (month === void 0) { month = self.currentMonth; }
                if (yr === void 0) { yr = self.currentYear; }
                if (month === 1 && ((yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0))
                    return 29;
                return self.l10n.daysInMonth[month];
            },
        };
    }
    function init() {
        self.element = self.input = element;
        self.isOpen = false;
        parseConfig();
        setupLocale();
        setupInputs();
        setupDates();
        setupHelperFunctions();
        if (!self.isMobile)
            build();
        bindEvents();
        if (self.selectedDates.length || self.config.noCalendar) {
            if (self.config.enableTime) {
                setHoursFromDate(self.config.noCalendar ? self.latestSelectedDateObj : undefined);
            }
            updateValue(false);
        }
        setCalendarWidth();
        var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (!self.isMobile && isSafari) {
            positionCalendar();
        }
        triggerEvent("onReady");
    }
    function getClosestActiveElement() {
        var _a;
        return (((_a = self.calendarContainer) === null || _a === void 0 ? void 0 : _a.getRootNode())
            .activeElement || document.activeElement);
    }
    function bindToInstance(fn) {
        return fn.bind(self);
    }
    function setCalendarWidth() {
        var config = self.config;
        if (config.weekNumbers === false && config.showMonths === 1) {
            return;
        }
        else if (config.noCalendar !== true) {
            window.requestAnimationFrame(function () {
                if (self.calendarContainer !== undefined) {
                    self.calendarContainer.style.visibility = "hidden";
                    self.calendarContainer.style.display = "block";
                }
                if (self.daysContainer !== undefined) {
                    var daysWidth = (self.days.offsetWidth + 1) * config.showMonths;
                    self.daysContainer.style.width = daysWidth + "px";
                    self.calendarContainer.style.width =
                        daysWidth +
                            (self.weekWrapper !== undefined
                                ? self.weekWrapper.offsetWidth
                                : 0) +
                            "px";
                    self.calendarContainer.style.removeProperty("visibility");
                    self.calendarContainer.style.removeProperty("display");
                }
            });
        }
    }
    function updateTime(e) {
        if (self.selectedDates.length === 0) {
            var defaultDate = self.config.minDate === undefined ||
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(new Date(), self.config.minDate) >= 0
                ? new Date()
                : new Date(self.config.minDate.getTime());
            var defaults = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.getDefaultHours)(self.config);
            defaultDate.setHours(defaults.hours, defaults.minutes, defaults.seconds, defaultDate.getMilliseconds());
            self.selectedDates = [defaultDate];
            self.latestSelectedDateObj = defaultDate;
        }
        if (e !== undefined && e.type !== "blur") {
            timeWrapper(e);
        }
        var prevValue = self._input.value;
        setHoursFromInputs();
        updateValue();
        if (self._input.value !== prevValue) {
            self._debouncedChange();
        }
    }
    function ampm2military(hour, amPM) {
        return (hour % 12) + 12 * (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(amPM === self.l10n.amPM[1]);
    }
    function military2ampm(hour) {
        switch (hour % 24) {
            case 0:
            case 12:
                return 12;
            default:
                return hour % 12;
        }
    }
    function setHoursFromInputs() {
        if (self.hourElement === undefined || self.minuteElement === undefined)
            return;
        var hours = (parseInt(self.hourElement.value.slice(-2), 10) || 0) % 24, minutes = (parseInt(self.minuteElement.value, 10) || 0) % 60, seconds = self.secondElement !== undefined
            ? (parseInt(self.secondElement.value, 10) || 0) % 60
            : 0;
        if (self.amPM !== undefined) {
            hours = ampm2military(hours, self.amPM.textContent);
        }
        var limitMinHours = self.config.minTime !== undefined ||
            (self.config.minDate &&
                self.minDateHasTime &&
                self.latestSelectedDateObj &&
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(self.latestSelectedDateObj, self.config.minDate, true) ===
                    0);
        var limitMaxHours = self.config.maxTime !== undefined ||
            (self.config.maxDate &&
                self.maxDateHasTime &&
                self.latestSelectedDateObj &&
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(self.latestSelectedDateObj, self.config.maxDate, true) ===
                    0);
        if (self.config.maxTime !== undefined &&
            self.config.minTime !== undefined &&
            self.config.minTime > self.config.maxTime) {
            var minBound = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.calculateSecondsSinceMidnight)(self.config.minTime.getHours(), self.config.minTime.getMinutes(), self.config.minTime.getSeconds());
            var maxBound = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.calculateSecondsSinceMidnight)(self.config.maxTime.getHours(), self.config.maxTime.getMinutes(), self.config.maxTime.getSeconds());
            var currentTime = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.calculateSecondsSinceMidnight)(hours, minutes, seconds);
            if (currentTime > maxBound && currentTime < minBound) {
                var result = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.parseSeconds)(minBound);
                hours = result[0];
                minutes = result[1];
                seconds = result[2];
            }
        }
        else {
            if (limitMaxHours) {
                var maxTime = self.config.maxTime !== undefined
                    ? self.config.maxTime
                    : self.config.maxDate;
                hours = Math.min(hours, maxTime.getHours());
                if (hours === maxTime.getHours())
                    minutes = Math.min(minutes, maxTime.getMinutes());
                if (minutes === maxTime.getMinutes())
                    seconds = Math.min(seconds, maxTime.getSeconds());
            }
            if (limitMinHours) {
                var minTime = self.config.minTime !== undefined
                    ? self.config.minTime
                    : self.config.minDate;
                hours = Math.max(hours, minTime.getHours());
                if (hours === minTime.getHours() && minutes < minTime.getMinutes())
                    minutes = minTime.getMinutes();
                if (minutes === minTime.getMinutes())
                    seconds = Math.max(seconds, minTime.getSeconds());
            }
        }
        setHours(hours, minutes, seconds);
    }
    function setHoursFromDate(dateObj) {
        var date = dateObj || self.latestSelectedDateObj;
        if (date && date instanceof Date) {
            setHours(date.getHours(), date.getMinutes(), date.getSeconds());
        }
    }
    function setHours(hours, minutes, seconds) {
        if (self.latestSelectedDateObj !== undefined) {
            self.latestSelectedDateObj.setHours(hours % 24, minutes, seconds || 0, 0);
        }
        if (!self.hourElement || !self.minuteElement || self.isMobile)
            return;
        self.hourElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(!self.config.time_24hr
            ? ((12 + hours) % 12) + 12 * (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(hours % 12 === 0)
            : hours);
        self.minuteElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(minutes);
        if (self.amPM !== undefined)
            self.amPM.textContent = self.l10n.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(hours >= 12)];
        if (self.secondElement !== undefined)
            self.secondElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(seconds);
    }
    function onYearInput(event) {
        var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(event);
        var year = parseInt(eventTarget.value) + (event.delta || 0);
        if (year / 1000 > 1 ||
            (event.key === "Enter" && !/[^\d]/.test(year.toString()))) {
            changeYear(year);
        }
    }
    function bind(element, event, handler, options) {
        if (event instanceof Array)
            return event.forEach(function (ev) { return bind(element, ev, handler, options); });
        if (element instanceof Array)
            return element.forEach(function (el) { return bind(el, event, handler, options); });
        element.addEventListener(event, handler, options);
        self._handlers.push({
            remove: function () { return element.removeEventListener(event, handler, options); },
        });
    }
    function triggerChange() {
        triggerEvent("onChange");
    }
    function bindEvents() {
        if (self.config.wrap) {
            ["open", "close", "toggle", "clear"].forEach(function (evt) {
                Array.prototype.forEach.call(self.element.querySelectorAll("[data-" + evt + "]"), function (el) {
                    return bind(el, "click", self[evt]);
                });
            });
        }
        if (self.isMobile) {
            setupMobile();
            return;
        }
        var debouncedResize = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.debounce)(onResize, 50);
        self._debouncedChange = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.debounce)(triggerChange, DEBOUNCED_CHANGE_MS);
        if (self.daysContainer && !/iPhone|iPad|iPod/i.test(navigator.userAgent))
            bind(self.daysContainer, "mouseover", function (e) {
                if (self.config.mode === "range")
                    onMouseOver((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e));
            });
        bind(self._input, "keydown", onKeyDown);
        if (self.calendarContainer !== undefined) {
            bind(self.calendarContainer, "keydown", onKeyDown);
        }
        if (!self.config.inline && !self.config.static)
            bind(window, "resize", debouncedResize);
        if (window.ontouchstart !== undefined)
            bind(window.document, "touchstart", documentClick);
        else
            bind(window.document, "mousedown", documentClick);
        bind(window.document, "focus", documentClick, { capture: true });
        if (self.config.clickOpens === true) {
            bind(self._input, "focus", self.open);
            bind(self._input, "click", self.open);
        }
        if (self.daysContainer !== undefined) {
            bind(self.monthNav, "click", onMonthNavClick);
            bind(self.monthNav, ["keyup", "increment"], onYearInput);
            bind(self.daysContainer, "click", selectDate);
        }
        if (self.timeContainer !== undefined &&
            self.minuteElement !== undefined &&
            self.hourElement !== undefined) {
            var selText = function (e) {
                return (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e).select();
            };
            bind(self.timeContainer, ["increment"], updateTime);
            bind(self.timeContainer, "blur", updateTime, { capture: true });
            bind(self.timeContainer, "click", timeIncrement);
            bind([self.hourElement, self.minuteElement], ["focus", "click"], selText);
            if (self.secondElement !== undefined)
                bind(self.secondElement, "focus", function () { return self.secondElement && self.secondElement.select(); });
            if (self.amPM !== undefined) {
                bind(self.amPM, "click", function (e) {
                    updateTime(e);
                });
            }
        }
        if (self.config.allowInput) {
            bind(self._input, "blur", onBlur);
        }
    }
    function jumpToDate(jumpDate, triggerChange) {
        var jumpTo = jumpDate !== undefined
            ? self.parseDate(jumpDate)
            : self.latestSelectedDateObj ||
                (self.config.minDate && self.config.minDate > self.now
                    ? self.config.minDate
                    : self.config.maxDate && self.config.maxDate < self.now
                        ? self.config.maxDate
                        : self.now);
        var oldYear = self.currentYear;
        var oldMonth = self.currentMonth;
        try {
            if (jumpTo !== undefined) {
                self.currentYear = jumpTo.getFullYear();
                self.currentMonth = jumpTo.getMonth();
            }
        }
        catch (e) {
            e.message = "Invalid date supplied: " + jumpTo;
            self.config.errorHandler(e);
        }
        if (triggerChange && self.currentYear !== oldYear) {
            triggerEvent("onYearChange");
            buildMonthSwitch();
        }
        if (triggerChange &&
            (self.currentYear !== oldYear || self.currentMonth !== oldMonth)) {
            triggerEvent("onMonthChange");
        }
        self.redraw();
    }
    function timeIncrement(e) {
        var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
        if (~eventTarget.className.indexOf("arrow"))
            incrementNumInput(e, eventTarget.classList.contains("arrowUp") ? 1 : -1);
    }
    function incrementNumInput(e, delta, inputElem) {
        var target = e && (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
        var input = inputElem ||
            (target && target.parentNode && target.parentNode.firstChild);
        var event = createEvent("increment");
        event.delta = delta;
        input && input.dispatchEvent(event);
    }
    function build() {
        var fragment = window.document.createDocumentFragment();
        self.calendarContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-calendar");
        self.calendarContainer.tabIndex = -1;
        if (!self.config.noCalendar) {
            fragment.appendChild(buildMonthNav());
            self.innerContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-innerContainer");
            if (self.config.weekNumbers) {
                var _a = buildWeeks(), weekWrapper = _a.weekWrapper, weekNumbers = _a.weekNumbers;
                self.innerContainer.appendChild(weekWrapper);
                self.weekNumbers = weekNumbers;
                self.weekWrapper = weekWrapper;
            }
            self.rContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-rContainer");
            self.rContainer.appendChild(buildWeekdays());
            if (!self.daysContainer) {
                self.daysContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-days");
                self.daysContainer.tabIndex = -1;
            }
            buildDays();
            self.rContainer.appendChild(self.daysContainer);
            self.innerContainer.appendChild(self.rContainer);
            fragment.appendChild(self.innerContainer);
        }
        if (self.config.enableTime) {
            fragment.appendChild(buildTime());
        }
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "rangeMode", self.config.mode === "range");
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "animate", self.config.animate === true);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "multiMonth", self.config.showMonths > 1);
        self.calendarContainer.appendChild(fragment);
        var customAppend = self.config.appendTo !== undefined &&
            self.config.appendTo.nodeType !== undefined;
        if (self.config.inline || self.config.static) {
            self.calendarContainer.classList.add(self.config.inline ? "inline" : "static");
            if (self.config.inline) {
                if (!customAppend && self.element.parentNode)
                    self.element.parentNode.insertBefore(self.calendarContainer, self._input.nextSibling);
                else if (self.config.appendTo !== undefined)
                    self.config.appendTo.appendChild(self.calendarContainer);
            }
            if (self.config.static) {
                var wrapper = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-wrapper");
                if (self.element.parentNode)
                    self.element.parentNode.insertBefore(wrapper, self.element);
                wrapper.appendChild(self.element);
                if (self.altInput)
                    wrapper.appendChild(self.altInput);
                wrapper.appendChild(self.calendarContainer);
            }
        }
        if (!self.config.static && !self.config.inline)
            (self.config.appendTo !== undefined
                ? self.config.appendTo
                : window.document.body).appendChild(self.calendarContainer);
    }
    function createDay(className, date, _dayNumber, i) {
        var dateIsEnabled = isEnabled(date, true), dayElement = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", className, date.getDate().toString());
        dayElement.dateObj = date;
        dayElement.$i = i;
        dayElement.setAttribute("aria-label", self.formatDate(date, self.config.ariaDateFormat));
        if (className.indexOf("hidden") === -1 &&
            (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.now) === 0) {
            self.todayDateElem = dayElement;
            dayElement.classList.add("today");
            dayElement.setAttribute("aria-current", "date");
        }
        if (dateIsEnabled) {
            dayElement.tabIndex = -1;
            if (isDateSelected(date)) {
                dayElement.classList.add("selected");
                self.selectedDateElem = dayElement;
                if (self.config.mode === "range") {
                    (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(dayElement, "startRange", self.selectedDates[0] &&
                        (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.selectedDates[0], true) === 0);
                    (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(dayElement, "endRange", self.selectedDates[1] &&
                        (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.selectedDates[1], true) === 0);
                    if (className === "nextMonthDay")
                        dayElement.classList.add("inRange");
                }
            }
        }
        else {
            dayElement.classList.add("flatpickr-disabled");
        }
        if (self.config.mode === "range") {
            if (isDateInRange(date) && !isDateSelected(date))
                dayElement.classList.add("inRange");
        }
        if (self.weekNumbers &&
            self.config.showMonths === 1 &&
            className !== "prevMonthDay" &&
            i % 7 === 6) {
            self.weekNumbers.insertAdjacentHTML("beforeend", "<span class='flatpickr-day'>" + self.config.getWeek(date) + "</span>");
        }
        triggerEvent("onDayCreate", dayElement);
        return dayElement;
    }
    function focusOnDayElem(targetNode) {
        targetNode.focus();
        if (self.config.mode === "range")
            onMouseOver(targetNode);
    }
    function getFirstAvailableDay(delta) {
        var startMonth = delta > 0 ? 0 : self.config.showMonths - 1;
        var endMonth = delta > 0 ? self.config.showMonths : -1;
        for (var m = startMonth; m != endMonth; m += delta) {
            var month = self.daysContainer.children[m];
            var startIndex = delta > 0 ? 0 : month.children.length - 1;
            var endIndex = delta > 0 ? month.children.length : -1;
            for (var i = startIndex; i != endIndex; i += delta) {
                var c = month.children[i];
                if (c.className.indexOf("hidden") === -1 && isEnabled(c.dateObj))
                    return c;
            }
        }
        return undefined;
    }
    function getNextAvailableDay(current, delta) {
        var givenMonth = current.className.indexOf("Month") === -1
            ? current.dateObj.getMonth()
            : self.currentMonth;
        var endMonth = delta > 0 ? self.config.showMonths : -1;
        var loopDelta = delta > 0 ? 1 : -1;
        for (var m = givenMonth - self.currentMonth; m != endMonth; m += loopDelta) {
            var month = self.daysContainer.children[m];
            var startIndex = givenMonth - self.currentMonth === m
                ? current.$i + delta
                : delta < 0
                    ? month.children.length - 1
                    : 0;
            var numMonthDays = month.children.length;
            for (var i = startIndex; i >= 0 && i < numMonthDays && i != (delta > 0 ? numMonthDays : -1); i += loopDelta) {
                var c = month.children[i];
                if (c.className.indexOf("hidden") === -1 &&
                    isEnabled(c.dateObj) &&
                    Math.abs(current.$i - i) >= Math.abs(delta))
                    return focusOnDayElem(c);
            }
        }
        self.changeMonth(loopDelta);
        focusOnDay(getFirstAvailableDay(loopDelta), 0);
        return undefined;
    }
    function focusOnDay(current, offset) {
        var activeElement = getClosestActiveElement();
        var dayFocused = isInView(activeElement || document.body);
        var startElem = current !== undefined
            ? current
            : dayFocused
                ? activeElement
                : self.selectedDateElem !== undefined && isInView(self.selectedDateElem)
                    ? self.selectedDateElem
                    : self.todayDateElem !== undefined && isInView(self.todayDateElem)
                        ? self.todayDateElem
                        : getFirstAvailableDay(offset > 0 ? 1 : -1);
        if (startElem === undefined) {
            self._input.focus();
        }
        else if (!dayFocused) {
            focusOnDayElem(startElem);
        }
        else {
            getNextAvailableDay(startElem, offset);
        }
    }
    function buildMonthDays(year, month) {
        var firstOfMonth = (new Date(year, month, 1).getDay() - self.l10n.firstDayOfWeek + 7) % 7;
        var prevMonthDays = self.utils.getDaysInMonth((month - 1 + 12) % 12, year);
        var daysInMonth = self.utils.getDaysInMonth(month, year), days = window.document.createDocumentFragment(), isMultiMonth = self.config.showMonths > 1, prevMonthDayClass = isMultiMonth ? "prevMonthDay hidden" : "prevMonthDay", nextMonthDayClass = isMultiMonth ? "nextMonthDay hidden" : "nextMonthDay";
        var dayNumber = prevMonthDays + 1 - firstOfMonth, dayIndex = 0;
        for (; dayNumber <= prevMonthDays; dayNumber++, dayIndex++) {
            days.appendChild(createDay("flatpickr-day " + prevMonthDayClass, new Date(year, month - 1, dayNumber), dayNumber, dayIndex));
        }
        for (dayNumber = 1; dayNumber <= daysInMonth; dayNumber++, dayIndex++) {
            days.appendChild(createDay("flatpickr-day", new Date(year, month, dayNumber), dayNumber, dayIndex));
        }
        for (var dayNum = daysInMonth + 1; dayNum <= 42 - firstOfMonth &&
            (self.config.showMonths === 1 || dayIndex % 7 !== 0); dayNum++, dayIndex++) {
            days.appendChild(createDay("flatpickr-day " + nextMonthDayClass, new Date(year, month + 1, dayNum % daysInMonth), dayNum, dayIndex));
        }
        var dayContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "dayContainer");
        dayContainer.appendChild(days);
        return dayContainer;
    }
    function buildDays() {
        if (self.daysContainer === undefined) {
            return;
        }
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.clearNode)(self.daysContainer);
        if (self.weekNumbers)
            (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.clearNode)(self.weekNumbers);
        var frag = document.createDocumentFragment();
        for (var i = 0; i < self.config.showMonths; i++) {
            var d = new Date(self.currentYear, self.currentMonth, 1);
            d.setMonth(self.currentMonth + i);
            frag.appendChild(buildMonthDays(d.getFullYear(), d.getMonth()));
        }
        self.daysContainer.appendChild(frag);
        self.days = self.daysContainer.firstChild;
        if (self.config.mode === "range" && self.selectedDates.length === 1) {
            onMouseOver();
        }
    }
    function buildMonthSwitch() {
        if (self.config.showMonths > 1 ||
            self.config.monthSelectorType !== "dropdown")
            return;
        var shouldBuildMonth = function (month) {
            if (self.config.minDate !== undefined &&
                self.currentYear === self.config.minDate.getFullYear() &&
                month < self.config.minDate.getMonth()) {
                return false;
            }
            return !(self.config.maxDate !== undefined &&
                self.currentYear === self.config.maxDate.getFullYear() &&
                month > self.config.maxDate.getMonth());
        };
        self.monthsDropdownContainer.tabIndex = -1;
        self.monthsDropdownContainer.innerHTML = "";
        for (var i = 0; i < 12; i++) {
            if (!shouldBuildMonth(i))
                continue;
            var month = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("option", "flatpickr-monthDropdown-month");
            month.value = new Date(self.currentYear, i).getMonth().toString();
            month.textContent = (0,_utils_formatting__WEBPACK_IMPORTED_MODULE_5__.monthToStr)(i, self.config.shorthandCurrentMonth, self.l10n);
            month.tabIndex = -1;
            if (self.currentMonth === i) {
                month.selected = true;
            }
            self.monthsDropdownContainer.appendChild(month);
        }
    }
    function buildMonth() {
        var container = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-month");
        var monthNavFragment = window.document.createDocumentFragment();
        var monthElement;
        if (self.config.showMonths > 1 ||
            self.config.monthSelectorType === "static") {
            monthElement = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "cur-month");
        }
        else {
            self.monthsDropdownContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("select", "flatpickr-monthDropdown-months");
            self.monthsDropdownContainer.setAttribute("aria-label", self.l10n.monthAriaLabel);
            bind(self.monthsDropdownContainer, "change", function (e) {
                var target = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
                var selectedMonth = parseInt(target.value, 10);
                self.changeMonth(selectedMonth - self.currentMonth);
                triggerEvent("onMonthChange");
            });
            buildMonthSwitch();
            monthElement = self.monthsDropdownContainer;
        }
        var yearInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createNumberInput)("cur-year", { tabindex: "-1" });
        var yearElement = yearInput.getElementsByTagName("input")[0];
        yearElement.setAttribute("aria-label", self.l10n.yearAriaLabel);
        if (self.config.minDate) {
            yearElement.setAttribute("min", self.config.minDate.getFullYear().toString());
        }
        if (self.config.maxDate) {
            yearElement.setAttribute("max", self.config.maxDate.getFullYear().toString());
            yearElement.disabled =
                !!self.config.minDate &&
                    self.config.minDate.getFullYear() === self.config.maxDate.getFullYear();
        }
        var currentMonth = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-current-month");
        currentMonth.appendChild(monthElement);
        currentMonth.appendChild(yearInput);
        monthNavFragment.appendChild(currentMonth);
        container.appendChild(monthNavFragment);
        return {
            container: container,
            yearElement: yearElement,
            monthElement: monthElement,
        };
    }
    function buildMonths() {
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.clearNode)(self.monthNav);
        self.monthNav.appendChild(self.prevMonthNav);
        if (self.config.showMonths) {
            self.yearElements = [];
            self.monthElements = [];
        }
        for (var m = self.config.showMonths; m--;) {
            var month = buildMonth();
            self.yearElements.push(month.yearElement);
            self.monthElements.push(month.monthElement);
            self.monthNav.appendChild(month.container);
        }
        self.monthNav.appendChild(self.nextMonthNav);
    }
    function buildMonthNav() {
        self.monthNav = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-months");
        self.yearElements = [];
        self.monthElements = [];
        self.prevMonthNav = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-prev-month");
        self.prevMonthNav.innerHTML = self.config.prevArrow;
        self.nextMonthNav = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-next-month");
        self.nextMonthNav.innerHTML = self.config.nextArrow;
        buildMonths();
        Object.defineProperty(self, "_hidePrevMonthArrow", {
            get: function () { return self.__hidePrevMonthArrow; },
            set: function (bool) {
                if (self.__hidePrevMonthArrow !== bool) {
                    (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.prevMonthNav, "flatpickr-disabled", bool);
                    self.__hidePrevMonthArrow = bool;
                }
            },
        });
        Object.defineProperty(self, "_hideNextMonthArrow", {
            get: function () { return self.__hideNextMonthArrow; },
            set: function (bool) {
                if (self.__hideNextMonthArrow !== bool) {
                    (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.nextMonthNav, "flatpickr-disabled", bool);
                    self.__hideNextMonthArrow = bool;
                }
            },
        });
        self.currentYearElement = self.yearElements[0];
        updateNavigationCurrentMonth();
        return self.monthNav;
    }
    function buildTime() {
        self.calendarContainer.classList.add("hasTime");
        if (self.config.noCalendar)
            self.calendarContainer.classList.add("noCalendar");
        var defaults = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.getDefaultHours)(self.config);
        self.timeContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-time");
        self.timeContainer.tabIndex = -1;
        var separator = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-time-separator", ":");
        var hourInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createNumberInput)("flatpickr-hour", {
            "aria-label": self.l10n.hourAriaLabel,
        });
        self.hourElement = hourInput.getElementsByTagName("input")[0];
        var minuteInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createNumberInput)("flatpickr-minute", {
            "aria-label": self.l10n.minuteAriaLabel,
        });
        self.minuteElement = minuteInput.getElementsByTagName("input")[0];
        self.hourElement.tabIndex = self.minuteElement.tabIndex = -1;
        self.hourElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(self.latestSelectedDateObj
            ? self.latestSelectedDateObj.getHours()
            : self.config.time_24hr
                ? defaults.hours
                : military2ampm(defaults.hours));
        self.minuteElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(self.latestSelectedDateObj
            ? self.latestSelectedDateObj.getMinutes()
            : defaults.minutes);
        self.hourElement.setAttribute("step", self.config.hourIncrement.toString());
        self.minuteElement.setAttribute("step", self.config.minuteIncrement.toString());
        self.hourElement.setAttribute("min", self.config.time_24hr ? "0" : "1");
        self.hourElement.setAttribute("max", self.config.time_24hr ? "23" : "12");
        self.hourElement.setAttribute("maxlength", "2");
        self.minuteElement.setAttribute("min", "0");
        self.minuteElement.setAttribute("max", "59");
        self.minuteElement.setAttribute("maxlength", "2");
        self.timeContainer.appendChild(hourInput);
        self.timeContainer.appendChild(separator);
        self.timeContainer.appendChild(minuteInput);
        if (self.config.time_24hr)
            self.timeContainer.classList.add("time24hr");
        if (self.config.enableSeconds) {
            self.timeContainer.classList.add("hasSeconds");
            var secondInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createNumberInput)("flatpickr-second");
            self.secondElement = secondInput.getElementsByTagName("input")[0];
            self.secondElement.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(self.latestSelectedDateObj
                ? self.latestSelectedDateObj.getSeconds()
                : defaults.seconds);
            self.secondElement.setAttribute("step", self.minuteElement.getAttribute("step"));
            self.secondElement.setAttribute("min", "0");
            self.secondElement.setAttribute("max", "59");
            self.secondElement.setAttribute("maxlength", "2");
            self.timeContainer.appendChild((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-time-separator", ":"));
            self.timeContainer.appendChild(secondInput);
        }
        if (!self.config.time_24hr) {
            self.amPM = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-am-pm", self.l10n.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)((self.latestSelectedDateObj
                ? self.hourElement.value
                : self.config.defaultHour) > 11)]);
            self.amPM.title = self.l10n.toggleTitle;
            self.amPM.tabIndex = -1;
            self.timeContainer.appendChild(self.amPM);
        }
        return self.timeContainer;
    }
    function buildWeekdays() {
        if (!self.weekdayContainer)
            self.weekdayContainer = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-weekdays");
        else
            (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.clearNode)(self.weekdayContainer);
        for (var i = self.config.showMonths; i--;) {
            var container = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-weekdaycontainer");
            self.weekdayContainer.appendChild(container);
        }
        updateWeekdays();
        return self.weekdayContainer;
    }
    function updateWeekdays() {
        if (!self.weekdayContainer) {
            return;
        }
        var firstDayOfWeek = self.l10n.firstDayOfWeek;
        var weekdays = __spreadArrays(self.l10n.weekdays.shorthand);
        if (firstDayOfWeek > 0 && firstDayOfWeek < weekdays.length) {
            weekdays = __spreadArrays(weekdays.splice(firstDayOfWeek, weekdays.length), weekdays.splice(0, firstDayOfWeek));
        }
        for (var i = self.config.showMonths; i--;) {
            self.weekdayContainer.children[i].innerHTML = "\n      <span class='flatpickr-weekday'>\n        " + weekdays.join("</span><span class='flatpickr-weekday'>") + "\n      </span>\n      ";
        }
    }
    function buildWeeks() {
        self.calendarContainer.classList.add("hasWeeks");
        var weekWrapper = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-weekwrapper");
        weekWrapper.appendChild((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("span", "flatpickr-weekday", self.l10n.weekAbbreviation));
        var weekNumbers = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("div", "flatpickr-weeks");
        weekWrapper.appendChild(weekNumbers);
        return {
            weekWrapper: weekWrapper,
            weekNumbers: weekNumbers,
        };
    }
    function changeMonth(value, isOffset) {
        if (isOffset === void 0) { isOffset = true; }
        var delta = isOffset ? value : value - self.currentMonth;
        if ((delta < 0 && self._hidePrevMonthArrow === true) ||
            (delta > 0 && self._hideNextMonthArrow === true))
            return;
        self.currentMonth += delta;
        if (self.currentMonth < 0 || self.currentMonth > 11) {
            self.currentYear += self.currentMonth > 11 ? 1 : -1;
            self.currentMonth = (self.currentMonth + 12) % 12;
            triggerEvent("onYearChange");
            buildMonthSwitch();
        }
        buildDays();
        triggerEvent("onMonthChange");
        updateNavigationCurrentMonth();
    }
    function clear(triggerChangeEvent, toInitial) {
        if (triggerChangeEvent === void 0) { triggerChangeEvent = true; }
        if (toInitial === void 0) { toInitial = true; }
        self.input.value = "";
        if (self.altInput !== undefined)
            self.altInput.value = "";
        if (self.mobileInput !== undefined)
            self.mobileInput.value = "";
        self.selectedDates = [];
        self.latestSelectedDateObj = undefined;
        if (toInitial === true) {
            self.currentYear = self._initialDate.getFullYear();
            self.currentMonth = self._initialDate.getMonth();
        }
        if (self.config.enableTime === true) {
            var _a = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.getDefaultHours)(self.config), hours = _a.hours, minutes = _a.minutes, seconds = _a.seconds;
            setHours(hours, minutes, seconds);
        }
        self.redraw();
        if (triggerChangeEvent)
            triggerEvent("onChange");
    }
    function close() {
        self.isOpen = false;
        if (!self.isMobile) {
            if (self.calendarContainer !== undefined) {
                self.calendarContainer.classList.remove("open");
            }
            if (self._input !== undefined) {
                self._input.classList.remove("active");
            }
        }
        triggerEvent("onClose");
    }
    function destroy() {
        if (self.config !== undefined)
            triggerEvent("onDestroy");
        for (var i = self._handlers.length; i--;) {
            self._handlers[i].remove();
        }
        self._handlers = [];
        if (self.mobileInput) {
            if (self.mobileInput.parentNode)
                self.mobileInput.parentNode.removeChild(self.mobileInput);
            self.mobileInput = undefined;
        }
        else if (self.calendarContainer && self.calendarContainer.parentNode) {
            if (self.config.static && self.calendarContainer.parentNode) {
                var wrapper = self.calendarContainer.parentNode;
                wrapper.lastChild && wrapper.removeChild(wrapper.lastChild);
                if (wrapper.parentNode) {
                    while (wrapper.firstChild)
                        wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
                    wrapper.parentNode.removeChild(wrapper);
                }
            }
            else
                self.calendarContainer.parentNode.removeChild(self.calendarContainer);
        }
        if (self.altInput) {
            self.input.type = "text";
            if (self.altInput.parentNode)
                self.altInput.parentNode.removeChild(self.altInput);
            delete self.altInput;
        }
        if (self.input) {
            self.input.type = self.input._type;
            self.input.classList.remove("flatpickr-input");
            self.input.removeAttribute("readonly");
        }
        [
            "_showTimeInput",
            "latestSelectedDateObj",
            "_hideNextMonthArrow",
            "_hidePrevMonthArrow",
            "__hideNextMonthArrow",
            "__hidePrevMonthArrow",
            "isMobile",
            "isOpen",
            "selectedDateElem",
            "minDateHasTime",
            "maxDateHasTime",
            "days",
            "daysContainer",
            "_input",
            "_positionElement",
            "innerContainer",
            "rContainer",
            "monthNav",
            "todayDateElem",
            "calendarContainer",
            "weekdayContainer",
            "prevMonthNav",
            "nextMonthNav",
            "monthsDropdownContainer",
            "currentMonthElement",
            "currentYearElement",
            "navigationCurrentMonth",
            "selectedDateElem",
            "config",
        ].forEach(function (k) {
            try {
                delete self[k];
            }
            catch (_) { }
        });
    }
    function isCalendarElem(elem) {
        return self.calendarContainer.contains(elem);
    }
    function documentClick(e) {
        if (self.isOpen && !self.config.inline) {
            var eventTarget_1 = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
            var isCalendarElement = isCalendarElem(eventTarget_1);
            var isInput = eventTarget_1 === self.input ||
                eventTarget_1 === self.altInput ||
                self.element.contains(eventTarget_1) ||
                (e.path &&
                    e.path.indexOf &&
                    (~e.path.indexOf(self.input) ||
                        ~e.path.indexOf(self.altInput)));
            var lostFocus = !isInput &&
                !isCalendarElement &&
                !isCalendarElem(e.relatedTarget);
            var isIgnored = !self.config.ignoredFocusElements.some(function (elem) {
                return elem.contains(eventTarget_1);
            });
            if (lostFocus && isIgnored) {
                if (self.config.allowInput) {
                    self.setDate(self._input.value, false, self.config.altInput
                        ? self.config.altFormat
                        : self.config.dateFormat);
                }
                if (self.timeContainer !== undefined &&
                    self.minuteElement !== undefined &&
                    self.hourElement !== undefined &&
                    self.input.value !== "" &&
                    self.input.value !== undefined) {
                    updateTime();
                }
                self.close();
                if (self.config &&
                    self.config.mode === "range" &&
                    self.selectedDates.length === 1)
                    self.clear(false);
            }
        }
    }
    function changeYear(newYear) {
        if (!newYear ||
            (self.config.minDate && newYear < self.config.minDate.getFullYear()) ||
            (self.config.maxDate && newYear > self.config.maxDate.getFullYear()))
            return;
        var newYearNum = newYear, isNewYear = self.currentYear !== newYearNum;
        self.currentYear = newYearNum || self.currentYear;
        if (self.config.maxDate &&
            self.currentYear === self.config.maxDate.getFullYear()) {
            self.currentMonth = Math.min(self.config.maxDate.getMonth(), self.currentMonth);
        }
        else if (self.config.minDate &&
            self.currentYear === self.config.minDate.getFullYear()) {
            self.currentMonth = Math.max(self.config.minDate.getMonth(), self.currentMonth);
        }
        if (isNewYear) {
            self.redraw();
            triggerEvent("onYearChange");
            buildMonthSwitch();
        }
    }
    function isEnabled(date, timeless) {
        var _a;
        if (timeless === void 0) { timeless = true; }
        var dateToCheck = self.parseDate(date, undefined, timeless);
        if ((self.config.minDate &&
            dateToCheck &&
            (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(dateToCheck, self.config.minDate, timeless !== undefined ? timeless : !self.minDateHasTime) < 0) ||
            (self.config.maxDate &&
                dateToCheck &&
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(dateToCheck, self.config.maxDate, timeless !== undefined ? timeless : !self.maxDateHasTime) > 0))
            return false;
        if (!self.config.enable && self.config.disable.length === 0)
            return true;
        if (dateToCheck === undefined)
            return false;
        var bool = !!self.config.enable, array = (_a = self.config.enable) !== null && _a !== void 0 ? _a : self.config.disable;
        for (var i = 0, d = void 0; i < array.length; i++) {
            d = array[i];
            if (typeof d === "function" &&
                d(dateToCheck))
                return bool;
            else if (d instanceof Date &&
                dateToCheck !== undefined &&
                d.getTime() === dateToCheck.getTime())
                return bool;
            else if (typeof d === "string") {
                var parsed = self.parseDate(d, undefined, true);
                return parsed && parsed.getTime() === dateToCheck.getTime()
                    ? bool
                    : !bool;
            }
            else if (typeof d === "object" &&
                dateToCheck !== undefined &&
                d.from &&
                d.to &&
                dateToCheck.getTime() >= d.from.getTime() &&
                dateToCheck.getTime() <= d.to.getTime())
                return bool;
        }
        return !bool;
    }
    function isInView(elem) {
        if (self.daysContainer !== undefined)
            return (elem.className.indexOf("hidden") === -1 &&
                elem.className.indexOf("flatpickr-disabled") === -1 &&
                self.daysContainer.contains(elem));
        return false;
    }
    function onBlur(e) {
        var isInput = e.target === self._input;
        var valueChanged = self._input.value.trimEnd() !== getDateStr();
        if (isInput &&
            valueChanged &&
            !(e.relatedTarget && isCalendarElem(e.relatedTarget))) {
            self.setDate(self._input.value, true, e.target === self.altInput
                ? self.config.altFormat
                : self.config.dateFormat);
        }
    }
    function onKeyDown(e) {
        var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
        var isInput = self.config.wrap
            ? element.contains(eventTarget)
            : eventTarget === self._input;
        var allowInput = self.config.allowInput;
        var allowKeydown = self.isOpen && (!allowInput || !isInput);
        var allowInlineKeydown = self.config.inline && isInput && !allowInput;
        if (e.keyCode === 13 && isInput) {
            if (allowInput) {
                self.setDate(self._input.value, true, eventTarget === self.altInput
                    ? self.config.altFormat
                    : self.config.dateFormat);
                self.close();
                return eventTarget.blur();
            }
            else {
                self.open();
            }
        }
        else if (isCalendarElem(eventTarget) ||
            allowKeydown ||
            allowInlineKeydown) {
            var isTimeObj = !!self.timeContainer &&
                self.timeContainer.contains(eventTarget);
            switch (e.keyCode) {
                case 13:
                    if (isTimeObj) {
                        e.preventDefault();
                        updateTime();
                        focusAndClose();
                    }
                    else
                        selectDate(e);
                    break;
                case 27:
                    e.preventDefault();
                    focusAndClose();
                    break;
                case 8:
                case 46:
                    if (isInput && !self.config.allowInput) {
                        e.preventDefault();
                        self.clear();
                    }
                    break;
                case 37:
                case 39:
                    if (!isTimeObj && !isInput) {
                        e.preventDefault();
                        var activeElement = getClosestActiveElement();
                        if (self.daysContainer !== undefined &&
                            (allowInput === false ||
                                (activeElement && isInView(activeElement)))) {
                            var delta_1 = e.keyCode === 39 ? 1 : -1;
                            if (!e.ctrlKey)
                                focusOnDay(undefined, delta_1);
                            else {
                                e.stopPropagation();
                                changeMonth(delta_1);
                                focusOnDay(getFirstAvailableDay(1), 0);
                            }
                        }
                    }
                    else if (self.hourElement)
                        self.hourElement.focus();
                    break;
                case 38:
                case 40:
                    e.preventDefault();
                    var delta = e.keyCode === 40 ? 1 : -1;
                    if ((self.daysContainer &&
                        eventTarget.$i !== undefined) ||
                        eventTarget === self.input ||
                        eventTarget === self.altInput) {
                        if (e.ctrlKey) {
                            e.stopPropagation();
                            changeYear(self.currentYear - delta);
                            focusOnDay(getFirstAvailableDay(1), 0);
                        }
                        else if (!isTimeObj)
                            focusOnDay(undefined, delta * 7);
                    }
                    else if (eventTarget === self.currentYearElement) {
                        changeYear(self.currentYear - delta);
                    }
                    else if (self.config.enableTime) {
                        if (!isTimeObj && self.hourElement)
                            self.hourElement.focus();
                        updateTime(e);
                        self._debouncedChange();
                    }
                    break;
                case 9:
                    if (isTimeObj) {
                        var elems = [
                            self.hourElement,
                            self.minuteElement,
                            self.secondElement,
                            self.amPM,
                        ]
                            .concat(self.pluginElements)
                            .filter(function (x) { return x; });
                        var i = elems.indexOf(eventTarget);
                        if (i !== -1) {
                            var target = elems[i + (e.shiftKey ? -1 : 1)];
                            e.preventDefault();
                            (target || self._input).focus();
                        }
                    }
                    else if (!self.config.noCalendar &&
                        self.daysContainer &&
                        self.daysContainer.contains(eventTarget) &&
                        e.shiftKey) {
                        e.preventDefault();
                        self._input.focus();
                    }
                    break;
                default:
                    break;
            }
        }
        if (self.amPM !== undefined && eventTarget === self.amPM) {
            switch (e.key) {
                case self.l10n.amPM[0].charAt(0):
                case self.l10n.amPM[0].charAt(0).toLowerCase():
                    self.amPM.textContent = self.l10n.amPM[0];
                    setHoursFromInputs();
                    updateValue();
                    break;
                case self.l10n.amPM[1].charAt(0):
                case self.l10n.amPM[1].charAt(0).toLowerCase():
                    self.amPM.textContent = self.l10n.amPM[1];
                    setHoursFromInputs();
                    updateValue();
                    break;
            }
        }
        if (isInput || isCalendarElem(eventTarget)) {
            triggerEvent("onKeyDown", e);
        }
    }
    function onMouseOver(elem, cellClass) {
        if (cellClass === void 0) { cellClass = "flatpickr-day"; }
        if (self.selectedDates.length !== 1 ||
            (elem &&
                (!elem.classList.contains(cellClass) ||
                    elem.classList.contains("flatpickr-disabled"))))
            return;
        var hoverDate = elem
            ? elem.dateObj.getTime()
            : self.days.firstElementChild.dateObj.getTime(), initialDate = self.parseDate(self.selectedDates[0], undefined, true).getTime(), rangeStartDate = Math.min(hoverDate, self.selectedDates[0].getTime()), rangeEndDate = Math.max(hoverDate, self.selectedDates[0].getTime());
        var containsDisabled = false;
        var minRange = 0, maxRange = 0;
        for (var t = rangeStartDate; t < rangeEndDate; t += _utils_dates__WEBPACK_IMPORTED_MODULE_4__.duration.DAY) {
            if (!isEnabled(new Date(t), true)) {
                containsDisabled =
                    containsDisabled || (t > rangeStartDate && t < rangeEndDate);
                if (t < initialDate && (!minRange || t > minRange))
                    minRange = t;
                else if (t > initialDate && (!maxRange || t < maxRange))
                    maxRange = t;
            }
        }
        var hoverableCells = Array.from(self.rContainer.querySelectorAll("*:nth-child(-n+" + self.config.showMonths + ") > ." + cellClass));
        hoverableCells.forEach(function (dayElem) {
            var date = dayElem.dateObj;
            var timestamp = date.getTime();
            var outOfRange = (minRange > 0 && timestamp < minRange) ||
                (maxRange > 0 && timestamp > maxRange);
            if (outOfRange) {
                dayElem.classList.add("notAllowed");
                ["inRange", "startRange", "endRange"].forEach(function (c) {
                    dayElem.classList.remove(c);
                });
                return;
            }
            else if (containsDisabled && !outOfRange)
                return;
            ["startRange", "inRange", "endRange", "notAllowed"].forEach(function (c) {
                dayElem.classList.remove(c);
            });
            if (elem !== undefined) {
                elem.classList.add(hoverDate <= self.selectedDates[0].getTime()
                    ? "startRange"
                    : "endRange");
                if (initialDate < hoverDate && timestamp === initialDate)
                    dayElem.classList.add("startRange");
                else if (initialDate > hoverDate && timestamp === initialDate)
                    dayElem.classList.add("endRange");
                if (timestamp >= minRange &&
                    (maxRange === 0 || timestamp <= maxRange) &&
                    (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.isBetween)(timestamp, initialDate, hoverDate))
                    dayElem.classList.add("inRange");
            }
        });
    }
    function onResize() {
        if (self.isOpen && !self.config.static && !self.config.inline)
            positionCalendar();
    }
    function open(e, positionElement) {
        if (positionElement === void 0) { positionElement = self._positionElement; }
        if (self.isMobile === true) {
            if (e) {
                e.preventDefault();
                var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
                if (eventTarget) {
                    eventTarget.blur();
                }
            }
            if (self.mobileInput !== undefined) {
                self.mobileInput.focus();
                self.mobileInput.click();
            }
            triggerEvent("onOpen");
            return;
        }
        else if (self._input.disabled || self.config.inline) {
            return;
        }
        var wasOpen = self.isOpen;
        self.isOpen = true;
        if (!wasOpen) {
            self.calendarContainer.classList.add("open");
            self._input.classList.add("active");
            triggerEvent("onOpen");
            positionCalendar(positionElement);
        }
        if (self.config.enableTime === true && self.config.noCalendar === true) {
            if (self.config.allowInput === false &&
                (e === undefined ||
                    !self.timeContainer.contains(e.relatedTarget))) {
                setTimeout(function () { return self.hourElement.select(); }, 50);
            }
        }
    }
    function minMaxDateSetter(type) {
        return function (date) {
            var dateObj = (self.config["_" + type + "Date"] = self.parseDate(date, self.config.dateFormat));
            var inverseDateObj = self.config["_" + (type === "min" ? "max" : "min") + "Date"];
            if (dateObj !== undefined) {
                self[type === "min" ? "minDateHasTime" : "maxDateHasTime"] =
                    dateObj.getHours() > 0 ||
                        dateObj.getMinutes() > 0 ||
                        dateObj.getSeconds() > 0;
            }
            if (self.selectedDates) {
                self.selectedDates = self.selectedDates.filter(function (d) { return isEnabled(d); });
                if (!self.selectedDates.length && type === "min")
                    setHoursFromDate(dateObj);
                updateValue();
            }
            if (self.daysContainer) {
                redraw();
                if (dateObj !== undefined)
                    self.currentYearElement[type] = dateObj.getFullYear().toString();
                else
                    self.currentYearElement.removeAttribute(type);
                self.currentYearElement.disabled =
                    !!inverseDateObj &&
                        dateObj !== undefined &&
                        inverseDateObj.getFullYear() === dateObj.getFullYear();
            }
        };
    }
    function parseConfig() {
        var boolOpts = [
            "wrap",
            "weekNumbers",
            "allowInput",
            "allowInvalidPreload",
            "clickOpens",
            "time_24hr",
            "enableTime",
            "noCalendar",
            "altInput",
            "shorthandCurrentMonth",
            "inline",
            "static",
            "enableSeconds",
            "disableMobile",
        ];
        var userConfig = __assign(__assign({}, JSON.parse(JSON.stringify(element.dataset || {}))), instanceConfig);
        var formats = {};
        self.config.parseDate = userConfig.parseDate;
        self.config.formatDate = userConfig.formatDate;
        Object.defineProperty(self.config, "enable", {
            get: function () { return self.config._enable; },
            set: function (dates) {
                self.config._enable = parseDateRules(dates);
            },
        });
        Object.defineProperty(self.config, "disable", {
            get: function () { return self.config._disable; },
            set: function (dates) {
                self.config._disable = parseDateRules(dates);
            },
        });
        var timeMode = userConfig.mode === "time";
        if (!userConfig.dateFormat && (userConfig.enableTime || timeMode)) {
            var defaultDateFormat = flatpickr.defaultConfig.dateFormat || _types_options__WEBPACK_IMPORTED_MODULE_0__.defaults.dateFormat;
            formats.dateFormat =
                userConfig.noCalendar || timeMode
                    ? "H:i" + (userConfig.enableSeconds ? ":S" : "")
                    : defaultDateFormat + " H:i" + (userConfig.enableSeconds ? ":S" : "");
        }
        if (userConfig.altInput &&
            (userConfig.enableTime || timeMode) &&
            !userConfig.altFormat) {
            var defaultAltFormat = flatpickr.defaultConfig.altFormat || _types_options__WEBPACK_IMPORTED_MODULE_0__.defaults.altFormat;
            formats.altFormat =
                userConfig.noCalendar || timeMode
                    ? "h:i" + (userConfig.enableSeconds ? ":S K" : " K")
                    : defaultAltFormat + (" h:i" + (userConfig.enableSeconds ? ":S" : "") + " K");
        }
        Object.defineProperty(self.config, "minDate", {
            get: function () { return self.config._minDate; },
            set: minMaxDateSetter("min"),
        });
        Object.defineProperty(self.config, "maxDate", {
            get: function () { return self.config._maxDate; },
            set: minMaxDateSetter("max"),
        });
        var minMaxTimeSetter = function (type) { return function (val) {
            self.config[type === "min" ? "_minTime" : "_maxTime"] = self.parseDate(val, "H:i:S");
        }; };
        Object.defineProperty(self.config, "minTime", {
            get: function () { return self.config._minTime; },
            set: minMaxTimeSetter("min"),
        });
        Object.defineProperty(self.config, "maxTime", {
            get: function () { return self.config._maxTime; },
            set: minMaxTimeSetter("max"),
        });
        if (userConfig.mode === "time") {
            self.config.noCalendar = true;
            self.config.enableTime = true;
        }
        Object.assign(self.config, formats, userConfig);
        for (var i = 0; i < boolOpts.length; i++)
            self.config[boolOpts[i]] =
                self.config[boolOpts[i]] === true ||
                    self.config[boolOpts[i]] === "true";
        _types_options__WEBPACK_IMPORTED_MODULE_0__.HOOKS.filter(function (hook) { return self.config[hook] !== undefined; }).forEach(function (hook) {
            self.config[hook] = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.arrayify)(self.config[hook] || []).map(bindToInstance);
        });
        self.isMobile =
            !self.config.disableMobile &&
                !self.config.inline &&
                self.config.mode === "single" &&
                !self.config.disable.length &&
                !self.config.enable &&
                !self.config.weekNumbers &&
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        for (var i = 0; i < self.config.plugins.length; i++) {
            var pluginConf = self.config.plugins[i](self) || {};
            for (var key in pluginConf) {
                if (_types_options__WEBPACK_IMPORTED_MODULE_0__.HOOKS.indexOf(key) > -1) {
                    self.config[key] = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.arrayify)(pluginConf[key])
                        .map(bindToInstance)
                        .concat(self.config[key]);
                }
                else if (typeof userConfig[key] === "undefined")
                    self.config[key] = pluginConf[key];
            }
        }
        if (!userConfig.altInputClass) {
            self.config.altInputClass =
                getInputElem().className + " " + self.config.altInputClass;
        }
        triggerEvent("onParseConfig");
    }
    function getInputElem() {
        return self.config.wrap
            ? element.querySelector("[data-input]")
            : element;
    }
    function setupLocale() {
        if (typeof self.config.locale !== "object" &&
            typeof flatpickr.l10ns[self.config.locale] === "undefined")
            self.config.errorHandler(new Error("flatpickr: invalid locale " + self.config.locale));
        self.l10n = __assign(__assign({}, flatpickr.l10ns.default), (typeof self.config.locale === "object"
            ? self.config.locale
            : self.config.locale !== "default"
                ? flatpickr.l10ns[self.config.locale]
                : undefined));
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.D = "(" + self.l10n.weekdays.shorthand.join("|") + ")";
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.l = "(" + self.l10n.weekdays.longhand.join("|") + ")";
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.M = "(" + self.l10n.months.shorthand.join("|") + ")";
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.F = "(" + self.l10n.months.longhand.join("|") + ")";
        _utils_formatting__WEBPACK_IMPORTED_MODULE_5__.tokenRegex.K = "(" + self.l10n.amPM[0] + "|" + self.l10n.amPM[1] + "|" + self.l10n.amPM[0].toLowerCase() + "|" + self.l10n.amPM[1].toLowerCase() + ")";
        var userConfig = __assign(__assign({}, instanceConfig), JSON.parse(JSON.stringify(element.dataset || {})));
        if (userConfig.time_24hr === undefined &&
            flatpickr.defaultConfig.time_24hr === undefined) {
            self.config.time_24hr = self.l10n.time_24hr;
        }
        self.formatDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateFormatter)(self);
        self.parseDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateParser)({ config: self.config, l10n: self.l10n });
    }
    function positionCalendar(customPositionElement) {
        if (typeof self.config.position === "function") {
            return void self.config.position(self, customPositionElement);
        }
        if (self.calendarContainer === undefined)
            return;
        triggerEvent("onPreCalendarPosition");
        var positionElement = customPositionElement || self._positionElement;
        var calendarHeight = Array.prototype.reduce.call(self.calendarContainer.children, (function (acc, child) { return acc + child.offsetHeight; }), 0), calendarWidth = self.calendarContainer.offsetWidth, configPos = self.config.position.split(" "), configPosVertical = configPos[0], configPosHorizontal = configPos.length > 1 ? configPos[1] : null, inputBounds = positionElement.getBoundingClientRect(), distanceFromBottom = window.innerHeight - inputBounds.bottom, showOnTop = configPosVertical === "above" ||
            (configPosVertical !== "below" &&
                distanceFromBottom < calendarHeight &&
                inputBounds.top > calendarHeight);
        var top = window.pageYOffset +
            inputBounds.top +
            (!showOnTop ? positionElement.offsetHeight + 2 : -calendarHeight - 2);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowTop", !showOnTop);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowBottom", showOnTop);
        if (self.config.inline)
            return;
        var left = window.pageXOffset + inputBounds.left;
        var isCenter = false;
        var isRight = false;
        if (configPosHorizontal === "center") {
            left -= (calendarWidth - inputBounds.width) / 2;
            isCenter = true;
        }
        else if (configPosHorizontal === "right") {
            left -= calendarWidth - inputBounds.width;
            isRight = true;
        }
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowLeft", !isCenter && !isRight);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowCenter", isCenter);
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "arrowRight", isRight);
        var right = window.document.body.offsetWidth -
            (window.pageXOffset + inputBounds.right);
        var rightMost = left + calendarWidth > window.document.body.offsetWidth;
        var centerMost = right + calendarWidth > window.document.body.offsetWidth;
        (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "rightMost", rightMost);
        if (self.config.static)
            return;
        self.calendarContainer.style.top = top + "px";
        if (!rightMost) {
            self.calendarContainer.style.left = left + "px";
            self.calendarContainer.style.right = "auto";
        }
        else if (!centerMost) {
            self.calendarContainer.style.left = "auto";
            self.calendarContainer.style.right = right + "px";
        }
        else {
            var doc = getDocumentStyleSheet();
            if (doc === undefined)
                return;
            var bodyWidth = window.document.body.offsetWidth;
            var centerLeft = Math.max(0, bodyWidth / 2 - calendarWidth / 2);
            var centerBefore = ".flatpickr-calendar.centerMost:before";
            var centerAfter = ".flatpickr-calendar.centerMost:after";
            var centerIndex = doc.cssRules.length;
            var centerStyle = "{left:" + inputBounds.left + "px;right:auto;}";
            (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "rightMost", false);
            (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.toggleClass)(self.calendarContainer, "centerMost", true);
            doc.insertRule(centerBefore + "," + centerAfter + centerStyle, centerIndex);
            self.calendarContainer.style.left = centerLeft + "px";
            self.calendarContainer.style.right = "auto";
        }
    }
    function getDocumentStyleSheet() {
        var editableSheet = null;
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sheet = document.styleSheets[i];
            if (!sheet.cssRules)
                continue;
            try {
                sheet.cssRules;
            }
            catch (err) {
                continue;
            }
            editableSheet = sheet;
            break;
        }
        return editableSheet != null ? editableSheet : createStyleSheet();
    }
    function createStyleSheet() {
        var style = document.createElement("style");
        document.head.appendChild(style);
        return style.sheet;
    }
    function redraw() {
        if (self.config.noCalendar || self.isMobile)
            return;
        buildMonthSwitch();
        updateNavigationCurrentMonth();
        buildDays();
    }
    function focusAndClose() {
        self._input.focus();
        if (window.navigator.userAgent.indexOf("MSIE") !== -1 ||
            navigator.msMaxTouchPoints !== undefined) {
            setTimeout(self.close, 0);
        }
        else {
            self.close();
        }
    }
    function selectDate(e) {
        e.preventDefault();
        e.stopPropagation();
        var isSelectable = function (day) {
            return day.classList &&
                day.classList.contains("flatpickr-day") &&
                !day.classList.contains("flatpickr-disabled") &&
                !day.classList.contains("notAllowed");
        };
        var t = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.findParent)((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e), isSelectable);
        if (t === undefined)
            return;
        var target = t;
        var selectedDate = (self.latestSelectedDateObj = new Date(target.dateObj.getTime()));
        var shouldChangeMonth = (selectedDate.getMonth() < self.currentMonth ||
            selectedDate.getMonth() >
                self.currentMonth + self.config.showMonths - 1) &&
            self.config.mode !== "range";
        self.selectedDateElem = target;
        if (self.config.mode === "single")
            self.selectedDates = [selectedDate];
        else if (self.config.mode === "multiple") {
            var selectedIndex = isDateSelected(selectedDate);
            if (selectedIndex)
                self.selectedDates.splice(parseInt(selectedIndex), 1);
            else
                self.selectedDates.push(selectedDate);
        }
        else if (self.config.mode === "range") {
            if (self.selectedDates.length === 2) {
                self.clear(false, false);
            }
            self.latestSelectedDateObj = selectedDate;
            self.selectedDates.push(selectedDate);
            if ((0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(selectedDate, self.selectedDates[0], true) !== 0)
                self.selectedDates.sort(function (a, b) { return a.getTime() - b.getTime(); });
        }
        setHoursFromInputs();
        if (shouldChangeMonth) {
            var isNewYear = self.currentYear !== selectedDate.getFullYear();
            self.currentYear = selectedDate.getFullYear();
            self.currentMonth = selectedDate.getMonth();
            if (isNewYear) {
                triggerEvent("onYearChange");
                buildMonthSwitch();
            }
            triggerEvent("onMonthChange");
        }
        updateNavigationCurrentMonth();
        buildDays();
        updateValue();
        if (!shouldChangeMonth &&
            self.config.mode !== "range" &&
            self.config.showMonths === 1)
            focusOnDayElem(target);
        else if (self.selectedDateElem !== undefined &&
            self.hourElement === undefined) {
            self.selectedDateElem && self.selectedDateElem.focus();
        }
        if (self.hourElement !== undefined)
            self.hourElement !== undefined && self.hourElement.focus();
        if (self.config.closeOnSelect) {
            var single = self.config.mode === "single" && !self.config.enableTime;
            var range = self.config.mode === "range" &&
                self.selectedDates.length === 2 &&
                !self.config.enableTime;
            if (single || range) {
                focusAndClose();
            }
        }
        triggerChange();
    }
    var CALLBACKS = {
        locale: [setupLocale, updateWeekdays],
        showMonths: [buildMonths, setCalendarWidth, buildWeekdays],
        minDate: [jumpToDate],
        maxDate: [jumpToDate],
        positionElement: [updatePositionElement],
        clickOpens: [
            function () {
                if (self.config.clickOpens === true) {
                    bind(self._input, "focus", self.open);
                    bind(self._input, "click", self.open);
                }
                else {
                    self._input.removeEventListener("focus", self.open);
                    self._input.removeEventListener("click", self.open);
                }
            },
        ],
    };
    function set(option, value) {
        if (option !== null && typeof option === "object") {
            Object.assign(self.config, option);
            for (var key in option) {
                if (CALLBACKS[key] !== undefined)
                    CALLBACKS[key].forEach(function (x) { return x(); });
            }
        }
        else {
            self.config[option] = value;
            if (CALLBACKS[option] !== undefined)
                CALLBACKS[option].forEach(function (x) { return x(); });
            else if (_types_options__WEBPACK_IMPORTED_MODULE_0__.HOOKS.indexOf(option) > -1)
                self.config[option] = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.arrayify)(value);
        }
        self.redraw();
        updateValue(true);
    }
    function setSelectedDate(inputDate, format) {
        var dates = [];
        if (inputDate instanceof Array)
            dates = inputDate.map(function (d) { return self.parseDate(d, format); });
        else if (inputDate instanceof Date || typeof inputDate === "number")
            dates = [self.parseDate(inputDate, format)];
        else if (typeof inputDate === "string") {
            switch (self.config.mode) {
                case "single":
                case "time":
                    dates = [self.parseDate(inputDate, format)];
                    break;
                case "multiple":
                    dates = inputDate
                        .split(self.config.conjunction)
                        .map(function (date) { return self.parseDate(date, format); });
                    break;
                case "range":
                    dates = inputDate
                        .split(self.l10n.rangeSeparator)
                        .map(function (date) { return self.parseDate(date, format); });
                    break;
                default:
                    break;
            }
        }
        else
            self.config.errorHandler(new Error("Invalid date supplied: " + JSON.stringify(inputDate)));
        self.selectedDates = (self.config.allowInvalidPreload
            ? dates
            : dates.filter(function (d) { return d instanceof Date && isEnabled(d, false); }));
        if (self.config.mode === "range")
            self.selectedDates.sort(function (a, b) { return a.getTime() - b.getTime(); });
    }
    function setDate(date, triggerChange, format) {
        if (triggerChange === void 0) { triggerChange = false; }
        if (format === void 0) { format = self.config.dateFormat; }
        if ((date !== 0 && !date) || (date instanceof Array && date.length === 0))
            return self.clear(triggerChange);
        setSelectedDate(date, format);
        self.latestSelectedDateObj =
            self.selectedDates[self.selectedDates.length - 1];
        self.redraw();
        jumpToDate(undefined, triggerChange);
        setHoursFromDate();
        if (self.selectedDates.length === 0) {
            self.clear(false);
        }
        updateValue(triggerChange);
        if (triggerChange)
            triggerEvent("onChange");
    }
    function parseDateRules(arr) {
        return arr
            .slice()
            .map(function (rule) {
            if (typeof rule === "string" ||
                typeof rule === "number" ||
                rule instanceof Date) {
                return self.parseDate(rule, undefined, true);
            }
            else if (rule &&
                typeof rule === "object" &&
                rule.from &&
                rule.to)
                return {
                    from: self.parseDate(rule.from, undefined),
                    to: self.parseDate(rule.to, undefined),
                };
            return rule;
        })
            .filter(function (x) { return x; });
    }
    function setupDates() {
        self.selectedDates = [];
        self.now = self.parseDate(self.config.now) || new Date();
        var preloadedDate = self.config.defaultDate ||
            ((self.input.nodeName === "INPUT" ||
                self.input.nodeName === "TEXTAREA") &&
                self.input.placeholder &&
                self.input.value === self.input.placeholder
                ? null
                : self.input.value);
        if (preloadedDate)
            setSelectedDate(preloadedDate, self.config.dateFormat);
        self._initialDate =
            self.selectedDates.length > 0
                ? self.selectedDates[0]
                : self.config.minDate &&
                    self.config.minDate.getTime() > self.now.getTime()
                    ? self.config.minDate
                    : self.config.maxDate &&
                        self.config.maxDate.getTime() < self.now.getTime()
                        ? self.config.maxDate
                        : self.now;
        self.currentYear = self._initialDate.getFullYear();
        self.currentMonth = self._initialDate.getMonth();
        if (self.selectedDates.length > 0)
            self.latestSelectedDateObj = self.selectedDates[0];
        if (self.config.minTime !== undefined)
            self.config.minTime = self.parseDate(self.config.minTime, "H:i");
        if (self.config.maxTime !== undefined)
            self.config.maxTime = self.parseDate(self.config.maxTime, "H:i");
        self.minDateHasTime =
            !!self.config.minDate &&
                (self.config.minDate.getHours() > 0 ||
                    self.config.minDate.getMinutes() > 0 ||
                    self.config.minDate.getSeconds() > 0);
        self.maxDateHasTime =
            !!self.config.maxDate &&
                (self.config.maxDate.getHours() > 0 ||
                    self.config.maxDate.getMinutes() > 0 ||
                    self.config.maxDate.getSeconds() > 0);
    }
    function setupInputs() {
        self.input = getInputElem();
        if (!self.input) {
            self.config.errorHandler(new Error("Invalid input element specified"));
            return;
        }
        self.input._type = self.input.type;
        self.input.type = "text";
        self.input.classList.add("flatpickr-input");
        self._input = self.input;
        if (self.config.altInput) {
            self.altInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)(self.input.nodeName, self.config.altInputClass);
            self._input = self.altInput;
            self.altInput.placeholder = self.input.placeholder;
            self.altInput.disabled = self.input.disabled;
            self.altInput.required = self.input.required;
            self.altInput.tabIndex = self.input.tabIndex;
            self.altInput.type = "text";
            self.input.setAttribute("type", "hidden");
            if (!self.config.static && self.input.parentNode)
                self.input.parentNode.insertBefore(self.altInput, self.input.nextSibling);
        }
        if (!self.config.allowInput)
            self._input.setAttribute("readonly", "readonly");
        updatePositionElement();
    }
    function updatePositionElement() {
        self._positionElement = self.config.positionElement || self._input;
    }
    function setupMobile() {
        var inputType = self.config.enableTime
            ? self.config.noCalendar
                ? "time"
                : "datetime-local"
            : "date";
        self.mobileInput = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.createElement)("input", self.input.className + " flatpickr-mobile");
        self.mobileInput.tabIndex = 1;
        self.mobileInput.type = inputType;
        self.mobileInput.disabled = self.input.disabled;
        self.mobileInput.required = self.input.required;
        self.mobileInput.placeholder = self.input.placeholder;
        self.mobileFormatStr =
            inputType === "datetime-local"
                ? "Y-m-d\\TH:i:S"
                : inputType === "date"
                    ? "Y-m-d"
                    : "H:i:S";
        if (self.selectedDates.length > 0) {
            self.mobileInput.defaultValue = self.mobileInput.value = self.formatDate(self.selectedDates[0], self.mobileFormatStr);
        }
        if (self.config.minDate)
            self.mobileInput.min = self.formatDate(self.config.minDate, "Y-m-d");
        if (self.config.maxDate)
            self.mobileInput.max = self.formatDate(self.config.maxDate, "Y-m-d");
        if (self.input.getAttribute("step"))
            self.mobileInput.step = String(self.input.getAttribute("step"));
        self.input.type = "hidden";
        if (self.altInput !== undefined)
            self.altInput.type = "hidden";
        try {
            if (self.input.parentNode)
                self.input.parentNode.insertBefore(self.mobileInput, self.input.nextSibling);
        }
        catch (_a) { }
        bind(self.mobileInput, "change", function (e) {
            self.setDate((0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e).value, false, self.mobileFormatStr);
            triggerEvent("onChange");
            triggerEvent("onClose");
        });
    }
    function toggle(e) {
        if (self.isOpen === true)
            return self.close();
        self.open(e);
    }
    function triggerEvent(event, data) {
        if (self.config === undefined)
            return;
        var hooks = self.config[event];
        if (hooks !== undefined && hooks.length > 0) {
            for (var i = 0; hooks[i] && i < hooks.length; i++)
                hooks[i](self.selectedDates, self.input.value, self, data);
        }
        if (event === "onChange") {
            self.input.dispatchEvent(createEvent("change"));
            self.input.dispatchEvent(createEvent("input"));
        }
    }
    function createEvent(name) {
        var e = document.createEvent("Event");
        e.initEvent(name, true, true);
        return e;
    }
    function isDateSelected(date) {
        for (var i = 0; i < self.selectedDates.length; i++) {
            var selectedDate = self.selectedDates[i];
            if (selectedDate instanceof Date &&
                (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(selectedDate, date) === 0)
                return "" + i;
        }
        return false;
    }
    function isDateInRange(date) {
        if (self.config.mode !== "range" || self.selectedDates.length < 2)
            return false;
        return ((0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.selectedDates[0]) >= 0 &&
            (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates)(date, self.selectedDates[1]) <= 0);
    }
    function updateNavigationCurrentMonth() {
        if (self.config.noCalendar || self.isMobile || !self.monthNav)
            return;
        self.yearElements.forEach(function (yearElement, i) {
            var d = new Date(self.currentYear, self.currentMonth, 1);
            d.setMonth(self.currentMonth + i);
            if (self.config.showMonths > 1 ||
                self.config.monthSelectorType === "static") {
                self.monthElements[i].textContent =
                    (0,_utils_formatting__WEBPACK_IMPORTED_MODULE_5__.monthToStr)(d.getMonth(), self.config.shorthandCurrentMonth, self.l10n) + " ";
            }
            else {
                self.monthsDropdownContainer.value = d.getMonth().toString();
            }
            yearElement.value = d.getFullYear().toString();
        });
        self._hidePrevMonthArrow =
            self.config.minDate !== undefined &&
                (self.currentYear === self.config.minDate.getFullYear()
                    ? self.currentMonth <= self.config.minDate.getMonth()
                    : self.currentYear < self.config.minDate.getFullYear());
        self._hideNextMonthArrow =
            self.config.maxDate !== undefined &&
                (self.currentYear === self.config.maxDate.getFullYear()
                    ? self.currentMonth + 1 > self.config.maxDate.getMonth()
                    : self.currentYear > self.config.maxDate.getFullYear());
    }
    function getDateStr(specificFormat) {
        var format = specificFormat ||
            (self.config.altInput ? self.config.altFormat : self.config.dateFormat);
        return self.selectedDates
            .map(function (dObj) { return self.formatDate(dObj, format); })
            .filter(function (d, i, arr) {
            return self.config.mode !== "range" ||
                self.config.enableTime ||
                arr.indexOf(d) === i;
        })
            .join(self.config.mode !== "range"
            ? self.config.conjunction
            : self.l10n.rangeSeparator);
    }
    function updateValue(triggerChange) {
        if (triggerChange === void 0) { triggerChange = true; }
        if (self.mobileInput !== undefined && self.mobileFormatStr) {
            self.mobileInput.value =
                self.latestSelectedDateObj !== undefined
                    ? self.formatDate(self.latestSelectedDateObj, self.mobileFormatStr)
                    : "";
        }
        self.input.value = getDateStr(self.config.dateFormat);
        if (self.altInput !== undefined) {
            self.altInput.value = getDateStr(self.config.altFormat);
        }
        if (triggerChange !== false)
            triggerEvent("onValueUpdate");
    }
    function onMonthNavClick(e) {
        var eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e);
        var isPrevMonth = self.prevMonthNav.contains(eventTarget);
        var isNextMonth = self.nextMonthNav.contains(eventTarget);
        if (isPrevMonth || isNextMonth) {
            changeMonth(isPrevMonth ? -1 : 1);
        }
        else if (self.yearElements.indexOf(eventTarget) >= 0) {
            eventTarget.select();
        }
        else if (eventTarget.classList.contains("arrowUp")) {
            self.changeYear(self.currentYear + 1);
        }
        else if (eventTarget.classList.contains("arrowDown")) {
            self.changeYear(self.currentYear - 1);
        }
    }
    function timeWrapper(e) {
        e.preventDefault();
        var isKeyDown = e.type === "keydown", eventTarget = (0,_utils_dom__WEBPACK_IMPORTED_MODULE_3__.getEventTarget)(e), input = eventTarget;
        if (self.amPM !== undefined && eventTarget === self.amPM) {
            self.amPM.textContent =
                self.l10n.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(self.amPM.textContent === self.l10n.amPM[0])];
        }
        var min = parseFloat(input.getAttribute("min")), max = parseFloat(input.getAttribute("max")), step = parseFloat(input.getAttribute("step")), curValue = parseInt(input.value, 10), delta = e.delta ||
            (isKeyDown ? (e.which === 38 ? 1 : -1) : 0);
        var newValue = curValue + step * delta;
        if (typeof input.value !== "undefined" && input.value.length === 2) {
            var isHourElem = input === self.hourElement, isMinuteElem = input === self.minuteElement;
            if (newValue < min) {
                newValue =
                    max +
                        newValue +
                        (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(!isHourElem) +
                        ((0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(isHourElem) && (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(!self.amPM));
                if (isMinuteElem)
                    incrementNumInput(undefined, -1, self.hourElement);
            }
            else if (newValue > max) {
                newValue =
                    input === self.hourElement ? newValue - max - (0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(!self.amPM) : min;
                if (isMinuteElem)
                    incrementNumInput(undefined, 1, self.hourElement);
            }
            if (self.amPM &&
                isHourElem &&
                (step === 1
                    ? newValue + curValue === 23
                    : Math.abs(newValue - curValue) > step)) {
                self.amPM.textContent =
                    self.l10n.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_2__.int)(self.amPM.textContent === self.l10n.amPM[0])];
            }
            input.value = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.pad)(newValue);
        }
    }
    init();
    return self;
}
function _flatpickr(nodeList, config) {
    var nodes = Array.prototype.slice
        .call(nodeList)
        .filter(function (x) { return x instanceof HTMLElement; });
    var instances = [];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        try {
            if (node.getAttribute("data-fp-omit") !== null)
                continue;
            if (node._flatpickr !== undefined) {
                node._flatpickr.destroy();
                node._flatpickr = undefined;
            }
            node._flatpickr = FlatpickrInstance(node, config || {});
            instances.push(node._flatpickr);
        }
        catch (e) {
            console.error(e);
        }
    }
    return instances.length === 1 ? instances[0] : instances;
}
if (typeof HTMLElement !== "undefined" &&
    typeof HTMLCollection !== "undefined" &&
    typeof NodeList !== "undefined") {
    HTMLCollection.prototype.flatpickr = NodeList.prototype.flatpickr = function (config) {
        return _flatpickr(this, config);
    };
    HTMLElement.prototype.flatpickr = function (config) {
        return _flatpickr([this], config);
    };
}
var flatpickr = function (selector, config) {
    if (typeof selector === "string") {
        return _flatpickr(window.document.querySelectorAll(selector), config);
    }
    else if (selector instanceof Node) {
        return _flatpickr([selector], config);
    }
    else {
        return _flatpickr(selector, config);
    }
};
flatpickr.defaultConfig = {};
flatpickr.l10ns = {
    en: __assign({}, _l10n_default__WEBPACK_IMPORTED_MODULE_1__["default"]),
    default: __assign({}, _l10n_default__WEBPACK_IMPORTED_MODULE_1__["default"]),
};
flatpickr.localize = function (l10n) {
    flatpickr.l10ns.default = __assign(__assign({}, flatpickr.l10ns.default), l10n);
};
flatpickr.setDefaults = function (config) {
    flatpickr.defaultConfig = __assign(__assign({}, flatpickr.defaultConfig), config);
};
flatpickr.parseDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateParser)({});
flatpickr.formatDate = (0,_utils_dates__WEBPACK_IMPORTED_MODULE_4__.createDateFormatter)({});
flatpickr.compareDates = _utils_dates__WEBPACK_IMPORTED_MODULE_4__.compareDates;
if (typeof jQuery !== "undefined" && typeof jQuery.fn !== "undefined") {
    jQuery.fn.flatpickr = function (config) {
        return _flatpickr(this, config);
    };
}
Date.prototype.fp_incr = function (days) {
    return new Date(this.getFullYear(), this.getMonth(), this.getDate() + (typeof days === "string" ? parseInt(days, 10) : days));
};
if (typeof window !== "undefined") {
    window.flatpickr = flatpickr;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (flatpickr);


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/l10n/default.js"
/*!*********************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/l10n/default.js ***!
  \*********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   english: () => (/* binding */ english)
/* harmony export */ });
var english = {
    weekdays: {
        shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        longhand: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ],
    },
    months: {
        shorthand: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ],
        longhand: [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ],
    },
    daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    firstDayOfWeek: 0,
    ordinal: function (nth) {
        var s = nth % 100;
        if (s > 3 && s < 21)
            return "th";
        switch (s % 10) {
            case 1:
                return "st";
            case 2:
                return "nd";
            case 3:
                return "rd";
            default:
                return "th";
        }
    },
    rangeSeparator: " to ",
    weekAbbreviation: "Wk",
    scrollTitle: "Scroll to increment",
    toggleTitle: "Click to toggle",
    amPM: ["AM", "PM"],
    yearAriaLabel: "Year",
    monthAriaLabel: "Month",
    hourAriaLabel: "Hour",
    minuteAriaLabel: "Minute",
    time_24hr: false,
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (english);


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/types/options.js"
/*!**********************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/types/options.js ***!
  \**********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HOOKS: () => (/* binding */ HOOKS),
/* harmony export */   defaults: () => (/* binding */ defaults)
/* harmony export */ });
var HOOKS = [
    "onChange",
    "onClose",
    "onDayCreate",
    "onDestroy",
    "onKeyDown",
    "onMonthChange",
    "onOpen",
    "onParseConfig",
    "onReady",
    "onValueUpdate",
    "onYearChange",
    "onPreCalendarPosition",
];
var defaults = {
    _disable: [],
    allowInput: false,
    allowInvalidPreload: false,
    altFormat: "F j, Y",
    altInput: false,
    altInputClass: "form-control input",
    animate: typeof window === "object" &&
        window.navigator.userAgent.indexOf("MSIE") === -1,
    ariaDateFormat: "F j, Y",
    autoFillDefaultTime: true,
    clickOpens: true,
    closeOnSelect: true,
    conjunction: ", ",
    dateFormat: "Y-m-d",
    defaultHour: 12,
    defaultMinute: 0,
    defaultSeconds: 0,
    disable: [],
    disableMobile: false,
    enableSeconds: false,
    enableTime: false,
    errorHandler: function (err) {
        return typeof console !== "undefined" && console.warn(err);
    },
    getWeek: function (givenDate) {
        var date = new Date(givenDate.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
        var week1 = new Date(date.getFullYear(), 0, 4);
        return (1 +
            Math.round(((date.getTime() - week1.getTime()) / 86400000 -
                3 +
                ((week1.getDay() + 6) % 7)) /
                7));
    },
    hourIncrement: 1,
    ignoredFocusElements: [],
    inline: false,
    locale: "default",
    minuteIncrement: 5,
    mode: "single",
    monthSelectorType: "dropdown",
    nextArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M13.207 8.472l-7.854 7.854-0.707-0.707 7.146-7.146-7.146-7.148 0.707-0.707 7.854 7.854z' /></svg>",
    noCalendar: false,
    now: new Date(),
    onChange: [],
    onClose: [],
    onDayCreate: [],
    onDestroy: [],
    onKeyDown: [],
    onMonthChange: [],
    onOpen: [],
    onParseConfig: [],
    onReady: [],
    onValueUpdate: [],
    onYearChange: [],
    onPreCalendarPosition: [],
    plugins: [],
    position: "auto",
    positionElement: undefined,
    prevArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M5.207 8.471l7.146 7.147-0.707 0.707-7.853-7.854 7.854-7.853 0.707 0.707-7.147 7.146z' /></svg>",
    shorthandCurrentMonth: false,
    showMonths: 1,
    static: false,
    time_24hr: false,
    weekNumbers: false,
    wrap: false,
};


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/dates.js"
/*!********************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/dates.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   calculateSecondsSinceMidnight: () => (/* binding */ calculateSecondsSinceMidnight),
/* harmony export */   compareDates: () => (/* binding */ compareDates),
/* harmony export */   compareTimes: () => (/* binding */ compareTimes),
/* harmony export */   createDateFormatter: () => (/* binding */ createDateFormatter),
/* harmony export */   createDateParser: () => (/* binding */ createDateParser),
/* harmony export */   duration: () => (/* binding */ duration),
/* harmony export */   getDefaultHours: () => (/* binding */ getDefaultHours),
/* harmony export */   isBetween: () => (/* binding */ isBetween),
/* harmony export */   parseSeconds: () => (/* binding */ parseSeconds)
/* harmony export */ });
/* harmony import */ var _formatting__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./formatting */ "./node_modules/flatpickr/dist/esm/utils/formatting.js");
/* harmony import */ var _types_options__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../types/options */ "./node_modules/flatpickr/dist/esm/types/options.js");
/* harmony import */ var _l10n_default__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../l10n/default */ "./node_modules/flatpickr/dist/esm/l10n/default.js");



var createDateFormatter = function (_a) {
    var _b = _a.config, config = _b === void 0 ? _types_options__WEBPACK_IMPORTED_MODULE_1__.defaults : _b, _c = _a.l10n, l10n = _c === void 0 ? _l10n_default__WEBPACK_IMPORTED_MODULE_2__.english : _c, _d = _a.isMobile, isMobile = _d === void 0 ? false : _d;
    return function (dateObj, frmt, overrideLocale) {
        var locale = overrideLocale || l10n;
        if (config.formatDate !== undefined && !isMobile) {
            return config.formatDate(dateObj, frmt, locale);
        }
        return frmt
            .split("")
            .map(function (c, i, arr) {
            return _formatting__WEBPACK_IMPORTED_MODULE_0__.formats[c] && arr[i - 1] !== "\\"
                ? _formatting__WEBPACK_IMPORTED_MODULE_0__.formats[c](dateObj, locale, config)
                : c !== "\\"
                    ? c
                    : "";
        })
            .join("");
    };
};
var createDateParser = function (_a) {
    var _b = _a.config, config = _b === void 0 ? _types_options__WEBPACK_IMPORTED_MODULE_1__.defaults : _b, _c = _a.l10n, l10n = _c === void 0 ? _l10n_default__WEBPACK_IMPORTED_MODULE_2__.english : _c;
    return function (date, givenFormat, timeless, customLocale) {
        if (date !== 0 && !date)
            return undefined;
        var locale = customLocale || l10n;
        var parsedDate;
        var dateOrig = date;
        if (date instanceof Date)
            parsedDate = new Date(date.getTime());
        else if (typeof date !== "string" &&
            date.toFixed !== undefined)
            parsedDate = new Date(date);
        else if (typeof date === "string") {
            var format = givenFormat || (config || _types_options__WEBPACK_IMPORTED_MODULE_1__.defaults).dateFormat;
            var datestr = String(date).trim();
            if (datestr === "today") {
                parsedDate = new Date();
                timeless = true;
            }
            else if (config && config.parseDate) {
                parsedDate = config.parseDate(date, format);
            }
            else if (/Z$/.test(datestr) ||
                /GMT$/.test(datestr)) {
                parsedDate = new Date(date);
            }
            else {
                var matched = void 0, ops = [];
                for (var i = 0, matchIndex = 0, regexStr = ""; i < format.length; i++) {
                    var token = format[i];
                    var isBackSlash = token === "\\";
                    var escaped = format[i - 1] === "\\" || isBackSlash;
                    if (_formatting__WEBPACK_IMPORTED_MODULE_0__.tokenRegex[token] && !escaped) {
                        regexStr += _formatting__WEBPACK_IMPORTED_MODULE_0__.tokenRegex[token];
                        var match = new RegExp(regexStr).exec(date);
                        if (match && (matched = true)) {
                            ops[token !== "Y" ? "push" : "unshift"]({
                                fn: _formatting__WEBPACK_IMPORTED_MODULE_0__.revFormat[token],
                                val: match[++matchIndex],
                            });
                        }
                    }
                    else if (!isBackSlash)
                        regexStr += ".";
                }
                parsedDate =
                    !config || !config.noCalendar
                        ? new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0)
                        : new Date(new Date().setHours(0, 0, 0, 0));
                ops.forEach(function (_a) {
                    var fn = _a.fn, val = _a.val;
                    return (parsedDate = fn(parsedDate, val, locale) || parsedDate);
                });
                parsedDate = matched ? parsedDate : undefined;
            }
        }
        if (!(parsedDate instanceof Date && !isNaN(parsedDate.getTime()))) {
            config.errorHandler(new Error("Invalid date provided: " + dateOrig));
            return undefined;
        }
        if (timeless === true)
            parsedDate.setHours(0, 0, 0, 0);
        return parsedDate;
    };
};
function compareDates(date1, date2, timeless) {
    if (timeless === void 0) { timeless = true; }
    if (timeless !== false) {
        return (new Date(date1.getTime()).setHours(0, 0, 0, 0) -
            new Date(date2.getTime()).setHours(0, 0, 0, 0));
    }
    return date1.getTime() - date2.getTime();
}
function compareTimes(date1, date2) {
    return (3600 * (date1.getHours() - date2.getHours()) +
        60 * (date1.getMinutes() - date2.getMinutes()) +
        date1.getSeconds() -
        date2.getSeconds());
}
var isBetween = function (ts, ts1, ts2) {
    return ts > Math.min(ts1, ts2) && ts < Math.max(ts1, ts2);
};
var calculateSecondsSinceMidnight = function (hours, minutes, seconds) {
    return hours * 3600 + minutes * 60 + seconds;
};
var parseSeconds = function (secondsSinceMidnight) {
    var hours = Math.floor(secondsSinceMidnight / 3600), minutes = (secondsSinceMidnight - hours * 3600) / 60;
    return [hours, minutes, secondsSinceMidnight - hours * 3600 - minutes * 60];
};
var duration = {
    DAY: 86400000,
};
function getDefaultHours(config) {
    var hours = config.defaultHour;
    var minutes = config.defaultMinute;
    var seconds = config.defaultSeconds;
    if (config.minDate !== undefined) {
        var minHour = config.minDate.getHours();
        var minMinutes = config.minDate.getMinutes();
        var minSeconds = config.minDate.getSeconds();
        if (hours < minHour) {
            hours = minHour;
        }
        if (hours === minHour && minutes < minMinutes) {
            minutes = minMinutes;
        }
        if (hours === minHour && minutes === minMinutes && seconds < minSeconds)
            seconds = config.minDate.getSeconds();
    }
    if (config.maxDate !== undefined) {
        var maxHr = config.maxDate.getHours();
        var maxMinutes = config.maxDate.getMinutes();
        hours = Math.min(hours, maxHr);
        if (hours === maxHr)
            minutes = Math.min(maxMinutes, minutes);
        if (hours === maxHr && minutes === maxMinutes)
            seconds = config.maxDate.getSeconds();
    }
    return { hours: hours, minutes: minutes, seconds: seconds };
}


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/dom.js"
/*!******************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/dom.js ***!
  \******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clearNode: () => (/* binding */ clearNode),
/* harmony export */   createElement: () => (/* binding */ createElement),
/* harmony export */   createNumberInput: () => (/* binding */ createNumberInput),
/* harmony export */   findParent: () => (/* binding */ findParent),
/* harmony export */   getEventTarget: () => (/* binding */ getEventTarget),
/* harmony export */   toggleClass: () => (/* binding */ toggleClass)
/* harmony export */ });
function toggleClass(elem, className, bool) {
    if (bool === true)
        return elem.classList.add(className);
    elem.classList.remove(className);
}
function createElement(tag, className, content) {
    var e = window.document.createElement(tag);
    className = className || "";
    content = content || "";
    e.className = className;
    if (content !== undefined)
        e.textContent = content;
    return e;
}
function clearNode(node) {
    while (node.firstChild)
        node.removeChild(node.firstChild);
}
function findParent(node, condition) {
    if (condition(node))
        return node;
    else if (node.parentNode)
        return findParent(node.parentNode, condition);
    return undefined;
}
function createNumberInput(inputClassName, opts) {
    var wrapper = createElement("div", "numInputWrapper"), numInput = createElement("input", "numInput " + inputClassName), arrowUp = createElement("span", "arrowUp"), arrowDown = createElement("span", "arrowDown");
    if (navigator.userAgent.indexOf("MSIE 9.0") === -1) {
        numInput.type = "number";
    }
    else {
        numInput.type = "text";
        numInput.pattern = "\\d*";
    }
    if (opts !== undefined)
        for (var key in opts)
            numInput.setAttribute(key, opts[key]);
    wrapper.appendChild(numInput);
    wrapper.appendChild(arrowUp);
    wrapper.appendChild(arrowDown);
    return wrapper;
}
function getEventTarget(event) {
    try {
        if (typeof event.composedPath === "function") {
            var path = event.composedPath();
            return path[0];
        }
        return event.target;
    }
    catch (error) {
        return event.target;
    }
}


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/formatting.js"
/*!*************************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/formatting.js ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   formats: () => (/* binding */ formats),
/* harmony export */   monthToStr: () => (/* binding */ monthToStr),
/* harmony export */   revFormat: () => (/* binding */ revFormat),
/* harmony export */   tokenRegex: () => (/* binding */ tokenRegex)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils */ "./node_modules/flatpickr/dist/esm/utils/index.js");

var doNothing = function () { return undefined; };
var monthToStr = function (monthNumber, shorthand, locale) { return locale.months[shorthand ? "shorthand" : "longhand"][monthNumber]; };
var revFormat = {
    D: doNothing,
    F: function (dateObj, monthName, locale) {
        dateObj.setMonth(locale.months.longhand.indexOf(monthName));
    },
    G: function (dateObj, hour) {
        dateObj.setHours((dateObj.getHours() >= 12 ? 12 : 0) + parseFloat(hour));
    },
    H: function (dateObj, hour) {
        dateObj.setHours(parseFloat(hour));
    },
    J: function (dateObj, day) {
        dateObj.setDate(parseFloat(day));
    },
    K: function (dateObj, amPM, locale) {
        dateObj.setHours((dateObj.getHours() % 12) +
            12 * (0,_utils__WEBPACK_IMPORTED_MODULE_0__.int)(new RegExp(locale.amPM[1], "i").test(amPM)));
    },
    M: function (dateObj, shortMonth, locale) {
        dateObj.setMonth(locale.months.shorthand.indexOf(shortMonth));
    },
    S: function (dateObj, seconds) {
        dateObj.setSeconds(parseFloat(seconds));
    },
    U: function (_, unixSeconds) { return new Date(parseFloat(unixSeconds) * 1000); },
    W: function (dateObj, weekNum, locale) {
        var weekNumber = parseInt(weekNum);
        var date = new Date(dateObj.getFullYear(), 0, 2 + (weekNumber - 1) * 7, 0, 0, 0, 0);
        date.setDate(date.getDate() - date.getDay() + locale.firstDayOfWeek);
        return date;
    },
    Y: function (dateObj, year) {
        dateObj.setFullYear(parseFloat(year));
    },
    Z: function (_, ISODate) { return new Date(ISODate); },
    d: function (dateObj, day) {
        dateObj.setDate(parseFloat(day));
    },
    h: function (dateObj, hour) {
        dateObj.setHours((dateObj.getHours() >= 12 ? 12 : 0) + parseFloat(hour));
    },
    i: function (dateObj, minutes) {
        dateObj.setMinutes(parseFloat(minutes));
    },
    j: function (dateObj, day) {
        dateObj.setDate(parseFloat(day));
    },
    l: doNothing,
    m: function (dateObj, month) {
        dateObj.setMonth(parseFloat(month) - 1);
    },
    n: function (dateObj, month) {
        dateObj.setMonth(parseFloat(month) - 1);
    },
    s: function (dateObj, seconds) {
        dateObj.setSeconds(parseFloat(seconds));
    },
    u: function (_, unixMillSeconds) {
        return new Date(parseFloat(unixMillSeconds));
    },
    w: doNothing,
    y: function (dateObj, year) {
        dateObj.setFullYear(2000 + parseFloat(year));
    },
};
var tokenRegex = {
    D: "",
    F: "",
    G: "(\\d\\d|\\d)",
    H: "(\\d\\d|\\d)",
    J: "(\\d\\d|\\d)\\w+",
    K: "",
    M: "",
    S: "(\\d\\d|\\d)",
    U: "(.+)",
    W: "(\\d\\d|\\d)",
    Y: "(\\d{4})",
    Z: "(.+)",
    d: "(\\d\\d|\\d)",
    h: "(\\d\\d|\\d)",
    i: "(\\d\\d|\\d)",
    j: "(\\d\\d|\\d)",
    l: "",
    m: "(\\d\\d|\\d)",
    n: "(\\d\\d|\\d)",
    s: "(\\d\\d|\\d)",
    u: "(.+)",
    w: "(\\d\\d|\\d)",
    y: "(\\d{2})",
};
var formats = {
    Z: function (date) { return date.toISOString(); },
    D: function (date, locale, options) {
        return locale.weekdays.shorthand[formats.w(date, locale, options)];
    },
    F: function (date, locale, options) {
        return monthToStr(formats.n(date, locale, options) - 1, false, locale);
    },
    G: function (date, locale, options) {
        return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(formats.h(date, locale, options));
    },
    H: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getHours()); },
    J: function (date, locale) {
        return locale.ordinal !== undefined
            ? date.getDate() + locale.ordinal(date.getDate())
            : date.getDate();
    },
    K: function (date, locale) { return locale.amPM[(0,_utils__WEBPACK_IMPORTED_MODULE_0__.int)(date.getHours() > 11)]; },
    M: function (date, locale) {
        return monthToStr(date.getMonth(), true, locale);
    },
    S: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getSeconds()); },
    U: function (date) { return date.getTime() / 1000; },
    W: function (date, _, options) {
        return options.getWeek(date);
    },
    Y: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getFullYear(), 4); },
    d: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getDate()); },
    h: function (date) { return (date.getHours() % 12 ? date.getHours() % 12 : 12); },
    i: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getMinutes()); },
    j: function (date) { return date.getDate(); },
    l: function (date, locale) {
        return locale.weekdays.longhand[date.getDay()];
    },
    m: function (date) { return (0,_utils__WEBPACK_IMPORTED_MODULE_0__.pad)(date.getMonth() + 1); },
    n: function (date) { return date.getMonth() + 1; },
    s: function (date) { return date.getSeconds(); },
    u: function (date) { return date.getTime(); },
    w: function (date) { return date.getDay(); },
    y: function (date) { return String(date.getFullYear()).substring(2); },
};


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/index.js"
/*!********************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/index.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   arrayify: () => (/* binding */ arrayify),
/* harmony export */   debounce: () => (/* binding */ debounce),
/* harmony export */   int: () => (/* binding */ int),
/* harmony export */   pad: () => (/* binding */ pad)
/* harmony export */ });
var pad = function (number, length) {
    if (length === void 0) { length = 2; }
    return ("000" + number).slice(length * -1);
};
var int = function (bool) { return (bool === true ? 1 : 0); };
function debounce(fn, wait) {
    var t;
    return function () {
        var _this = this;
        var args = arguments;
        clearTimeout(t);
        t = setTimeout(function () { return fn.apply(_this, args); }, wait);
    };
}
var arrayify = function (obj) {
    return obj instanceof Array ? obj : [obj];
};


/***/ },

/***/ "./node_modules/flatpickr/dist/esm/utils/polyfills.js"
/*!************************************************************!*\
  !*** ./node_modules/flatpickr/dist/esm/utils/polyfills.js ***!
  \************************************************************/
() {


if (typeof Object.assign !== "function") {
    Object.assign = function (target) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!target) {
            throw TypeError("Cannot convert undefined or null to object");
        }
        var _loop_1 = function (source) {
            if (source) {
                Object.keys(source).forEach(function (key) { return (target[key] = source[key]); });
            }
        };
        for (var _a = 0, args_1 = args; _a < args_1.length; _a++) {
            var source = args_1[_a];
            _loop_1(source);
        }
        return target;
    };
}


/***/ },

/***/ "./node_modules/flatpickr/dist/flatpickr.min.css"
/*!*******************************************************!*\
  !*** ./node_modules/flatpickr/dist/flatpickr.min.css ***!
  \*******************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "./assets/src/scss/blocks.scss"
/*!*************************************!*\
  !*** ./assets/src/scss/blocks.scss ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "./assets/src/scss/store.scss"
/*!************************************!*\
  !*** ./assets/src/scss/store.scss ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "@wordpress/i18n"
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
(module) {

module.exports = window["wp"]["i18n"];

/***/ },

/***/ "./assets/data/countries.json"
/*!************************************!*\
  !*** ./assets/data/countries.json ***!
  \************************************/
(module) {

module.exports = /*#__PURE__*/JSON.parse('[{"iso2":"af","name":"Afghanistan","dial":"93"},{"iso2":"ax","name":"Åland Islands","dial":"358"},{"iso2":"al","name":"Albania","dial":"355"},{"iso2":"dz","name":"Algeria","dial":"213"},{"iso2":"as","name":"American Samoa","dial":"1"},{"iso2":"ad","name":"Andorra","dial":"376"},{"iso2":"ao","name":"Angola","dial":"244"},{"iso2":"ai","name":"Anguilla","dial":"1"},{"iso2":"ag","name":"Antigua and Barbuda","dial":"1"},{"iso2":"ar","name":"Argentina","dial":"54"},{"iso2":"am","name":"Armenia","dial":"374"},{"iso2":"aw","name":"Aruba","dial":"297"},{"iso2":"au","name":"Australia","dial":"61"},{"iso2":"at","name":"Austria","dial":"43"},{"iso2":"az","name":"Azerbaijan","dial":"994"},{"iso2":"bs","name":"Bahamas","dial":"1"},{"iso2":"bh","name":"Bahrain","dial":"973"},{"iso2":"bd","name":"Bangladesh","dial":"880"},{"iso2":"bb","name":"Barbados","dial":"1"},{"iso2":"by","name":"Belarus","dial":"375"},{"iso2":"be","name":"Belgium","dial":"32"},{"iso2":"bz","name":"Belize","dial":"501"},{"iso2":"bj","name":"Benin","dial":"229"},{"iso2":"bm","name":"Bermuda","dial":"1"},{"iso2":"bt","name":"Bhutan","dial":"975"},{"iso2":"bo","name":"Bolivia","dial":"591"},{"iso2":"ba","name":"Bosnia and Herzegovina","dial":"387"},{"iso2":"bw","name":"Botswana","dial":"267"},{"iso2":"br","name":"Brazil","dial":"55"},{"iso2":"io","name":"British Indian Ocean Territory","dial":"246"},{"iso2":"vg","name":"British Virgin Islands","dial":"1"},{"iso2":"bn","name":"Brunei","dial":"673"},{"iso2":"bg","name":"Bulgaria","dial":"359"},{"iso2":"bf","name":"Burkina Faso","dial":"226"},{"iso2":"bi","name":"Burundi","dial":"257"},{"iso2":"kh","name":"Cambodia","dial":"855"},{"iso2":"cm","name":"Cameroon","dial":"237"},{"iso2":"ca","name":"Canada","dial":"1"},{"iso2":"cv","name":"Cape Verde","dial":"238"},{"iso2":"bq","name":"Caribbean Netherlands","dial":"599"},{"iso2":"ky","name":"Cayman Islands","dial":"1"},{"iso2":"cf","name":"Central African Republic","dial":"236"},{"iso2":"td","name":"Chad","dial":"235"},{"iso2":"cl","name":"Chile","dial":"56"},{"iso2":"cn","name":"China","dial":"86"},{"iso2":"cx","name":"Christmas Island","dial":"61"},{"iso2":"cc","name":"Cocos (Keeling) Islands","dial":"61"},{"iso2":"co","name":"Colombia","dial":"57"},{"iso2":"km","name":"Comoros","dial":"269"},{"iso2":"cd","name":"Congo (DRC)","dial":"243"},{"iso2":"cg","name":"Congo (Republic)","dial":"242"},{"iso2":"ck","name":"Cook Islands","dial":"682"},{"iso2":"cr","name":"Costa Rica","dial":"506"},{"iso2":"ci","name":"Côte d\'Ivoire","dial":"225"},{"iso2":"hr","name":"Croatia","dial":"385"},{"iso2":"cu","name":"Cuba","dial":"53"},{"iso2":"cw","name":"Curaçao","dial":"599"},{"iso2":"cy","name":"Cyprus","dial":"357"},{"iso2":"cz","name":"Czechia","dial":"420"},{"iso2":"dk","name":"Denmark","dial":"45"},{"iso2":"dj","name":"Djibouti","dial":"253"},{"iso2":"dm","name":"Dominica","dial":"1"},{"iso2":"do","name":"Dominican Republic","dial":"1"},{"iso2":"ec","name":"Ecuador","dial":"593"},{"iso2":"eg","name":"Egypt","dial":"20"},{"iso2":"sv","name":"El Salvador","dial":"503"},{"iso2":"gq","name":"Equatorial Guinea","dial":"240"},{"iso2":"er","name":"Eritrea","dial":"291"},{"iso2":"ee","name":"Estonia","dial":"372"},{"iso2":"sz","name":"Eswatini","dial":"268"},{"iso2":"et","name":"Ethiopia","dial":"251"},{"iso2":"fk","name":"Falkland Islands","dial":"500"},{"iso2":"fo","name":"Faroe Islands","dial":"298"},{"iso2":"fj","name":"Fiji","dial":"679"},{"iso2":"fi","name":"Finland","dial":"358"},{"iso2":"fr","name":"France","dial":"33"},{"iso2":"gf","name":"French Guiana","dial":"594"},{"iso2":"pf","name":"French Polynesia","dial":"689"},{"iso2":"ga","name":"Gabon","dial":"241"},{"iso2":"gm","name":"Gambia","dial":"220"},{"iso2":"ge","name":"Georgia","dial":"995"},{"iso2":"de","name":"Germany","dial":"49"},{"iso2":"gh","name":"Ghana","dial":"233"},{"iso2":"gi","name":"Gibraltar","dial":"350"},{"iso2":"gr","name":"Greece","dial":"30"},{"iso2":"gl","name":"Greenland","dial":"299"},{"iso2":"gd","name":"Grenada","dial":"1"},{"iso2":"gp","name":"Guadeloupe","dial":"590"},{"iso2":"gu","name":"Guam","dial":"1"},{"iso2":"gt","name":"Guatemala","dial":"502"},{"iso2":"gg","name":"Guernsey","dial":"44"},{"iso2":"gn","name":"Guinea","dial":"224"},{"iso2":"gw","name":"Guinea-Bissau","dial":"245"},{"iso2":"gy","name":"Guyana","dial":"592"},{"iso2":"ht","name":"Haiti","dial":"509"},{"iso2":"hn","name":"Honduras","dial":"504"},{"iso2":"hk","name":"Hong Kong","dial":"852"},{"iso2":"hu","name":"Hungary","dial":"36"},{"iso2":"is","name":"Iceland","dial":"354"},{"iso2":"in","name":"India","dial":"91"},{"iso2":"id","name":"Indonesia","dial":"62"},{"iso2":"ir","name":"Iran","dial":"98"},{"iso2":"iq","name":"Iraq","dial":"964"},{"iso2":"ie","name":"Ireland","dial":"353"},{"iso2":"im","name":"Isle of Man","dial":"44"},{"iso2":"il","name":"Israel","dial":"972"},{"iso2":"it","name":"Italy","dial":"39"},{"iso2":"jm","name":"Jamaica","dial":"1"},{"iso2":"jp","name":"Japan","dial":"81"},{"iso2":"je","name":"Jersey","dial":"44"},{"iso2":"jo","name":"Jordan","dial":"962"},{"iso2":"kz","name":"Kazakhstan","dial":"7"},{"iso2":"ke","name":"Kenya","dial":"254"},{"iso2":"ki","name":"Kiribati","dial":"686"},{"iso2":"xk","name":"Kosovo","dial":"383"},{"iso2":"kw","name":"Kuwait","dial":"965"},{"iso2":"kg","name":"Kyrgyzstan","dial":"996"},{"iso2":"la","name":"Laos","dial":"856"},{"iso2":"lv","name":"Latvia","dial":"371"},{"iso2":"lb","name":"Lebanon","dial":"961"},{"iso2":"ls","name":"Lesotho","dial":"266"},{"iso2":"lr","name":"Liberia","dial":"231"},{"iso2":"ly","name":"Libya","dial":"218"},{"iso2":"li","name":"Liechtenstein","dial":"423"},{"iso2":"lt","name":"Lithuania","dial":"370"},{"iso2":"lu","name":"Luxembourg","dial":"352"},{"iso2":"mo","name":"Macau","dial":"853"},{"iso2":"mg","name":"Madagascar","dial":"261"},{"iso2":"mw","name":"Malawi","dial":"265"},{"iso2":"my","name":"Malaysia","dial":"60"},{"iso2":"mv","name":"Maldives","dial":"960"},{"iso2":"ml","name":"Mali","dial":"223"},{"iso2":"mt","name":"Malta","dial":"356"},{"iso2":"mh","name":"Marshall Islands","dial":"692"},{"iso2":"mq","name":"Martinique","dial":"596"},{"iso2":"mr","name":"Mauritania","dial":"222"},{"iso2":"mu","name":"Mauritius","dial":"230"},{"iso2":"yt","name":"Mayotte","dial":"262"},{"iso2":"mx","name":"Mexico","dial":"52"},{"iso2":"fm","name":"Micronesia","dial":"691"},{"iso2":"md","name":"Moldova","dial":"373"},{"iso2":"mc","name":"Monaco","dial":"377"},{"iso2":"mn","name":"Mongolia","dial":"976"},{"iso2":"me","name":"Montenegro","dial":"382"},{"iso2":"ms","name":"Montserrat","dial":"1"},{"iso2":"ma","name":"Morocco","dial":"212"},{"iso2":"mz","name":"Mozambique","dial":"258"},{"iso2":"mm","name":"Myanmar","dial":"95"},{"iso2":"na","name":"Namibia","dial":"264"},{"iso2":"nr","name":"Nauru","dial":"674"},{"iso2":"np","name":"Nepal","dial":"977"},{"iso2":"nl","name":"Netherlands","dial":"31"},{"iso2":"nc","name":"New Caledonia","dial":"687"},{"iso2":"nz","name":"New Zealand","dial":"64"},{"iso2":"ni","name":"Nicaragua","dial":"505"},{"iso2":"ne","name":"Niger","dial":"227"},{"iso2":"ng","name":"Nigeria","dial":"234"},{"iso2":"nu","name":"Niue","dial":"683"},{"iso2":"nf","name":"Norfolk Island","dial":"672"},{"iso2":"kp","name":"North Korea","dial":"850"},{"iso2":"mk","name":"North Macedonia","dial":"389"},{"iso2":"mp","name":"Northern Mariana Islands","dial":"1"},{"iso2":"no","name":"Norway","dial":"47"},{"iso2":"om","name":"Oman","dial":"968"},{"iso2":"pk","name":"Pakistan","dial":"92"},{"iso2":"pw","name":"Palau","dial":"680"},{"iso2":"ps","name":"Palestine","dial":"970"},{"iso2":"pa","name":"Panama","dial":"507"},{"iso2":"pg","name":"Papua New Guinea","dial":"675"},{"iso2":"py","name":"Paraguay","dial":"595"},{"iso2":"pe","name":"Peru","dial":"51"},{"iso2":"ph","name":"Philippines","dial":"63"},{"iso2":"pl","name":"Poland","dial":"48"},{"iso2":"pt","name":"Portugal","dial":"351"},{"iso2":"pr","name":"Puerto Rico","dial":"1"},{"iso2":"qa","name":"Qatar","dial":"974"},{"iso2":"re","name":"Réunion","dial":"262"},{"iso2":"ro","name":"Romania","dial":"40"},{"iso2":"ru","name":"Russia","dial":"7"},{"iso2":"rw","name":"Rwanda","dial":"250"},{"iso2":"bl","name":"Saint Barthélemy","dial":"590"},{"iso2":"sh","name":"Saint Helena","dial":"290"},{"iso2":"kn","name":"Saint Kitts and Nevis","dial":"1"},{"iso2":"lc","name":"Saint Lucia","dial":"1"},{"iso2":"mf","name":"Saint Martin","dial":"590"},{"iso2":"pm","name":"Saint Pierre and Miquelon","dial":"508"},{"iso2":"vc","name":"Saint Vincent and the Grenadines","dial":"1"},{"iso2":"ws","name":"Samoa","dial":"685"},{"iso2":"sm","name":"San Marino","dial":"378"},{"iso2":"st","name":"São Tomé and Príncipe","dial":"239"},{"iso2":"sa","name":"Saudi Arabia","dial":"966"},{"iso2":"sn","name":"Senegal","dial":"221"},{"iso2":"rs","name":"Serbia","dial":"381"},{"iso2":"sc","name":"Seychelles","dial":"248"},{"iso2":"sl","name":"Sierra Leone","dial":"232"},{"iso2":"sg","name":"Singapore","dial":"65"},{"iso2":"sx","name":"Sint Maarten","dial":"1"},{"iso2":"sk","name":"Slovakia","dial":"421"},{"iso2":"si","name":"Slovenia","dial":"386"},{"iso2":"sb","name":"Solomon Islands","dial":"677"},{"iso2":"so","name":"Somalia","dial":"252"},{"iso2":"za","name":"South Africa","dial":"27"},{"iso2":"kr","name":"South Korea","dial":"82"},{"iso2":"ss","name":"South Sudan","dial":"211"},{"iso2":"es","name":"Spain","dial":"34"},{"iso2":"lk","name":"Sri Lanka","dial":"94"},{"iso2":"sd","name":"Sudan","dial":"249"},{"iso2":"sr","name":"Suriname","dial":"597"},{"iso2":"se","name":"Sweden","dial":"46"},{"iso2":"ch","name":"Switzerland","dial":"41"},{"iso2":"sy","name":"Syria","dial":"963"},{"iso2":"tw","name":"Taiwan","dial":"886"},{"iso2":"tj","name":"Tajikistan","dial":"992"},{"iso2":"tz","name":"Tanzania","dial":"255"},{"iso2":"th","name":"Thailand","dial":"66"},{"iso2":"tl","name":"Timor-Leste","dial":"670"},{"iso2":"tg","name":"Togo","dial":"228"},{"iso2":"tk","name":"Tokelau","dial":"690"},{"iso2":"to","name":"Tonga","dial":"676"},{"iso2":"tt","name":"Trinidad and Tobago","dial":"1"},{"iso2":"tn","name":"Tunisia","dial":"216"},{"iso2":"tr","name":"Turkey","dial":"90"},{"iso2":"tm","name":"Turkmenistan","dial":"993"},{"iso2":"tc","name":"Turks and Caicos Islands","dial":"1"},{"iso2":"tv","name":"Tuvalu","dial":"688"},{"iso2":"ug","name":"Uganda","dial":"256"},{"iso2":"ua","name":"Ukraine","dial":"380"},{"iso2":"ae","name":"United Arab Emirates","dial":"971"},{"iso2":"gb","name":"United Kingdom","dial":"44"},{"iso2":"us","name":"United States","dial":"1"},{"iso2":"uy","name":"Uruguay","dial":"598"},{"iso2":"uz","name":"Uzbekistan","dial":"998"},{"iso2":"vu","name":"Vanuatu","dial":"678"},{"iso2":"va","name":"Vatican City","dial":"39"},{"iso2":"ve","name":"Venezuela","dial":"58"},{"iso2":"vn","name":"Vietnam","dial":"84"},{"iso2":"wf","name":"Wallis and Futuna","dial":"681"},{"iso2":"ye","name":"Yemen","dial":"967"},{"iso2":"zm","name":"Zambia","dial":"260"},{"iso2":"zw","name":"Zimbabwe","dial":"263"}]');

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!***********************************!*\
  !*** ./assets/src/store/index.js ***!
  \***********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _scss_store_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scss/store.scss */ "./assets/src/scss/store.scss");
/* harmony import */ var _scss_blocks_scss__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../scss/blocks.scss */ "./assets/src/scss/blocks.scss");
/* harmony import */ var _controller__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./controller */ "./assets/src/store/controller.js");
/* harmony import */ var _formula__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./formula */ "./assets/src/store/formula.js");
/**
 * Storefront runtime bootstrap.
 *
 * Discovers every `.optset-options` wrapper and instantiates one Controller per
 * product form. Re-scans when WooCommerce replaces the cart/product markup
 * (`updated_wc_div`) or after generic AJAX page swaps, so AJAX-rendered
 * product templates are handled too.
 *
 * Also publishes `window.optsetEvaluateFormula(expr, vars, mode)` for theme /
 * integration use, mirroring the two PHP formula engines.
 *
 * @package
 */





const controllers = [];

/**
 * Scan the document and boot any not-yet-bound option wrappers.
 *
 * @return {void}
 */
function scan() {
  try {
    const roots = document.querySelectorAll('.optset-options');
    roots.forEach(root => {
      if (root.__optsetBound) {
        return;
      }
      const c = new _controller__WEBPACK_IMPORTED_MODULE_2__["default"](root);
      c.init();
      controllers.push(c);
    });
  } catch (e) {
    /* bootstrap must never throw into the page. */
  }
}

/**
 * Expose the public formula evaluator surface (ARCHITECTURE §1).
 *
 * @return {void}
 */
function exposeGlobals() {
  try {
    window.optsetEvaluateFormula = (expr, vars, mode) => (0,_formula__WEBPACK_IMPORTED_MODULE_3__.evaluateFormula)(expr, vars || {}, mode || 'simple');
  } catch (e) {
    /* read-only window — ignore. */
  }
}

/**
 * Wire all bootstrap triggers (DOM ready + WC AJAX refresh events).
 *
 * @return {void}
 */
function boot() {
  exposeGlobals();
  scan();
  const jq = window.jQuery;
  if (jq) {
    // WooCommerce replaces cart / mini-cart / variation markup.
    jq(document.body).on('updated_wc_div updated_cart_totals wc_fragments_refreshed wc_fragments_loaded', scan);
    // Quick-view / ajax product templates land later.
    jq(document).ajaxComplete(() => scan());
  }

  // Generic SPA / lazy-template fallback.
  if (typeof window.MutationObserver === 'function') {
    let pending = false;
    const mo = new window.MutationObserver(() => {
      if (pending) {
        return;
      }
      pending = true;
      window.setTimeout(() => {
        pending = false;
        scan();
      }, 250);
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
})();

/******/ })()
;
//# sourceMappingURL=store.js.map