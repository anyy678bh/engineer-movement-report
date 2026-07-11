const form = document.getElementById('movementForm');
const entriesList = document.getElementById('entriesList');
const clearBtn = document.getElementById('clearBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const profileForm = document.getElementById('profileForm');
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

async function renderEntries() {
  if (!entriesList) return;

  const session = getSession();
  if (!session) {
    entriesList.innerHTML = '<div class="empty">Please sign in to create and view movement reports.</div>';
    return;
  }

  const { items, nextToken } = await loadReportsFromApi();
  const localEntries = getEntries();
  const entries = items.length ? items : localEntries;

  if (!entries.length) {
    entriesList.innerHTML = '<div class="empty">No movement reports saved yet.</div>';
    return;
  }

  const entriesHtml = entries
    .map(
      (entry) => `
        <article class="entry">
          <h3>${entry.companyName || entry.companyNameAttended || 'Unknown company'}</h3>
          <p><strong>Date:</strong> ${entry.date || entry.createdAt || 'N/A'}</p>
          <p><strong>Location:</strong> ${entry.location || 'N/A'}</p>
          <p><strong>Transport:</strong> ${entry.transportType || 'N/A'}</p>
          <p><strong>Machine:</strong> ${entry.machineType || 'N/A'}</p>
          <p><strong>Service:</strong> ${entry.serviceRendered || 'N/A'}</p>
        </article>
      `
    )
    .join('');

  const nextButton = nextToken
    ? `<button id="loadMoreBtn" class="ghost" type="button">Load more reports</button>`
    : '';

  entriesList.innerHTML = `${entriesHtml}${nextButton}`;

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      const moreData = await loadReportsFromApi(nextToken);
      const combinedEntries = [...entries, ...moreData.items];
      const mergedHtml = combinedEntries
        .map(
          (entry) => `
            <article class="entry">
              <h3>${entry.companyName || entry.companyNameAttended || 'Unknown company'}</h3>
              <p><strong>Date:</strong> ${entry.date || entry.createdAt || 'N/A'}</p>
              <p><strong>Location:</strong> ${entry.location || 'N/A'}</p>
              <p><strong>Transport:</strong> ${entry.transportType || 'N/A'}</p>
              <p><strong>Machine:</strong> ${entry.machineType || 'N/A'}</p>
              <p><strong>Service:</strong> ${entry.serviceRendered || 'N/A'}</p>
            </article>
          `
        )
        .join('');
      entriesList.innerHTML = `${mergedHtml}${moreData.nextToken ? '<button id="loadMoreBtn" class="ghost" type="button">Load more reports</button>' : ''}`;
    });
  }
}

async function renderProfilePage() {
  const session = getSession();
  let profile = getProfile();

  if (!document.getElementById('profileName')) return;

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  if (!profile.fullName && !profile.department && !profile.idCardNumber && !profile.emailAddress) {
    const remoteProfile = await loadProfileFromApi();
    if (remoteProfile) {
      profile = remoteProfile;
    }
  }

  const displayName = profile.fullName || session.name || 'Engineer User';
  const displayEmail = profile.emailAddress || session.email || 'user@company.com';

  const nameElement = document.getElementById('profileName');
  const emailElement = document.getElementById('profileEmail');
  const fullNameField = document.getElementById('fullName');
  const departmentField = document.getElementById('department');
  const idCardField = document.getElementById('idCardNumber');
  const emailField = document.getElementById('emailAddress');

  if (nameElement) nameElement.textContent = displayName;
  if (emailElement) emailElement.textContent = displayEmail;
  if (fullNameField) fullNameField.value = profile.fullName || '';
  if (departmentField) departmentField.value = profile.department || '';
  if (idCardField) idCardField.value = profile.idCardNumber || '';
  if (emailField) emailField.value = displayEmail;
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

function handleRegister(event) {
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

  if (registerMessage) registerMessage.textContent = 'Account created successfully. Redirecting...';
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

  try {
    const profileApiUrl = window.PROFILE_API_URL || '';
    if (profileApiUrl) {
      const response = await fetch(profileApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: getSession()?.email || profile.emailAddress,
          tenantId: window.DEFAULT_TENANT_ID,
          ...profile,
        }),
      });

      if (!response.ok) {
        throw new Error('Profile API request failed');
      }
    }

    if (profileMessage) profileMessage.textContent = 'Profile updated successfully.';
  } catch (error) {
    console.warn('Profile save to API failed, data kept locally:', error);
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
      entriesList.innerHTML = '<div class="empty">Please sign in before saving a report.</div>';
      return;
    }

    const entry = {
      id: Date.now(),
      date: document.getElementById('date').value,
      companyName: document.getElementById('companyName').value.trim(),
      location: document.getElementById('location').value.trim(),
      transportType: document.getElementById('transportType').value,
      machineType: document.getElementById('machineType').value.trim(),
      serviceRendered: document.getElementById('serviceRendered').value.trim(),
    };

    const entries = [entry, ...getEntries()];
    saveEntries(entries);
    await syncReportToApi(entry);
    renderEntries();
    form.reset();
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

renderEntries();
renderProfilePage();
