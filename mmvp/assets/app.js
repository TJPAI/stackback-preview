'use strict';
const SOURCE_URL = 'https://www.mcdonalds.com.cn/news/20260824-BABBM/';
const VALID_FROM = '2026-08-24';
const VALID_THROUGH = '2026-09-15';

const DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'mcd-cn-mix-match-20260824',
    brandId: 'mcd-cn',
    market: 'China',
    title: '随心配指定组合 13.9元起',
    sourceUrl: SOURCE_URL,
    offerPrice: Object.freeze({ amount: 13.9, currency: 'CNY', kind: 'starting_bundle_price' }),
    priceQualifier: '部分蓝区指定产品需另加1元，实际14.9元',
    validFrom: VALID_FROM,
    validThrough: VALID_THROUGH,
    dailyWindow: null,
    availabilityNote: '早餐时段后供应，具体以餐厅实际情况为准',
    applicability: 'partial_restaurants',
    stacking: 'not_allowed',
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
    market: 'China',
    title: '海鲜堡三件套 +3元换购美禄可可雪冰',
    sourceUrl: SOURCE_URL,
    offerPrice: Object.freeze({ amount: 3, currency: 'CNY', kind: 'addon_upgrade_price' }),
    priceQualifier: '购买新加坡蟹酱海鲜堡三件套时，套餐内默认饮品+3元可换购为美禄可可雪冰',
    validFrom: VALID_FROM,
    validThrough: VALID_THROUGH,
    dailyWindow: '10:30:00-23:59:59',
    availabilityNote: '每日10:30-23:59:59，仅部分供应麦咖啡的麦当劳餐厅，且需在产品供应时段内',
    applicability: 'partial_mccafe_restaurants',
    stacking: 'not_allowed',
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

function dateKey(now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('valid current time is required');
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function active(definition, now) {
  const date = dateKey(now);
  return date >= definition.validFrom && date <= definition.validThrough;
}

function sameCore(raw, definition) {
  if (!raw || typeof raw !== 'object') return false;
  const rawMarket = raw.market == null ? 'China' : raw.market;
  const rawDailyWindow = raw.dailyWindow == null ? null : raw.dailyWindow;
  return raw.id === definition.id &&
    raw.brandId === definition.brandId &&
    rawMarket === definition.market &&
    raw.title === definition.title &&
    raw.sourceUrl === definition.sourceUrl &&
    raw.offerPrice && Number(raw.offerPrice.amount) === definition.offerPrice.amount &&
    raw.offerPrice.currency === definition.offerPrice.currency &&
    raw.offerPrice.kind === definition.offerPrice.kind &&
    raw.priceQualifier === definition.priceQualifier &&
    raw.validFrom === definition.validFrom &&
    raw.validThrough === definition.validThrough &&
    rawDailyWindow === definition.dailyWindow &&
    raw.applicability === definition.applicability &&
    raw.stacking === definition.stacking;
}

function copy(definition) {
  return Object.freeze({
    id: definition.id,
    brandId: definition.brandId,
    market: definition.market,
    title: definition.title,
    sourceUrl: definition.sourceUrl,
    status: 'verified_official',
    offerPrice: definition.offerPrice,
    priceQualifier: definition.priceQualifier,
    validFrom: definition.validFrom,
    validThrough: definition.validThrough,
    dailyWindow: definition.dailyWindow,
    availabilityNote: definition.availabilityNote,
    applicability: definition.applicability,
    stacking: definition.stacking,
    channels: definition.channels,
    executionSteps: definition.executionSteps
  });
}

function authorizeTrustedOffer(raw, { now = new Date() } = {}) {
  const definition = DEFINITIONS.find((item) => item.id === (raw && raw.id));
  if (!definition || !active(definition, now) || !sameCore(raw, definition)) return null;
  return copy(definition);
}

function listTrustedOffers({ brandId = null, now = new Date() } = {}) {
  return Object.freeze(DEFINITIONS
    .filter((item) => (!brandId || item.brandId === brandId) && active(item, now))
    .map(copy));
}

const TRUSTED_OFFER_IDS = Object.freeze(DEFINITIONS.map((item) => item.id));



const INITIAL = listTrustedOffers({ brandId: 'mcd-cn', now: new Date('2026-08-28T00:00:00+08:00') });
const TRUSTED_OFFER = INITIAL[0];

function getActiveTrustedOffer({ now = new Date() } = {}) {
  const offers = listTrustedOffers({ brandId: 'mcd-cn', now });
  return offers.find((offer) => offer.id === TRUSTED_OFFER.id) || null;
}


const GOALS = new Set(['general_meal', 'seafood_combo']);

function chinaClock(now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('valid current time is required');
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  const v = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Object.freeze({ date: `${v.year}-${v.month}-${v.day}`, time: `${v.hour}:${v.minute}:${v.second}` });
}

function inWindow(offer, clock) {
  if (typeof offer.validFrom !== 'string' || typeof offer.validThrough !== 'string') return false;
  if (clock.date < offer.validFrom || clock.date > offer.validThrough) return false;
  if (!offer.dailyWindow) return true;
  if (typeof offer.dailyWindow !== 'string' || !/^\d{2}:\d{2}:\d{2}-\d{2}:\d{2}:\d{2}$/u.test(offer.dailyWindow)) return false;
  const [start, end] = offer.dailyWindow.split('-');
  return clock.time >= start && clock.time <= end;
}

function safeSteps(offer) {
  return Array.isArray(offer.executionSteps) ? offer.executionSteps.length : 8;
}

function scoreOffer(offer, demand) {
  let score = 0;
  const reasons = [];
  const kind = offer.offerPrice && offer.offerPrice.kind;

  if (demand.goal === 'general_meal') {
    if (kind === 'starting_bundle_price') {
      score += 100;
      reasons.push('direct_meal_fit');
    } else if (kind === 'addon_upgrade_price') {
      score += 25;
      reasons.push('secondary_addon_fit');
    }
  } else if (demand.goal === 'seafood_combo') {
    if (kind === 'addon_upgrade_price' && offer.id === 'mcd-cn-seafood-milo-addon-20260824') {
      score += 125;
      reasons.push('specific_intent_fit');
    } else if (kind === 'starting_bundle_price') {
      score += 50;
      reasons.push('fallback_meal_fit');
    }
  }

  if (offer.applicability === 'partial_restaurants') {
    score += 12;
    reasons.push('broader_applicability');
  } else if (offer.applicability === 'partial_mccafe_restaurants') {
    score += 4;
  }

  const steps = safeSteps(offer);
  score -= Math.min(20, steps * 2);
  if (steps <= 5) reasons.push('lower_friction');
  return Object.freeze({ score, reasonCodes: Object.freeze(reasons) });
}

function rankOffersForDemand({ offers, demand, now = new Date() } = {}) {
  if (!Array.isArray(offers)) throw new TypeError('offers must be an array');
  if (!demand || typeof demand !== 'object' || typeof demand.market !== 'string' || typeof demand.brandId !== 'string' || !GOALS.has(demand.goal)) {
    throw new TypeError('bounded demand is required');
  }
  const clock = chinaClock(now);
  const ranked = [];
  const seen = new Set();

  for (const offer of offers) {
    if (!offer || typeof offer !== 'object' || typeof offer.id !== 'string' || seen.has(offer.id)) continue;
    seen.add(offer.id);
    if (offer.market !== demand.market || offer.brandId !== demand.brandId || !inWindow(offer, clock)) continue;
    const scored = scoreOffer(offer, demand);
    if (scored.score <= 0) continue;
    ranked.push(Object.freeze({ offer, score: scored.score, reasonCodes: scored.reasonCodes }));
  }

  ranked.sort((a, b) => b.score - a.score || a.offer.id.localeCompare(b.offer.id));
  return Object.freeze(ranked.map((item, index) => Object.freeze({ ...item, rank: index + 1 })));
}


const RECOMMENDABLE_TRUST = new Set(['verified', 'recommendable']);

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validSaving(value) {
  return value === null || value === undefined || finiteNonNegative(value);
}

function savingKnown(offer) {
  return finiteNonNegative(offer.savingAmountCents);
}

function normalizeCandidate(offer) {
  if (!offer || typeof offer !== 'object') return null;
  if (typeof offer.id !== 'string' || offer.id.trim() === '') return null;
  if (!RECOMMENDABLE_TRUST.has(offer.trustStatus)) return null;
  if (!finiteNonNegative(offer.distanceMeters)) return null;
  if (!validSaving(offer.savingAmountCents)) return null;
  if (!finiteNonNegative(offer.frictionScore)) return null;
  if (!finiteNonNegative(offer.preferenceScore)) return null;
  return offer;
}

function compareSaving(a, b) {
  const aKnown = savingKnown(a);
  const bKnown = savingKnown(b);
  if (aKnown && bKnown) return b.savingAmountCents - a.savingAmountCents;
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  return 0;
}

function compare(a, b) {
  return a.distanceMeters - b.distanceMeters
    || compareSaving(a, b)
    || a.frictionScore - b.frictionScore
    || b.preferenceScore - a.preferenceScore
    || a.id.localeCompare(b.id);
}

function rankNearbyOffers(offers = []) {
  if (!Array.isArray(offers)) throw new TypeError('offers must be an array');

  const seen = new Set();
  const eligible = [];
  for (const row of offers) {
    const offer = normalizeCandidate(row);
    if (!offer || seen.has(offer.id)) continue;
    seen.add(offer.id);
    eligible.push(offer);
  }

  eligible.sort(compare);
  if (eligible.length === 0) return Object.freeze([]);

  const minDistance = Math.min(...eligible.map((offer) => offer.distanceMeters));
  const knownSavings = eligible.filter(savingKnown).map((offer) => offer.savingAmountCents);
  const maxSaving = knownSavings.length ? Math.max(...knownSavings) : null;
  const minFriction = Math.min(...eligible.map((offer) => offer.frictionScore));

  return Object.freeze(eligible.map((offer, index) => {
    const reasonCodes = ['trusted'];
    if (offer.distanceMeters === minDistance) reasonCodes.push('nearer');
    if (savingKnown(offer) && offer.savingAmountCents === maxSaving) reasonCodes.push('higher_saving');
    if (!savingKnown(offer)) reasonCodes.push('saving_unknown');
    if (offer.frictionScore === minFriction) reasonCodes.push('lower_friction');
    if (offer.preferenceScore > 0) reasonCodes.push('preference_match');

    return Object.freeze({
      offer,
      rank: index + 1,
      reasonCodes: Object.freeze(reasonCodes)
    });
  }));
}


const OUTCOMES = new Set(['shown', 'not_shown']);
const issuedChecks = new WeakSet();

function id(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim();
  return cleaned && cleaned.length <= 120 && !/[\u0000-\u001f\u007f]/u.test(cleaned) ? cleaned : '';
}

function timestamp(value) {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function createSessionStoreCheck({ outcome, offerId, storeId, checkedAt } = {}) {
  const safeOfferId = id(offerId);
  const safeStoreId = id(storeId);
  const safeTime = timestamp(checkedAt);
  if (!OUTCOMES.has(outcome)) throw new TypeError('session store check outcome must be shown or not_shown');
  if (!safeOfferId || !safeStoreId || !safeTime) throw new TypeError('exact offer, store and check time are required');

  const record = Object.freeze({
    schemaVersion: 1,
    evidenceClass: 'user_confirmed_session',
    scope: 'current_session',
    globalConfirmed: false,
    outcome,
    offerId: safeOfferId,
    storeId: safeStoreId,
    checkedAt: safeTime
  });
  issuedChecks.add(record);
  return record;
}

function isAuthorizedSessionStoreCheck(check, { offerId, storeId, outcome = 'shown' } = {}) {
  return Boolean(
    check &&
    typeof check === 'object' &&
    issuedChecks.has(check) &&
    check.outcome === outcome &&
    check.offerId === offerId &&
    check.storeId === storeId &&
    check.globalConfirmed === false &&
    check.scope === 'current_session'
  );
}




function text(value, max = 180) {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim();
  return cleaned.length <= max ? cleaned : '';
}

function normalizeStore(store) {
  if (!store || typeof store !== 'object') return null;
  const storeId = text(store.id, 120);
  const name = text(store.name, 120);
  const address = text(store.address, 220);
  const distanceKm = Number(store.distanceKm);
  if (!storeId || !name || !Number.isFinite(distanceKm) || distanceKm < 0 || store.confirmation !== 'candidate') return null;
  return Object.freeze({ storeId, name, address, distanceKm, confirmation: 'candidate' });
}

function normalizeMatch(match, trustedOffer) {
  if (!match || typeof match !== 'object' || !trustedOffer || !match.offer || match.offer.id !== trustedOffer.id) return null;
  const rank = Number(match.rank);
  const score = Number(match.score);
  const reasons = Array.isArray(match.reasonCodes)
    ? match.reasonCodes.filter((code) => typeof code === 'string' && /^[a-z0-9_]{1,80}$/u.test(code)).slice(0, 8)
    : [];
  if (!Number.isInteger(rank) || rank < 1 || !Number.isFinite(score)) return null;
  return Object.freeze({ rank, score, reasonCodes: Object.freeze(reasons) });
}

function createDecision({ offer, store, hasPreciseLocation = false, sessionStoreCheck = null, match = null, now = new Date() } = {}) {
  const trustedOffer = authorizeTrustedOffer(offer, { now });
  const candidateStore = normalizeStore(store);
  const destination = hasPreciseLocation && candidateStore ? candidateStore : null;
  const sessionApplicable = Boolean(
    trustedOffer &&
    destination &&
    isAuthorizedSessionStoreCheck(sessionStoreCheck, {
      offerId: trustedOffer.id,
      storeId: destination.storeId,
      outcome: 'shown'
    })
  );

  const blockers = [];
  if (!hasPreciseLocation) blockers.push('precise_location');
  if (hasPreciseLocation && !candidateStore) blockers.push('store_candidate');
  if (destination && !sessionApplicable) blockers.push('store_applicability');
  blockers.push('savings_baseline');
  if (!trustedOffer) blockers.unshift('verified_offer');

  const readyToExecute = Boolean(trustedOffer && destination && sessionApplicable);
  const normalizedMatch = normalizeMatch(match, trustedOffer);
  return Object.freeze({
    kind: 'mmvp_savings_plan',
    destination,
    offer: trustedOffer ? Object.freeze({ id: trustedOffer.id, title: trustedOffer.title, sourceUrl: trustedOffer.sourceUrl }) : null,
    offerPrice: trustedOffer
      ? Object.freeze({ amount: trustedOffer.offerPrice.amount, currency: trustedOffer.offerPrice.currency, kind: trustedOffer.offerPrice.kind, qualifier: trustedOffer.priceQualifier })
      : Object.freeze({ amount: null, currency: null, kind: null, qualifier: null }),
    reliableSavings: Object.freeze({ known: false, amount: null, currency: null }),
    storeApplicability: Object.freeze({
      status: sessionApplicable ? 'user_confirmed_session' : 'unknown',
      globalConfirmed: false,
      checkedAt: sessionApplicable ? sessionStoreCheck.checkedAt : null
    }),
    match: normalizedMatch,
    executionSteps: Object.freeze(trustedOffer ? [...trustedOffer.executionSteps] : []),
    readiness: readyToExecute ? 'ready_to_execute' : 'verification_required',
    blockers: Object.freeze(blockers),
    primaryAction: Object.freeze(readyToExecute
      ? { kind: 'continue_official_order', label: '继续在官方渠道下单', url: trustedOffer.sourceUrl }
      : { kind: 'verify_official_offer', label: '打开官方活动确认', url: trustedOffer ? trustedOffer.sourceUrl : 'https://www.mcdonalds.com.cn/news/sales' })
  });
}


const FAILURE_REASONS = new Set(['store_not_participating', 'offer_not_shown', 'price_mismatch', 'offer_ended', 'other']);

function id(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim();
  return cleaned && cleaned.length <= 120 && !/[\u0000-\u001f\u007f]/u.test(cleaned) ? cleaned : '';
}

function timestamp(value) {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function createExecutionFeedback({ outcome, offerId, storeId, actualPaid = null, currency = null, reason = null, occurredAt } = {}) {
  const safeOfferId = id(offerId);
  const safeStoreId = id(storeId);
  const safeTime = timestamp(occurredAt);
  if (!safeOfferId || !safeStoreId || !safeTime) throw new TypeError('exact offer, store and occurrence time are required');

  if (outcome === 'success') {
    if (typeof actualPaid !== 'number') throw new TypeError('valid actual paid amount is required');
    const amount = actualPaid;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) throw new TypeError('valid actual paid amount is required');
    if (currency !== 'CNY') throw new TypeError('mMVP currently accepts CNY execution amounts only');
    return Object.freeze({
      schemaVersion: 1,
      evidenceClass: 'user_reported_local',
      outcome: 'success',
      offerId: safeOfferId,
      storeId: safeStoreId,
      actualPaid: amount,
      currency: 'CNY',
      reason: null,
      occurredAt: safeTime
    });
  }

  if (outcome === 'failure') {
    if (!FAILURE_REASONS.has(reason)) throw new TypeError('failure reason must use a bounded code');
    return Object.freeze({
      schemaVersion: 1,
      evidenceClass: 'user_reported_local',
      outcome: 'failure',
      offerId: safeOfferId,
      storeId: safeStoreId,
      actualPaid: null,
      currency: null,
      reason,
      occurredAt: safeTime
    });
  }

  throw new TypeError('execution outcome must be success or failure');
}




function cleanNearbyText(value, max) {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim();
  return cleaned.length > 0 && cleaned.length <= max ? cleaned : '';
}

function normalizeNearbyStore(raw) {
  if (!raw || typeof raw !== 'object' || raw.confirmation !== 'candidate') return null;
  const id = cleanNearbyText(raw.id, 120);
  const name = cleanNearbyText(raw.name, 120);
  const address = cleanNearbyText(raw.address, 260);
  const distanceKm = Number(raw.distanceKm);
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!id || !name || !Number.isFinite(distanceKm) || distanceKm < 0) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return Object.freeze({
    id,
    name,
    address,
    distanceMeters: Math.round(distanceKm * 1000),
    lat,
    lon,
    confirmation: 'candidate'
  });
}

function nearbyCentsFromAmount(amount) {
  return typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : null;
}

function buildNearbyOfferReadModel({ offers = [], stores = [], now = new Date() } = {}) {
  if (!Array.isArray(offers) || !Array.isArray(stores)) throw new TypeError('offers and stores must be arrays');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('valid current time is required');

  const trusted = [];
  const seenOffers = new Set();
  for (const raw of offers.slice(0, 8)) {
    const offer = authorizeTrustedOffer(raw, { now });
    if (!offer || seenOffers.has(offer.id)) continue;
    seenOffers.add(offer.id);
    trusted.push(offer);
  }

  const nearbyStores = [];
  const seenStores = new Set();
  for (const raw of stores) {
    const store = normalizeNearbyStore(raw);
    if (!store || seenStores.has(store.id)) continue;
    seenStores.add(store.id);
    nearbyStores.push(store);
  }
  nearbyStores.sort((a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id));

  const projections = [];
  for (const offer of trusted) {
    for (const store of nearbyStores.slice(0, 3)) {
      projections.push(Object.freeze({
        id: `${offer.id}::${store.id}`,
        trustStatus: 'verified',
        distanceMeters: store.distanceMeters,
        savingAmountCents: null,
        frictionScore: Array.isArray(offer.executionSteps) ? offer.executionSteps.length : 99,
        preferenceScore: 0,
        offer,
        store
      }));
    }
  }

  const ranked = rankNearbyOffers(projections);
  return Object.freeze(ranked.map((item) => Object.freeze({
    id: item.offer.id,
    rank: item.rank,
    offerId: item.offer.offer.id,
    title: item.offer.offer.title,
    sourceUrl: item.offer.offer.sourceUrl,
    offerTrustStatus: 'verified',
    usabilityStatus: 'verification_required',
    offerPrice: Object.freeze({
      amount: item.offer.offer.offerPrice.amount,
      amountCents: nearbyCentsFromAmount(item.offer.offer.offerPrice.amount),
      currency: item.offer.offer.offerPrice.currency,
      kind: item.offer.offer.offerPrice.kind,
      qualifier: item.offer.offer.priceQualifier
    }),
    reliableSavings: Object.freeze({ known: false, amountCents: null, currency: null }),
    distanceMeters: item.offer.distanceMeters,
    store: Object.freeze({
      id: item.offer.store.id,
      name: item.offer.store.name,
      address: item.offer.store.address,
      lat: item.offer.store.lat,
      lon: item.offer.store.lon,
      confirmation: 'candidate'
    }),
    storeApplicability: Object.freeze({ status: 'unknown', globalConfirmed: false }),
    validFrom: item.offer.offer.validFrom,
    validThrough: item.offer.offer.validThrough,
    executionSteps: Object.freeze([...item.offer.offer.executionSteps]),
    reasonCodes: item.reasonCodes
  })));
}



function nearbyDiscoveryBlocked(reason, detail = {}) {
  return Object.freeze({ kind: 'blocked', reason, ...detail });
}

function normalizeDiscoveryLocation(raw) {
  if (!raw || typeof raw !== 'object' || raw.hasPreciseLocation !== true) return null;
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  const accuracyMeters = Number(raw.accuracyMeters);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(accuracyMeters) || accuracyMeters < 0) return null;
  return Object.freeze({ lat, lon, accuracyMeters, hasPreciseLocation: true });
}

function createNearbyDiscovery({ readLocation, isSupportedLocation, loadOffers, findStores, now = () => new Date() } = {}) {
  if (typeof readLocation !== 'function' || typeof isSupportedLocation !== 'function' || typeof loadOffers !== 'function' || typeof findStores !== 'function' || typeof now !== 'function') {
    throw new TypeError('nearby discovery dependencies are required');
  }

  async function discover() {
    const rawLocation = await readLocation();
    const location = normalizeDiscoveryLocation(rawLocation);
    if (!location) {
      return nearbyDiscoveryBlocked('low_accuracy', { accuracyMeters: Number(rawLocation && rawLocation.accuracyMeters) });
    }
    if (!isSupportedLocation(location)) return nearbyDiscoveryBlocked('unsupported_market');

    const [offers, stores] = await Promise.all([loadOffers(), findStores(location)]);
    if (!Array.isArray(offers) || offers.length === 0) return nearbyDiscoveryBlocked('no_offers');
    if (!Array.isArray(stores) || stores.length === 0) return nearbyDiscoveryBlocked('no_stores');

    const candidates = buildNearbyOfferReadModel({ offers, stores, now: now() });
    if (!candidates.length) return nearbyDiscoveryBlocked('no_candidates');

    return Object.freeze({
      kind: 'nearby',
      location,
      candidates
    });
  }

  return Object.freeze({ discover });
}




function freezePlanResult(plan) {
  return Object.freeze({ kind: 'plan', plan });
}

function blocked(reason, detail = {}) {
  return Object.freeze({ kind: 'blocked', reason, ...detail });
}

function defaultRank(offers) {
  return Object.freeze(offers.map((offer, index) => Object.freeze({ offer, rank: index + 1, score: 0, reasonCodes: Object.freeze([]) })));
}

function preferredFirst(items, preferredId, idOf) {
  if (typeof preferredId !== 'string' || preferredId.length < 1 || preferredId.length > 180) return items;
  const index = items.findIndex((item) => idOf(item) === preferredId);
  if (index <= 0) return items;
  return [items[index], ...items.slice(0, index), ...items.slice(index + 1)];
}

function createExecutionSession({
  readLocation,
  isSupportedLocation,
  loadOffer = null,
  loadOffers = null,
  rankOffers = null,
  demand = Object.freeze({ market: 'China', brandId: 'mcd-cn', goal: 'general_meal' }),
  findStores,
  now = () => new Date()
} = {}) {
  const offerLoader = typeof loadOffers === 'function'
    ? loadOffers
    : typeof loadOffer === 'function'
      ? async () => Object.freeze([await loadOffer()])
      : null;
  if (typeof readLocation !== 'function' || typeof isSupportedLocation !== 'function' || !offerLoader || typeof findStores !== 'function' || typeof now !== 'function') {
    throw new TypeError('mMVP execution session dependencies are required');
  }
  if (rankOffers !== null && typeof rankOffers !== 'function') throw new TypeError('rankOffers must be a function');

  let rankedOffers = [];
  let stores = [];
  let offerIndex = 0;
  let storeIndex = 0;
  let rejectedCount = 0;
  let storeCheck = null;
  let currentPlan = null;
  let activeDemand = demand;

  function currentRankedOffer() {
    return rankedOffers[offerIndex] || null;
  }

  function buildCurrentPlan() {
    const ranked = currentRankedOffer();
    const store = stores[storeIndex] || null;
    if (!ranked || !store) {
      currentPlan = null;
      return blocked('no_participating_candidates', { checkedCount: rejectedCount });
    }
    currentPlan = createDecision({
      offer: ranked.offer,
      store,
      hasPreciseLocation: true,
      sessionStoreCheck: storeCheck,
      match: ranked,
      now: now()
    });
    return freezePlanResult(currentPlan);
  }

  async function start({ demand: startDemand = activeDemand, preferredOfferId = null, preferredStoreId = null } = {}) {
    rankedOffers = [];
    stores = [];
    offerIndex = 0;
    storeIndex = 0;
    rejectedCount = 0;
    storeCheck = null;
    currentPlan = null;
    activeDemand = startDemand;

    const location = await readLocation();
    if (!location || !location.hasPreciseLocation) {
      return blocked('low_accuracy', { accuracyMeters: Number(location && location.accuracyMeters) });
    }
    if (!isSupportedLocation(location)) return blocked('unsupported_market');

    const [loaded, foundStores] = await Promise.all([offerLoader(), findStores(location)]);
    const offers = Array.isArray(loaded) ? loaded.filter(Boolean).slice(0, 8) : [];
    if (!offers.length) return blocked('no_offers');
    if (!Array.isArray(foundStores) || foundStores.length === 0) return blocked('no_stores');
    stores = foundStores.slice(0, 3);

    const ranked = rankOffers
      ? rankOffers({ offers, demand: activeDemand, now: now() })
      : defaultRank(offers);
    rankedOffers = Array.isArray(ranked) ? ranked.slice(0, 8) : [];
    if (!rankedOffers.length) return blocked('no_matching_offers');

    rankedOffers = preferredFirst(rankedOffers, preferredOfferId, (item) => item && item.offer && item.offer.id);
    stores = preferredFirst(stores, preferredStoreId, (item) => item && item.id);
    return buildCurrentPlan();
  }

  function confirmCurrentStoreShown() {
    if (!currentPlan || !currentPlan.offer || !currentPlan.destination) throw new Error('no current store to confirm');
    storeCheck = createSessionStoreCheck({
      outcome: 'shown',
      offerId: currentPlan.offer.id,
      storeId: currentPlan.destination.storeId,
      checkedAt: now().toISOString()
    });
    return buildCurrentPlan();
  }

  function rejectCurrentStoreAndAdvance() {
    if (!currentPlan || !currentPlan.offer || !currentPlan.destination) throw new Error('no current store to reject');
    createSessionStoreCheck({
      outcome: 'not_shown',
      offerId: currentPlan.offer.id,
      storeId: currentPlan.destination.storeId,
      checkedAt: now().toISOString()
    });
    rejectedCount += 1;
    storeCheck = null;
    storeIndex += 1;
    if (storeIndex >= stores.length) {
      offerIndex += 1;
      storeIndex = 0;
    }
    return buildCurrentPlan();
  }

  function getCurrentPlan() {
    return currentPlan;
  }

  return Object.freeze({ start, confirmCurrentStoreShown, rejectCurrentStoreAndAdvance, getCurrentPlan });
}


function getCurrentLocation({ geolocation = globalThis.navigator && globalThis.navigator.geolocation, timeoutMs = 10000 } = {}) {
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return Promise.reject(new Error('当前浏览器不支持定位'));
  }
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lon = Number(position.coords.longitude);
        const accuracyMeters = Number(position.coords.accuracy);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(accuracyMeters)) {
          reject(new Error('定位结果无效'));
          return;
        }
        resolve(Object.freeze({ lat, lon, accuracyMeters, hasPreciseLocation: accuracyMeters <= 250 }));
      },
      (error) => reject(new Error(error && error.message ? error.message : '无法获取当前位置')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

function isShanghai(location) {
  if (!location) return false;
  const lat = Number(location.lat);
  const lon = Number(location.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 30.6 && lat <= 31.9 && lon >= 120.8 && lon <= 122.1;
}


function haversineKm(a, b) {
  const rad = (degrees) => degrees * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim();
  return text.length <= max ? text : '';
}

function createMcDonaldsStoreProvider({ fetchImpl = globalThis.fetch, timeoutMs = 6000 } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required');
  return async function findNearbyMcDonalds(location) {
    const lat = Number(location && location.lat);
    const lon = Number(location && location.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new TypeError('valid location is required');

    const latDelta = 0.07;
    const lonDelta = 0.09;
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: '麦当劳',
      limit: '8',
      bounded: '1',
      addressdetails: '1',
      viewbox: `${lon - lonDelta},${lat + latDelta},${lon + lonDelta},${lat - latDelta}`
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'Accept-Language': 'zh-CN,zh;q=0.9' }
      });
      if (!response.ok) throw new Error(`附近门店查询 HTTP ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw)) throw new Error('附近门店响应格式无效');
      return Object.freeze(raw.map((row) => {
        const storeLat = Number(row.lat);
        const storeLon = Number(row.lon);
        if (!Number.isFinite(storeLat) || !Number.isFinite(storeLon)) return null;
        const display = clean(row.display_name, 260);
        const rawName = clean(row.name, 120);
        const name = rawName || (display.split(',')[0] || '').trim();
        if (!name || !/(麦当劳|mcdonald)/iu.test(`${name} ${display}`)) return null;
        return Object.freeze({
          id: `osm:${clean(row.osm_type, 20) || 'object'}:${String(row.osm_id || '')}`,
          name,
          address: display,
          distanceKm: Number(haversineKm({ lat, lon }, { lat: storeLat, lon: storeLon }).toFixed(3)),
          lat: storeLat,
          lon: storeLon,
          confirmation: 'candidate'
        });
      }).filter(Boolean).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3));
    } finally {
      clearTimeout(timer);
    }
  };
}



const DEFAULT_URL = '../mvp/data/verified-offer-registry-v1.json';
const FRESH_MS = 24 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 5 * 60 * 1000;

function activeOrder(now) {
  return listTrustedOffers({ brandId: 'mcd-cn', now }).map((offer) => offer.id);
}

function parseCapture(payload, now) {
  const captured = Date.parse(payload && payload.capturedAt);
  if (!Number.isFinite(captured)) throw new Error('核验数据缺少可信的新鲜度时间');
  const nowMs = now.getTime();
  if (captured > nowMs + FUTURE_SKEW_MS) throw new Error('核验数据时间无效');
  if (nowMs - captured > FRESH_MS) throw new Error('核验数据已过期，不够新鲜');
  return captured;
}

function canonicalize(rows, now) {
  const byId = new Map();
  for (const row of rows) {
    const withContext = row && typeof row === 'object' ? { ...row, market: row.market || 'China' } : row;
    const authorized = authorizeTrustedOffer(withContext, { now });
    if (authorized && !byId.has(authorized.id)) byId.set(authorized.id, authorized);
  }
  const ordered = activeOrder(now).map((id) => byId.get(id)).filter(Boolean);
  return Object.freeze(ordered);
}

async function loadVerifiedMcDonaldsOffers({ fetchFn = globalThis.fetch, now = () => new Date(), url = DEFAULT_URL } = {}) {
  if (typeof fetchFn !== 'function') throw new TypeError('fetch is required');
  if (typeof now !== 'function') throw new TypeError('clock is required');
  const current = now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) throw new TypeError('valid current time is required');
  const response = await fetchFn(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response || !response.ok) throw new Error(`核验数据读取失败${response && response.status ? `（HTTP ${response.status}）` : ''}`);
  const payload = await response.json();
  if (!payload || payload.schemaVersion !== 1 || payload.kind !== 'stackback_verified_offer_registry' || payload.market !== 'China' || !Array.isArray(payload.rows) || payload.rows.length > 20) {
    throw new Error('核验数据上下文不可信');
  }
  parseCapture(payload, current);
  const authorized = canonicalize(payload.rows, current);
  if (authorized.length === 0) throw new Error('核验数据与代码授权的可信事实不一致');
  return authorized;
}

// Compatibility for the first mMVP golden-path tests. Production runtime uses the
// fresh multi-offer registry above; provider-authored authority is ignored here too.
async function loadVerifiedMcDonaldsOffer({ fetchFn = globalThis.fetch, now = () => new Date(), url = DEFAULT_URL } = {}) {
  if (typeof fetchFn !== 'function') throw new TypeError('fetch is required');
  if (typeof now !== 'function') throw new TypeError('clock is required');
  const current = now();
  const response = await fetchFn(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response || !response.ok) throw new Error(`核验数据读取失败${response && response.status ? `（HTTP ${response.status}）` : ''}`);
  const payload = await response.json();
  if (payload && payload.kind === 'stackback_verified_offer_registry') {
    if (payload.schemaVersion !== 1 || payload.market !== 'China' || !Array.isArray(payload.rows) || payload.rows.length > 20) throw new Error('核验数据上下文不可信');
    parseCapture(payload, current);
    const offers = canonicalize(payload.rows, current);
    if (!offers.length) throw new Error('核验数据与代码授权的可信事实不一致');
    return offers[0];
  }
  if (!payload || payload.schemaVersion !== 1 || payload.brandId !== 'mcd-cn' || payload.market !== 'China' || !Array.isArray(payload.rows)) {
    throw new Error('核验数据上下文不可信');
  }
  const expected = listTrustedOffers({ brandId: 'mcd-cn', now: current }).find((offer) => offer.id === 'mcd-cn-mix-match-20260824');
  if (!expected) throw new Error('核验活动不在有效期内');
  const matches = payload.rows.filter((row) => row && row.id === expected.id);
  if (matches.length !== 1) throw new Error('核验数据与代码授权的可信事实不一致');
  const authorized = authorizeTrustedOffer({ ...matches[0], brandId: 'mcd-cn', market: 'China' }, { now: current });
  if (!authorized) throw new Error('核验数据与代码授权的可信事实不一致');
  return authorized;
}



const KEY = 'stackback.mmvp.execution.v1';
const MAX_RECORDS = 50;

function createFeedbackStore({ storage = globalThis.localStorage } = {}) {
  function read() {
    if (!storage || typeof storage.getItem !== 'function') return [];
    try {
      const raw = JSON.parse(storage.getItem(KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.map((row) => {
        try { return createExecutionFeedback(row); } catch { return null; }
      }).filter(Boolean).slice(-MAX_RECORDS);
    } catch {
      return [];
    }
  }

  function append(input) {
    const record = createExecutionFeedback(input);
    if (storage && typeof storage.setItem === 'function') {
      const rows = [...read(), record].slice(-MAX_RECORDS);
      storage.setItem(KEY, JSON.stringify(rows));
    }
    return record;
  }

  return Object.freeze({ read, append });
}


function money(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '待确认';
  if (currency === 'CNY') return `¥${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/u, '')}`;
  return `${value} ${currency || ''}`.trim();
}

function matchNote(plan) {
  const reasons = plan && plan.match && Array.isArray(plan.match.reasonCodes) ? plan.match.reasonCodes : [];
  if (reasons.includes('specific_intent_fit')) return '更贴合你想吃海鲜堡套餐的需求。';
  if (reasons.includes('direct_meal_fit')) return '在当前已核验权益中，这项更适合“随便吃点”的需求。';
  return null;
}

function createPlanViewModel(plan) {
  if (!plan || plan.kind !== 'mmvp_savings_plan') throw new TypeError('mMVP savings plan is required');
  const price = plan.offerPrice || {};
  const destination = plan.destination;
  const offer = plan.offer || {};
  const allowedAction = plan.primaryAction && ['verify_official_offer', 'continue_official_order'].includes(plan.primaryAction.kind)
    ? plan.primaryAction
    : { kind: 'verify_official_offer', label: '打开官方活动确认', url: offer.sourceUrl || null };
  const primaryAction = Object.freeze({ ...allowedAction });

  const sessionConfirmed = plan.storeApplicability && plan.storeApplicability.status === 'user_confirmed_session';
  const reliability = sessionConfirmed
    ? '活动价已核验；本店仅为本次由你在官方点购页确认；可靠省额仍待确认'
    : '活动价已核验；门店适用与可靠省额仍待确认';

  const sections = Object.freeze([
    Object.freeze({ label: '去哪', value: destination ? `${destination.name}${destination.distanceKm != null ? ` · ${destination.distanceKm.toFixed(2)} km` : ''}` : '先获取精确位置' }),
    Object.freeze({ label: '怎么买', value: offer.title || '活动待核验' }),
    Object.freeze({ label: '当前价格', value: price.amount == null ? '待核验' : `${money(price.amount, price.currency)}${price.kind === 'starting_bundle_price' ? ' 起' : ''}${price.qualifier ? ` · ${price.qualifier}` : ''}` }),
    Object.freeze({ label: '怎么操作', value: Array.isArray(plan.executionSteps) && plan.executionSteps.length ? plan.executionSteps.join(' → ') : '先打开官方活动确认' }),
    Object.freeze({ label: '是否可靠', value: reliability })
  ]);

  const needsStoreApplicability = Array.isArray(plan.blockers) && plan.blockers.includes('store_applicability');
  const title = destination
    ? needsStoreApplicability
      ? `先确认 ${destination.name} 能否使用`
      : `去 ${destination.name}，按活动价下单`
    : '先获取当前位置';

  return Object.freeze({
    title,
    matchNote: matchNote(plan),
    reliableSavingsLabel: plan.reliableSavings && plan.reliableSavings.known ? money(plan.reliableSavings.amount, plan.reliableSavings.currency) : '暂不能可靠计算',
    primaryAction,
    secondaryActions: Object.freeze([]),
    storeCheck: Object.freeze({
      visible: Boolean(destination && needsStoreApplicability),
      question: destination ? `在官方点购页选择 ${destination.name} 后，这个活动显示了吗？` : null,
      shownLabel: '本店显示活动',
      notShownLabel: '没有显示，换下一个方案'
    }),
    trustNote: sessionConfirmed
      ? '活动价由 StackBack 核验；本店参与仅是你在本次官方点购页的即时确认，不会升级为全局门店事实。'
      : '活动价由 StackBack 核验；附近门店仍需在官方点购页确认参加。',
    sections,
    blockers: Object.freeze(Array.isArray(plan.blockers) ? [...plan.blockers] : [])
  });
}


function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/gu, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function section(row) {
  return `<div class="fact"><div class="fact-label">${esc(row.label)}</div><div class="fact-value">${esc(row.value)}</div></div>`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value) || value < 0) return '距离待确认';
  if (value < 1000) return `${Math.round(value)}米`;
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}公里`;
}

function formatPrice(offerPrice) {
  if (!offerPrice || !Number.isFinite(Number(offerPrice.amount))) return '价格待确认';
  if (offerPrice.currency === 'CNY') return `¥${Number(offerPrice.amount)}`;
  return `${Number(offerPrice.amount)} ${esc(offerPrice.currency || '')}`.trim();
}

function selectedCandidate(result, selectedCandidateId) {
  const candidates = result && Array.isArray(result.candidates) ? result.candidates : [];
  return candidates.find((item) => item.id === selectedCandidateId) || candidates[0] || null;
}

function pinPosition(location, store, stores) {
  const lat0 = Number(location && location.lat);
  const lon0 = Number(location && location.lon);
  const lat = Number(store && store.lat);
  const lon = Number(store && store.lon);
  if (![lat0, lon0, lat, lon].every(Number.isFinite)) return Object.freeze({ left: 50, top: 50 });

  const cosLat = Math.max(0.2, Math.cos(lat0 * Math.PI / 180));
  const offsets = stores.map((row) => ({
    x: (Number(row.lon) - lon0) * cosLat,
    y: Number(row.lat) - lat0
  })).filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y));
  const maxSpan = Math.max(0.0002, ...offsets.flatMap((row) => [Math.abs(row.x), Math.abs(row.y)]));
  const x = (lon - lon0) * cosLat;
  const y = lat - lat0;
  return Object.freeze({
    left: clamp(50 + (x / maxSpan) * 38, 8, 92),
    top: clamp(50 - (y / maxSpan) * 38, 8, 92)
  });
}

function renderIdle(root) {
  root.innerHTML = `
    <section class="hero">
      <div class="eyebrow">PerksAid · V1</div>
      <h1>附近现在有什么值得用？</h1>
      <p>先用当前位置找附近已核验优惠，再决定哪一个值得去核验门店。</p>
      <label class="intent-field"><span>我现在想</span><select data-role="demand-goal"><option value="general_meal">随便吃点</option><option value="seafood_combo">吃海鲜堡套餐</option></select></label>
      <button class="primary" data-action="discover-nearby">查看附近优惠</button>
      <div class="micro">位置只用于本次附近判断；当前数据覆盖仍从上海麦当劳验证链路逐步扩展。</div>
    </section>`;
}

function renderLoading(root, message = '正在匹配附近值得先看的优惠…') {
  root.innerHTML = `<section class="hero compact"><div class="spinner" aria-hidden="true"></div><h1>${esc(message)}</h1><p>先筛已核验权益，再结合附近门店。不会把活动价或内部排序分数冒充成省钱金额。</p></section>`;
}

function renderError(root, title, detail) {
  root.innerHTML = `<section class="hero"><div class="eyebrow">暂时不能给出可靠方案</div><h1>${esc(title)}</h1><p>${esc(detail)}</p><button class="primary" data-action="discover-nearby">重新获取附近优惠</button></section>`;
}

function renderNearbyDiscovery(root, result, selectedCandidateId = null) {
  const candidates = result && Array.isArray(result.candidates) ? result.candidates.slice(0, 8) : [];
  const selected = selectedCandidate(result, selectedCandidateId);
  if (!selected || candidates.length === 0) {
    renderError(root, '附近暂时没有足够可靠的候选', 'PerksAid 不会用未经验证的优惠填空。');
    return;
  }

  const uniqueStores = [];
  const seenStores = new Set();
  for (const item of candidates) {
    if (!item.store || seenStores.has(item.store.id)) continue;
    seenStores.add(item.store.id);
    uniqueStores.push(item.store);
  }
  const selectedStoreId = selected.store && selected.store.id;
  const pinHtml = uniqueStores.map((store) => {
    const candidate = candidates.find((item) => item.store && item.store.id === store.id);
    const pos = pinPosition(result.location, store, uniqueStores);
    const active = store.id === selectedStoreId ? ' active' : '';
    return `<button type="button" class="map-pin${active}" style="left:${pos.left.toFixed(1)}%;top:${pos.top.toFixed(1)}%" data-action="select-candidate" data-candidate-id="${esc(candidate.id)}" aria-label="选择${esc(store.name)}"><span>${esc(formatDistance(candidate.distanceMeters))}</span></button>`;
  }).join('');

  const cardHtml = candidates.map((item) => {
    const active = item.id === selected.id;
    return `<article class="deal-card${active ? ' selected' : ''}" data-candidate-id="${esc(item.id)}">
      <div class="deal-card-top">
        <div>
          <div class="deal-trust">优惠已核验 · 门店需确认</div>
          <h2>${esc(item.title)}</h2>
        </div>
        <div class="deal-distance">${esc(formatDistance(item.distanceMeters))}</div>
      </div>
      <div class="deal-store">${esc(item.store.name)}${item.store.address ? ` · ${esc(item.store.address)}` : ''}</div>
      <div class="deal-metrics">
        <div><span>当前活动价</span><strong>${formatPrice(item.offerPrice)}</strong></div>
        <div><span>可靠可省</span><strong>待确认</strong></div>
      </div>
      <div class="deal-validity">有效期至 ${esc(item.validThrough)} · ${esc(item.offerPrice.qualifier || '具体以官方页面为准')}</div>
      ${active
        ? `<button type="button" class="primary candidate-action" data-action="verify-candidate" data-offer-id="${esc(item.offerId)}" data-store-id="${esc(item.store.id)}">核验这个方案</button>`
        : `<button type="button" class="card-select" data-action="select-candidate" data-candidate-id="${esc(item.id)}">设为当前方案</button>`}
    </article>`;
  }).join('');

  root.innerHTML = `
    <section class="nearby-head">
      <div><div class="eyebrow">当前位置附近</div><h1>先看这几个</h1></div>
      <button class="location-refresh" type="button" data-action="discover-nearby">重新定位</button>
    </section>
    <section class="nearby-map" data-role="nearby-map" aria-label="附近优惠地图">
      <div class="map-grid" aria-hidden="true"></div>
      <div class="you-dot" style="left:50%;top:50%"><span>你</span></div>
      ${pinHtml}
      <div class="map-caption">附近位置关系 · 位置只用于本次计算</div>
    </section>
    <section class="deal-list" data-role="deal-list">${cardHtml}</section>
    <div class="attribution">门店位置数据 © OpenStreetMap contributors</div>`;
}

function renderPlan(root, plan, vm) {
  const canFeedback = Boolean(plan.destination && plan.offer && plan.readiness === 'ready_to_execute');
  const storeCheck = vm.storeCheck && vm.storeCheck.visible ? `
      <div class="verification-card">
        <div class="verification-title">${esc(vm.storeCheck.question)}</div>
        <div class="verification-actions">
          <button class="secondary" type="button" data-action="store-shown">${esc(vm.storeCheck.shownLabel)}</button>
          <button class="quiet-button" type="button" data-action="store-not-shown">${esc(vm.storeCheck.notShownLabel)}</button>
        </div>
      </div>` : '';

  root.innerHTML = `
    <section class="answer">
      <div class="eyebrow">当前建议</div>
      <h1>${esc(vm.title)}</h1>
      ${vm.matchNote ? `<div class="match-note">${esc(vm.matchNote)}</div>` : ''}
      <div class="answer-grid">${vm.sections.map(section).join('')}</div>
      <div class="savings-line"><span>可靠可省</span><strong>${esc(vm.reliableSavingsLabel)}</strong></div>
      <a class="primary link" href="${esc(vm.primaryAction.url)}" target="_blank" rel="noopener noreferrer">${esc(vm.primaryAction.label)}</a>
      ${storeCheck}
      <div class="trust-note">${esc(vm.trustNote)} 活动价不等于“可靠省了多少”。</div>
    </section>
    ${canFeedback ? `
    <section class="feedback-card">
      <h2>用完告诉 PerksAid 结果</h2>
      <p>只记录这次活动 × 这家店，帮助后续判断现实执行质量，不自动升级成全局事实。</p>
      <form data-role="feedback-form">
        <label>结果<select name="outcome"><option value="success">成功使用</option><option value="failure">未成功</option></select></label>
        <label>实际支付<input name="actualPaid" type="number" min="0.01" max="100000" step="0.01" inputmode="decimal" placeholder="成功时填写，例如 13.9"></label>
        <label>失败原因<select name="reason"><option value="store_not_participating">门店不参加</option><option value="offer_not_shown">点购页未显示活动</option><option value="price_mismatch">价格不符</option><option value="offer_ended">活动显示结束</option><option value="other">其他</option></select></label>
        <button class="secondary" type="submit">记录本次结果</button>
      </form>
      <div data-role="feedback-result"></div>
    </section>` : ''}
    <button class="text-button" data-action="discover-nearby">返回附近优惠</button>
    <div class="attribution">门店数据 © OpenStreetMap contributors</div>`;
}

function renderFeedbackResult(root, record) {
  if (!root || !record) return;
  root.innerHTML = record.outcome === 'success'
    ? `<div class="receipt success">已记录：本次成功使用，实付 ¥${esc(record.actualPaid)}。没有可靠基准价时，这仍不是“已证实省了多少”。</div>`
    : '<div class="receipt">已记录：本次未成功。只作为这台设备上的精确执行记录。</div>';
}











const root = document.querySelector('#app');
const feedbackStore = createFeedbackStore();
const storeProvider = createMcDonaldsStoreProvider();
const discovery = createNearbyDiscovery({
  readLocation: getCurrentLocation,
  isSupportedLocation: isShanghai,
  loadOffers: loadVerifiedMcDonaldsOffers,
  findStores: storeProvider
});
const session = createExecutionSession({
  readLocation: getCurrentLocation,
  isSupportedLocation: isShanghai,
  loadOffers: loadVerifiedMcDonaldsOffers,
  rankOffers: rankOffersForDemand,
  findStores: storeProvider
});
let lastGoal = 'general_meal';
let lastDiscovery = null;
let selectedCandidateId = null;

function boundedGoal(value) {
  return value === 'seafood_combo' ? 'seafood_combo' : 'general_meal';
}

function presentBlocked(result) {
  if (!result || result.kind !== 'blocked') {
    renderError(root, '这次没有得到可靠答案', '请稍后重新定位。');
    return;
  }
  if (result.reason === 'low_accuracy') {
    const accuracy = Number.isFinite(result.accuracyMeters) ? `当前定位约 ±${Math.round(result.accuracyMeters)} 米。` : '';
    renderError(root, '定位精度还不够', `${accuracy}需要更精确的位置后，才能可靠判断附近门店。`);
  } else if (result.reason === 'unsupported_market') {
    renderError(root, '当前可体验数据先覆盖上海', 'PerksAid V1 的产品范围包括上海和深圳，但深圳数据链路尚未完成时不会用泛化结果冒充本地答案。');
  } else if (result.reason === 'no_stores') {
    renderError(root, '附近没有找到足够可靠的门店候选', '这次没有足够可靠的附近门店数据，PerksAid 不会凭空推荐。');
  } else if (result.reason === 'no_offers' || result.reason === 'no_matching_offers' || result.reason === 'no_candidates') {
    renderError(root, '现在没有足够可靠的优惠候选', 'PerksAid 不会用未经核验或过期的活动填空。');
  } else if (result.reason === 'no_participating_candidates') {
    renderError(root, '附近候选方案都没有确认到这个活动', '已经按有限的活动 × 门店组合核验。PerksAid 不会无限尝试或假装可用。');
  } else {
    renderError(root, '这次没有得到可靠答案', '请稍后重新定位。');
  }
}

function presentPlan(result) {
  if (result && result.kind === 'plan') {
    renderPlan(root, result.plan, createPlanViewModel(result.plan));
    return;
  }
  presentBlocked(result);
}

async function discoverNearby(goal = lastGoal) {
  lastGoal = boundedGoal(goal);
  renderLoading(root);
  try {
    const result = await discovery.discover();
    if (!result || result.kind !== 'nearby') {
      lastDiscovery = null;
      selectedCandidateId = null;
      presentBlocked(result);
      return;
    }
    lastDiscovery = result;
    selectedCandidateId = result.candidates[0] ? result.candidates[0].id : null;
    renderNearbyDiscovery(root, result, selectedCandidateId);
  } catch (error) {
    lastDiscovery = null;
    selectedCandidateId = null;
    renderError(root, '这次没有得到可靠答案', error && error.message ? error.message : '请稍后重新定位。');
  }
}

async function verifyCandidate(preferredOfferId, preferredStoreId) {
  renderLoading(root, '正在核验你选的方案…');
  try {
    presentPlan(await session.start({
      demand: { market: 'China', brandId: 'mcd-cn', goal: lastGoal },
      preferredOfferId,
      preferredStoreId
    }));
  } catch (error) {
    renderError(root, '这次没有得到可靠答案', error && error.message ? error.message : '请稍后重新定位。');
  }
}

root.addEventListener('click', (event) => {
  const discover = event.target.closest('[data-action="discover-nearby"]');
  if (discover) {
    event.preventDefault();
    const selector = root.querySelector('[data-role="demand-goal"]');
    discoverNearby(selector ? selector.value : lastGoal);
    return;
  }

  const selectCandidate = event.target.closest('[data-action="select-candidate"]');
  if (selectCandidate && lastDiscovery) {
    event.preventDefault();
    const candidateId = String(selectCandidate.dataset.candidateId || '');
    if (lastDiscovery.candidates.some((item) => item.id === candidateId)) {
      selectedCandidateId = candidateId;
      renderNearbyDiscovery(root, lastDiscovery, selectedCandidateId);
    }
    return;
  }

  const verify = event.target.closest('[data-action="verify-candidate"]');
  if (verify) {
    event.preventDefault();
    verifyCandidate(String(verify.dataset.offerId || ''), String(verify.dataset.storeId || ''));
    return;
  }

  const shown = event.target.closest('[data-action="store-shown"]');
  if (shown) {
    event.preventDefault();
    presentPlan(session.confirmCurrentStoreShown());
    return;
  }

  const notShown = event.target.closest('[data-action="store-not-shown"]');
  if (notShown) {
    event.preventDefault();
    presentPlan(session.rejectCurrentStoreAndAdvance());
  }
});

root.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-role="feedback-form"]');
  const currentPlan = session.getCurrentPlan();
  if (!form || !currentPlan || currentPlan.readiness !== 'ready_to_execute' || !currentPlan.offer || !currentPlan.destination) return;
  event.preventDefault();
  const data = new FormData(form);
  const outcome = String(data.get('outcome') || '');
  const paidText = String(data.get('actualPaid') || '').trim();
  try {
    const record = feedbackStore.append({
      outcome,
      offerId: currentPlan.offer.id,
      storeId: currentPlan.destination.storeId,
      actualPaid: outcome === 'success' && paidText ? Number(paidText) : null,
      currency: outcome === 'success' ? 'CNY' : null,
      reason: outcome === 'failure' ? String(data.get('reason') || '') : null,
      occurredAt: new Date().toISOString()
    });
    renderFeedbackResult(root.querySelector('[data-role="feedback-result"]'), record);
  } catch (error) {
    const target = root.querySelector('[data-role="feedback-result"]');
    if (target) target.textContent = error && error.message ? error.message : '这条反馈没有保存。';
  }
});

renderIdle(root);

