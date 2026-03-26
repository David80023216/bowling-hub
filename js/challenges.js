/**
 * challenges.js — Challenges view for Bowling Hub
 */

import * as Storage from './storage.js';
import { showModal, closeModal, showToast, formatDate, formField, inputClass, selectClass, btnPrimary } from './app.js';

const CHALLENGE_TYPES = ['Highest Series', 'Head-to-Head', 'Pins Over Average', 'High Game'];
const STATUS_COLORS = {
  'Pending': 'bg-yellow-500/20 text-yellow-400',
  'Active': 'bg-green-500/20 text-green-400',
  'Completed': 'bg-blue-500/20 text-blue-400',
  'Declined': 'bg-red-500/20 text-red-400',
};

export function renderChallenges(container) {
  const challenges = Storage.getChallenges();
  const contacts = Storage.getContacts();

  // Stats
  const completed = challenges.filter(c => c.status === 'Completed');
  const wins = completed.filter(c => c.winner === 'me').length;
  const losses = completed.filter(c => c.winner === 'them').length;
  const draws = completed.filter(c => c.winner === 'draw').length;

  // Group
  const pending = challenges.filter(c => c.status === 'Pending');
  const active = challenges.filter(c => c.status === 'Active');
  const history = challenges.filter(c => c.status === 'Completed' || c.status === 'Declined');

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold flex items-center gap-2"><i class="fa-solid fa-bolt text-yellow-400"></i> Challenges</h2>
        <p class="text-bowl-muted text-sm">Create and track head-to-head challenges</p>
      </div>
      ${btnPrimary('New Challenge', 'btn-new-challenge', 'fa-plus')}
    </div>

    <!-- Win/Loss Record -->
    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="bg-bowl-dark border border-bowl-border rounded-xl p-4 text-center">
        <p class="text-3xl font-bold text-bowl-green">${wins}</p>
        <p class="text-xs text-bowl-muted">Wins</p>
      </div>
      <div class="bg-bowl-dark border border-bowl-border rounded-xl p-4 text-center">
        <p class="text-3xl font-bold text-bowl-red">${losses}</p>
        <p class="text-xs text-bowl-muted">Losses</p>
      </div>
      <div class="bg-bowl-dark border border-bowl-border rounded-xl p-4 text-center">
        <p class="text-3xl font-bold text-gray-400">${draws}</p>
        <p class="text-xs text-bowl-muted">Draws</p>
      </div>
    </div>

    ${pending.length > 0 ? `
      <div class="mb-6">
        <h3 class="font-bold text-yellow-400 mb-3 flex items-center gap-2"><i class="fa-solid fa-hourglass-half"></i> Pending</h3>
        <div class="space-y-3">${pending.map(c => renderChallengeCard(c)).join('')}</div>
      </div>
    ` : ''}

    ${active.length > 0 ? `
      <div class="mb-6">
        <h3 class="font-bold text-bowl-green mb-3 flex items-center gap-2"><i class="fa-solid fa-fire"></i> Active</h3>
        <div class="space-y-3">${active.map(c => renderChallengeCard(c)).join('')}</div>
      </div>
    ` : ''}

    ${pending.length === 0 && active.length === 0 ? `
      <div class="text-center py-12 text-bowl-muted mb-6">
        <i class="fa-solid fa-bolt text-5xl mb-4 opacity-50"></i>
        <p class="text-lg">No active challenges</p>
        <p class="text-sm">Challenge a friend to a bowling showdown!</p>
      </div>
    ` : ''}

    ${history.length > 0 ? `
      <div>
        <h3 class="font-bold text-bowl-muted mb-3 flex items-center gap-2"><i class="fa-solid fa-clock-rotate-left"></i> History</h3>
        <div class="space-y-3">${history.map(c => renderChallengeCard(c)).join('')}</div>
      </div>
    ` : ''}

    <!-- Disclaimer -->
    <div class="mt-8 p-4 bg-bowl-dark border border-bowl-border rounded-xl text-xs text-bowl-muted">
      <p><i class="fa-solid fa-info-circle text-bowl-amber mr-1"></i> <strong>Disclaimer:</strong> Challenges are for fun and friendly competition. Please wager responsibly and in accordance with local laws. Bowling Hub does not facilitate or process any financial transactions.</p>
    </div>
  `;

  // New challenge handler
  document.getElementById('btn-new-challenge').addEventListener('click', () => openNewChallengeModal(contacts));

  // Action handlers
  document.querySelectorAll('.btn-accept-challenge').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = challenges.find(c => c.id === btn.dataset.id);
      if (ch) {
        ch.status = 'Active';
        Storage.saveChallenge(ch);
        showToast('Challenge accepted! 🎳', 'success');
        renderChallenges(container);
      }
    });
  });

  document.querySelectorAll('.btn-decline-challenge').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = challenges.find(c => c.id === btn.dataset.id);
      if (ch) {
        ch.status = 'Declined';
        Storage.saveChallenge(ch);
        showToast('Challenge declined', 'info');
        renderChallenges(container);
      }
    });
  });

  document.querySelectorAll('.btn-record-result').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = challenges.find(c => c.id === btn.dataset.id);
      if (ch) openRecordResultModal(ch, container);
    });
  });

  document.querySelectorAll('.btn-delete-challenge').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this challenge?')) {
        Storage.deleteChallenge(btn.dataset.id);
        showToast('Challenge deleted', 'info');
        renderChallenges(container);
      }
    });
  });
}

function renderChallengeCard(c) {
  const statusClass = STATUS_COLORS[c.status] || 'bg-gray-500/20 text-gray-400';
  const isCompleted = c.status === 'Completed';
  const winnerLabel = c.winner === 'me' ? '🏆 You Won!' : c.winner === 'them' ? '😤 You Lost' : c.winner === 'draw' ? '🤝 Draw' : '';

  return `
    <div class="bg-bowl-dark border border-bowl-border rounded-xl p-4">
      <div class="flex items-start justify-between mb-2">
        <div>
          <p class="font-bold flex items-center gap-2">
            ⚡ vs ${c.opponentName}
            <span class="text-xs px-2 py-0.5 rounded-full ${statusClass}">${c.status}</span>
          </p>
          <p class="text-sm text-bowl-muted">${c.type} — ${c.stakes || 'Bragging rights'}</p>
        </div>
        <button class="btn-delete-challenge text-gray-500 hover:text-red-400 transition-colors text-sm" data-id="${c.id}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

      ${isCompleted ? `
        <div class="flex items-center justify-between bg-bowl-navy rounded-lg px-4 py-2 mt-2">
          <div class="text-center">
            <p class="text-xs text-bowl-muted">You</p>
            <p class="font-bold text-lg">${c.myScore || '—'}</p>
          </div>
          <div class="text-center font-bold ${c.winner === 'me' ? 'text-bowl-green' : c.winner === 'them' ? 'text-bowl-red' : 'text-gray-400'}">${winnerLabel}</div>
          <div class="text-center">
            <p class="text-xs text-bowl-muted">${c.opponentName}</p>
            <p class="font-bold text-lg">${c.theirScore || '—'}</p>
          </div>
        </div>
      ` : ''}

      <div class="flex gap-2 mt-3">
        ${c.status === 'Pending' ? `
          <button class="btn-accept-challenge text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1.5 rounded-lg transition-colors" data-id="${c.id}">
            <i class="fa-solid fa-check mr-1"></i> Accept
          </button>
          <button class="btn-decline-challenge text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors" data-id="${c.id}">
            <i class="fa-solid fa-xmark mr-1"></i> Decline
          </button>
        ` : ''}
        ${c.status === 'Active' ? `
          <button class="btn-record-result text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg transition-colors" data-id="${c.id}">
            <i class="fa-solid fa-pen mr-1"></i> Record Result
          </button>
        ` : ''}
      </div>

      <p class="text-xs text-bowl-muted mt-2">${formatDate(c.createdAt?.split('T')[0])}</p>
    </div>
  `;
}

function openNewChallengeModal(contacts) {
  showModal('⚡ New Challenge', (body) => {
    body.innerHTML = `
      <div class="space-y-4">
        ${formField('Opponent', `
          <div>
            <select id="challenge-contact" class="${selectClass()} mb-2">
              <option value="">— Choose from contacts —</option>
              ${contacts.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
            </select>
            <input type="text" id="challenge-opponent" placeholder="Or type opponent name" class="${inputClass()}" />
          </div>
        `, 'challenge-contact')}

        ${formField('Challenge Type', `
          <select id="challenge-type" class="${selectClass()}">
            ${CHALLENGE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        `, 'challenge-type')}

        ${formField('Stakes / Wager', `<input type="text" id="challenge-stakes" placeholder="Loser buys dinner" class="${inputClass()}" />`, 'challenge-stakes')}

        <button id="challenge-save" class="w-full bg-bowl-red hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <i class="fa-solid fa-bolt"></i> Create Challenge
        </button>
      </div>
    `;

    // Auto-fill from contact select
    body.querySelector('#challenge-contact').addEventListener('change', (e) => {
      if (e.target.value) {
        body.querySelector('#challenge-opponent').value = e.target.value;
      }
    });

    body.querySelector('#challenge-save').addEventListener('click', () => {
      const opponentName = body.querySelector('#challenge-opponent').value.trim() || body.querySelector('#challenge-contact').value;
      if (!opponentName) {
        showToast('Please enter an opponent', 'error');
        return;
      }

      const challenge = {
        opponentName,
        type: body.querySelector('#challenge-type').value,
        stakes: body.querySelector('#challenge-stakes').value.trim() || 'Bragging rights',
        status: 'Pending',
        myScore: null,
        theirScore: null,
        winner: null,
        completedAt: null,
      };

      // Save contact if new
      const contacts = Storage.getContacts();
      if (!contacts.find(c => c.name.toLowerCase() === opponentName.toLowerCase())) {
        Storage.saveContact({ name: opponentName, usbcId: '', email: '' });
      }

      Storage.saveChallenge(challenge);
      closeModal();
      showToast('Challenge created! ⚡', 'success');
      renderChallenges(document.getElementById('view-container'));
    });
  });
}

function openRecordResultModal(challenge, parentContainer) {
  showModal('📊 Record Result', (body) => {
    body.innerHTML = `
      <div class="space-y-4">
        <p class="text-bowl-muted text-sm">
          <strong>${challenge.type}</strong> vs <strong>${challenge.opponentName}</strong>
        </p>

        ${formField('Your Score', `<input type="number" id="result-my-score" min="0" placeholder="e.g., 650" class="${inputClass()}" />`, 'result-my-score')}
        ${formField(`${challenge.opponentName}'s Score`, `<input type="number" id="result-their-score" min="0" placeholder="e.g., 620" class="${inputClass()}" />`, 'result-their-score')}

        <button id="result-save" class="w-full bg-bowl-red hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <i class="fa-solid fa-flag-checkered"></i> Submit Result
        </button>
      </div>
    `;

    body.querySelector('#result-save').addEventListener('click', () => {
      const myScore = Number(body.querySelector('#result-my-score').value);
      const theirScore = Number(body.querySelector('#result-their-score').value);

      if (!myScore && myScore !== 0) {
        showToast('Enter your score', 'error');
        return;
      }
      if (!theirScore && theirScore !== 0) {
        showToast('Enter their score', 'error');
        return;
      }

      challenge.myScore = myScore;
      challenge.theirScore = theirScore;
      challenge.status = 'Completed';
      challenge.completedAt = new Date().toISOString();

      if (myScore > theirScore) challenge.winner = 'me';
      else if (theirScore > myScore) challenge.winner = 'them';
      else challenge.winner = 'draw';

      Storage.saveChallenge(challenge);
      closeModal();

      const resultMsg = challenge.winner === 'me' ? 'You won! 🏆' : challenge.winner === 'them' ? `${challenge.opponentName} wins 😤` : 'It\'s a draw! 🤝';
      showToast(resultMsg, challenge.winner === 'me' ? 'success' : 'info');
      renderChallenges(parentContainer);
    });
  });
}
