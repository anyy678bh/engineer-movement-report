const form = document.getElementById('movementForm');
const entriesList = document.getElementById('entriesList');
const clearBtn = document.getElementById('clearBtn');
const formStatus = document.getElementById('formStatus');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const profileForm = document.getElementById('profileForm');
const transportTypeSelect = document.getElementById('transportType');
const vehiclePlateInput = document.getElementById('vehiclePlateNumber');
const vehiclePlateContainer = document.getElementById('vehiclePlateContainer');
const profileImageFileInput = document.getElementById('profileImageFile');
const removeProfileImageBtn = document.getElementById('removeProfileImageBtn');
const profileImagePreview = document.getElementById('profileImagePreview');
const profileImagePreviewPlaceholder = document.getElementById('profileImagePreviewPlaceholder');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginMessage = document.getElementById('loginMessage');
const profileMessage = document.getElementById('profileMessage');
const registerMessage = document.getElementById('registerMessage');
const storageKey = 'engineer-movement-reports';
const authKey = 'engineer-user-session';
const profileKey = 'engineer-user-profile';
const usersKey = 'engineer-users';
let profileImageClearRequested = false;

function getReportsKey() {
  const session = getSession();
  return session && session.email ? `${storageKey}:${session.email}` : storageKey;
}

function getEntries() {
  const reportsKey = getReportsKey();

  try {
    const currentEntries = localStorage.getItem(reportsKey);
    if (currentEntries) {
      return JSON.parse(currentEntries);
    }

    const legacyEntries = localStorage.getItem(storageKey);
    if (legacyEntries) {
      localStorage.setItem(reportsKey, legacyEntries);
      return JSON.parse(legacyEntries);
    }

    return [];
  } catch (error) {
    console.error('Unable to read entries:', error);
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(getReportsKey(), JSON.stringify(entries));
}

async function syncReportToApi(entry) {
  const apiBaseUrl = window.API_BASE_URL || '';
  if (!apiBaseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: window.DEFAULT_TENANT_ID,
        userEmail: getSession()?.email || 'unknown@example.com',
        ...entry,
      }),
    });

    if (!response.ok) {
      throw new Error('API sync failed');
    }

    return await response.json();
  } catch (error) {
    console.warn('Falling back to local storage:', error);
    return null;
  }
}

async function loadReportsFromApi(startToken = null) {
  const apiBaseUrl = window.API_BASE_URL || '';
  if (!apiBaseUrl) {
    return { items: [], nextToken: null };
  }

  try {
    const url = new URL(`${apiBaseUrl}/reports`);
    url.searchParams.set('tenantId', window.DEFAULT_TENANT_ID);
    url.searchParams.set('limit', '7');
    if (startToken) {
      url.searchParams.set('startKey', startToken);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Unable to load reports from API');
    }

    return await response.json();
  } catch (error) {
    console.warn('API load failed:', error);
    return { items: [], nextToken: null };
  }
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(profileKey) || '{}');
  } catch (error) {
    console.error('Unable to read profile:', error);
    return {};
  }
}

function saveProfile(profile) {
  localStorage.setItem(profileKey, JSON.stringify(profile));
}

function updateVehiclePlateRequirement() {
  if (!transportTypeSelect || !vehiclePlateInput || !vehiclePlateContainer) return;
  const isCompanyVehicle = transportTypeSelect.value === 'Company Vehicle';
  vehiclePlateContainer.classList.toggle('hidden', !isCompanyVehicle);
  vehiclePlateInput.required = isCompanyVehicle;
  if (!isCompanyVehicle) {
    vehiclePlateInput.value = '';
  }
}

function getVehiclePlateNumber() {
  if (!transportTypeSelect || !vehiclePlateInput) return '';
  return transportTypeSelect.value === 'Company Vehicle' ? vehiclePlateInput.value.trim() : '';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getProfileImagePreviewSource(profile) {
  if (!profile) return null;
  return profile.profileImageData || profile.profileImageUrl || null;
}

function setProfileImagePreview(source) {
  if (!profileImagePreview || !profileImagePreviewPlaceholder) return;
  if (source) {
    profileImagePreview.src = source;
    profileImagePreview.style.display = 'block';
    profileImagePreviewPlaceholder.style.display = 'none';
  } else {
    profileImagePreview.src = '';
    profileImagePreview.style.display = 'none';
    profileImagePreviewPlaceholder.style.display = 'block';
  }
}

function renderProfileAvatar(profile) {
  const avatarImg = document.getElementById('profileAvatarImg');
  const avatarInitials = document.getElementById('profileAvatarInitials');
  if (!avatarImg || !avatarInitials) return;

  const imageSource = getProfileImagePreviewSource(profile);
  const displayName = profile?.fullName || getSession()?.name || 'Engineer';
  const initials = displayName
    .split(' ')
    .map((part) => part[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (imageSource) {
    avatarImg.src = imageSource;
    avatarImg.style.display = 'block';
    avatarInitials.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    avatarImg.src = '';
    avatarInitials.textContent = initials;
    avatarInitials.style.display = 'grid';
  }
}

function handleProfileImageFileChange() {
  if (!profileImageFileInput) return;
  profileImageClearRequested = false;
  const file = profileImageFileInput.files?.[0];
  if (!file) {
    const profile = getProfile();
    setProfileImagePreview(getProfileImagePreviewSource(profile));
    return;
  }

  readFileAsDataUrl(file)
    .then((dataUrl) => {
      setProfileImagePreview(dataUrl);
    })
    .catch(() => {
      setProfileImagePreview(null);
    });
}

function clearProfileImageSelection() {
  if (profileImageFileInput) profileImageFileInput.value = '';
  profileImageClearRequested = true;
  setProfileImagePreview(null);
}

function getGreetingText() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function getGreetingName() {
  const profile = getProfile();
  const session = getSession();
  const rawName = profile.fullName || session?.name || 'Engineer';
  return rawName.split(' ')[0];
}

function renderHomeGreeting() {
  const greeting = document.getElementById('homeGreeting');
  if (!greeting) return;

  const label = greeting.querySelector('.greeting-label');
  const name = greeting.querySelector('.greeting-name');
  const subtitle = greeting.querySelector('.greeting-subtitle');
  const greetingText = getGreetingText().toUpperCase();
  const greetingName = getGreetingName().toUpperCase();

  if (label) label.textContent = greetingText;
  if (name) name.textContent = greetingName;
  if (subtitle) subtitle.textContent = `Ready to log your last site visit?`;
}

async function getPresignedProfileImageUploadUrl(fileName, contentType, userId) {
  const uploadUrlEndpoint = window.PROFILE_IMAGE_UPLOAD_URL || '';
  if (!uploadUrlEndpoint) return null;

  try {
    const response = await fetch(uploadUrlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: window.DEFAULT_TENANT_ID,
        userId,
        fileName,
        contentType,
      }),
    });
    if (!response.ok) throw new Error('Unable to get presigned upload URL');
    return await response.json();
  } catch (error) {
    console.warn('Profile image upload URL request failed:', error);
    return null;
  }
}

async function uploadProfileImageToS3(uploadUrl, file) {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });
    return response.ok;
  } catch (error) {
    console.warn('Profile image upload failed:', error);
    return false;
  }
}

async function removeProfileImageFromServer(userId, imageKey) {
  const removeUrlEndpoint = window.PROFILE_IMAGE_REMOVE_URL || '';
  if (!removeUrlEndpoint || !userId || !imageKey) {
    return false;
  }

  try {
    const response = await fetch(removeUrlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: window.DEFAULT_TENANT_ID,
        userId,
        imageKey,
      }),
    });
    return response.ok;
  } catch (error) {
    console.warn('Profile image remove request failed:', error);
    return false;
  }
}

async function syncProfileToApi(profile, userId = null) {
  const profileApiUrl = window.PROFILE_API_URL || '';
  if (!profileApiUrl) {
    return null;
  }

  try {
    const response = await fetch(profileApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId || profile.emailAddress || 'unknown@example.com',
        tenantId: window.DEFAULT_TENANT_ID,
        ...profile,
      }),
    });

    if (!response.ok) {
      throw new Error('Profile API request failed');
    }

    return await response.json();
  } catch (error) {
    console.warn('Profile API sync failed:', error);
    return null;
  }
}

async function loadProfileFromApi() {
  const profileApiUrl = window.PROFILE_API_URL || '';
  const session = getSession();
  if (!profileApiUrl || !session?.email) {
    return null;
  }

  try {
    const url = new URL(profileApiUrl);
    url.searchParams.set('userId', session.email);
    url.searchParams.set('tenantId', window.DEFAULT_TENANT_ID);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Unable to load profile from API');
    }

    const profile = await response.json();
    if (profile && Object.keys(profile).length) {
      saveProfile({
        fullName: profile.fullName || '',
        department: profile.department || '',
        idCardNumber: profile.idCardNumber || '',
        emailAddress: profile.emailAddress || session.email,
        profileImageUrl: profile.profileImageUrl || '',
        profileImageKey: profile.profileImageKey || '',
      });
      return getProfile();
    }
  } catch (error) {
    console.warn('Profile API load failed:', error);
  }

  return null;
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(authKey) || 'null');
  } catch (error) {
    console.error('Unable to read session:', error);
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(authKey, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(authKey);
  localStorage.removeItem(profileKey);
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(usersKey) || '[]');
  } catch (error) {
    console.error('Unable to read users:', error);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

function setFormStatus(message, type = 'success') {
  if (!formStatus) return;

  if (!message) {
    formStatus.textContent = '';
    formStatus.className = 'status-pill';
    return;
  }

  formStatus.textContent = message;
  formStatus.className = `status-pill ${type}`;
}

function buildEntryMarkup(entry) {
  const company = entry.companyName || entry.companyNameAttended || 'Unknown company';
  const date = entry.date || entry.createdAt || 'N/A';
  const location = entry.location || 'N/A';
  const transportType = entry.transportType || 'N/A';
  const plateNumber = entry.vehiclePlateNumber || '';
  const machineType = entry.machineType || 'N/A';
  const serviceRendered = entry.serviceRendered || 'N/A';

  return `
    <article class="entry">
      <h3>${company}</h3>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Location:</strong> ${location}</p>
      <p><strong>Transport:</strong> ${transportType}</p>
      ${plateNumber ? `<p><strong>Plate #:</strong> ${plateNumber}</p>` : ''}
      <p><strong>Machine:</strong> ${machineType}</p>
      <p><strong>Service:</strong> ${serviceRendered}</p>
    </article>
  `;
}

async function renderCompanyChart() {
  const chart = document.getElementById('companyChart');
  const summary = document.getElementById('monthlySummary');
  const legend = document.getElementById('chartLegend');
  if (!chart) return;

  const { items = [] } = await loadReportsFromApi();
  const localEntries = getEntries();
  const sourceEntries = items.length ? items : localEntries;

  const monthlyData = sourceEntries.reduce((accumulator, entry) => {
    const company = (entry.companyName || entry.companyNameAttended || '').trim();
    const rawDate = entry.date || entry.createdAt || '';
    if (!company || !rawDate) {
      return accumulator;
    }

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return accumulator;
    }

    const monthKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
    if (!accumulator[company]) {
      accumulator[company] = {};
    }

    accumulator[company][monthKey] = (accumulator[company][monthKey] || 0) + 1;
    return accumulator;
  }, {});

  const companies = Object.entries(monthlyData)
    .sort((a, b) => Object.values(b[1]).reduce((sum, value) => sum + value, 0) - Object.values(a[1]).reduce((sum, value) => sum + value, 0))
    .slice(0, 4);

  if (!companies.length) {
    chart.innerHTML = '<div class="empty">No monthly activity yet.</div>';
    if (summary) {
      summary.innerHTML = '';
    }
    if (legend) {
      legend.innerHTML = '';
    }
    return;
  }

  const monthKeys = [...new Set(sourceEntries
    .map((entry) => {
      const rawDate = entry.date || entry.createdAt || '';
      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }
      return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
    })
    .filter(Boolean))]
    .sort();

  const maxValue = Math.max(
    1,
    ...companies.flatMap(([, months]) => Object.values(months))
  );

  const totalVisits = companies.reduce((sum, [, months]) => sum + Object.values(months).reduce((valueSum, value) => valueSum + value, 0), 0);
  const latestMonth = monthKeys[monthKeys.length - 1];
  const previousMonth = monthKeys[monthKeys.length - 2];
  const trendText = latestMonth && previousMonth
    ? companies.map(([company, months]) => {
        const latestValue = months[latestMonth] || 0;
        const previousValue = months[previousMonth] || 0;
        const delta = latestValue - previousValue;
        const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'steady';
        return `${company}: ${direction === 'up' ? '↑' : direction === 'down' ? '↓' : '•'} ${Math.abs(delta)}`;
      }).join(' • ')
    : 'Monthly trend will appear as activity grows.';

  if (summary) {
    summary.innerHTML = `
      <div class="summary-pill">
        <strong>${totalVisits}</strong>
        <span>total visits</span>
      </div>
      <div class="summary-pill">
        <strong>${companies.length}</strong>
        <span>companies tracked</span>
      </div>
      <div class="summary-pill">
        <strong>${monthKeys.length}</strong>
        <span>months shown</span>
      </div>
      <div class="summary-pill trend-pill">
        <strong>${latestMonth || '—'}</strong>
        <span>${trendText}</span>
      </div>
    `;
  }

  if (legend) {
    legend.innerHTML = `
      <div class="legend-item">
        <span class="legend-swatch"></span>
        <span>Monthly visit activity</span>
      </div>
    `;
  }

  chart.innerHTML = `
    <div class="monthly-chart">
      <div class="chart-axis"></div>
      <div class="chart-grid">
        ${monthKeys.map((month) => `<div class="chart-month-label">${month}</div>`).join('')}
      </div>
      ${companies
        .map(([company, months]) => {
          return `
            <div class="series-row">
              <div class="series-label">${company}</div>
              <div class="series-bars">
                ${monthKeys.map((month) => {
                  const value = months[month] || 0;
                  const height = value === 0 ? 0 : Math.max(12, (value / maxValue) * 100);
                  return `<div class="series-bar" title="${company} in ${month}: ${value} visit${value === 1 ? '' : 's'}"><div class="series-fill" style="--bar-height: ${height}%; animation-delay: ${Math.random() * 0.3}s"></div><span class="series-value">${value}</span></div>`;
                }).join('')}
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

async function renderEntries() {
  if (!entriesList) return;

  const session = getSession();
  if (!session) {
    entriesList.innerHTML = '<div class="empty">Please sign in to create and view movement reports.</div>';
    return;
  }

  const { items = [] } = await loadReportsFromApi();
  const localEntries = getEntries();
  const entries = (items.length ? items : localEntries).slice(0, 7);

  if (!entries.length) {
    entriesList.innerHTML = '<div class="empty">No movement reports saved yet.</div>';
    return;
  }

  entriesList.innerHTML = entries.map(buildEntryMarkup).join('');
}

async function renderRecentEntriesPage() {
  const list = document.getElementById('recentEntriesList');
  const form = document.getElementById('recentEntriesSearchForm');
  const count = document.getElementById('recentEntriesCount');
  if (!list) return;

  const session = getSession();
  if (!session) {
    list.innerHTML = '<div class="empty">Please sign in to view recent entries.</div>';
    return;
  }

  const { items = [] } = await loadReportsFromApi();
  const recentEntries = (items.length ? items : getEntries()).slice(0, 7);
  const renderResults = (entries) => {
    if (count) {
      count.textContent = `Showing ${entries.length} of ${recentEntries.length} latest entries`;
    }

    if (!entries.length) {
      list.innerHTML = '<div class="empty">No entries matched your search.</div>';
      return;
    }

    list.innerHTML = entries.map(buildEntryMarkup).join('');
  };

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const date = document.getElementById('queryDate').value;
      const company = document.getElementById('queryCompany').value.trim().toLowerCase();

      const filteredEntries = recentEntries.filter((entry) => {
        const entryDate = (entry.date || entry.createdAt || '').toString();
        const entryCompany = (entry.companyName || entry.companyNameAttended || '').toString().toLowerCase();
        const matchesDate = !date || entryDate.startsWith(date);
        const matchesCompany = !company || entryCompany.includes(company);
        return matchesDate && matchesCompany;
      });

      renderResults(filteredEntries);
    });
  }

  renderResults(recentEntries);
}

function getAnalysisEntries() {
  const { items = [] } = loadReportsFromApi();
  return items.length ? items : getEntries();
}

function buildAnalysisSummary(entries, period, companyFilter, selectedDate, selectedWeek) {
  const filteredEntries = entries.filter((entry) => {
    const company = (entry.companyName || entry.companyNameAttended || '').toString().toLowerCase();
    const matchesCompany = !companyFilter || company.includes(companyFilter.toLowerCase());
    return matchesCompany;
  });

  const grouped = filteredEntries.reduce((accumulator, entry) => {
    const rawDate = entry.date || entry.createdAt || '';
    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return accumulator;
    }

    const entryMonth = parsedDate.getMonth() + 1;
    const entryYear = parsedDate.getFullYear();
    const weekNumber = getWeekNumber(parsedDate);
    const selectedDateValue = selectedDate ? new Date(selectedDate) : null;
    const matchesDate = !selectedDateValue || (() => {
      if (period === 'month') {
        return parsedDate.getFullYear() === selectedDateValue.getFullYear()
          && parsedDate.getMonth() === selectedDateValue.getMonth();
      }
      return parsedDate.toDateString() === selectedDateValue.toDateString();
    })();
    const matchesWeek = !selectedWeek || weekNumber === Number(selectedWeek);
    const matchesPeriod = period === 'week'
      ? matchesDate && matchesWeek
      : matchesDate;

    if (!matchesPeriod) {
      return accumulator;
    }

    const key = period === 'week'
      ? `${entryYear}-${String(entryMonth).padStart(2, '0')} • W${weekNumber}`
      : `${entryYear}-${String(entryMonth).padStart(2, '0')}`;

    const company = (entry.companyName || entry.companyNameAttended || 'Unknown').trim();
    if (!accumulator[company]) {
      accumulator[company] = {};
    }

    accumulator[company][key] = (accumulator[company][key] || 0) + 1;
    return accumulator;
  }, {});

  return { grouped, filteredEntries };
}

function getWeekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / 86400000);
  return Math.ceil((days + start.getDay() + 1) / 7);
}

async function renderAnalyticsPage() {
  const form = document.getElementById('analyticsQueryForm');
  const summary = document.getElementById('analyticsSummary');
  const chart = document.getElementById('analyticsChart');
  const topPerformers = document.getElementById('analyticsTopPerformers');
  const tableWrap = document.getElementById('analyticsTableWrap');
  const clearButton = document.getElementById('clearAnalyticsBtn');
  const analysisDate = document.getElementById('analysisDate');
  const weekInput = document.getElementById('analysisWeek');
  const periodSelect = document.getElementById('analysisPeriod');
  if (!form || !summary || !chart || !topPerformers || !tableWrap || !analysisDate || !weekInput || !periodSelect) return;

  const updateDateInputMode = () => {
    if (periodSelect.value === 'week') {
      analysisDate.type = 'date';
      analysisDate.setAttribute('placeholder', 'Select a date');
    } else {
      analysisDate.type = 'month';
      analysisDate.setAttribute('placeholder', 'Select a month');
    }
  };

  const entries = await getAnalysisEntries();
  const renderResults = (period = 'month', companyFilter = '', selectedDate = '', selectedWeek = '') => {
    const { grouped, filteredEntries } = buildAnalysisSummary(entries, period, companyFilter, selectedDate, selectedWeek);
    const companies = Object.entries(grouped).sort((a, b) => {
      const aValue = Object.values(b[1]).reduce((sum, value) => sum + value, 0);
      const bValue = Object.values(a[1]).reduce((sum, value) => sum + value, 0);
      return aValue - bValue;
    });

    if (!companies.length) {
      summary.innerHTML = '<div class="empty">No matching results found.</div>';
      chart.innerHTML = '<div class="empty">Try a broader search.</div>';
      topPerformers.innerHTML = '<div class="empty">No top performers yet.</div>';
      tableWrap.innerHTML = '<div class="empty">No matching rows.</div>';
      return;
    }

    const periodKeys = [...new Set(companies.flatMap(([, months]) => Object.keys(months)))].sort();
    const maxValue = Math.max(1, ...companies.flatMap(([, months]) => Object.values(months)));
    const topCompanies = [...companies].slice(0, 4);

    const selectedDateLabel = selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'All dates';
    const selectedWeekLabel = selectedWeek ? `Week ${selectedWeek}` : '';
    const periodDetail = period === 'week'
      ? `${selectedDateLabel}${selectedWeekLabel ? ` • ${selectedWeekLabel}` : ''}`
      : selectedDateLabel;

    summary.innerHTML = `
      <div class="summary-pill">
        <strong>${filteredEntries.length}</strong>
        <span>matching visits</span>
      </div>
      <div class="summary-pill">
        <strong>${companies.length}</strong>
        <span>companies shown</span>
      </div>
      <div class="summary-pill">
        <strong>${periodDetail}</strong>
        <span>period details</span>
      </div>
    `;

    topPerformers.innerHTML = `
      <h3>Top-performing companies</h3>
      <div class="analytics-list">
        ${topCompanies.map(([company, values]) => `
          <div class="analytics-list-item">
            <span>${company}</span>
            <strong>${Object.values(values).reduce((sum, value) => sum + value, 0)} visits</strong>
          </div>
        `).join('')}
      </div>
    `;

    tableWrap.innerHTML = `
      <h3>Matched results</h3>
      <table class="analytics-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>${period === 'week' ? 'Week' : 'Month'}</th>
            <th>Visits</th>
          </tr>
        </thead>
        <tbody>
          ${companies.map(([company, values]) => `
            <tr>
              <td>${company}</td>
              <td>${periodKeys.join(', ')}</td>
              <td>${Object.values(values).reduce((sum, value) => sum + value, 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    chart.innerHTML = `
      <div class="monthly-chart">
        <div class="chart-grid">
          ${periodKeys.map((periodKey) => `<div class="chart-month-label">${periodKey}</div>`).join('')}
        </div>
        ${companies.map(([company, values]) => `
          <div class="series-row">
            <div class="series-label">${company}</div>
            <div class="series-bars">
              ${periodKeys.map((periodKey) => {
                const value = values[periodKey] || 0;
                const height = value === 0 ? 0 : Math.max(12, (value / maxValue) * 100);
                return `<div class="series-bar" title="${company} in ${periodKey}: ${value}"><div class="series-fill" style="--bar-height: ${height}%; animation-delay: ${Math.random() * 0.3}s"></div><span class="series-value">${value}</span></div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const period = periodSelect.value;
    const companyFilter = document.getElementById('analysisCompany').value.trim();
    const selectedDate = analysisDate.value;
    const selectedWeek = weekInput.value.trim();
    renderResults(period, companyFilter, selectedDate, selectedWeek);
  });

  clearButton?.addEventListener('click', () => {
    form.reset();
    analysisDate.value = '';
    weekInput.value = '';
    renderResults('month', '', '', '');
  });

  periodSelect.addEventListener('change', () => {
    weekInput.disabled = periodSelect.value !== 'week';
    updateDateInputMode();
  });

  weekInput.disabled = periodSelect.value !== 'week';
  updateDateInputMode();
  renderResults('month', '', '', '');
}

async function renderProfilePage() {
  const session = getSession();
  let profile = getProfile();

  if (!document.getElementById('profileName')) return;

  const isGuest = !session;
  if (isGuest && profileMessage) {
    profileMessage.textContent = 'Viewing profile (sign in to edit).';
  }

  if (!profile.fullName && !profile.department && !profile.idCardNumber && !profile.emailAddress) {
    const remoteProfile = await loadProfileFromApi();
    if (remoteProfile) {
      profile = remoteProfile;
    }
  }

  const displayName = profile.fullName || (session && session.name) || 'Engineer User';
  const displayEmail = profile.emailAddress || (session && session.email) || 'user@company.com';

  const nameElement = document.getElementById('profileName');
  const emailElement = document.getElementById('profileEmail');
  const fullNameField = document.getElementById('fullName');
  const departmentField = document.getElementById('department');
  const idCardField = document.getElementById('idCardNumber');
  const emailField = document.getElementById('emailAddress');
  const profileFullNameDisplay = document.getElementById('profileFullName');
  const profileDepartmentDisplay = document.getElementById('profileDepartment');
  const profileIdCardDisplay = document.getElementById('profileIdCard');
  const profileEmailDisplay = document.getElementById('profileEmailDisplay');

  if (nameElement) nameElement.textContent = displayName;
  if (emailElement) emailElement.textContent = displayEmail;
  if (profileFullNameDisplay) profileFullNameDisplay.textContent = profile.fullName || displayName;
  if (profileDepartmentDisplay) profileDepartmentDisplay.textContent = profile.department || '—';
  if (profileIdCardDisplay) profileIdCardDisplay.textContent = profile.idCardNumber || '—';
  if (profileEmailDisplay) profileEmailDisplay.textContent = profile.emailAddress || displayEmail;
  if (fullNameField) fullNameField.value = profile.fullName || '';
  if (departmentField) departmentField.value = profile.department || '';
  if (idCardField) idCardField.value = profile.idCardNumber || '';
  if (emailField) emailField.value = displayEmail;
  renderProfileAvatar(profile);
  const debugEl = document.getElementById('profileDebug');
  try {
    if (debugEl) {
      debugEl.textContent = JSON.stringify(profile, null, 2) || localStorage.getItem(profileKey) || '';
    }
    console.log('renderProfilePage - profile:', profile);
    console.log('renderProfilePage - raw localStorage:', localStorage.getItem(profileKey));
  } catch (e) {
    if (debugEl) debugEl.textContent = `Error serializing profile: ${e.message}`;
  }
}

function initializeEditProfileForm() {
  const profile = getProfile();
  if (profileForm) {
    const fullNameField = document.getElementById('fullName');
    const departmentField = document.getElementById('department');
    const idCardField = document.getElementById('idCardNumber');
    const emailField = document.getElementById('emailAddress');
    if (fullNameField) fullNameField.value = profile.fullName || '';
    if (departmentField) departmentField.value = profile.department || '';
    if (idCardField) idCardField.value = profile.idCardNumber || '';
    if (emailField) emailField.value = profile.emailAddress || getSession()?.email || '';
  }

  setProfileImagePreview(getProfileImagePreviewSource(profile));
  renderProfileAvatar(profile);
}

async function handleProfileUpdate(event) {
  event.preventDefault();

  const profile = {
    fullName: document.getElementById('fullName').value.trim(),
    department: document.getElementById('department').value.trim(),
    idCardNumber: document.getElementById('idCardNumber').value.trim(),
    emailAddress: document.getElementById('emailAddress').value.trim(),
  };

  const currentProfile = getProfile();
  const userId = getSession()?.email || profile.emailAddress;
  const file = profileImageFileInput?.files?.[0];

  if (profileImageClearRequested) {
    if (currentProfile.profileImageKey) {
      await removeProfileImageFromServer(userId, currentProfile.profileImageKey);
    }
    profile.profileImageData = '';
    profile.profileImageUrl = '';
    profile.profileImageKey = '';
  } else if (file) {
    try {
      profile.profileImageData = await readFileAsDataUrl(file);
    } catch (error) {
      console.warn('Unable to read profile image file', error);
    }

    const signedData = await getPresignedProfileImageUploadUrl(file.name, file.type, userId);
    if (signedData?.uploadUrl) {
      const uploaded = await uploadProfileImageToS3(signedData.uploadUrl, file);
      if (uploaded) {
        profile.profileImageUrl = signedData.imageUrl;
        profile.profileImageKey = signedData.imageKey;
      }
    }
  } else {
    profile.profileImageData = currentProfile.profileImageData || '';
    profile.profileImageUrl = currentProfile.profileImageUrl || '';
    profile.profileImageKey = currentProfile.profileImageKey || '';
  }

  saveProfile(profile);

  const syncedProfile = await syncProfileToApi(profile, userId);

  if (syncedProfile) {
    if (profileMessage) profileMessage.textContent = 'Profile updated successfully.';
  } else {
    if (profileMessage) profileMessage.textContent = 'Profile saved locally. AWS sync will retry later.';
  }

  renderProfilePage();
}

function handleResetPassword() {
  if (profileMessage) profileMessage.textContent = 'Password reset link sent to your email.';
}

async function handleRegister(event) {
  event.preventDefault();

  const fullName = document.getElementById('registerFullName').value.trim();
  const department = document.getElementById('registerDepartment').value.trim();
  const idCardNumber = document.getElementById('registerIdCardNumber').value.trim();
  const emailAddress = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  if (password.length < 6) {
    if (registerMessage) registerMessage.textContent = 'Password must be at least 6 characters.';
    return;
  }

  if (password !== confirmPassword) {
    if (registerMessage) registerMessage.textContent = 'Passwords do not match.';
    return;
  }

  const users = getUsers();
  const existingUser = users.find((user) => user.emailAddress === emailAddress);

  if (existingUser) {
    if (registerMessage) registerMessage.textContent = 'An account with this email already exists.';
    return;
  }

  const newUser = {
    fullName,
    department,
    idCardNumber,
    emailAddress,
    password,
  };

  users.push(newUser);
  saveUsers(users);
  saveSession({ name: fullName, email: emailAddress });
  saveProfile({ fullName, department, idCardNumber, emailAddress });

  const syncedProfile = await syncProfileToApi({ fullName, department, idCardNumber, emailAddress }, emailAddress);
  if (registerMessage) {
    registerMessage.textContent = syncedProfile
      ? 'Account created successfully and synced to AWS. Redirecting...'
      : 'Account created locally. AWS sync failed. Redirecting...';
  }

  window.location.href = 'profile.html';
}

function handleResetPassword() {
  if (profileMessage) profileMessage.textContent = 'Password reset link sent to your email.';
}

function handleLogout() {
  clearSession();
  window.location.href = 'login.html';
}

function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const users = getUsers();
  const user = users.find((entry) => entry.emailAddress === email);

  if (email === 'amina@tenant.com' && password === 'password123') {
    const session = { name: 'Amina Yusuf', email };
    const profile = {
      fullName: 'Amina Yusuf',
      department: 'Maintenance Engineering',
      idCardNumber: 'ENG-1024',
      emailAddress: email,
    };

    saveSession(session);
    saveProfile(profile);
    if (loginMessage) loginMessage.textContent = 'Login successful. Redirecting...';
    window.location.href = 'profile.html';
  } else if (user && user.password === password) {
    const session = { name: user.fullName, email: user.emailAddress };
    saveSession(session);
    saveProfile({
      fullName: user.fullName,
      department: user.department,
      idCardNumber: user.idCardNumber,
      emailAddress: user.emailAddress,
    });
    if (loginMessage) loginMessage.textContent = 'Login successful. Redirecting...';
    window.location.href = 'profile.html';
  } else {
    if (loginMessage) loginMessage.textContent = 'Invalid email or password.';
  }
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!getSession()) {
      if (entriesList) {
        entriesList.innerHTML = '<div class="empty">Please sign in before saving a report.</div>';
      }
      setFormStatus('Please sign in before saving a report.', 'error');
      return;
    }

    const entry = {
      id: Date.now(),
      date: document.getElementById('date').value,
      companyName: document.getElementById('companyName').value.trim(),
      location: document.getElementById('location').value.trim(),
      transportType: document.getElementById('transportType').value,
      vehiclePlateNumber: getVehiclePlateNumber(),
      machineType: document.getElementById('machineType').value.trim(),
      serviceRendered: document.getElementById('serviceRendered').value.trim(),
    };

    const entries = [entry, ...getEntries()];
    saveEntries(entries);
    const synced = await syncReportToApi(entry);
    renderEntries();
    await renderCompanyChart();
    form.reset();

    if (synced) {
      setFormStatus('Report saved successfully and synced.', 'success');
    } else {
      setFormStatus('Report saved locally. Sync will retry when the connection is available.', 'error');
    }
  });
}

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    saveEntries([]);
    renderEntries();
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

if (registerForm) {
  registerForm.addEventListener('submit', handleRegister);
}

if (profileForm) {
  profileForm.addEventListener('submit', handleProfileUpdate);
}

if (profileImageFileInput) {
  profileImageFileInput.addEventListener('change', handleProfileImageFileChange);
}

if (removeProfileImageBtn) {
  removeProfileImageBtn.addEventListener('click', clearProfileImageSelection);
}

if (resetPasswordBtn) {
  resetPasswordBtn.addEventListener('click', handleResetPassword);
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', handleLogout);
}

if (transportTypeSelect) {
  transportTypeSelect.addEventListener('change', updateVehiclePlateRequirement);
}

initializeEditProfileForm();
updateVehiclePlateRequirement();
renderEntries();
renderCompanyChart();
renderHomeGreeting();
renderRecentEntriesPage();
renderAnalyticsPage();
renderProfilePage();
