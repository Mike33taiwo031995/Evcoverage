(() => {
  'use strict';

  const currencyCodes = [
    ['USD', 'U.S. dollar'], ['CAD', 'Canadian dollar'], ['MXN', 'Mexican peso'],
    ['BRL', 'Brazilian real'], ['ARS', 'Argentine peso'], ['CLP', 'Chilean peso'],
    ['GBP', 'Pound sterling'], ['EUR', 'Euro'], ['NOK', 'Norwegian krone'],
    ['SEK', 'Swedish krona'], ['NGN', 'Nigerian naira'], ['ZAR', 'South African rand'],
    ['KES', 'Kenyan shilling'], ['EGP', 'Egyptian pound'], ['INR', 'Indian rupee'],
    ['JPY', 'Japanese yen'], ['SGD', 'Singapore dollar'], ['AUD', 'Australian dollar'],
    ['NZD', 'New Zealand dollar'], ['AED', 'UAE dirham']
  ];
  const countryData = [
    ['United States', 'USD', 'north-america'], ['Canada', 'CAD', 'north-america'],
    ['Mexico', 'MXN', 'north-america'], ['Brazil', 'BRL', 'south-america'],
    ['Argentina', 'ARS', 'south-america'], ['Chile', 'CLP', 'south-america'],
    ['United Kingdom', 'GBP', 'europe'], ['Germany', 'EUR', 'europe'],
    ['France', 'EUR', 'europe'], ['Netherlands', 'EUR', 'europe'],
    ['Norway', 'NOK', 'europe'], ['Sweden', 'SEK', 'europe'],
    ['Nigeria', 'NGN', 'africa'], ['South Africa', 'ZAR', 'africa'],
    ['Kenya', 'KES', 'africa'], ['Egypt', 'EGP', 'africa'],
    ['India', 'INR', 'asia'], ['Japan', 'JPY', 'asia'],
    ['Singapore', 'SGD', 'asia'], ['Australia', 'AUD', 'oceania'],
    ['New Zealand', 'NZD', 'oceania'], ['United Arab Emirates', 'AED', 'asia']
  ];
  const regionInfo = {
    global: ['Worldwide context', 'This guide offers general questions and user-entered tools for EV owners in any market. No global, comparable premium series is published. U.S.-only companion materials are not worldwide benchmarks.'],
    'north-america': ['North America', 'The companion workbook contains U.S.-only state and vehicle references. Those materials are not a worldwide cost benchmark, and no regional premium figures are published here.'],
    'south-america': ['South America', 'Insurance rules and policy wording vary between countries and markets. A verified, comparable regional EV price series is not currently available in this guide.'],
    europe: ['Europe', 'Insurance rules and policy wording differ by country and may differ within a country. A verified, comparable regional price series is not currently available here.'],
    africa: ['Africa', 'Local rules, vehicle availability and repair networks vary widely. This guide does not currently publish verified, comparable EV premium information for African markets.'],
    asia: ['Asia', 'Insurance terms and vehicle repair networks vary across Asian markets. Comparable, dated EV premium information for this region is not currently available in this guide.'],
    oceania: ['Oceania', 'Local insurer terms, vehicle repair networks and regulation matter. Comparable, dated EV premium information for this region is not currently available in this guide.'],
    other: ['Other / not listed', 'We have not verified a local price dataset for every market. Check local policy wording and ask insurers serving your area directly.']
  };
  const symbols = {
    USD: '$', CAD: 'CA$', MXN: 'MX$', BRL: 'R$', ARS: 'AR$', CLP: 'CL$',
    GBP: '£', EUR: '€', NOK: 'NOK ', SEK: 'SEK ', NGN: '₦', ZAR: 'R',
    KES: 'KSh ', EGP: 'E£', INR: '₹', JPY: '¥', SGD: 'S$', AUD: 'A$',
    NZD: 'NZ$', AED: 'AED '
  };

  const byId = (id) => document.getElementById(id);
  const currencySelects = ['eh-gap-currency', 'eh-quote-currency-a', 'eh-quote-currency-b'].map(byId);
  currencySelects.forEach((select) => {
    if (!select) return;
    currencyCodes.forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${code} — ${name}`;
      select.appendChild(option);
    });
  });

  const countryList = byId('eh-country-suggestions');
  if (countryList) {
    countryData.forEach(([name]) => {
      const option = document.createElement('option');
      option.value = name;
      countryList.appendChild(option);
    });
  }

  function resolveCountry(value) {
    const normalized = value.trim().toLocaleLowerCase();
    return countryData.find(([name]) => name.toLocaleLowerCase() === normalized);
  }

  function applyRegion(regionId) {
    const [title, copy] = regionInfo[regionId] || regionInfo.other;
    byId('eh-region-title').textContent = title;
    byId('eh-region-copy').textContent = copy;
    document.querySelectorAll('.eh-map-pins button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.region === regionId));
    });
    document.querySelectorAll('.eh-land').forEach((shape) => {
      shape.classList.toggle('eh-selected', shape.dataset.shape === regionId);
    });
  }

  const countryInput = byId('eh-country');
  if (countryInput) {
    countryInput.addEventListener('input', (event) => {
      const match = resolveCountry(event.target.value);
      if (!match) return;
      const [, currency] = match;
      if (byId('eh-gap-currency')) byId('eh-gap-currency').value = currency;
      if (byId('eh-quote-currency-a')) byId('eh-quote-currency-a').value = currency;
      if (byId('eh-quote-currency-b')) byId('eh-quote-currency-b').value = currency;
    });
  }

  const findLocationBtn = byId('eh-find-location');
  if (findLocationBtn) {
    findLocationBtn.addEventListener('click', () => {
      const value = byId('eh-country').value.trim();
      const badge = document.querySelector('.eh-location-heading .eh-badge');
      if (!value) {
        byId('eh-location-title').textContent = 'Choose a country or market';
        byId('eh-location-copy').textContent = 'Type a location to see the local information status. No postcode lookup is performed.';
        badge.textContent = 'Global scope';
        badge.classList.remove('eh-pending');
        return;
      }
      const match = resolveCountry(value);
      const regionId = match ? match[2] : 'other';
      applyRegion(regionId);
      byId('eh-location-title').textContent = value;
      byId('eh-location-copy').textContent = `No verified, comparable premium figures are published for ${value}. ${byId('eh-postcode').value.trim() ? 'Your postcode remains only in this browser and is not looked up.' : 'No postcode lookup was performed.'} Use the regional note and compare current, equivalent written quotes from local insurers.`;
      badge.textContent = 'No verified price data';
      badge.classList.add('eh-pending');
    });
  }

  document.querySelectorAll('.eh-map-pins button').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => applyRegion(button.dataset.region));
  });
  if (byId('eh-region-title')) applyRegion('global');

  function refreshGap() {
    const rawBalance = byId('eh-loan').value;
    const rawValue = byId('eh-value').value;
    const currency = byId('eh-gap-currency').value;
    const label = byId('eh-gap-label');
    const amount = byId('eh-gap-amount');
    const state = byId('eh-gap-state');
    if (rawBalance === '' || rawValue === '' || !currency) {
      label.textContent = 'Enter both amounts and choose a currency';
      amount.textContent = '—';
      state.textContent = 'Awaiting values';
      state.classList.add('eh-result-pending');
      return;
    }
    const balance = Number(rawBalance);
    const value = Number(rawValue);
    if (!Number.isFinite(balance) || balance < 0 || !Number.isFinite(value) || value < 0) {
      label.textContent = 'Enter two non-negative amounts';
      amount.textContent = '—';
      state.textContent = 'Check the inputs';
      state.classList.add('eh-result-pending');
      return;
    }
    const gap = balance - value;
    label.textContent = gap > 0 ? 'Difference between balance and value' : gap === 0 ? 'Balance and value are level' : 'Estimated value above balance';
    amount.textContent = `${symbols[currency] || ''}${Math.abs(gap).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
    state.textContent = gap > 0 ? 'Balance is higher' : 'No loan-to-value gap';
    state.classList.toggle('eh-result-pending', gap <= 0);
  }
  if (byId('eh-loan')) {
    ['eh-loan', 'eh-value', 'eh-gap-currency'].forEach((id) => byId(id).addEventListener('input', refreshGap));
    byId('eh-gap-currency').addEventListener('change', refreshGap);
  }

  function refreshQuotes() {
    const first = byId('eh-quote-a').value;
    const second = byId('eh-quote-b').value;
    const currencyA = byId('eh-quote-currency-a').value;
    const currencyB = byId('eh-quote-currency-b').value;
    const result = byId('eh-quote-result');
    if (first === '' || second === '') {
      result.textContent = 'Enter two annual premiums to see a comparison.';
    } else if (!currencyA || !currencyB) {
      result.textContent = 'Choose a currency for each quote to compare.';
    } else if (currencyA !== currencyB) {
      result.textContent = 'Not comparable yet: currencies differ. This tool does not convert amounts; compare figures only when both are already stated in the same currency.';
    } else if (!Number.isFinite(Number(first)) || Number(first) < 0 || !Number.isFinite(Number(second)) || Number(second) < 0) {
      result.textContent = 'Enter non-negative annual premiums before comparing.';
    } else if (!byId('eh-same-coverage').checked) {
      result.textContent = `Amounts are in ${currencyA}. Confirm the same coverage basis above before interpreting any difference.`;
    } else {
      const a = Math.max(0, Number(first));
      const b = Math.max(0, Number(second));
      const symbol = symbols[currencyA] || '';
      if (a === b) {
        result.textContent = `Both entered premiums are the same: ${symbol}${a.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currencyA} per year.`;
      } else {
        const lower = a < b ? 'Quote one' : 'Quote two';
        result.textContent = `Lower entered premium: ${lower} by ${symbol}${Math.abs(a - b).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currencyA} per year.`;
      }
    }
  }
  if (byId('eh-quote-a')) {
    ['eh-quote-a', 'eh-quote-b', 'eh-quote-currency-a', 'eh-quote-currency-b', 'eh-same-coverage'].forEach((id) => {
      byId(id).addEventListener('input', refreshQuotes);
      byId(id).addEventListener('change', refreshQuotes);
    });
  }
})();
