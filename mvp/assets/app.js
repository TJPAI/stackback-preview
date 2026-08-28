(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.Decision = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BRAND_RULES = Object.freeze([
    { id: 'mcd-cn', name: '麦当劳', searchText: '麦当劳', pattern: /(麦当劳|mcdonald'?s|mcd)/i },
    { id: 'kfc-cn', name: '肯德基', searchText: '肯德基', pattern: /(肯德基|\bkfc\b)/i },
    { id: 'starbucks', name: '星巴克', searchText: '星巴克', pattern: /(星巴克|starbucks)/i }
  ]);

  function cleanText(value, max = 160) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function normalizeIntent(input) {
    const raw = cleanText(input, 80);
    const match = BRAND_RULES.find((rule) => rule.pattern.test(raw));
    if (match) return Object.freeze({ brandId: match.id, brandName: match.name, searchText: match.searchText });
    return Object.freeze({ brandId: null, brandName: null, searchText: raw });
  }

  function normalizeStore(row) {
    if (!row || typeof row !== 'object') return null;
    const distanceMeters = Number(row.distanceMeters);
    if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return null;
    const id = cleanText(row.id, 100);
    const name = cleanText(row.name, 100);
    if (!id || !name) return null;
    const lat = Number(row.lat);
    const lon = Number(row.lon);
    return Object.freeze({
      id,
      name,
      address: cleanText(row.address, 220),
      distanceMeters,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      status: 'candidate'
    });
  }

  function normalizeOffer(row) {
    if (!row || typeof row !== 'object') return null;
    const id = cleanText(row.id, 120);
    const title = cleanText(row.title, 220);
    const sourceUrl = cleanText(row.sourceUrl, 500);
    if (!id || !title || !sourceUrl) return null;
    try {
      const url = new URL(sourceUrl);
      if (url.protocol !== 'https:') return null;
    } catch {
      return null;
    }
    return Object.freeze({ id, title, sourceUrl, status: 'candidate' });
  }

  function normalizeVerifiedOffer(row) {
    if (!row || typeof row !== 'object' || row.status !== 'verified_official') return null;
    const id = cleanText(row.id, 120);
    const title = cleanText(row.title, 220);
    const sourceUrl = cleanText(row.sourceUrl, 500);
    const priceQualifier = cleanText(row.priceQualifier, 180);
    if (id !== 'mcd-cn-mix-match-20260824' || title !== '随心配指定组合 13.9元起' || priceQualifier !== '部分蓝区指定产品需另加1元，实际14.9元') return null;
    try {
      const url = new URL(sourceUrl);
      if (url.toString() !== 'https://www.mcdonalds.com.cn/news/20260824-BABBM/') return null;
    } catch {
      return null;
    }
    const price = row.offerPrice;
    if (!price || Number(price.amount) !== 13.9 || price.currency !== 'CNY' || price.kind !== 'starting_bundle_price') return null;
    if (row.applicability !== 'partial_restaurants' || row.stacking !== 'not_allowed') return null;
    if (!Array.isArray(row.executionSteps) || row.executionSteps.length < 1 || row.executionSteps.length > 6) return null;
    const executionSteps = row.executionSteps.map((step) => cleanText(step, 220));
    if (executionSteps.some((step) => !step)) return null;
    return Object.freeze({
      id,
      title,
      sourceUrl,
      status: 'verified_official',
      offerPrice: Object.freeze({ amount: 13.9, currency: 'CNY', kind: 'starting_bundle_price' }),
      priceQualifier,
      applicability: 'partial_restaurants',
      stacking: 'not_allowed',
      executionSteps: Object.freeze(executionSteps)
    });
  }

  function buildSavingsPlan({
    intent,
    stores = [],
    offers = [],
    verifiedOffers = [],
    offerFreshness = 'unknown',
    verifiedOfferFreshness = 'unknown',
    storeError = null,
    offerError = null,
    verifiedOfferError = null
  } = {}) {
    const normalizedIntent = intent && typeof intent === 'object' ? intent : normalizeIntent('');
    const normalizedStores = stores.map(normalizeStore).filter(Boolean).sort((a, b) => a.distanceMeters - b.distanceMeters);
    const normalizedOffers = offers.map(normalizeOffer).filter(Boolean);
    const normalizedVerified = verifiedOfferFreshness === 'fresh' ? verifiedOffers.map(normalizeVerifiedOffer).filter(Boolean) : [];
    const store = normalizedStores[0] || null;
    const verifiedOffer = normalizedVerified[0] || null;
    const offer = verifiedOffer || normalizedOffers[0] || null;
    const selectedFreshness = verifiedOffer ? verifiedOfferFreshness : offerFreshness;
    const blockers = ['savings_amount_unknown'];
    if (store) blockers.push('store_applicability_unverified');
    else blockers.push('store_not_found_or_unverified');
    if (!offer) blockers.push('offer_not_found_or_unverified');
    if (offer && selectedFreshness !== 'fresh') blockers.push('offer_freshness_not_verified');
    if (storeError) blockers.push('store_provider_error');
    if (offerError) blockers.push('offer_provider_error');
    if (verifiedOfferError) blockers.push('verified_offer_provider_error');

    return Object.freeze({
      intent: normalizedIntent,
      store,
      offer,
      otherStores: Object.freeze(normalizedStores.slice(1, 3)),
      otherOffers: Object.freeze(normalizedOffers.filter((row) => !offer || row.id !== offer.id).slice(0, 3)),
      offerFreshness: selectedFreshness,
      candidateOfferFreshness: offerFreshness,
      verifiedOfferFreshness,
      reliableOfferPrice: verifiedOffer
        ? Object.freeze({ status: 'verified', amount: verifiedOffer.offerPrice.amount, currency: verifiedOffer.offerPrice.currency, kind: verifiedOffer.offerPrice.kind })
        : Object.freeze({ status: 'unknown', amount: null, currency: null, kind: null }),
      reliableSavings: Object.freeze({ status: 'unknown', amount: null, currency: null }),
      executionSteps: Object.freeze(verifiedOffer ? [...verifiedOffer.executionSteps] : []),
      stacking: verifiedOffer ? verifiedOffer.stacking : 'unknown',
      blockers: Object.freeze([...new Set(blockers)]),
      diagnostics: Object.freeze({
        storeError: storeError ? cleanText(storeError, 120) : null,
        offerError: offerError ? cleanText(offerError, 120) : null,
        verifiedOfferError: verifiedOfferError ? cleanText(verifiedOfferError, 120) : null
      })
    });
  }

  function canEnterCouponPool(candidate) {
    return Boolean(candidate && candidate.transferability === 'public_shareable');
  }

  return Object.freeze({ normalizeIntent, buildSavingsPlan, canEnterCouponPool, cleanText });
});

;
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.ExecutionReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const EVIDENCE_CLASS = 'user_reported_local';
  const CURRENCY = 'CNY';
  const MAX_MONEY = 100000;
  const TOP_KEYS = Object.freeze([
    'schemaVersion', 'id', 'evidenceClass', 'observedAt', 'brandId', 'brandName',
    'store', 'offer', 'outcome', 'actualPaid', 'comparisonPrice',
    'selfReportedDifference', 'successfulSavingsSession', 'failureReason'
  ]);

  function cleanText(value, max = 160) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function parseMoney(value, { required = false } = {}) {
    if (value == null || value === '') {
      if (required) throw new TypeError('实际支付金额不能为空');
      return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > MAX_MONEY) throw new TypeError('金额无效');
    return Object.freeze({ amount: roundMoney(number), currency: CURRENCY });
  }

  function normalizeContext(context) {
    if (!context || typeof context !== 'object') throw new TypeError('执行上下文不能为空');
    const brandId = cleanText(context.brandId, 80);
    const brandName = cleanText(context.brandName, 80);
    const store = context.store;
    const offer = context.offer;
    if (!brandId || !store || typeof store !== 'object' || !offer || typeof offer !== 'object') throw new TypeError('执行上下文不完整');
    const storeId = cleanText(store.id, 120);
    const storeName = cleanText(store.name, 120);
    const offerId = cleanText(offer.id, 120);
    const offerTitle = cleanText(offer.title, 220);
    if (!storeId || !storeName || !offerId || !offerTitle) throw new TypeError('执行上下文标识无效');
    return Object.freeze({
      brandId,
      brandName,
      store: Object.freeze({ id: storeId, name: storeName, address: cleanText(store.address, 220) }),
      offer: Object.freeze({ id: offerId, title: offerTitle })
    });
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function createExecutionReport({ context, input, observedAt = new Date().toISOString() } = {}) {
    const safeContext = normalizeContext(context);
    if (!input || typeof input !== 'object') throw new TypeError('执行结果不能为空');
    const outcome = input.outcome === 'success' || input.outcome === 'failure' ? input.outcome : null;
    if (!outcome) throw new TypeError('执行结果必须为成功或失败');
    const parsedObservedAt = new Date(observedAt);
    if (!Number.isFinite(parsedObservedAt.getTime())) throw new TypeError('执行时间无效');
    const observedIso = parsedObservedAt.toISOString();

    const actualPaid = outcome === 'success' ? parseMoney(input.actualPaid, { required: true }) : null;
    const comparisonPrice = outcome === 'success' ? parseMoney(input.comparisonPrice) : null;
    if (comparisonPrice && comparisonPrice.amount <= actualPaid.amount) {
      throw new TypeError('对比价不能低于实付价，也不能等于实付价；不确定请留空');
    }
    const selfReportedDifference = comparisonPrice
      ? Object.freeze({ amount: roundMoney(comparisonPrice.amount - actualPaid.amount), currency: CURRENCY })
      : null;
    const successfulSavingsSession = Boolean(outcome === 'success' && selfReportedDifference && selfReportedDifference.amount > 0);
    const failureReason = outcome === 'failure' ? cleanText(input.failureReason, 180) : '';
    const idSeed = [observedIso, safeContext.brandId, safeContext.store.id, safeContext.offer.id, outcome, actualPaid && actualPaid.amount, comparisonPrice && comparisonPrice.amount, failureReason].join('|');

    return Object.freeze({
      schemaVersion: 1,
      id: `execution-${parsedObservedAt.getTime()}-${stableHash(idSeed)}`,
      evidenceClass: EVIDENCE_CLASS,
      observedAt: observedIso,
      brandId: safeContext.brandId,
      brandName: safeContext.brandName,
      store: safeContext.store,
      offer: safeContext.offer,
      outcome,
      actualPaid,
      comparisonPrice,
      selfReportedDifference,
      successfulSavingsSession,
      failureReason
    });
  }

  function sameKeys(object, allowed) {
    if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
    const keys = Object.keys(object);
    return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
  }

  function normalizeStoredMoney(value) {
    if (value == null) return null;
    if (!sameKeys(value, ['amount', 'currency']) || value.currency !== CURRENCY) return null;
    try { return parseMoney(value.amount, { required: true }); } catch { return null; }
  }

  function normalizeStoredReport(row) {
    try {
      if (!sameKeys(row, TOP_KEYS) || row.schemaVersion !== 1 || row.evidenceClass !== EVIDENCE_CLASS) return null;
      const id = cleanText(row.id, 180);
      if (!/^execution-[A-Za-z0-9._:-]+$/.test(id)) return null;
      const observedAt = new Date(row.observedAt);
      if (!Number.isFinite(observedAt.getTime())) return null;
      const context = normalizeContext({
        brandId: row.brandId,
        brandName: row.brandName,
        store: row.store,
        offer: row.offer
      });
      if (!sameKeys(row.store, ['id', 'name', 'address']) || !sameKeys(row.offer, ['id', 'title'])) return null;
      if (row.outcome !== 'success' && row.outcome !== 'failure') return null;

      const actualPaid = normalizeStoredMoney(row.actualPaid);
      const comparisonPrice = normalizeStoredMoney(row.comparisonPrice);
      const storedDifference = normalizeStoredMoney(row.selfReportedDifference);
      let selfReportedDifference = null;
      let successfulSavingsSession = false;
      let failureReason = '';

      if (row.outcome === 'success') {
        if (!actualPaid) return null;
        if (row.comparisonPrice != null && !comparisonPrice) return null;
        if (comparisonPrice) {
          const expected = roundMoney(comparisonPrice.amount - actualPaid.amount);
          if (expected <= 0 || !storedDifference || storedDifference.amount !== expected) return null;
          selfReportedDifference = storedDifference;
          successfulSavingsSession = true;
        } else if (row.selfReportedDifference != null) {
          return null;
        }
        if (row.failureReason !== '') return null;
      } else {
        if (row.actualPaid != null || row.comparisonPrice != null || row.selfReportedDifference != null || row.successfulSavingsSession !== false) return null;
        failureReason = cleanText(row.failureReason, 180);
      }
      if (Boolean(row.successfulSavingsSession) !== successfulSavingsSession) return null;

      return Object.freeze({
        schemaVersion: 1,
        id,
        evidenceClass: EVIDENCE_CLASS,
        observedAt: observedAt.toISOString(),
        brandId: context.brandId,
        brandName: context.brandName,
        store: context.store,
        offer: context.offer,
        outcome: row.outcome,
        actualPaid,
        comparisonPrice,
        selfReportedDifference,
        successfulSavingsSession,
        failureReason
      });
    } catch {
      return null;
    }
  }

  return Object.freeze({ createExecutionReport, normalizeStoredReport, cleanText });
});

;
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.BrowserLocation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getCurrentLocation({ timeoutMs = 9000 } = {}) {
    if (!globalThis.navigator || !navigator.geolocation) {
      return Promise.reject(Object.assign(new Error('当前浏览器不支持定位'), { code: 'unsupported' }));
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude);
          const lon = Number(position.coords.longitude);
          const accuracy = Number(position.coords.accuracy);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            reject(Object.assign(new Error('定位结果无效'), { code: 'invalid' }));
            return;
          }
          resolve(Object.freeze({ lat, lon, accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null, observedAt: Date.now() }));
        },
        (error) => {
          const code = error && error.code === 1 ? 'permission-denied' : error && error.code === 3 ? 'timeout' : 'unavailable';
          reject(Object.assign(new Error(code === 'permission-denied' ? '尚未授权定位' : '暂时无法获取当前位置'), { code }));
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: timeoutMs }
      );
    });
  }

  return Object.freeze({ getCurrentLocation });
});

;
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.OsmStores = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function finite(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function haversineMeters(a, b) {
    const R = 6371000;
    const p1 = a.lat * Math.PI / 180;
    const p2 = b.lat * Math.PI / 180;
    const dp = (b.lat - a.lat) * Math.PI / 180;
    const dl = (b.lon - a.lon) * Math.PI / 180;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function viewboxAround(location, radiusKm) {
    const latDelta = radiusKm / 111;
    const lonScale = Math.max(0.2, Math.cos(location.lat * Math.PI / 180));
    const lonDelta = radiusKm / (111 * lonScale);
    const west = Math.max(-180, location.lon - lonDelta);
    const east = Math.min(180, location.lon + lonDelta);
    const north = Math.min(90, location.lat + latDelta);
    const south = Math.max(-90, location.lat - latDelta);
    return `${west},${north},${east},${south}`;
  }

  function normalizeResult(row, location, radiusMeters) {
    if (!row || typeof row !== 'object') return null;
    const lat = finite(row.lat);
    const lon = finite(row.lon);
    const id = String(row.place_id == null ? '' : row.place_id).trim();
    const name = String(row.name || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (lat == null || lon == null || !id || !name) return null;
    const distanceMeters = haversineMeters(location, { lat, lon });
    if (!Number.isFinite(distanceMeters) || distanceMeters > radiusMeters) return null;
    return Object.freeze({
      id: `osm:${id}`,
      name,
      address: String(row.display_name || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      lat,
      lon,
      distanceMeters
    });
  }

  function createStoreProvider({ fetchImpl = globalThis.fetch, radiusKm = 8, timeoutMs = 6500 } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required');
    return async function findStores({ searchText, location } = {}) {
      const query = String(searchText || '').trim();
      if (!query) return [];
      if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lon))) throw new TypeError('valid location is required');
      const loc = { lat: Number(location.lat), lon: Number(location.lon) };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', query);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('limit', '20');
        url.searchParams.set('bounded', '1');
        url.searchParams.set('viewbox', viewboxAround(loc, radiusKm));
        url.searchParams.set('addressdetails', '1');
        const response = await fetchImpl(url.toString(), { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw new Error(`地图服务 HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload)) throw new Error('地图服务返回格式异常');
        const seen = new Set();
        return payload.map((row) => normalizeResult(row, loc, radiusKm * 1000)).filter(Boolean).filter((row) => {
          const key = `${row.name}|${row.address}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 5);
      } finally {
        clearTimeout(timer);
      }
    };
  }

  return Object.freeze({ createStoreProvider, haversineMeters });
});

;
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.PreviewOffers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ROUTES = Object.freeze({
    'mcd-cn': Object.freeze({ path: '../data/mcd-cn.json', expectedBrandId: 'mcd-cn', allowedHosts: ['www.mcdonalds.com.cn'] }),
    'kfc-cn': Object.freeze({ path: '../data/kfc-cn.json', expectedBrandId: 'kfc-cn', allowedHosts: ['login.kfc.com.cn'] }),
    'starbucks': Object.freeze({ path: '../data/starbucks-cn.json', expectedBrandId: 'starbucks', allowedHosts: ['www.starbucks.com.cn'] })
  });

  const ACTIONABLE_PATTERN = /(￥|¥|\d+(?:\.\d+)?\s*元|优惠|特惠|优惠券|领券|买.{0,8}送|免费|兑换|权益|会员|早餐|下午茶|超值|coupon|\boff\b|free)/i;

  function cleanText(value, max) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function parseCandidateSnapshot(snapshot, { expectedBrandId, allowedHosts, nowMs = Date.now(), freshMs = 36 * 3600 * 1000, maxAgeMs = 7 * 24 * 3600 * 1000 } = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new TypeError('snapshot must be an object');
    if (snapshot.schemaVersion !== 1) throw new Error('unsupported snapshot schema');
    if (snapshot.brandId !== expectedBrandId) throw new Error('snapshot brand mismatch');
    if (snapshot.market !== 'China') throw new Error('snapshot market mismatch');
    const capturedAtMs = Date.parse(snapshot.capturedAt);
    if (!Number.isFinite(capturedAtMs) || capturedAtMs > nowMs + 5 * 60 * 1000) throw new Error('invalid snapshot capture time');
    if (!Array.isArray(snapshot.rows) || snapshot.rows.length > 100) throw new Error('invalid snapshot rows');
    const age = Math.max(0, nowMs - capturedAtMs);
    const freshness = age <= freshMs ? 'fresh' : age <= maxAgeMs ? 'stale' : 'expired';
    const hosts = new Set((allowedHosts || []).map((host) => String(host).toLowerCase()));
    const ids = new Set();
    const rows = [];
    for (const raw of snapshot.rows) {
      if (!raw || typeof raw !== 'object') throw new Error('invalid offer row');
      const id = cleanText(raw.id, 120);
      const title = cleanText(raw.title, 220);
      const sourceUrl = cleanText(raw.sourceUrl, 500);
      if (!id || !title || !sourceUrl || ids.has(id)) throw new Error('invalid or duplicate offer row');
      const url = new URL(sourceUrl);
      if (url.protocol !== 'https:' || !hosts.has(url.hostname.toLowerCase())) throw new Error('offer source is outside allowed official host');
      ids.add(id);
      if (ACTIONABLE_PATTERN.test(title)) rows.push(Object.freeze({ id, title, sourceUrl: url.toString(), status: 'candidate' }));
    }
    return Object.freeze({ freshness, capturedAt: new Date(capturedAtMs).toISOString(), rows: Object.freeze(freshness === 'expired' ? [] : rows.slice(0, 5)) });
  }

  function isLikelyChina(location) {
    if (!location) return false;
    const lat = Number(location.lat);
    const lon = Number(location.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135;
  }

  function createOfferProvider({ fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required');
    return async function findOffers({ brandId, location } = {}) {
      const route = ROUTES[brandId];
      if (!route) return Object.freeze({ freshness: 'unsupported', rows: [] });
      if (!isLikelyChina(location)) return Object.freeze({ freshness: 'outside-coverage', rows: [] });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(route.path, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw new Error(`优惠数据 HTTP ${response.status}`);
        return parseCandidateSnapshot(await response.json(), route);
      } finally {
        clearTimeout(timer);
      }
    };
  }

  return Object.freeze({ createOfferProvider, parseCandidateSnapshot, isLikelyChina });
});

;
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.VerifiedOffers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ROUTE = Object.freeze({
    brandId: 'mcd-cn',
    path: './data/verified-mcd-cn.json',
    sourceUrl: 'https://www.mcdonalds.com.cn/news/20260824-BABBM/'
  });
  const AUTHORITY = 'stackback-first-party-verifier';
  const EXPECTED_ID = 'mcd-cn-mix-match-20260824';
  const EXPECTED_TITLE = '随心配指定组合 13.9元起';
  const EXPECTED_QUALIFIER = '部分蓝区指定产品需另加1元，实际14.9元';
  const EXPECTED_FROM = '2026-08-24';
  const EXPECTED_THROUGH = '2026-09-15';
  const FRESH_MS = 24 * 60 * 60 * 1000;

  function cleanText(value, max = 220) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function chinaDateKey(ms) {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(ms));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function isLikelyChina(location) {
    if (!location) return false;
    const lat = Number(location.lat);
    const lon = Number(location.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135;
  }

  function normalizeStringArray(value, { min = 1, max = 8, itemMax = 160 } = {}) {
    if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error('invalid verified offer list');
    const rows = value.map((item) => cleanText(item, itemMax));
    if (rows.some((item) => !item)) throw new Error('invalid verified offer list item');
    return Object.freeze(rows);
  }

  function normalizeVerifiedRow(raw, nowMs) {
    if (!raw || typeof raw !== 'object') throw new Error('invalid verified offer row');
    const id = cleanText(raw.id, 120);
    const title = cleanText(raw.title, 220);
    const sourceUrl = cleanText(raw.sourceUrl, 500);
    const priceQualifier = cleanText(raw.priceQualifier, 180);
    if (id !== EXPECTED_ID || title !== EXPECTED_TITLE || priceQualifier !== EXPECTED_QUALIFIER) throw new Error('verified offer identity mismatch');
    const url = new URL(sourceUrl);
    if (url.toString() !== ROUTE.sourceUrl) throw new Error('verified offer source mismatch');

    const price = raw.offerPrice;
    if (!price || typeof price !== 'object' || Number(price.amount) !== 13.9 || price.currency !== 'CNY' || price.kind !== 'starting_bundle_price') {
      throw new Error('verified offer price mismatch');
    }
    if (raw.validFrom !== EXPECTED_FROM || raw.validThrough !== EXPECTED_THROUGH) throw new Error('verified offer validity mismatch');
    if (raw.applicability !== 'partial_restaurants' || raw.stacking !== 'not_allowed') throw new Error('verified offer rule mismatch');
    const today = chinaDateKey(nowMs);
    if (today < EXPECTED_FROM || today > EXPECTED_THROUGH) return null;

    return Object.freeze({
      id,
      title,
      sourceUrl: url.toString(),
      status: 'verified_official',
      offerPrice: Object.freeze({ amount: 13.9, currency: 'CNY', kind: 'starting_bundle_price' }),
      priceQualifier,
      validFrom: EXPECTED_FROM,
      validThrough: EXPECTED_THROUGH,
      availabilityNote: cleanText(raw.availabilityNote, 220),
      applicability: 'partial_restaurants',
      stacking: 'not_allowed',
      channels: normalizeStringArray(raw.channels, { max: 6 }),
      executionSteps: normalizeStringArray(raw.executionSteps, { max: 6, itemMax: 220 })
    });
  }

  function parseVerifiedSnapshot(snapshot, { nowMs = Date.now(), freshMs = FRESH_MS } = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new TypeError('verified snapshot must be an object');
    if (snapshot.schemaVersion !== 1 || snapshot.authority !== AUTHORITY) throw new Error('verified snapshot authority mismatch');
    if (snapshot.brandId !== ROUTE.brandId || snapshot.market !== 'China') throw new Error('verified snapshot context mismatch');
    const capturedAtMs = Date.parse(snapshot.capturedAt);
    if (!Number.isFinite(capturedAtMs) || capturedAtMs > nowMs + 5 * 60 * 1000) throw new Error('invalid verified snapshot capture time');
    if (!Array.isArray(snapshot.rows) || snapshot.rows.length > 3) throw new Error('invalid verified snapshot rows');
    const age = Math.max(0, nowMs - capturedAtMs);
    const freshness = age <= freshMs ? 'fresh' : 'stale';
    if (freshness !== 'fresh') return Object.freeze({ freshness, capturedAt: new Date(capturedAtMs).toISOString(), rows: Object.freeze([]) });
    const rows = snapshot.rows.map((row) => normalizeVerifiedRow(row, nowMs)).filter(Boolean);
    return Object.freeze({ freshness, capturedAt: new Date(capturedAtMs).toISOString(), rows: Object.freeze(rows) });
  }

  function createVerifiedOfferProvider({ fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required');
    return async function findVerifiedOffers({ brandId, location } = {}) {
      if (brandId !== ROUTE.brandId) return Object.freeze({ freshness: 'unsupported', rows: [] });
      if (!isLikelyChina(location)) return Object.freeze({ freshness: 'outside-coverage', rows: [] });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(ROUTE.path, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw new Error(`官方核验数据 HTTP ${response.status}`);
        return parseVerifiedSnapshot(await response.json());
      } finally {
        clearTimeout(timer);
      }
    };
  }

  return Object.freeze({ createVerifiedOfferProvider, parseVerifiedSnapshot, isLikelyChina });
});

;
(function (root, factory) {
  const domain = typeof module === 'object' && module.exports
    ? require('../domain/execution-report.js')
    : root.StackBackMvp && root.StackBackMvp.ExecutionReport;
  const api = factory(domain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.LocalExecutionStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ExecutionReport) {
  'use strict';

  const STORAGE_KEY = 'stackback.mvp.execution.v1';

  function createLocalExecutionStore({ storage, maxRecords = 20 } = {}) {
    if (!ExecutionReport) throw new Error('ExecutionReport domain is required');
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new TypeError('local storage adapter is required');
    const limit = Number(maxRecords);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new TypeError('maxRecords must be between 1 and 50');

    function list() {
      let parsed;
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return Object.freeze([]);
        parsed = JSON.parse(raw);
      } catch {
        return Object.freeze([]);
      }
      if (!Array.isArray(parsed) || parsed.length > 100) return Object.freeze([]);
      const safe = parsed.map((row) => ExecutionReport.normalizeStoredReport(row)).filter(Boolean).slice(0, limit);
      return Object.freeze(safe);
    }

    function append(report) {
      const safe = ExecutionReport.normalizeStoredReport(report);
      if (!safe) throw new TypeError('execution report is not valid user-reported evidence');
      const next = [safe, ...list().filter((row) => row.id !== safe.id)].slice(0, limit);
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
      return safe;
    }

    return Object.freeze({ append, list });
  }

  return Object.freeze({ createLocalExecutionStore, STORAGE_KEY });
});

;
(function (root, factory) {
  const api = factory(root.StackBackMvp && root.StackBackMvp.Decision);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.FindSavings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Decision) {
  'use strict';

  function createFindSavingsUseCase({ storeProvider, offerProvider, verifiedOfferProvider } = {}) {
    if (!Decision) throw new Error('Decision domain is required');
    if (typeof storeProvider !== 'function' || typeof offerProvider !== 'function') throw new TypeError('providers are required');
    const trustedProvider = typeof verifiedOfferProvider === 'function'
      ? verifiedOfferProvider
      : async () => Object.freeze({ freshness: 'unsupported', rows: [] });

    return async function execute({ query, location } = {}) {
      const intent = Decision.normalizeIntent(query);
      if (!intent.searchText) return Decision.buildSavingsPlan({ intent });

      const [storeResult, offerResult, verifiedResult] = await Promise.allSettled([
        storeProvider({ searchText: intent.searchText, location }),
        offerProvider({ brandId: intent.brandId, location }),
        trustedProvider({ brandId: intent.brandId, location })
      ]);

      const stores = storeResult.status === 'fulfilled' ? storeResult.value : [];
      const offerPayload = offerResult.status === 'fulfilled' ? offerResult.value : { freshness: 'unknown', rows: [] };
      const verifiedPayload = verifiedResult.status === 'fulfilled' ? verifiedResult.value : { freshness: 'unknown', rows: [] };
      return Decision.buildSavingsPlan({
        intent,
        stores,
        offers: Array.isArray(offerPayload.rows) ? offerPayload.rows : [],
        verifiedOffers: Array.isArray(verifiedPayload.rows) ? verifiedPayload.rows : [],
        offerFreshness: offerPayload.freshness || 'unknown',
        verifiedOfferFreshness: verifiedPayload.freshness || 'unknown',
        storeError: storeResult.status === 'rejected' ? storeResult.reason && storeResult.reason.message : null,
        offerError: offerResult.status === 'rejected' ? offerResult.reason && offerResult.reason.message : null,
        verifiedOfferError: verifiedResult.status === 'rejected' ? verifiedResult.reason && verifiedResult.reason.message : null
      });
    };
  }

  return Object.freeze({ createFindSavingsUseCase });
});

;
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.RecordExecution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createRecordExecutionUseCase({ executionDomain, executionStore, clock = () => new Date() } = {}) {
    if (!executionDomain || typeof executionDomain.createExecutionReport !== 'function') throw new TypeError('execution domain is required');
    if (!executionStore || typeof executionStore.append !== 'function') throw new TypeError('execution store is required');
    if (typeof clock !== 'function') throw new TypeError('clock is required');

    return function recordExecution({ plan, input } = {}) {
      if (!plan || typeof plan !== 'object' || !plan.intent || !plan.store || !plan.offer) throw new TypeError('当前方案还不能记录执行结果');
      const report = executionDomain.createExecutionReport({
        context: {
          brandId: plan.intent.brandId,
          brandName: plan.intent.brandName,
          store: { id: plan.store.id, name: plan.store.name, address: plan.store.address },
          offer: { id: plan.offer.id, title: plan.offer.title }
        },
        input,
        observedAt: clock().toISOString()
      });
      return executionStore.append(report);
    };
  }

  return Object.freeze({ createRecordExecutionUseCase });
});

;
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.Render = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function formatDistance(meters) {
    const n = Number(meters);
    if (!Number.isFinite(n)) return '距离待确认';
    return n < 1000 ? `${Math.round(n)} 米` : `${(n / 1000).toFixed(n < 3000 ? 1 : 0)} 公里`;
  }

  function formatMoney(amount, currency = 'CNY') {
    const number = Number(amount);
    if (!Number.isFinite(number)) return null;
    if (currency !== 'CNY') return `${number.toFixed(2)} ${escapeHtml(currency)}`;
    return `¥${Number.isInteger(number) ? number : number.toFixed(2).replace(/0$/, '')}`;
  }

  function formatPrice(price) {
    if (!price || price.status !== 'verified' || price.currency !== 'CNY' || !Number.isFinite(Number(price.amount))) return null;
    return formatMoney(price.amount, price.currency);
  }

  function reliabilityText(plan) {
    const parts = [];
    if (plan.store) parts.push('门店来自 OpenStreetMap，仍属于附近候选');
    else parts.push('附近门店尚未找到');
    if (plan.offer && plan.offer.status === 'verified_official') {
      parts.push('优惠条款由 StackBack 第一方核验流程从麦当劳官方活动页读取，当前核验快照有效');
      parts.push('官方明确仅部分餐厅适用，因此附近门店仍需在点购页确认参与');
      parts.push('官方明确本活动不与其他优惠同享');
    } else if (plan.offer) {
      parts.push(plan.offerFreshness === 'fresh' ? '优惠来自近期官方页面候选' : '优惠来自官方页面候选，但数据新鲜度需复核');
      parts.push('尚未确认该门店当前可用或可叠加');
    } else if (plan.offerFreshness === 'outside-coverage') {
      parts.push('当前 MVP 的官方优惠源先覆盖中国区');
    } else {
      parts.push('暂未找到明确官方优惠候选');
    }
    if (plan.diagnostics && plan.diagnostics.verifiedOfferError) parts.push('第一方核验源本次读取失败，未使用其旧结论');
    return parts.join('；') + '。';
  }

  function renderExecutionForm() {
    return `
      <section class="execution-panel">
        <div class="support-title">实际用完后，告诉 StackBack 结果</div>
        <div class="answer-sub">这一步只记录你的真实执行反馈，不会把单次自报升级成全局“已确认”。成功时请填实付金额；若你确实知道同一组合的常规价，可选填对比价。</div>
        <form class="execution-form" data-role="execution-form">
          <label><span>结果</span><select name="outcome"><option value="success">成功使用</option><option value="failure">未成功</option></select></label>
          <div class="execution-money-grid">
            <label><span>实际支付</span><input name="actualPaid" inputmode="decimal" type="number" min="0" max="100000" step="0.01" placeholder="例如 13.9"></label>
            <label><span>常规/对比价（选填）</span><input name="comparisonPrice" inputmode="decimal" type="number" min="0" max="100000" step="0.01" placeholder="只有确实知道才填"></label>
          </div>
          <label><span>失败原因（失败时选填）</span><input name="failureReason" maxlength="180" placeholder="例如：点购页未显示活动"></label>
          <button class="primary-btn execution-submit" type="submit">记录本次结果</button>
        </form>
        <div data-role="execution-result"></div>
        <div class="local-note">当前记录仅保存在这个浏览器中；它属于 user_reported_local 证据，不会改变优惠、门店或省额的全局可信状态。</div>
      </section>`;
  }

  function renderExecutionReceipt(report) {
    if (!report || report.evidenceClass !== 'user_reported_local') return '<div class="execution-receipt warning">没有保存无效执行记录。</div>';
    if (report.outcome === 'failure') {
      const reason = report.failureReason ? `：${escapeHtml(report.failureReason)}` : '';
      return `<div class="execution-receipt warning"><strong>已记录：本次未成功（用户自报）</strong>${reason}<div>这条记录不会把优惠标记为失效，只会作为本机执行反馈。</div></div>`;
    }
    const paid = report.actualPaid ? formatMoney(report.actualPaid.amount, report.actualPaid.currency) : '金额未知';
    if (report.successfulSavingsSession && report.comparisonPrice && report.selfReportedDifference) {
      const comparison = formatMoney(report.comparisonPrice.amount, report.comparisonPrice.currency);
      const difference = formatMoney(report.selfReportedDifference.amount, report.selfReportedDifference.currency);
      return `<div class="execution-receipt success"><strong>已记录 Successful Savings Session（用户自报）</strong><div>你报告实付 ${escapeHtml(paid)}，同一消费的可比较价格为 ${escapeHtml(comparison)}，少付 ${escapeHtml(difference)}。</div><div>该差额只作为你的自报结果保存，不等同于 StackBack 全局可靠省额。</div></div>`;
    }
    return `<div class="execution-receipt success"><strong>已记录：本次成功使用（用户自报）</strong><div>你报告实付 ${escapeHtml(paid)}。由于没有可靠的可比较常规价，本次不计算省额，也不计入量化 Successful Savings Session。</div></div>`;
  }

  function renderPlan(plan) {
    const where = plan.store
      ? `<div class="answer-main">${escapeHtml(plan.store.name)}</div><div class="answer-sub">${escapeHtml(formatDistance(plan.store.distanceMeters))}${plan.store.address ? ` · ${escapeHtml(plan.store.address)}` : ''}</div>`
      : '<div class="answer-main muted">附近门店待确认</div><div class="answer-sub">可换个更具体的品牌或商品关键词再试</div>';

    const verified = Boolean(plan.offer && plan.offer.status === 'verified_official');
    const verifiedPrice = formatPrice(plan.reliableOfferPrice);
    const how = verified
      ? `<div class="offer-title">${escapeHtml(plan.offer.title)}</div><div class="answer-sub">${escapeHtml(plan.offer.priceQualifier)}</div><div class="support-block"><div class="support-title">按这个顺序操作</div>${plan.executionSteps.map((step, index) => `<div class="mini-row"><span>${index + 1}. ${escapeHtml(step)}</span></div>`).join('')}</div><a class="secondary-btn" href="${escapeHtml(plan.offer.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看麦当劳官方活动页</a>`
      : plan.offer
        ? `<div class="offer-title">${escapeHtml(plan.offer.title)}</div><a class="secondary-btn" href="${escapeHtml(plan.offer.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看官方优惠详情</a>`
        : '<div class="answer-sub">暂未找到明确优惠。先把最近门店找准，不把未知优惠包装成“预计省”。</div>';

    const savings = verified && verifiedPrice
      ? `<div class="saving-value">省额待核验</div><div class="answer-sub">已核验活动成交价：${escapeHtml(verifiedPrice)} 起。${escapeHtml(plan.offer.priceQualifier)}。常规价随门店和组合变化，因此暂不把差额包装成“可靠可省”。</div>`
      : '<div class="saving-value">待确认</div><div class="answer-sub">当前没有足够证据计算可靠节省金额</div>';

    const mapLink = plan.store && Number.isFinite(plan.store.lat) && Number.isFinite(plan.store.lon)
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(plan.store.lat)}&mlon=${encodeURIComponent(plan.store.lon)}#map=18/${encodeURIComponent(plan.store.lat)}/${encodeURIComponent(plan.store.lon)}`
      : null;

    const otherStores = plan.otherStores.length
      ? `<div class="support-block"><div class="support-title">其他附近候选</div>${plan.otherStores.map((s) => `<div class="mini-row"><span>${escapeHtml(s.name)}</span><span>${escapeHtml(formatDistance(s.distanceMeters))}</span></div>`).join('')}</div>`
      : '';

    const badges = verified
      ? `<span>优惠：官方核验</span><span>活动价：${escapeHtml(verifiedPrice || '待确认')}起</span><span>门店：待点购页确认</span><span>叠加：不可</span>`
      : '<span>门店：候选</span><span>金额：未知</span><span>叠加：未确认</span>';

    return `
      <section class="result-card">
        <div class="eyebrow">当前建议</div>
        <div class="answer-grid">
          <div class="answer-section"><div class="answer-label">去哪</div>${where}${mapLink ? `<a class="text-link" href="${mapLink}" target="_blank" rel="noopener noreferrer">查看地图</a>` : ''}</div>
          <div class="answer-section savings"><div class="answer-label">省多少</div>${savings}</div>
          <div class="answer-section"><div class="answer-label">怎么省</div>${how}</div>
          <div class="answer-section"><div class="answer-label">是否可靠</div><div class="trust-copy">${escapeHtml(reliabilityText(plan))}</div><div class="badges">${badges}</div></div>
        </div>
        ${otherStores}
        ${verified && plan.store ? renderExecutionForm() : ''}
        <div class="attribution">门店数据 © OpenStreetMap contributors</div>
      </section>`;
  }

  return Object.freeze({ renderPlan, renderExecutionReceipt, formatDistance, formatPrice, formatMoney, escapeHtml });
});

;
(function () {
  'use strict';

  const S = globalThis.StackBackMvp;
  if (!S || !S.Decision || !S.ExecutionReport || !S.BrowserLocation || !S.OsmStores || !S.PreviewOffers || !S.VerifiedOffers || !S.LocalExecutionStore || !S.FindSavings || !S.RecordExecution || !S.Render) throw new Error('StackBack MVP modules are incomplete');

  const storeProvider = S.OsmStores.createStoreProvider();
  const offerProvider = S.PreviewOffers.createOfferProvider();
  const verifiedOfferProvider = S.VerifiedOffers.createVerifiedOfferProvider();
  const findSavings = S.FindSavings.createFindSavingsUseCase({ storeProvider, offerProvider, verifiedOfferProvider });
  let executionStore = null;
  let recordExecution = null;
  try {
    executionStore = S.LocalExecutionStore.createLocalExecutionStore({ storage: globalThis.localStorage });
    recordExecution = S.RecordExecution.createRecordExecutionUseCase({ executionDomain: S.ExecutionReport, executionStore });
  } catch {
    executionStore = null;
    recordExecution = null;
  }

  const state = { location: null, searching: false, currentPlan: null };
  const el = {
    locate: document.querySelector('[data-action="locate"]'),
    locationStatus: document.querySelector('[data-role="location-status"]'),
    form: document.querySelector('[data-role="search-form"]'),
    input: document.querySelector('[data-role="query"]'),
    submit: document.querySelector('[data-action="search"]'),
    results: document.querySelector('[data-role="results"]'),
    chips: Array.from(document.querySelectorAll('[data-query]'))
  };

  function setBusy(busy) {
    state.searching = busy;
    el.submit.disabled = busy || !state.location;
    el.locate.disabled = busy;
    el.submit.textContent = busy ? '正在判断…' : '告诉我现在怎么买';
  }

  function showMessage(message, tone = 'neutral') {
    state.currentPlan = null;
    el.results.innerHTML = `<div class="status-card ${tone}">${S.Render.escapeHtml(message)}</div>`;
  }

  function bindExecutionFeedback() {
    const form = el.results.querySelector('[data-role="execution-form"]');
    const output = el.results.querySelector('[data-role="execution-result"]');
    if (!form || !output) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!recordExecution || !state.currentPlan) {
        output.innerHTML = '<div class="execution-receipt warning">当前浏览器无法本机保存执行反馈。推荐本身不受影响。</div>';
        return;
      }
      const data = new FormData(form);
      try {
        const report = recordExecution({
          plan: state.currentPlan,
          input: {
            outcome: String(data.get('outcome') || ''),
            actualPaid: String(data.get('actualPaid') || '').trim(),
            comparisonPrice: String(data.get('comparisonPrice') || '').trim(),
            failureReason: String(data.get('failureReason') || '').trim()
          }
        });
        output.innerHTML = S.Render.renderExecutionReceipt(report);
      } catch (error) {
        output.innerHTML = `<div class="execution-receipt warning">${S.Render.escapeHtml(error && error.message ? error.message : '执行反馈未保存')}</div>`;
      }
    });
  }

  async function locate() {
    el.locationStatus.textContent = '正在获取当前位置…';
    el.locate.disabled = true;
    try {
      state.location = await S.BrowserLocation.getCurrentLocation();
      const accuracy = Number.isFinite(state.location.accuracy) ? `，约 ±${Math.round(state.location.accuracy)} 米` : '';
      el.locationStatus.textContent = `已获取当前位置${accuracy}`;
      el.locate.textContent = '重新定位';
      el.submit.disabled = false;
      el.input.focus();
    } catch (error) {
      state.location = null;
      el.locationStatus.textContent = error && error.message ? error.message : '定位失败';
      el.locate.textContent = '再次获取位置';
      showMessage('需要位置才能回答“现在去哪”。请在浏览器里允许定位后重试。', 'warning');
    } finally {
      el.locate.disabled = false;
    }
  }

  async function search() {
    if (!state.location || state.searching) return;
    const query = el.input.value.trim();
    if (!query) {
      showMessage('先告诉我你现在想买什么，例如“麦当劳”“星巴克”或“肯德基”。');
      return;
    }
    setBusy(true);
    showMessage('正在同时找附近门店、官方优惠候选和第一方核验活动…');
    try {
      const plan = await findSavings({ query, location: state.location });
      state.currentPlan = plan;
      el.results.innerHTML = S.Render.renderPlan(plan);
      bindExecutionFeedback();
    } catch (error) {
      showMessage(`这次没有完成判断：${error && error.message ? error.message : '未知错误'}。可以稍后重试或换一个更具体的品牌。`, 'warning');
    } finally {
      setBusy(false);
    }
  }

  el.locate.addEventListener('click', locate);
  el.form.addEventListener('submit', (event) => { event.preventDefault(); search(); });
  el.chips.forEach((chip) => chip.addEventListener('click', () => {
    el.input.value = chip.dataset.query || '';
    if (state.location) search(); else locate();
  }));
  setBusy(false);
})();
