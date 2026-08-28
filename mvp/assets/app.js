(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.VerifiedOfferRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SOURCE_URL = 'https://www.mcdonalds.com.cn/news/20260824-BABBM/';
  const VALID_FROM = '2026-08-24';
  const VALID_THROUGH = '2026-09-15';

  const DEFINITIONS = Object.freeze([
    Object.freeze({
      id: 'mcd-cn-mix-match-20260824',
      brandId: 'mcd-cn',
      title: '随心配指定组合 13.9元起',
      sourceUrl: SOURCE_URL,
      offerPrice: Object.freeze({ amount: 13.9, currency: 'CNY', kind: 'starting_bundle_price' }),
      priceQualifier: '部分蓝区指定产品需另加1元，实际14.9元',
      validFrom: VALID_FROM,
      validThrough: VALID_THROUGH,
      applicability: 'partial_restaurants',
      stacking: 'not_allowed',
      dailyWindow: null,
      availabilityNote: '早餐时段后供应，具体以餐厅实际情况为准',
      channels: Object.freeze(['麦当劳App到店取餐', '微信/支付宝小程序到店取餐', '车道取餐', '自助点餐机', '餐厅柜台']),
      executionSteps: Object.freeze([
        '先在麦当劳App或微信/支付宝小程序选择附近门店',
        '早餐时段后进入到店取餐；也可使用车道取餐、自助点餐机或餐厅柜台',
        '随心配选择1款粉区指定产品 + 1款蓝区指定产品',
        '确认点购页显示13.9元；部分蓝区指定产品为14.9元',
        '确认该门店参与后再下单，不与其他优惠叠加'
      ])
    }),
    Object.freeze({
      id: 'mcd-cn-seafood-milo-addon-20260824',
      brandId: 'mcd-cn',
      title: '海鲜堡三件套 +3元换购美禄可可雪冰',
      sourceUrl: SOURCE_URL,
      offerPrice: Object.freeze({ amount: 3, currency: 'CNY', kind: 'addon_upgrade_price' }),
      priceQualifier: '购买新加坡蟹酱海鲜堡三件套时，套餐内默认饮品+3元可换购为美禄可可雪冰',
      validFrom: VALID_FROM,
      validThrough: VALID_THROUGH,
      applicability: 'partial_mccafe_restaurants',
      stacking: 'not_allowed',
      dailyWindow: '10:30:00-23:59:59',
      availabilityNote: '每日10:30-23:59:59，仅部分供应麦咖啡的麦当劳餐厅，且需在产品供应时段内',
      channels: Object.freeze(['麦当劳App到店取餐', '微信/支付宝小程序到店取餐', '自助点餐机']),
      executionSteps: Object.freeze([
        '先选择附近麦当劳门店，并确认该门店供应麦咖啡',
        '在每日10:30-23:59:59进入App或微信/支付宝小程序到店取餐，也可使用自助点餐机',
        '购买新加坡蟹酱海鲜堡三件套',
        '确认套餐默认饮品显示+3元可换购美禄可可雪冰',
        '确认该门店参与且产品有货后再下单，不与其他优惠叠加'
      ])
    })
  ]);

  function chinaDateKey(ms) {
    const date = new Date(ms);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function active(definition, nowMs) {
    const today = chinaDateKey(nowMs);
    return Boolean(today && today >= definition.validFrom && today <= definition.validThrough);
  }

  function samePrice(actual, expected) {
    return Boolean(actual && typeof actual === 'object' &&
      Number(actual.amount) === expected.amount &&
      actual.currency === expected.currency &&
      actual.kind === expected.kind);
  }

  function sameCoreFact(raw, definition) {
    if (!raw || typeof raw !== 'object') return false;
    return raw.id === definition.id &&
      raw.brandId === definition.brandId &&
      raw.title === definition.title &&
      raw.sourceUrl === definition.sourceUrl &&
      samePrice(raw.offerPrice, definition.offerPrice) &&
      raw.priceQualifier === definition.priceQualifier &&
      raw.validFrom === definition.validFrom &&
      raw.validThrough === definition.validThrough &&
      raw.applicability === definition.applicability &&
      raw.stacking === definition.stacking &&
      (definition.dailyWindow === null ? raw.dailyWindow == null : raw.dailyWindow === definition.dailyWindow);
  }

  function authorizedCopy(definition) {
    return Object.freeze({
      id: definition.id,
      brandId: definition.brandId,
      title: definition.title,
      sourceUrl: definition.sourceUrl,
      status: 'verified_official',
      offerPrice: definition.offerPrice,
      priceQualifier: definition.priceQualifier,
      validFrom: definition.validFrom,
      validThrough: definition.validThrough,
      applicability: definition.applicability,
      stacking: definition.stacking,
      dailyWindow: definition.dailyWindow,
      availabilityNote: definition.availabilityNote,
      channels: definition.channels,
      executionSteps: definition.executionSteps
    });
  }

  function authorizeVerifiedOffer(raw, { nowMs = Date.now() } = {}) {
    const definition = DEFINITIONS.find((item) => item.id === (raw && raw.id));
    if (!definition || !active(definition, nowMs) || !sameCoreFact(raw, definition)) return null;
    return authorizedCopy(definition);
  }

  function listTrustedOffers({ brandId = null, nowMs = Date.now() } = {}) {
    return Object.freeze(DEFINITIONS
      .filter((item) => (!brandId || item.brandId === brandId) && active(item, nowMs))
      .map(authorizedCopy));
  }

  return Object.freeze({ authorizeVerifiedOffer, listTrustedOffers });
});

;
(function (root, factory) {
  const registry = typeof module === 'object' && module.exports
    ? require('./verified-offer-registry.js')
    : root.StackBackMvp && root.StackBackMvp.VerifiedOfferRegistry;
  const api = factory(registry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.Decision = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (registry) {
  'use strict';

  if (!registry || typeof registry.authorizeVerifiedOffer !== 'function') throw new Error('verified offer registry is required');

  const BRAND_RULES = Object.freeze([
    { id: 'mcd-cn', name: '麦当劳', searchText: '麦当劳', pattern: /(麦当劳|mcdonald'?s|mcd)/i },
    { id: 'kfc-cn', name: '肯德基', searchText: '肯德基', pattern: /(肯德基|\bkfc\b)/i },
    { id: 'burger-king-cn', name: '汉堡王', searchText: '汉堡王', pattern: /(汉堡王|burger\s*king)/i },
    { id: 'starbucks', name: '星巴克', searchText: '星巴克', pattern: /(星巴克|starbucks)/i }
  ]);

  const PREFERRED_VERIFIED_OFFER_IDS = Object.freeze({
    'mcd-mix-match': 'mcd-cn-mix-match-20260824',
    'mcd-seafood-milo': 'mcd-cn-seafood-milo-addon-20260824'
  });

  function cleanText(value, max = 160) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function sameKeys(object, allowed) {
    if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
    const keys = Object.keys(object);
    return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
  }

  function detectOfferPreference(raw, brandId) {
    if (brandId !== 'mcd-cn') return null;
    const miloOrSeafood = /(美禄|雪冰|海鲜堡|新加坡\s*蟹酱|\bmilo\b|seafood)/iu.test(raw);
    const mixMatch = /(随心配|13\s*[.．]\s*9|1\s*\+\s*1)/iu.test(raw);
    if (miloOrSeafood === mixMatch) return null;
    return miloOrSeafood ? 'mcd-seafood-milo' : 'mcd-mix-match';
  }

  function normalizeIntent(input) {
    const raw = cleanText(input, 80);
    const match = BRAND_RULES.find((rule) => rule.pattern.test(raw));
    if (match) {
      return Object.freeze({
        brandId: match.id,
        brandName: match.name,
        searchText: match.searchText,
        offerPreference: detectOfferPreference(raw, match.id)
      });
    }
    return Object.freeze({ brandId: null, brandName: null, searchText: raw, offerPreference: null });
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

  function normalizeVerifiedOffer(row, nowMs) {
    if (!row || typeof row !== 'object' || row.status !== 'verified_official') return null;
    return registry.authorizeVerifiedOffer(row, { nowMs });
  }

  function rankVerifiedOffersForIntent(rows, intent) {
    const preferredId = intent && PREFERRED_VERIFIED_OFFER_IDS[intent.offerPreference];
    if (!preferredId) return rows;
    const preferredIndex = rows.findIndex((row) => row.id === preferredId);
    if (preferredIndex <= 0) return rows;
    return [rows[preferredIndex], ...rows.slice(0, preferredIndex), ...rows.slice(preferredIndex + 1)];
  }

  function normalizeLocalGuidance(value, { brandId, offerId, storeIds } = {}) {
    if (!sameKeys(value, ['evidenceClass', 'brandId', 'offerId', 'demotedStoreIds', 'offerCaution'])) return null;
    if (value.evidenceClass !== 'user_reported_local_guidance') return null;
    if (value.brandId !== brandId || value.offerId !== offerId) return null;
    if (!Array.isArray(value.demotedStoreIds) || value.demotedStoreIds.length > 30) return null;
    if (value.offerCaution !== null && value.offerCaution !== 'offer_ended') return null;
    const allowedStores = new Set(storeIds);
    const seen = new Set();
    const demotedStoreIds = [];
    for (const raw of value.demotedStoreIds) {
      const id = cleanText(raw, 100);
      if (!id || !allowedStores.has(id) || seen.has(id)) continue;
      seen.add(id);
      demotedStoreIds.push(id);
    }
    return Object.freeze({
      evidenceClass: 'user_reported_local_guidance',
      demotedStoreIds: Object.freeze(demotedStoreIds),
      offerCaution: value.offerCaution
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
    verifiedOfferError = null,
    localGuidance = null,
    nowMs = Date.now()
  } = {}) {
    const normalizedIntent = intent && typeof intent === 'object' ? intent : normalizeIntent('');
    const normalizedStores = stores.map(normalizeStore).filter(Boolean);
    const normalizedOffers = offers.map(normalizeOffer).filter(Boolean);
    const authorizedVerified = verifiedOfferFreshness === 'fresh'
      ? verifiedOffers.map((row) => normalizeVerifiedOffer(row, nowMs)).filter((row) => row && row.brandId === normalizedIntent.brandId)
      : [];
    const normalizedVerified = rankVerifiedOffersForIntent(authorizedVerified, normalizedIntent);
    const verifiedOffer = normalizedVerified[0] || null;
    const verifiedAlternatives = Object.freeze(normalizedVerified.slice(1, 3));
    const offer = verifiedOffer || normalizedOffers[0] || null;
    const selectedFreshness = verifiedOffer ? verifiedOfferFreshness : offerFreshness;
    const localFeedback = offer
      ? normalizeLocalGuidance(localGuidance, {
          brandId: normalizedIntent.brandId,
          offerId: offer.id,
          storeIds: normalizedStores.map((row) => row.id)
        })
      : null;
    const demoted = new Set(localFeedback ? localFeedback.demotedStoreIds : []);
    normalizedStores.sort((a, b) => {
      const localRank = Number(demoted.has(a.id)) - Number(demoted.has(b.id));
      return localRank || a.distanceMeters - b.distanceMeters;
    });
    const store = normalizedStores[0] || null;
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
      verifiedAlternatives,
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
      localFeedback,
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
  const FAILURE_CODES = Object.freeze([
    'store_not_participating',
    'offer_not_shown',
    'price_mismatch',
    'offer_ended',
    'other'
  ]);
  const FAILURE_CODE_SET = new Set(FAILURE_CODES);
  const TOP_KEYS_V2 = Object.freeze([
    'schemaVersion', 'id', 'evidenceClass', 'observedAt', 'brandId', 'brandName',
    'store', 'offer', 'outcome', 'actualPaid', 'comparisonPrice',
    'selfReportedDifference', 'successfulSavingsSession', 'failureCode', 'failureNote'
  ]);
  const TOP_KEYS_V1 = Object.freeze([
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

  function normalizeFailureCode(value, { required = false } = {}) {
    const code = String(value == null ? '' : value).trim();
    if (!code && !required) return '';
    if (!FAILURE_CODE_SET.has(code)) throw new TypeError('失败原因必须从预设选项中选择');
    return code;
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
    const failureCode = outcome === 'failure' ? normalizeFailureCode(input.failureCode, { required: true }) : '';
    const failureNote = outcome === 'failure' ? cleanText(input.failureNote, 180) : '';
    const idSeed = [
      observedIso, safeContext.brandId, safeContext.store.id, safeContext.offer.id, outcome,
      actualPaid && actualPaid.amount, comparisonPrice && comparisonPrice.amount, failureCode, failureNote
    ].join('|');

    return Object.freeze({
      schemaVersion: 2,
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
      failureCode,
      failureNote
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
      if (!row || typeof row !== 'object' || Array.isArray(row) || row.evidenceClass !== EVIDENCE_CLASS) return null;
      const isV2 = row.schemaVersion === 2 && sameKeys(row, TOP_KEYS_V2);
      const isLegacyV1 = row.schemaVersion === 1 && sameKeys(row, TOP_KEYS_V1);
      if (!isV2 && !isLegacyV1) return null;

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
      let failureCode = '';
      let failureNote = '';

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
        if (isV2 && (row.failureCode !== '' || row.failureNote !== '')) return null;
        if (isLegacyV1 && row.failureReason !== '') return null;
      } else {
        if (row.actualPaid != null || row.comparisonPrice != null || row.selfReportedDifference != null || row.successfulSavingsSession !== false) return null;
        if (isV2) {
          failureCode = normalizeFailureCode(row.failureCode, { required: true });
          failureNote = cleanText(row.failureNote, 180);
        } else {
          failureCode = 'other';
          failureNote = cleanText(row.failureReason, 180);
        }
      }
      if (Boolean(row.successfulSavingsSession) !== successfulSavingsSession) return null;

      return Object.freeze({
        schemaVersion: 2,
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
        failureCode,
        failureNote
      });
    } catch {
      return null;
    }
  }

  return Object.freeze({ createExecutionReport, normalizeStoredReport, cleanText, FAILURE_CODES });
});
;
(function (root, factory) {
  const execution = typeof module === 'object' && module.exports
    ? require('./execution-report.js')
    : root.StackBackMvp && root.StackBackMvp.ExecutionReport;
  const api = factory(execution);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.ExecutionLedger = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ExecutionReport) {
  'use strict';

  const SUMMARY_EVIDENCE_CLASS = 'user_reported_local_summary';
  const MAX_INPUT_ROWS = 100;

  function moneyFromCents(cents) {
    return Object.freeze({ amount: Math.round(cents) / 100, currency: 'CNY' });
  }

  function summarizeExecutionReports(rows) {
    if (!ExecutionReport || typeof ExecutionReport.normalizeStoredReport !== 'function') throw new Error('ExecutionReport domain is required');
    if (!Array.isArray(rows)) throw new TypeError('执行历史必须是数组');

    const safe = rows
      .slice(0, MAX_INPUT_ROWS)
      .map((row) => ExecutionReport.normalizeStoredReport(row))
      .filter(Boolean);

    let successfulRedemptions = 0;
    let failedAttempts = 0;
    let quantifiedSavingsSessions = 0;
    let savingsCents = 0;

    for (const report of safe) {
      if (report.outcome === 'success') successfulRedemptions += 1;
      else if (report.outcome === 'failure') failedAttempts += 1;

      if (report.successfulSavingsSession && report.selfReportedDifference && report.selfReportedDifference.currency === 'CNY') {
        quantifiedSavingsSessions += 1;
        savingsCents += Math.round(Number(report.selfReportedDifference.amount) * 100);
      }
    }

    return Object.freeze({
      evidenceClass: SUMMARY_EVIDENCE_CLASS,
      attempts: safe.length,
      successfulRedemptions,
      failedAttempts,
      quantifiedSavingsSessions,
      selfReportedSavings: moneyFromCents(savingsCents)
    });
  }

  return Object.freeze({ summarizeExecutionReports, SUMMARY_EVIDENCE_CLASS });
});

;
(function (root, factory) {
  const execution = typeof module === 'object' && module.exports
    ? require('./execution-report.js')
    : root.StackBackMvp && root.StackBackMvp.ExecutionReport;
  const api = factory(execution);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.ExecutionGuidance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ExecutionReport) {
  'use strict';

  const EVIDENCE_CLASS = 'user_reported_local_guidance';
  const DEFAULT_MAX_AGE_MS = 72 * 60 * 60 * 1000;
  const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
  const DEMOTION_CODES = new Set(['store_not_participating', 'offer_not_shown', 'price_mismatch']);

  function cleanId(value, max = 120) {
    if (!ExecutionReport || typeof ExecutionReport.cleanText !== 'function') return '';
    return ExecutionReport.cleanText(value, max);
  }

  function instantMs(value) {
    const ms = Date.parse(String(value == null ? '' : value));
    return Number.isFinite(ms) ? ms : null;
  }

  function createExecutionGuidance({
    reports = [],
    brandId,
    offerId,
    candidateStoreIds = [],
    now = new Date().toISOString(),
    maxAgeMs = DEFAULT_MAX_AGE_MS
  } = {}) {
    if (!ExecutionReport || typeof ExecutionReport.normalizeStoredReport !== 'function') throw new Error('ExecutionReport domain is required');
    if (!Array.isArray(reports)) throw new TypeError('执行历史必须是数组');
    if (!Array.isArray(candidateStoreIds)) throw new TypeError('候选门店必须是数组');
    const safeBrandId = cleanId(brandId, 80);
    const safeOfferId = cleanId(offerId, 120);
    if (!safeBrandId || !safeOfferId) throw new TypeError('本机反馈上下文不完整');
    const nowMs = instantMs(now);
    if (nowMs == null) throw new TypeError('当前时间无效');
    const maxAge = Number(maxAgeMs);
    if (!Number.isInteger(maxAge) || maxAge <= 0 || maxAge > 14 * 24 * 60 * 60 * 1000) throw new TypeError('反馈有效期无效');

    const candidateIds = [];
    const candidateSet = new Set();
    for (const value of candidateStoreIds.slice(0, 30)) {
      const id = cleanId(value, 120);
      if (id && !candidateSet.has(id)) {
        candidateSet.add(id);
        candidateIds.push(id);
      }
    }

    const safe = reports
      .slice(0, 100)
      .map((row) => ExecutionReport.normalizeStoredReport(row))
      .filter(Boolean)
      .filter((report) => {
        if (report.brandId !== safeBrandId || report.offer.id !== safeOfferId || !candidateSet.has(report.store.id)) return false;
        const observedMs = instantMs(report.observedAt);
        if (observedMs == null || observedMs - nowMs > MAX_FUTURE_SKEW_MS) return false;
        return nowMs - observedMs <= maxAge;
      })
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));

    const latestByStore = new Map();
    for (const report of safe) {
      if (!latestByStore.has(report.store.id)) latestByStore.set(report.store.id, report);
    }

    const demotedStoreIds = [];
    for (const id of candidateIds) {
      const latest = latestByStore.get(id);
      if (latest && latest.outcome === 'failure' && DEMOTION_CODES.has(latest.failureCode)) demotedStoreIds.push(id);
    }

    const latestOfferSignal = safe[0] || null;
    const offerCaution = latestOfferSignal && latestOfferSignal.outcome === 'failure' && latestOfferSignal.failureCode === 'offer_ended'
      ? 'offer_ended'
      : null;

    return Object.freeze({
      evidenceClass: EVIDENCE_CLASS,
      brandId: safeBrandId,
      offerId: safeOfferId,
      demotedStoreIds: Object.freeze(demotedStoreIds),
      offerCaution
    });
  }

  return Object.freeze({ createExecutionGuidance, EVIDENCE_CLASS, DEFAULT_MAX_AGE_MS });
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

  const READ_MODEL_PATH = '../shared/candidate-read-model-v1.json';
  const ROUTES = Object.freeze({
    'burger-king-cn': Object.freeze({ allowedHosts: Object.freeze(['bkchina.cn']) }),
    'kfc-cn': Object.freeze({ allowedHosts: Object.freeze(['login.kfc.com.cn']) }),
    'mcd-cn': Object.freeze({ allowedHosts: Object.freeze(['www.mcdonalds.com.cn']) }),
    'starbucks': Object.freeze({ allowedHosts: Object.freeze(['www.starbucks.com.cn']) })
  });
  const TOP_KEYS = Object.freeze(['kind', 'schemaVersion', 'sources']);
  const SOURCE_KEYS = Object.freeze(['brandId', 'capturedAt', 'market', 'rows']);
  const ROW_KEYS = Object.freeze(['id', 'sourceUrl', 'title']);

  function sameKeys(value, allowed) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value).sort();
    return keys.length === allowed.length && keys.every((key, index) => key === allowed[index]);
  }

  function cleanText(value, max) {
    if (typeof value !== 'string') return '';
    const text = value.trim();
    if (!text || text.length > max || /[\u0000-\u001f\u007f]/u.test(text)) return '';
    return text;
  }

  function parseCandidateReadModel(model, { brandId, nowMs = Date.now(), freshMs = 36 * 3600 * 1000, maxAgeMs = 7 * 24 * 3600 * 1000 } = {}) {
    const route = ROUTES[brandId];
    if (!route) throw new Error('unsupported candidate brand');
    if (!sameKeys(model, TOP_KEYS)) throw new Error('candidate read model fields are invalid');
    if (model.schemaVersion !== 1 || model.kind !== 'stackback_candidate_read_model') throw new Error('unsupported candidate read model schema');
    if (!Array.isArray(model.sources) || model.sources.length < 1 || model.sources.length > Object.keys(ROUTES).length) throw new Error('invalid candidate sources');

    const seenSources = new Set();
    let selected = null;
    for (const source of model.sources) {
      if (!sameKeys(source, SOURCE_KEYS)) throw new Error('candidate source fields are invalid');
      const sourceBrandId = cleanText(source.brandId, 80);
      if (!sourceBrandId || !ROUTES[sourceBrandId]) throw new Error('unknown candidate source brand');
      if (seenSources.has(sourceBrandId)) throw new Error('duplicate source brand');
      seenSources.add(sourceBrandId);
      if (sourceBrandId === brandId) selected = source;
    }

    if (!selected) return Object.freeze({ freshness: 'unavailable', capturedAt: null, rows: Object.freeze([]) });
    if (selected.market !== 'China') throw new Error('candidate source market mismatch');
    const capturedAtMs = Date.parse(selected.capturedAt);
    if (!Number.isFinite(capturedAtMs) || capturedAtMs > nowMs + 5 * 60 * 1000) throw new Error('invalid candidate capture time');
    if (!Array.isArray(selected.rows) || selected.rows.length > 100) throw new Error('invalid candidate rows');

    const age = Math.max(0, nowMs - capturedAtMs);
    const freshness = age <= freshMs ? 'fresh' : age <= maxAgeMs ? 'stale' : 'expired';
    const allowedHosts = new Set(route.allowedHosts);
    const ids = new Set();
    const urls = new Set();
    const rows = [];

    for (const raw of selected.rows) {
      if (!sameKeys(raw, ROW_KEYS)) throw new Error('candidate row fields are invalid');
      const id = cleanText(raw.id, 120);
      const title = cleanText(raw.title, 220);
      const sourceUrl = cleanText(raw.sourceUrl, 500);
      if (!id || !title || !sourceUrl || ids.has(id)) throw new Error('invalid or duplicate candidate row');

      let url;
      try { url = new URL(sourceUrl); } catch { throw new Error('candidate source URL is invalid'); }
      if (url.protocol !== 'https:') throw new Error('candidate source URL must use HTTPS');
      if (url.username || url.password || url.port || url.hash) throw new Error('candidate source URL must be canonical HTTPS');
      if (!allowedHosts.has(url.hostname.toLowerCase())) throw new Error('candidate source is outside allowed official host');
      const canonicalUrl = url.toString();
      if (urls.has(canonicalUrl)) throw new Error('duplicate candidate source URL');

      ids.add(id);
      urls.add(canonicalUrl);
      rows.push(Object.freeze({ id, title, sourceUrl: canonicalUrl, status: 'candidate' }));
    }

    return Object.freeze({
      freshness,
      capturedAt: new Date(capturedAtMs).toISOString(),
      rows: Object.freeze(freshness === 'expired' ? [] : rows.slice(0, 5))
    });
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
      if (!ROUTES[brandId]) return Object.freeze({ freshness: 'unsupported', rows: [] });
      if (!isLikelyChina(location)) return Object.freeze({ freshness: 'outside-coverage', rows: [] });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(READ_MODEL_PATH, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw new Error(`优惠数据 HTTP ${response.status}`);
        return parseCandidateReadModel(await response.json(), { brandId });
      } finally {
        clearTimeout(timer);
      }
    };
  }

  return Object.freeze({ createOfferProvider, parseCandidateReadModel, isLikelyChina });
});

;
(function (root, factory) {
  const registry = typeof module === 'object' && module.exports
    ? require('../domain/verified-offer-registry.js')
    : root.StackBackMvp && root.StackBackMvp.VerifiedOfferRegistry;
  const api = factory(registry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.VerifiedOffers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (registry) {
  'use strict';

  if (!registry || typeof registry.authorizeVerifiedOffer !== 'function' || typeof registry.listTrustedOffers !== 'function') {
    throw new Error('verified offer registry is required');
  }

  const ROUTE = Object.freeze({
    brandId: 'mcd-cn',
    path: './data/verified-offer-registry-v1.json'
  });
  const LEGACY_AUTHORITY = 'stackback-first-party-verifier';
  const FRESH_MS = 24 * 60 * 60 * 1000;

  function isLikelyChina(location) {
    if (!location) return false;
    const lat = Number(location.lat);
    const lon = Number(location.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135;
  }

  function parseCaptureTime(snapshot, { nowMs, freshMs }) {
    const capturedAtMs = Date.parse(snapshot.capturedAt);
    if (!Number.isFinite(capturedAtMs) || capturedAtMs > nowMs + 5 * 60 * 1000) throw new Error('invalid verified snapshot capture time');
    const age = Math.max(0, nowMs - capturedAtMs);
    return Object.freeze({
      capturedAtMs,
      capturedAt: new Date(capturedAtMs).toISOString(),
      freshness: age <= freshMs ? 'fresh' : 'stale'
    });
  }

  function canonicalizeAuthorizedRows(rows, nowMs) {
    const authorizedById = new Map();
    for (const raw of rows) {
      const authorized = registry.authorizeVerifiedOffer(raw, { nowMs });
      if (authorized && !authorizedById.has(authorized.id)) authorizedById.set(authorized.id, authorized);
    }
    const ordered = registry.listTrustedOffers({ nowMs })
      .map((definition) => authorizedById.get(definition.id))
      .filter(Boolean);
    return Object.freeze(ordered);
  }

  function parseVerifiedRegistrySnapshot(snapshot, { nowMs = Date.now(), freshMs = FRESH_MS } = {}) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new TypeError('verified registry snapshot must be an object');
    if (snapshot.schemaVersion !== 1 || snapshot.kind !== 'stackback_verified_offer_registry') throw new Error('verified registry snapshot schema mismatch');
    if (snapshot.market !== 'China') throw new Error('verified registry snapshot context mismatch');
    if (!Array.isArray(snapshot.rows) || snapshot.rows.length > 20) throw new Error('invalid verified registry rows');
    const capture = parseCaptureTime(snapshot, { nowMs, freshMs });
    if (capture.freshness !== 'fresh') return Object.freeze({ freshness: capture.freshness, capturedAt: capture.capturedAt, rows: Object.freeze([]) });
    return Object.freeze({
      freshness: capture.freshness,
      capturedAt: capture.capturedAt,
      rows: canonicalizeAuthorizedRows(snapshot.rows, nowMs)
    });
  }

  // Legacy parser remains only for compatibility with the pre-0.7 MVP data file.
  // MVP 0.7 runtime does not use provider-authored authority as a trust capability.
  function parseVerifiedSnapshot(snapshot, { nowMs = Date.now(), freshMs = FRESH_MS } = {}) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new TypeError('verified snapshot must be an object');
    if (snapshot.schemaVersion !== 1 || snapshot.authority !== LEGACY_AUTHORITY) throw new Error('verified snapshot authority mismatch');
    if (snapshot.brandId !== ROUTE.brandId || snapshot.market !== 'China') throw new Error('verified snapshot context mismatch');
    if (!Array.isArray(snapshot.rows) || snapshot.rows.length > 3) throw new Error('invalid verified snapshot rows');
    const capture = parseCaptureTime(snapshot, { nowMs, freshMs });
    if (capture.freshness !== 'fresh') return Object.freeze({ freshness: capture.freshness, capturedAt: capture.capturedAt, rows: Object.freeze([]) });
    const withBrand = snapshot.rows.map((row) => ({ ...row, brandId: ROUTE.brandId }));
    return Object.freeze({
      freshness: capture.freshness,
      capturedAt: capture.capturedAt,
      rows: canonicalizeAuthorizedRows(withBrand, nowMs).slice(0, 1)
    });
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
        const parsed = parseVerifiedRegistrySnapshot(await response.json());
        return Object.freeze({
          freshness: parsed.freshness,
          capturedAt: parsed.capturedAt,
          rows: Object.freeze(parsed.rows.filter((row) => row.brandId === brandId))
        });
      } finally {
        clearTimeout(timer);
      }
    };
  }

  return Object.freeze({ createVerifiedOfferProvider, parseVerifiedRegistrySnapshot, parseVerifiedSnapshot, isLikelyChina });
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
  const decision = typeof module === 'object' && module.exports
    ? require('../domain/decision.js')
    : root.StackBackMvp && root.StackBackMvp.Decision;
  const guidance = typeof module === 'object' && module.exports
    ? require('../domain/execution-guidance.js')
    : root.StackBackMvp && root.StackBackMvp.ExecutionGuidance;
  const api = factory(decision, guidance);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackBackMvp = root.StackBackMvp || {};
  root.StackBackMvp.FindSavings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Decision, ExecutionGuidance) {
  'use strict';

  function createFindSavingsUseCase({
    storeProvider,
    offerProvider,
    verifiedOfferProvider,
    executionStore = null,
    clock = () => new Date().toISOString()
  } = {}) {
    if (!Decision) throw new Error('Decision domain is required');
    if (typeof storeProvider !== 'function' || typeof offerProvider !== 'function') throw new TypeError('providers are required');
    if (typeof clock !== 'function') throw new TypeError('clock is required');
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

      const stores = storeResult.status === 'fulfilled' && Array.isArray(storeResult.value) ? storeResult.value : [];
      const offerPayload = offerResult.status === 'fulfilled' ? offerResult.value : { freshness: 'unknown', rows: [] };
      const verifiedPayload = verifiedResult.status === 'fulfilled' ? verifiedResult.value : { freshness: 'unknown', rows: [] };
      const planInput = {
        intent,
        stores,
        offers: Array.isArray(offerPayload.rows) ? offerPayload.rows : [],
        verifiedOffers: Array.isArray(verifiedPayload.rows) ? verifiedPayload.rows : [],
        offerFreshness: offerPayload.freshness || 'unknown',
        verifiedOfferFreshness: verifiedPayload.freshness || 'unknown',
        storeError: storeResult.status === 'rejected' ? storeResult.reason && storeResult.reason.message : null,
        offerError: offerResult.status === 'rejected' ? offerResult.reason && offerResult.reason.message : null,
        verifiedOfferError: verifiedResult.status === 'rejected' ? verifiedResult.reason && verifiedResult.reason.message : null
      };
      const basePlan = Decision.buildSavingsPlan(planInput);
      if (
        !basePlan.offer ||
        !ExecutionGuidance || typeof ExecutionGuidance.createExecutionGuidance !== 'function' ||
        !executionStore || typeof executionStore.list !== 'function'
      ) return basePlan;

      try {
        const localGuidance = ExecutionGuidance.createExecutionGuidance({
          reports: executionStore.list(),
          brandId: intent.brandId,
          offerId: basePlan.offer.id,
          candidateStoreIds: stores.map((row) => row && row.id),
          now: clock()
        });
        return Decision.buildSavingsPlan({ ...planInput, localGuidance });
      } catch {
        return basePlan;
      }
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

  const FAILURE_LABELS = Object.freeze({
    store_not_participating: '门店不参加',
    offer_not_shown: '点购页未显示活动',
    price_mismatch: '价格与预期不符',
    offer_ended: '活动显示已结束',
    other: '其他原因'
  });

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
    const money = formatMoney(price.amount, price.currency);
    if (price.kind === 'starting_bundle_price') return `${money} 起`;
    if (price.kind === 'addon_upgrade_price') return `+${money} 换购`;
    return money;
  }

  function reliabilityText(plan) {
    const parts = [];
    if (plan.store) parts.push('门店来自 OpenStreetMap，仍属于附近候选');
    else parts.push('附近门店尚未找到');
    if (plan.offer && plan.offer.status === 'verified_official') {
      parts.push('优惠条款由 StackBack 第一方核验流程从麦当劳官方活动页读取，并再次与 MVP 代码 Registry 授权事实核对');
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
        <div class="answer-sub">这一步只记录你的真实执行反馈，不会把单次自报升级成全局“已确认”。成功时请填实付金额；失败时请选择最接近的结构化原因，补充说明只作为备注。</div>
        <form class="execution-form" data-role="execution-form">
          <label><span>结果</span><select name="outcome"><option value="success">成功使用</option><option value="failure">未成功</option></select></label>
          <div class="execution-money-grid">
            <label><span>实际支付</span><input name="actualPaid" inputmode="decimal" type="number" min="0" max="100000" step="0.01" placeholder="成功时填写，例如 13.9"></label>
            <label><span>常规/对比价（选填）</span><input name="comparisonPrice" inputmode="decimal" type="number" min="0" max="100000" step="0.01" placeholder="只有确实知道才填"></label>
          </div>
          <label><span>失败原因（失败时必选）</span><select name="failureCode"><option value="">请选择</option><option value="store_not_participating">门店不参加</option><option value="offer_not_shown">点购页未显示活动</option><option value="price_mismatch">价格与预期不符</option><option value="offer_ended">活动显示已结束</option><option value="other">其他原因</option></select></label>
          <label><span>补充说明（选填）</span><input name="failureNote" maxlength="180" placeholder="只作为本机备注，不直接参与排序"></label>
          <button class="primary-btn execution-submit" type="submit">记录本次结果</button>
        </form>
        <div data-role="execution-result"></div>
        <div class="local-note">记录仅保存在这个浏览器中。结构化失败原因最多影响近 72 小时内同一优惠的本机候选顺序；不会改变优惠、门店或省额的全局可信状态。</div>
      </section>`;
  }

  function renderExecutionReceipt(report) {
    if (!report || report.evidenceClass !== 'user_reported_local') return '<div class="execution-receipt warning">没有保存无效执行记录。</div>';
    if (report.outcome === 'failure') {
      const label = FAILURE_LABELS[report.failureCode] || '其他原因';
      const note = report.failureNote ? `：${escapeHtml(report.failureNote)}` : '';
      return `<div class="execution-receipt warning"><strong>已记录：本次未成功（用户自报）</strong><div>${escapeHtml(label)}${note}</div><div>这条记录不会把优惠或门店标记为失效；符合精确上下文和时效条件时，只会在下次搜索中作为本机候选排序提示。</div></div>`;
    }
    const paid = report.actualPaid ? formatMoney(report.actualPaid.amount, report.actualPaid.currency) : '金额未知';
    if (report.successfulSavingsSession && report.comparisonPrice && report.selfReportedDifference) {
      const comparison = formatMoney(report.comparisonPrice.amount, report.comparisonPrice.currency);
      const difference = formatMoney(report.selfReportedDifference.amount, report.selfReportedDifference.currency);
      return `<div class="execution-receipt success"><strong>已记录 Successful Savings Session（用户自报）</strong><div>你报告实付 ${escapeHtml(paid)}，同一消费的可比较价格为 ${escapeHtml(comparison)}，少付 ${escapeHtml(difference)}。</div><div>该差额只作为你的自报结果保存，不等同于 StackBack 全局可靠省额。</div></div>`;
    }
    return `<div class="execution-receipt success"><strong>已记录：本次成功使用（用户自报）</strong><div>你报告实付 ${escapeHtml(paid)}。由于没有可靠的可比较常规价，本次不计算省额，也不计入量化 Successful Savings Session。</div></div>`;
  }

  function renderExecutionLedger(summary) {
    if (!summary || summary.evidenceClass !== 'user_reported_local_summary') {
      return '<section class="ledger-card"><div class="support-title">本机自报省钱账本</div><div class="answer-sub">当前浏览器无法读取本机执行记录；这不会影响优惠推荐。</div></section>';
    }
    const total = summary.selfReportedSavings && summary.selfReportedSavings.currency === 'CNY'
      ? formatMoney(summary.selfReportedSavings.amount, 'CNY')
      : '¥0';
    const empty = summary.attempts === 0
      ? '<div class="ledger-empty">还没有执行记录。实际使用一次核验优惠后，可在这里看到本机闭环结果。</div>'
      : '';
    return `
      <section class="ledger-card">
        <div class="ledger-head"><div><div class="support-title">本机自报省钱账本</div><div class="ledger-money">累计自报少付 ${escapeHtml(total)}</div></div><div class="ledger-session">量化 Successful Savings Session<br><strong>${escapeHtml(summary.quantifiedSavingsSessions)}</strong> 次</div></div>
        <div class="ledger-stats"><span>尝试 ${escapeHtml(summary.attempts)} 次</span><span>成功核销 ${escapeHtml(summary.successfulRedemptions)} 次</span><span>未成功 ${escapeHtml(summary.failedAttempts)} 次</span></div>
        ${empty}
        <div class="local-note">只汇总通过证据校验的 user_reported_local 记录；累计少付金额来自你提供的可比较价格，不会升级为 StackBack 的全局可靠省额。</div>
      </section>`;
  }

  function renderLocalFeedback(plan) {
    const feedback = plan && plan.localFeedback;
    if (!feedback || feedback.evidenceClass !== 'user_reported_local_guidance') return '';
    const messages = [];
    const demotedCount = Array.isArray(feedback.demotedStoreIds) ? feedback.demotedStoreIds.length : 0;
    if (demotedCount > 0) messages.push(`这个浏览器近 72 小时的同一优惠执行记录让 ${demotedCount} 家候选暂时后排；门店仍是候选，并非官方“不参加”结论。`);
    if (feedback.offerCaution === 'offer_ended') messages.push('这个浏览器近期记录过“活动显示已结束”；这里只提示再次核验，不能据此判定官方活动已经结束。');
    if (!messages.length) return '';
    return `<div class="local-guidance"><strong>本机执行反馈</strong><div>${messages.map((message) => escapeHtml(message)).join('<br>')}</div></div>`;
  }

  function renderVerifiedAlternatives(plan) {
    const rows = Array.isArray(plan && plan.verifiedAlternatives) ? plan.verifiedAlternatives : [];
    if (!rows.length) return '';
    const content = rows.map((row) => {
      const price = formatPrice({ status: 'verified', amount: row.offerPrice.amount, currency: row.offerPrice.currency, kind: row.offerPrice.kind });
      return `<div class="verified-alternative"><div class="mini-row"><span>${escapeHtml(row.title)}</span><strong>${escapeHtml(price || '价格待确认')}</strong></div><div class="answer-sub">${escapeHtml(row.priceQualifier)}。该活动本身已核验，但当前附近门店是否适用仍需点购页确认。</div><a class="text-link" href="${escapeHtml(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看官方条款</a></div>`;
    }).join('');
    return `<div class="support-block"><div class="support-title">其他已核验官方活动</div>${content}</div>`;
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
      ? `<div class="saving-value">省额待核验</div><div class="answer-sub">已核验活动价格：${escapeHtml(verifiedPrice)}。${escapeHtml(plan.offer.priceQualifier)}。没有可靠常规价基线，因此暂不把差额包装成“可靠可省”。</div>`
      : '<div class="saving-value">待确认</div><div class="answer-sub">当前没有足够证据计算可靠节省金额</div>';

    const mapLink = plan.store && Number.isFinite(plan.store.lat) && Number.isFinite(plan.store.lon)
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(plan.store.lat)}&mlon=${encodeURIComponent(plan.store.lon)}#map=18/${encodeURIComponent(plan.store.lat)}/${encodeURIComponent(plan.store.lon)}`
      : null;

    const otherStores = plan.otherStores.length
      ? `<div class="support-block"><div class="support-title">其他附近候选</div>${plan.otherStores.map((s) => `<div class="mini-row"><span>${escapeHtml(s.name)}</span><span>${escapeHtml(formatDistance(s.distanceMeters))}</span></div>`).join('')}</div>`
      : '';

    const badges = verified
      ? `<span>优惠：官方核验</span><span>活动价格：${escapeHtml(verifiedPrice || '待确认')}</span><span>门店：待点购页确认</span><span>叠加：不可</span>`
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
        ${renderVerifiedAlternatives(plan)}
        ${renderLocalFeedback(plan)}
        ${otherStores}
        ${verified && plan.store ? renderExecutionForm() : ''}
        <div class="attribution">门店数据 © OpenStreetMap contributors</div>
      </section>`;
  }

  return Object.freeze({ renderPlan, renderExecutionReceipt, renderExecutionLedger, formatDistance, formatPrice, formatMoney, escapeHtml });
});

;
(function () {
  'use strict';

  const S = globalThis.StackBackMvp;
  if (!S || !S.Decision || !S.ExecutionReport || !S.ExecutionLedger || !S.ExecutionGuidance || !S.BrowserLocation || !S.OsmStores || !S.PreviewOffers || !S.VerifiedOffers || !S.LocalExecutionStore || !S.FindSavings || !S.RecordExecution || !S.Render) throw new Error('StackBack MVP modules are incomplete');

  const storeProvider = S.OsmStores.createStoreProvider();
  const offerProvider = S.PreviewOffers.createOfferProvider();
  const verifiedOfferProvider = S.VerifiedOffers.createVerifiedOfferProvider();
  let executionStore = null;
  let recordExecution = null;
  try {
    executionStore = S.LocalExecutionStore.createLocalExecutionStore({ storage: globalThis.localStorage });
    recordExecution = S.RecordExecution.createRecordExecutionUseCase({ executionDomain: S.ExecutionReport, executionStore });
  } catch {
    executionStore = null;
    recordExecution = null;
  }
  const findSavings = S.FindSavings.createFindSavingsUseCase({
    storeProvider,
    offerProvider,
    verifiedOfferProvider,
    executionStore
  });

  const state = { location: null, searching: false, currentPlan: null };
  const el = {
    locate: document.querySelector('[data-action="locate"]'),
    locationStatus: document.querySelector('[data-role="location-status"]'),
    form: document.querySelector('[data-role="search-form"]'),
    input: document.querySelector('[data-role="query"]'),
    submit: document.querySelector('[data-action="search"]'),
    ledger: document.querySelector('[data-role="execution-ledger"]'),
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

  function readLedger() {
    if (!executionStore) return null;
    try {
      return S.ExecutionLedger.summarizeExecutionReports(executionStore.list());
    } catch {
      return null;
    }
  }

  function refreshLedger() {
    if (!el.ledger) return;
    el.ledger.innerHTML = S.Render.renderExecutionLedger(readLedger());
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
            failureCode: String(data.get('failureCode') || '').trim(),
            failureNote: String(data.get('failureNote') || '').trim()
          }
        });
        output.innerHTML = S.Render.renderExecutionReceipt(report);
        refreshLedger();
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
  refreshLedger();
  setBusy(false);
})();