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
const engineerDialog = document.getElementById('engineerDialog');
const engineerQuestionSection = document.getElementById('engineerQuestionSection');
const engineerCountSection = document.getElementById('engineerCountSection');
const engineerFieldsSection = document.getElementById('engineerFieldsSection');
const engineerNoBtn = document.getElementById('engineerNoBtn');
const engineerYesBtn = document.getElementById('engineerYesBtn');
const engineerCountInput = document.getElementById('otherEngineerCount');
const engineerCountSubmitBtn = document.getElementById('engineerCountSubmitBtn');
const engineerCancelBtn = document.getElementById('engineerCancelBtn');

const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');
let pendingEntry = null;
const loginMessage = document.getElementById('loginMessage');
const profileMessage = document.getElementById('profileMessage');
const registerMessage = document.getElementById('registerMessage');

async function getEntries() {
  const result = await loadReportsFromApi();
  return Array.isArray(result.items) ? result.items.map(normalizeApiEntry).filter(Boolean) : [];
}

function setPendingEntry(entry) { pendingEntry = entry; }
function clearPendingEntry() { pendingEntry = null; }

function resetEngineerDialogState() {
  if (engineerQuestionSection) engineerQuestionSection.classList.remove('hidden');
  if (engineerCountSection) engineerCountSection.classList.add('hidden');
  if (engineerFieldsSection) { engineerFieldsSection.classList.add('hidden'); engineerFieldsSection.innerHTML = ''; }
  if (engineerCountInput) engineerCountInput.value = '';
}

function showEngineerDialog() {
  if (!engineerDialog) return;
  resetEngineerDialogState();
  engineerDialog.classList.remove('hidden');
  engineerDialog.setAttribute('aria-hidden', 'false');
}

function hideEngineerDialog() {
  if (!engineerDialog) return;
  engineerDialog.classList.add('hidden');
  engineerDialog.setAttribute('aria-hidden', 'true');
}

function renderAdditionalEngineerFields(count) {
  if (!engineerFieldsSection) return;
  const safeCount = Math.max(0, Number(count) || 0);
  if (safeCount <= 0) {
    engineerFieldsSection.classList.add('hidden');
    engineerFieldsSection.innerHTML = '';
    return;
  }
  engineerFieldsSection.innerHTML = `
    ${Array.from({ length: safeCount }, (_, index) => `
      <label>
        Other Engineer ${index + 1}
        <input type="text" data-engineer-index="${index}" placeholder="Enter engineer name" />
      </label>
    `).join('')}
    <button id="engineerNamesSubmitBtn" type="button">Submit report</button>
  `;
  engineerFieldsSection.classList.remove('hidden');
  if (engineerCountSection) engineerCountSection.classList.add('hidden');
  if (engineerQuestionSection) engineerQuestionSection.classList.add('hidden');
  if (engineerDialog) { engineerDialog.classList.remove('hidden'); engineerDialog.setAttribute('aria-hidden', 'false'); }
  const submitButton = document.getElementById('engineerNamesSubmitBtn');
  if (submitButton) {
    submitButton.onclick = async () => {
      if (!pendingEntry) return;
      const otherEngineerNames = Array.from(engineerFieldsSection.querySelectorAll('input[data-engineer-index]'))
      .map((input) => input.value.trim())
      .filter(Boolean);
      pendingEntry.otherEngineerNames = otherEngineerNames;
      await finalizePendingEntry();
    };
  }
}

async function finalizePendingEntry() {
  if (!pendingEntry) return;
  const entry = {...pendingEntry, otherEngineerNames: Array.isArray(pendingEntry.otherEngineerNames)? pendingEntry.otherEngineerNames : [] };
  clearPendingEntry();
  resetEngineerDialogState();
  hideEngineerDialog();
  const synced = await syncReportToApi(entry);
  await renderEntries();
  await renderCompanyChart();
  if (form) form.reset();
  if (synced) setFormStatus('Report saved successfully and synced.', 'success');
  else setFormStatus('Report could not be saved. Please try again later.', 'error');
}

async function syncReportToApi(entry) {
  const apiBaseUrl = window.API_BASE_URL || '';
  if (!apiBaseUrl) return null;
  try {
    const response = await fetch(`${apiBaseUrl}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: window.DEFAULT_TENANT_ID, userEmail: getSession()?.email || 'unknown@example.com',...entry }),
    });
    if (!response.ok) throw new Error('API sync failed');
    return await response.json();
  } catch (error) {
    console.warn('Backend report save failed:', error);
    return null;
  }
}

async function loadReportsFromApi(startToken = null) {
  const apiBaseUrl = window.API_BASE_URL || '';
  if (!apiBaseUrl) return { items: [], nextToken: null };
  try {
    const url = new URL(`${apiBaseUrl}/reports`);
    url.searchParams.set('tenantId', window.DEFAULT_TENANT_ID);
    url.searchParams.set('limit', '7');
    if (startToken) url.searchParams.set('startKey', startToken);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Unable to load reports from API');
    return await response.json();
  } catch (error) {
    console.warn('API load failed:', error);
    return { items: [], nextToken: null };
  }
}

function getProfile() {
  return {};
}

async function saveProfile(profile) {
  const userId = profile.emailAddress || getSession()?.email || '';
  const normalizedProfile = {
    ...profile,
    emailAddress: profile.emailAddress || getSession()?.email || '',
    updatedAt: new Date().toISOString(),
  };
  return await syncProfileToApi(normalizedProfile, userId);
}

function updateVehiclePlateRequirement() {
  if (!transportTypeSelect ||!vehiclePlateInput ||!vehiclePlateContainer) return;
  const isCompanyVehicle = transportTypeSelect.value === 'Company Vehicle';
  vehiclePlateContainer.classList.toggle('hidden',!isCompanyVehicle);
  vehiclePlateInput.required = isCompanyVehicle;
  if (!isCompanyVehicle) vehiclePlateInput.value = '';
}

function getVehiclePlateNumber() {
  if (!transportTypeSelect ||!vehiclePlateInput) return '';
  return transportTypeSelect.value === 'Company Vehicle'? vehiclePlateInput.value.trim() : '';
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
  if (!profileApiUrl) return null;
  try {
    const response = await fetch(profileApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId || profile.emailAddress || 'unknown@example.com', tenantId: window.DEFAULT_TENANT_ID,...profile }),
    });
    if (!response.ok) throw new Error('Profile API request failed');
    return await response.json();
  } catch (error) {
    console.warn('Profile API sync failed:', error);
    return null;
  }
}

async function loadProfileFromApi() {
  const profileApiUrl = window.PROFILE_API_URL || '';
  const session = getSession();
  if (!profileApiUrl || !session?.email) return null;
  try {
    const url = new URL(profileApiUrl);
    url.searchParams.set('userId', session.email);
    url.searchParams.set('tenantId', window.DEFAULT_TENANT_ID);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Unable to load profile from API');
    const profile = await response.json();
    if (profile && Object.keys(profile).length) {
      return {
        fullName: profile.fullName || '',
        department: profile.department || '',
        idCardNumber: profile.idCardNumber || '',
        emailAddress: profile.emailAddress || session.email,
      };
    }
  } catch (error) {
    console.warn('Profile API load failed:', error);
  }
  return null;
}

const SESSION_STORAGE_KEY = 'engineerMovementReportSession';
let currentSession = null;

function getSession() {
  if (currentSession) return currentSession;
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      currentSession = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Could not load session from sessionStorage:', error);
  }
  return currentSession;
}

function saveSession(session) {
  currentSession = session && typeof session === 'object' ? session : null;
  try {
    if (currentSession) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Could not save session to sessionStorage:', error);
  }
}

function clearSession() {
  currentSession = null;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear session from sessionStorage:', error);
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getAttributeMap(attributes = []) {
  return (attributes || []).reduce((accumulator, attribute) => {
    if (attribute && attribute.Name) {
      accumulator[attribute.Name] = attribute.Value;
    }
    return accumulator;
  }, {});
}

function setFormStatus(message, type = 'success') {
  if (!formStatus) return;
  if (!message) { formStatus.textContent = ''; formStatus.className = 'status-pill'; return; }
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
  const hoursSpent = entry.hoursSpent!= null? `${entry.hoursSpent} hours` : null;
  const people = entry.engineerName? `<p><strong>Engineer:</strong> ${entry.engineerName}</p>` : '';
  const otherEngineerNames = Array.isArray(entry.otherEngineerNames) && entry.otherEngineerNames.length? entry.otherEngineerNames.join(', ') : (entry.otherEngineerName? entry.otherEngineerName : '');
  const otherEngineer = otherEngineerNames? `<p><strong>Other Engineers:</strong> ${otherEngineerNames}</p>` : '';
  return `
    <article class="entry">
      <h3>${company}</h3>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Location:</strong> ${location}</p>
      ${people}
      ${otherEngineer}
      <p><strong>Transport:</strong> ${transportType}</p>
      ${plateNumber? `<p><strong>Plate #:</strong> ${plateNumber}</p>` : ''}
      <p><strong>Machine:</strong> ${machineType}</p>
      <p><strong>Service:</strong> ${serviceRendered}</p>
      ${hoursSpent? `<p><strong>Hours:</strong> ${hoursSpent}</p>` : ''}
    </article>
  `;
}

function normalizeApiEntry(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    id: item.id || item.reportId || item.sk || item.pk || `${item.date || ''}-${item.companyName || ''}`,
    date: item.date || item.createdAt || '',
    companyName: item.companyName || item.companyNameAttended || '',
    engineerName: item.engineerName || '',
    location: item.location || '',
    transportType: item.transportType || '',
    vehiclePlateNumber: item.vehiclePlateNumber || '',
    machineType: item.machineType || '',
    serviceRendered: item.serviceRendered || '',
    hoursSpent: item.hoursSpent ?? 0,
    otherEngineerName: item.otherEngineerName || null,
    otherEngineerNames: Array.isArray(item.otherEngineerNames) ? item.otherEngineerNames : [],
    createdAt: item.createdAt || item.date || '',
  };
}

async function renderCompanyChart() {
  return null;
}

async function renderEntries() {
  if (!entriesList) return;
  const remoteResult = await loadReportsFromApi().catch(() => ({ items: [] }));
  const entries = Array.isArray(remoteResult.items)
    ? remoteResult.items.map(normalizeApiEntry).filter(Boolean)
    : [];

  if (!entries.length) {
    entriesList.innerHTML = '<div class="empty">No entries yet. Save your first report to start building your history.</div>';
    return;
  }

  entriesList.innerHTML = entries.map(buildEntryMarkup).join('');
}

async function renderRecentEntriesPage() {
  const recentEntriesList = document.getElementById('recentEntriesList');
  const recentEntriesCount = document.getElementById('recentEntriesCount');
  if (!recentEntriesList) return;

  const queryDate = document.getElementById('queryDate')?.value || '';
  const queryCompany = (document.getElementById('queryCompany')?.value || '').trim().toLowerCase();
  const remoteResult = await loadReportsFromApi().catch(() => ({ items: [] }));
  const entries = Array.isArray(remoteResult.items)
    ? remoteResult.items.map(normalizeApiEntry).filter(Boolean)
    : [];
  const filteredEntries = entries.filter((entry) => {
    const entryDate = String(entry.date || '').slice(0, 10);
    const entryCompany = String(entry.companyName || entry.companyNameAttended || '').toLowerCase();
    const matchesDate = !queryDate || entryDate === queryDate;
    const matchesCompany = !queryCompany || entryCompany.includes(queryCompany);
    return matchesDate && matchesCompany;
  });

  if (recentEntriesCount) {
    recentEntriesCount.textContent = `${filteredEntries.length} entr${filteredEntries.length === 1 ? 'y' : 'ies'}`;
  }

  if (!filteredEntries.length) {
    recentEntriesList.innerHTML = '<div class="empty">No matching entries found.</div>';
    return;
  }

  recentEntriesList.innerHTML = filteredEntries.slice(0, 7).map(buildEntryMarkup).join('');
}

async function renderAnalyticsPage() {
  return null;
}

async function renderProfilePage() {
  const session = getSession();
  let profile = getProfile();
  if (!document.getElementById('profileName')) return;
  const isGuest =!session;
  if (isGuest && profileMessage) profileMessage.textContent = 'Viewing profile (sign in to edit).';
  if (!profile.fullName &&!profile.department &&!profile.idCardNumber &&!profile.emailAddress) {
    const remoteProfile = await loadProfileFromApi();
    if (remoteProfile) profile = remoteProfile;
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
}

async function initializeEditProfileForm() {
  const remoteProfile = await loadProfileFromApi();
  const profile = remoteProfile || getProfile();
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
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  const profile = {
    fullName: document.getElementById('fullName').value.trim(),
    department: document.getElementById('department').value.trim(),
    idCardNumber: document.getElementById('idCardNumber').value.trim(),
    emailAddress: document.getElementById('emailAddress').value.trim(),
  };
  const userId = getSession()?.email || profile.emailAddress;
  const syncedProfile = await saveProfile(profile);
  if (syncedProfile) {
    if (profileMessage) profileMessage.textContent = 'Profile updated successfully.';
  } else {
    if (profileMessage) profileMessage.textContent = 'Unable to save profile to backend.';
  }
  renderProfilePage();
}

function setResetMode(isConfirmMode) { /* unchanged */ }
function initializePasswordResetForm() { /* unchanged */ }
function handleResetPassword() { /* unchanged */ }
async function handleResetRequest(event) { /* unchanged */ }
async function handlePasswordReset(event) { /* unchanged */ }
function buildProfileFromUser(user, fallbackEmail = '') {
  return {
    fullName: user?.fullName || '',
    department: user?.department || '',
    idCardNumber: user?.idCardNumber || '',
    emailAddress: user?.emailAddress || fallbackEmail,
    profileImageData: '',
    profileImageUrl: '',
    profileImageKey: '',
  };
}

async function handleRegister(event) {
  event.preventDefault();

  const fullName = document.getElementById('registerFullName')?.value.trim() || '';
  const department = document.getElementById('registerDepartment')?.value.trim() || '';
  const idCardNumber = document.getElementById('registerIdCardNumber')?.value.trim() || '';
  const email = normalizeEmail(document.getElementById('registerEmail')?.value || '');
  const password = document.getElementById('registerPassword')?.value || '';
  const confirmPassword = document.getElementById('registerConfirmPassword')?.value || '';

  if (!fullName || !department || !email || !password || !confirmPassword) {
    if (registerMessage) registerMessage.textContent = 'Please complete all required fields.';
    return;
  }

  if (password !== confirmPassword) {
    if (registerMessage) registerMessage.textContent = 'Passwords do not match.';
    return;
  }

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    if (registerMessage) registerMessage.textContent = 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
    return;
  }

  try {
    if (registerMessage) registerMessage.textContent = 'Saving your account to AWS...';

    const response = await fetch(window.PROFILE_API_URL || '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        tenantId: window.DEFAULT_TENANT_ID,
        userId: email,
        fullName,
        department,
        idCardNumber,
        emailAddress: email,
        password,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || 'Account creation failed.');
    }

    const profile = {
      fullName,
      department,
      idCardNumber,
      emailAddress: email,
    };

    saveSession({ name: fullName, email, provider: 'aws' });
    await saveProfile(profile);

    if (registerMessage) registerMessage.textContent = 'Account created successfully. Redirecting...';
    window.location.href = 'profile.html';
  } catch (error) {
    console.error('AWS signup failed:', error);
    if (registerMessage) registerMessage.textContent = error.message || 'Account creation failed.';
  }
}

function handleLogout() { clearSession(); window.location.href = 'login.html'; }

async function handleLogin(event) {
  event.preventDefault();

  const email = normalizeEmail(document.getElementById('loginEmail')?.value || '');
  const password = document.getElementById('loginPassword')?.value || '';

  if (!email || !password) {
    if (loginMessage) loginMessage.textContent = 'Please enter your email and password.';
    return;
  }

  try {
    if (loginMessage) loginMessage.textContent = 'Signing in with AWS...';

    const response = await fetch(window.PROFILE_API_URL || '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        tenantId: window.DEFAULT_TENANT_ID,
        userId: email,
        emailAddress: email,
        password,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || 'Invalid email or password.');
    }

    const profile = {
      fullName: payload.item?.fullName || '',
      department: payload.item?.department || '',
      idCardNumber: payload.item?.idCardNumber || '',
      emailAddress: payload.item?.emailAddress || email,
    };

    saveSession({ name: profile.fullName || email.split('@')[0], email, provider: 'aws' });
    await saveProfile(profile);

    if (loginMessage) loginMessage.textContent = 'Login successful. Redirecting...';
    window.location.href = 'profile.html';
  } catch (error) {
    console.error('AWS login failed:', error);
    if (loginMessage) loginMessage.textContent = error.message || 'Unable to sign in right now.';
  }
}

// FORM SUBMIT - THIS OPENS THE POPUP
if (form) {
  form.onsubmit = async (event) => {
    event.preventDefault();

    if (!getSession()) {
      if (entriesList) {
        entriesList.innerHTML = '<div class="empty">Please sign in before saving a report.</div>';
      }
      setFormStatus('Please sign in before saving a report.', 'error');
      return;
    }

    const engineerNameValue = document.getElementById('engineerName').value.trim();
    if (!engineerNameValue) {
      setFormStatus('Please enter your engineer name.', 'error');
      return;
    }

    const entry = {
      id: Date.now(),
      date: document.getElementById('date').value,
      companyName: document.getElementById('companyName').value.trim(),
      engineerName: engineerNameValue,
      location: document.getElementById('location').value.trim(),
      transportType: document.getElementById('transportType').value,
      vehiclePlateNumber: getVehiclePlateNumber(),
      machineType: document.getElementById('machineType').value.trim(),
      serviceRendered: document.getElementById('serviceRendered').value.trim(),
      hoursSpent: Number(document.getElementById('hoursSpent').value) || 0,
      otherEngineerName: null,
      otherEngineerNames: [],
    };

    setPendingEntry(entry);
    showEngineerDialog(); // OPENS THE MODAL
  };
}

if (clearBtn) clearBtn.addEventListener('click', () => {
  setFormStatus('Clearing reports is not supported in this backend-only mode.', 'error');
});
if (loginForm) loginForm.addEventListener('submit', handleLogin);
if (registerForm) registerForm.addEventListener('submit', handleRegister);
if (profileForm) profileForm.addEventListener('submit', handleProfileUpdate);
if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', handleResetPassword);
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (transportTypeSelect) transportTypeSelect.addEventListener('change', updateVehiclePlateRequirement);

if (engineerNoBtn) {
  engineerNoBtn.onclick = async () => {
    if (!pendingEntry) return;
    pendingEntry.otherEngineerNames = [];
    await finalizePendingEntry();
  };
}

if (engineerYesBtn) {
  engineerYesBtn.onclick = () => {
    if (engineerQuestionSection) engineerQuestionSection.classList.add('hidden');
    if (engineerCountSection) engineerCountSection.classList.remove('hidden');
    if (engineerCountInput) engineerCountInput.focus();
  };
}

if (engineerCountSubmitBtn) {
  engineerCountSubmitBtn.onclick = () => {
    if (!pendingEntry) return;
    const count = Math.max(0, Number(engineerCountInput?.value) || 0);
    if (count <= 0) {
      pendingEntry.otherEngineerNames = [];
      finalizePendingEntry();
      return;
    }
    renderAdditionalEngineerFields(count);
  };
}

if (engineerCancelBtn) {
  engineerCancelBtn.onclick = () => {
    hideEngineerDialog();
    clearPendingEntry();
    setFormStatus('Report submission cancelled.', 'error');
  };
}

initializeEditProfileForm();
updateVehiclePlateRequirement();
renderEntries();
renderCompanyChart();
renderHomeGreeting();
renderRecentEntriesPage();
renderAnalyticsPage();
renderProfilePage();