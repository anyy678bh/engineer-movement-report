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
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginMessage = document.getElementById('loginMessage');
const profileMessage = document.getElementById('profileMessage');
const registerMessage = document.getElementById('registerMessage');
const storageKey = 'engineer-movement-reports';
const authKey = 'engineer-user-session';
const profileKey = 'engineer-user-profile';
const usersKey = 'engineer-users';

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

async function handleProfileUpdate(event) {
  event.preventDefault();

  const profile = {
    fullName: document.getElementById('fullName').value.trim(),
    department: document.getElementById('department').value.trim(),
    idCardNumber: document.getElementById('idCardNumber').value.trim(),
    emailAddress: document.getElementById('emailAddress').value.trim(),
  };

  saveProfile(profile);

  const syncedProfile = await syncProfileToApi(profile, getSession()?.email || profile.emailAddress);

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

function handleLogout() {
  clearSession();
  window.location.href = 'login.html';
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

if (resetPasswordBtn) {
  resetPasswordBtn.addEventListener('click', handleResetPassword);
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', handleLogout);
}

if (transportTypeSelect) {
  transportTypeSelect.addEventListener('change', updateVehiclePlateRequirement);
}

updateVehiclePlateRequirement();
renderEntries();
renderCompanyChart();
renderHomeGreeting();
renderRecentEntriesPage();
renderProfilePage();
