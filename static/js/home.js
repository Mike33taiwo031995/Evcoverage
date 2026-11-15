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
  // UN M49 country/area groupings, reviewed 2026-11-15:
  // https://unstats.un.org/unsd/methodology/m49/overview/
  // Central America and the Caribbean join North America for navigation.
  // TW and XK are supplemental navigation entries, not jurisdictional claims.
  const countryGroups = {
    africa: 'DZ EG LY MA SD TN EH IO BI KM DJ ER ET TF KE MG MW MU YT MZ RE RW SC SO SS UG TZ ZM ZW AO CM CF TD CG CD GQ GA ST BW SZ LS NA ZA BJ BF CV CI GM GH GN GW LR ML MR NE NG SH SN SL TG',
    'north-america': 'AI AG AW BS BB BQ VG KY CU CW DM DO GD GP HT JM MQ MS PR BL KN LC MF VC SX TT TC VI BZ CR SV GT HN MX NI PA BM CA GL PM US',
    'south-america': 'AR BO BV BR CL CO EC FK GF GY PY PE GS SR UY VE',
    asia: 'KZ KG TJ TM UZ CN HK MO KP JP MN KR BN KH ID LA MY MM PH SG TH TL VN AF BD BT IN IR MV NP PK LK AM AZ BH CY GE IQ IL JO KW LB OM QA SA PS SY TR AE YE TW',
    europe: 'BY BG CZ HU PL MD RO RU SK UA AX DK EE FO FI GG IS IE IM JE LV LT NO SJ SE GB AL AD BA HR GI GR VA IT MT ME MK PT SM RS SI ES AT BE FR DE LI LU MC NL CH XK',
    oceania: 'AU CX CC HM NZ NF FJ NC PG SB VU GU KI MH FM NR MP PW UM AS CK PF NU PN WS TK TO TV WF',
    other: 'AQ'
  };
  const countryCurrencies = {
    US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP',
    GB: 'GBP', DE: 'EUR', FR: 'EUR', NL: 'EUR', NO: 'NOK', SE: 'SEK',
    NG: 'NGN', ZA: 'ZAR', KE: 'KES', EG: 'EGP', IN: 'INR', JP: 'JPY',
    SG: 'SGD', AU: 'AUD', NZ: 'NZD', AE: 'AED'
  };
  const commonCountryNames = {
    US: 'United States', GB: 'United Kingdom', AE: 'United Arab Emirates',
    KR: 'South Korea', KP: 'North Korea', CD: 'Democratic Republic of the Congo',
    CG: 'Republic of the Congo', CA: 'Canada', MX: 'Mexico', BR: 'Brazil',
    AR: 'Argentina', CL: 'Chile', DE: 'Germany', FR: 'France', NL: 'Netherlands',
    NO: 'Norway', SE: 'Sweden', NG: 'Nigeria', ZA: 'South Africa', KE: 'Kenya',
    EG: 'Egypt', IN: 'India', JP: 'Japan', SG: 'Singapore', AU: 'Australia',
    NZ: 'New Zealand'
  };
  const countryNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  const countryData = Object.entries(countryGroups).flatMap(([region, codes]) =>
    codes.split(' ').map((code) => [
      commonCountryNames[code] || (countryNames && countryNames.of(code)) || code,
      countryCurrencies[code] || null, region, code
    ])
  ).sort((a, b) => a[0].localeCompare(b[0]));
  const normalizeCountry = (value) => value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const countryLookup = new Map();
  countryData.forEach((entry) => {
    countryLookup.set(normalizeCountry(entry[0]), entry);
    countryLookup.set(entry[3].toLowerCase(), entry);
  });
  const countryAliases = {
    'United States of America': 'US', USA: 'US', 'U.S.A.': 'US',
    'U.S.': 'US', UK: 'GB', 'U.K.': 'GB', Britain: 'GB', 'Great Britain': 'GB',
    England: 'GB', Scotland: 'GB', Wales: 'GB', 'Northern Ireland': 'GB',
    UAE: 'AE', 'U.A.E.': 'AE', 'The Netherlands': 'NL',
    'Czech Republic': 'CZ', 'Cape Verde': 'CV', 'Ivory Coast': 'CI',
    'Cote d Ivoire': 'CI', Turkey: 'TR', Turkiye: 'TR',
    'Republic of Korea': 'KR', 'Korea Republic of': 'KR',
    'Democratic Peoples Republic of Korea': 'KP',
    'Democratic Republic of Congo': 'CD', DRC: 'CD', 'Congo Kinshasa': 'CD',
    'Congo Brazzaville': 'CG', 'Russian Federation': 'RU',
    'United Republic of Tanzania': 'TZ', 'Tanzania United Republic of': 'TZ',
    'Iran Islamic Republic of': 'IR', 'Islamic Republic of Iran': 'IR',
    'Syrian Arab Republic': 'SY', 'Lao Peoples Democratic Republic': 'LA',
    'Bolivia Plurinational State of': 'BO', 'Venezuela Bolivarian Republic of': 'VE',
    'State of Palestine': 'PS', 'Palestine State of': 'PS',
    'Holy See': 'VA', 'Viet Nam': 'VN', Swaziland: 'SZ',
    'United States Virgin Islands': 'VI', 'British Virgin Islands': 'VG',
    'Sao Tome and Principe': 'ST', 'Cabo Verde': 'CV', 'Saint Helena': 'SH',
    'Antigua and Barbuda': 'AG', 'Bonaire Sint Eustatius and Saba': 'BQ',
    'Saint Barthelemy': 'BL', 'Saint Kitts and Nevis': 'KN', 'Saint Lucia': 'LC',
    'Saint Martin French Part': 'MF', 'Saint Vincent and the Grenadines': 'VC',
    'Sint Maarten Dutch part': 'SX', 'Trinidad and Tobago': 'TT',
    'Turks and Caicos Islands': 'TC', 'Falkland Islands Malvinas': 'FK',
    'South Georgia and the South Sandwich Islands': 'GS', 'Saint Pierre and Miquelon': 'PM',
    'China Hong Kong Special Administrative Region': 'HK',
    'China Macao Special Administrative Region': 'MO', 'Brunei Darussalam': 'BN',
    Myanmar: 'MM', 'Republic of Moldova': 'MD', 'Svalbard and Jan Mayen Islands': 'SJ',
    'United Kingdom of Great Britain and Northern Ireland': 'GB',
    'Bosnia and Herzegovina': 'BA', 'Netherlands Kingdom of the': 'NL',
    'Heard Island and McDonald Islands': 'HM', 'Micronesia Federated States of': 'FM',
    Naoero: 'NR', 'United States Minor Outlying Islands': 'UM', Pitcairn: 'PN',
    'Wallis and Futuna Islands': 'WF'
  };
  Object.entries(countryAliases).forEach(([alias, code]) => {
    countryLookup.set(normalizeCountry(alias), countryLookup.get(code.toLowerCase()));
  });
  const regionInfo = {
    global: ['Choose your region', 'Six regional guides are available below. Choose a map region or a recognised country above to see the matching guide. Country examples are clearly labelled; no regional premium dataset or live quote is provided.'],
    'north-america': ['North America', 'Start with the U.S., Canada and Mexico guide, including a link to the existing U.S. state guide. Central America and the Caribbean share this navigation group, but their individual rules are not all covered.'],
    'south-america': ['South America', 'Explore examples from Brazil, Chile, Colombia and Argentina. Distinguish injury schemes, liability and damage to your own EV; confirm the current local requirements and contract.'],
    europe: ['Europe', 'Compare EU and UK examples and the questions to ask before foreign travel. Europe is not the same as EU membership, and optional protection can differ by country and policy.'],
    africa: ['Africa', 'Read examples from Nigeria, Kenya, Morocco and South Africa. Check compulsory protection, battery and property cover, repair arrangements and the appropriate local source.'],
    asia: ['Asia', 'Read examples from India, Singapore, Japan and the UAE. Required injury or liability protection does not by itself establish cover for your own battery or vehicle.'],
    oceania: ['Oceania', 'Start with Australia and New Zealand, plus a Pacific-market caution. Injury arrangements, property insurance and the applicable local authority need separate checks.'],
    other: ['No specific regional match', 'Choose a recognised country or use the six region buttons. Countries and areas are grouped for navigation, not legal advice; a regional guide is not an individual country quotation.']
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
    countryData.forEach(([name, , region, code]) => {
      const option = document.createElement('option');
      option.value = name;
      option.label = code;
      option.dataset.countryCode = code;
      option.dataset.countryRegion = region;
      countryList.appendChild(option);
    });
  }

  function resolveCountry(value) {
    return countryLookup.get(normalizeCountry(value));
  }

  function regionGuide(regionId) {
    return document.querySelector(`[data-guide-region="${regionId}"]`);
  }

  function showRegionGuide(regionId) {
    const link = regionGuide(regionId);
    const card = byId('eh-region-guide');
    if (!card) return;
    card.hidden = !link;
    byId('eh-region-guide-intro').hidden = Boolean(link);
    if (!link) return;
    card.href = link.href;
    byId('eh-region-guide-label').textContent = link.dataset.guideLabel;
    byId('eh-region-guide-title').textContent = link.dataset.guideTitle;
    byId('eh-region-guide-copy').textContent = link.dataset.guideCopy;
    byId('eh-region-guide-action').textContent = `Read the ${regionInfo[regionId][0]} EV insurance guide`;
  }

  function showCountryGuide(match) {
    const panel = byId('eh-country-guide');
    if (!panel) return;
    const link = match && regionGuide(match[2]);
    panel.hidden = !link;
    if (!link) return;
    byId('eh-country-guide-label').textContent = `Regional reading for ${match[0]}`;
    const countryLink = byId('eh-country-guide-link');
    countryLink.href = link.href;
    countryLink.textContent = `Read the ${regionInfo[match[2]][0]} EV insurance guide →`;
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
    showRegionGuide(regionId);
  }

  function updateCountrySelection() {
    const value = byId('eh-country').value.trim();
    const match = resolveCountry(value);
    const badge = document.querySelector('.eh-location-heading .eh-badge');
    showCountryGuide(match);
    if (!match) {
      applyRegion(value ? 'other' : 'global');
      byId('eh-location-title').textContent = value ? 'Choose a recognised country or market' : 'Choose your regional starting point';
      byId('eh-location-copy').textContent = value
        ? 'Choose a full country name from the suggestions or use a two-letter country code. No region is guessed from an unrecognised entry.'
        : 'Choose a country above or a region on the map for a relevant reading guide. No postcode lookup or live quotation is performed.';
      badge.textContent = value ? 'Choose from suggestions' : 'Regional guides';
      badge.classList.remove('eh-pending');
      return;
    }
    const [name, currency, region] = match;
    if (currency) {
      currencySelects.forEach((select) => {
        if (select) select.value = currency;
      });
      if (byId('eh-loan')) refreshGap();
      if (byId('eh-quote-a')) refreshQuotes();
    }
    applyRegion(region);
    const available = Boolean(regionGuide(region));
    byId('eh-location-title').textContent = name;
    byId('eh-location-copy').textContent = available
      ? `The ${regionInfo[region][0]} guide is available below. It uses named country examples, not a complete statement of local rules. No verified, comparable premium figures are published for this location.`
      : 'No dedicated regional insurance guide is available for this area. Browse the other regional guides without treating them as local rules.';
    if (byId('eh-postcode').value.trim()) {
      byId('eh-location-copy').textContent += ' Your postcode remains only in this browser and is not looked up.';
    }
    badge.textContent = available ? 'Regional guide available' : 'No dedicated guide';
    badge.classList.toggle('eh-pending', !available);
  }

  const countryInput = byId('eh-country');
  if (countryInput) {
    countryInput.addEventListener('input', updateCountrySelection);
    countryInput.addEventListener('change', updateCountrySelection);
  }

  const findLocationBtn = byId('eh-find-location');
  if (findLocationBtn) {
    findLocationBtn.addEventListener('click', updateCountrySelection);
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
