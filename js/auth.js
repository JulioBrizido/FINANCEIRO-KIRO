/**
 * auth.js — gerenciamento de autenticação no frontend.
 *
 * - Guarda/recupera o JWT no localStorage
 * - `requireAuth()`: redireciona para login se não autenticado
 * - `logout()`: limpa o token e volta para o login
 * - `updateNavUser()`: exibe nome do usuário e botão de logout na nav
 */

// ── TOKEN ──────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('ff_token');
}

function setToken(token) {
  localStorage.setItem('ff_token', token);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('ff_user'));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('ff_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('ff_token');
  localStorage.removeItem('ff_user');
}

// ── GUARD ──────────────────────────────────────────────────────────────────

/**
 * Chamar no topo de cada página protegida.
 * Se não houver token, redireciona para login.html.
 */
function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  // Disponibiliza o token para api.js
  window._authToken = token;
  return true;
}

// ── LOGOUT ─────────────────────────────────────────────────────────────────

function logout() {
  clearAuth();
  window.location.href = 'login.html';
}

// ── NAV USER ───────────────────────────────────────────────────────────────

/**
 * Adiciona o nome do usuário e botão de logout na barra de navegação.
 * Procura por um elemento #navUser na nav; se não existir, cria um.
 */
function updateNavUser() {
  const user = getUser();
  if (!user) return;

  const nav = document.querySelector('nav');
  if (!nav) return;

  // Remove versão do fim da nav (será reinserida junto com o user)
  let navVersion = document.getElementById('navVersion');
  let versionText = navVersion ? navVersion.textContent : '';
  if (navVersion) navVersion.remove();

  // Cria container de usuário à direita
  let navUser = document.getElementById('navUser');
  if (!navUser) {
    navUser = document.createElement('span');
    navUser.id = 'navUser';
    navUser.style.cssText = 'margin-left:auto;display:flex;align-items:center;gap:.75rem';
    nav.appendChild(navUser);
  }

  navUser.innerHTML =
    '<span style="font-size:.85rem;color:var(--text);display:flex;align-items:center;gap:.4rem">' +
      '<span style="background:var(--accent);color:#fff;width:28px;height:28px;border-radius:50%;' +
      'display:inline-flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">' +
      (user.nome ? user.nome.charAt(0).toUpperCase() : '?') +
      '</span>' +
      '<span>' + user.nome + '</span>' +
    '</span>' +
    '<button class="btn btn-ghost" style="padding:.35rem .9rem;font-size:.8rem" onclick="logout()">Sair</button>' +
    (versionText ? '<span class="nav-version" id="navVersion">' + versionText + '</span>' : '');
}
