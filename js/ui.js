/**
 * ui.js — componentes de UI compartilhados entre todas as páginas
 * Depende apenas do DOM. Sem dependência de db.js ou utils.
 */

// ── TOAST ─────────────────────────────────────────────────────────────────

let _toastTimer;

function toast(msg, erro) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (erro ? ' error' : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

// ── MODAL DE CONFIRMAÇÃO ──────────────────────────────────────────────────

function abrirModal(titulo, msg, onConfirm) {
  document.getElementById('modalTitle').textContent = titulo;
  document.getElementById('modalMsg').textContent   = msg;
  document.getElementById('modalConfirm').onclick   = () => { fecharModal(); onConfirm(); };
  document.getElementById('modalOverlay').classList.add('open');
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// Fecha modal ao clicar no overlay
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === e.currentTarget) fecharModal();
    });
  }
});
