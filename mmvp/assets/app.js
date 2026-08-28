'use strict';
const TRUSTED_OFFER = Object.freeze({
  id: 'mcd-cn-mix-match-20260824',
  brandId: 'mcd-cn',
  market: 'China',
  title: '随心配指定组合 13.9元起',
  offerPrice: Object.freeze({ amount: 13.9, currency: 'CNY', kind: 'starting_bundle_price' }),
  priceQualifier: '部分蓝区指定产品需另加1元，实际14.9元',
  validFrom: '2026-08-24',
  validThrough: '2026-09-15',
  applicability: 'partial_restaurants',
  stacking: 'not_allowed',
  sourceUrl: 'https://www.mcdonalds.com.cn/news/20260824-BABBM/',
  executionSteps: Object.freeze([
    '先在麦当劳App或微信/支付宝小程序选择附近门店',
    '早餐时段后进入到店取餐；也可使用车道取餐、自助点餐机或餐厅柜台',
    '随心配选择1款粉区指定产品 + 1款蓝区指定产品',
    '确认点购页显示13.9元；部分蓝区指定产品为14.9元',
    '确认该门店参与后再下单，不与其他优惠叠加'
  ])
});

function getActiveTrustedOffer({ now = new Date() } = {}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('valid current time is required');
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  return date >= TRUSTED_OFFER.validFrom && date <= TRUSTED_OFFER.validThrough ? TRUSTED_OFFER : null;
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

function sameTrustedOffer(offer) {
  if (!offer || typeof offer !== 'object') return false;
  return offer.id === TRUSTED_OFFER.id &&
    offer.brandId === TRUSTED_OFFER.brandId &&
    offer.title === TRUSTED_OFFER.title &&
    offer.sourceUrl === TRUSTED_OFFER.sourceUrl &&
    offer.priceQualifier === TRUSTED_OFFER.priceQualifier &&
    offer.validFrom === TRUSTED_OFFER.validFrom &&
    offer.validThrough === TRUSTED_OFFER.validThrough &&
    offer.applicability === TRUSTED_OFFER.applicability &&
    offer.stacking === TRUSTED_OFFER.stacking &&
    offer.offerPrice &&
    offer.offerPrice.amount === TRUSTED_OFFER.offerPrice.amount &&
    offer.offerPrice.currency === TRUSTED_OFFER.offerPrice.currency &&
    offer.offerPrice.kind === TRUSTED_OFFER.offerPrice.kind;
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

function createDecision({ offer, store, hasPreciseLocation = false, sessionStoreCheck = null } = {}) {
  const trustedOffer = sameTrustedOffer(offer) ? TRUSTED_OFFER : null;
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
    executionSteps: Object.freeze(trustedOffer ? [...trustedOffer.executionSteps] : []),
    readiness: readyToExecute ? 'ready_to_execute' : 'verification_required',
    blockers: Object.freeze(blockers),
    primaryAction: Object.freeze(readyToExecute
      ? {
          kind: 'continue_official_order',
          label: '继续在官方渠道下单',
          url: trustedOffer.sourceUrl
        }
      : {
          kind: 'verify_official_offer',
          label: '打开官方活动确认',
          url: trustedOffer ? trustedOffer.sourceUrl : TRUSTED_OFFER.sourceUrl
        })
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




function freezePlanResult(plan) {
  return Object.freeze({ kind: 'plan', plan });
}

function blocked(reason, detail = {}) {
  return Object.freeze({ kind: 'blocked', reason, ...detail });
}

function createExecutionSession({ readLocation, isSupportedLocation, loadOffer, findStores, now = () => new Date() } = {}) {
  if (typeof readLocation !== 'function' || typeof isSupportedLocation !== 'function' || typeof loadOffer !== 'function' || typeof findStores !== 'function' || typeof now !== 'function') {
    throw new TypeError('mMVP execution session dependencies are required');
  }

  let offer = null;
  let stores = [];
  let storeIndex = 0;
  let storeCheck = null;
  let currentPlan = null;

  function buildCurrentPlan() {
    const store = stores[storeIndex] || null;
    if (!offer || !store) {
      currentPlan = null;
      return blocked('no_participating_candidates', { checkedCount: storeIndex });
    }
    currentPlan = createDecision({ offer, store, hasPreciseLocation: true, sessionStoreCheck: storeCheck });
    return freezePlanResult(currentPlan);
  }

  async function start() {
    offer = null;
    stores = [];
    storeIndex = 0;
    storeCheck = null;
    currentPlan = null;

    const location = await readLocation();
    if (!location || !location.hasPreciseLocation) {
      return blocked('low_accuracy', { accuracyMeters: Number(location && location.accuracyMeters) });
    }
    if (!isSupportedLocation(location)) return blocked('unsupported_market');

    const [loadedOffer, foundStores] = await Promise.all([loadOffer(), findStores(location)]);
    if (!Array.isArray(foundStores) || foundStores.length === 0) return blocked('no_stores');
    offer = loadedOffer;
    stores = [...foundStores];
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
    storeIndex += 1;
    storeCheck = null;
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



const DEFAULT_URL = '../mvp/data/verified-mcd-cn.json';

function exactCore(row) {
  return Boolean(row &&
    row.id === TRUSTED_OFFER.id &&
    row.title === TRUSTED_OFFER.title &&
    row.sourceUrl === TRUSTED_OFFER.sourceUrl &&
    row.priceQualifier === TRUSTED_OFFER.priceQualifier &&
    row.validFrom === TRUSTED_OFFER.validFrom &&
    row.validThrough === TRUSTED_OFFER.validThrough &&
    row.applicability === TRUSTED_OFFER.applicability &&
    row.stacking === TRUSTED_OFFER.stacking &&
    row.offerPrice && row.offerPrice.amount === TRUSTED_OFFER.offerPrice.amount &&
    row.offerPrice.currency === TRUSTED_OFFER.offerPrice.currency &&
    row.offerPrice.kind === TRUSTED_OFFER.offerPrice.kind &&
    Array.isArray(row.executionSteps) &&
    row.executionSteps.length === TRUSTED_OFFER.executionSteps.length &&
    row.executionSteps.every((step, index) => step === TRUSTED_OFFER.executionSteps[index]));
}

async function loadVerifiedMcDonaldsOffer({ fetchFn = globalThis.fetch, now = () => new Date(), url = DEFAULT_URL } = {}) {
  if (typeof fetchFn !== 'function') throw new TypeError('fetch is required');
  if (typeof now !== 'function') throw new TypeError('clock is required');
  const response = await fetchFn(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response || !response.ok) throw new Error(`核验数据读取失败${response && response.status ? `（HTTP ${response.status}）` : ''}`);
  const payload = await response.json();
  if (!payload || payload.schemaVersion !== 1 || payload.brandId !== 'mcd-cn' || payload.market !== 'China' || !Array.isArray(payload.rows)) {
    throw new Error('核验数据上下文不可信');
  }
  const matches = payload.rows.filter((row) => row && row.id === TRUSTED_OFFER.id);
  if (matches.length !== 1 || !exactCore(matches[0])) throw new Error('核验数据与代码授权的可信事实不一致');
  const active = getActiveTrustedOffer({ now: now() });
  if (!active) throw new Error('核验活动不在有效期内');
  return active;
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
    reliableSavingsLabel: plan.reliableSavings && plan.reliableSavings.known ? money(plan.reliableSavings.amount, plan.reliableSavings.currency) : '暂不能可靠计算',
    primaryAction,
    secondaryActions: Object.freeze([]),
    storeCheck: Object.freeze({
      visible: Boolean(destination && needsStoreApplicability),
      question: destination ? `在官方点购页选择 ${destination.name} 后，这个活动显示了吗？` : null,
      shownLabel: '本店显示活动',
      notShownLabel: '没有显示，换下一家'
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

function renderIdle(root) {
  root.innerHTML = `
    <section class="hero">
      <div class="eyebrow">上海 · 麦当劳 · mMVP</div>
      <h1>现在去哪里，怎么买？</h1>
      <p>只做一件事：用你当前的位置，给出一个能继续核验和执行的麦当劳省钱方案。</p>
      <button class="primary" data-action="locate">使用当前位置</button>
      <div class="micro">定位只用于本次附近门店判断；首版仅覆盖上海。</div>
    </section>`;
}

function renderLoading(root, message = '正在找附近麦当劳…') {
  root.innerHTML = `<section class="hero compact"><div class="spinner" aria-hidden="true"></div><h1>${esc(message)}</h1><p>不会因为“附近”就把门店说成活动适用门店。</p></section>`;
}

function renderError(root, title, detail) {
  root.innerHTML = `<section class="hero"><div class="eyebrow">暂时不能给出可靠方案</div><h1>${esc(title)}</h1><p>${esc(detail)}</p><button class="primary" data-action="locate">重新定位</button></section>`;
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
      <div class="answer-grid">${vm.sections.map(section).join('')}</div>
      <div class="savings-line"><span>可靠可省</span><strong>${esc(vm.reliableSavingsLabel)}</strong></div>
      <a class="primary link" href="${esc(vm.primaryAction.url)}" target="_blank" rel="noopener noreferrer">${esc(vm.primaryAction.label)}</a>
      ${storeCheck}
      <div class="trust-note">${esc(vm.trustNote)} 13.9 元活动价不等于“可靠省了多少”。</div>
    </section>
    ${canFeedback ? `
    <section class="feedback-card">
      <h2>用完告诉 StackBack 结果</h2>
      <p>只记录这次活动 × 这家店，不会自动升级成全上海事实。</p>
      <form data-role="feedback-form">
        <label>结果<select name="outcome"><option value="success">成功使用</option><option value="failure">未成功</option></select></label>
        <label>实际支付<input name="actualPaid" type="number" min="0.01" max="100000" step="0.01" inputmode="decimal" placeholder="成功时填写，例如 13.9"></label>
        <label>失败原因<select name="reason"><option value="store_not_participating">门店不参加</option><option value="offer_not_shown">点购页未显示活动</option><option value="price_mismatch">价格不符</option><option value="offer_ended">活动显示结束</option><option value="other">其他</option></select></label>
        <button class="secondary" type="submit">记录本次结果</button>
      </form>
      <div data-role="feedback-result"></div>
    </section>` : ''}
    <button class="text-button" data-action="locate">重新获取位置</button>
    <div class="attribution">门店数据 © OpenStreetMap contributors</div>`;
}

function renderFeedbackResult(root, record) {
  if (!root || !record) return;
  root.innerHTML = record.outcome === 'success'
    ? `<div class="receipt success">已记录：本次成功使用，实付 ¥${esc(record.actualPaid)}。这不是全局可靠省额。</div>`
    : '<div class="receipt">已记录：本次未成功。只作为这台设备上的精确执行记录。</div>';
}









const root = document.querySelector('#app');
const feedbackStore = createFeedbackStore();
const session = createExecutionSession({
  readLocation: getCurrentLocation,
  isSupportedLocation: isShanghai,
  loadOffer: loadVerifiedMcDonaldsOffer,
  findStores: createMcDonaldsStoreProvider()
});

function present(result) {
  if (result && result.kind === 'plan') {
    renderPlan(root, result.plan, createPlanViewModel(result.plan));
    return;
  }
  if (!result || result.kind !== 'blocked') {
    renderError(root, '这次没有得到可靠答案', '请稍后重新定位。');
    return;
  }
  if (result.reason === 'low_accuracy') {
    const accuracy = Number.isFinite(result.accuracyMeters) ? `当前定位约 ±${Math.round(result.accuracyMeters)} 米。` : '';
    renderError(root, '定位精度还不够', `${accuracy}需要更精确的位置后，才能可靠地告诉你去哪家门店。`);
  } else if (result.reason === 'unsupported_market') {
    renderError(root, '首版先只做上海', 'mMVP 目前只验证上海麦当劳这一条完整闭环，不用泛化结果冒充本地答案。');
  } else if (result.reason === 'no_stores') {
    renderError(root, '附近没有找到麦当劳候选门店', '这次没有足够可靠的附近门店数据，StackBack 不会凭空推荐。');
  } else if (result.reason === 'no_participating_candidates') {
    renderError(root, '附近候选店都没有确认到这个活动', '刚才检查的候选门店都没有在官方点购页显示活动。StackBack 不会继续推荐它们。');
  } else {
    renderError(root, '这次没有得到可靠答案', '请稍后重新定位。');
  }
}

async function locateAndPlan() {
  renderLoading(root);
  try {
    present(await session.start());
  } catch (error) {
    renderError(root, '这次没有得到可靠答案', error && error.message ? error.message : '请稍后重新定位。');
  }
}

root.addEventListener('click', (event) => {
  const locate = event.target.closest('[data-action="locate"]');
  if (locate) {
    event.preventDefault();
    locateAndPlan();
    return;
  }
  const shown = event.target.closest('[data-action="store-shown"]');
  if (shown) {
    event.preventDefault();
    present(session.confirmCurrentStoreShown());
    return;
  }
  const notShown = event.target.closest('[data-action="store-not-shown"]');
  if (notShown) {
    event.preventDefault();
    present(session.rejectCurrentStoreAndAdvance());
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

