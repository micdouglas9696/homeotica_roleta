/**
 * Roleta de Prêmios - Home Ótica
 * Versão Tablet Tela Cheia (100% Imersiva)
 * Sem necessidade de banco de dados (armazena via LocalStorage).
 */

// ==========================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// ==========================================
const STORAGE_KEYS = {
  PRIZES: 'home_otica_prizes_v2', // v2 para carregar a nova lista de brinquedos automaticamente
  HISTORY: 'home_otica_history_v2',
  SOUND: 'home_otica_sound_v2'
};

// Paleta harmônica de alto contraste com o Azul e Branco da Home Ótica
const WHEEL_COLORS = [
  '#0d6efd', // Azul Royal Home Ótica
  '#059669', // Verde Esmeralda
  '#d97706', // Ouro / Âmbar
  '#7c3aed', // Roxo Violeta
  '#e11d48', // Vermelho Rubi
  '#0284c7', // Azul Turquesa
  '#db2777', // Rosa Chiclete
  '#ea580c'  // Laranja Vibrante
];

// Relação de brinquedos e brindes da Home Ótica (conforme fotos e especificações)
const DEFAULT_PRIZES = [
  { id: '1', name: 'Laptop Infantil Musical', quantity: 2, color: '#db2777' },
  { id: '2', name: 'Squishy Pãozinho Dumpling', quantity: 10, color: '#d97706' },
  { id: '3', name: 'Girafa Pop Tube Ventosa', quantity: 10, color: '#059669' },
  { id: '4', name: 'Consulta Tia Paula Odonto', quantity: 10, color: '#7c3aed' },
  { id: '5', name: 'Óculos de Sol Infantil', quantity: 2, color: '#0284c7' },
  { id: '6', name: '5% Desconto em Compras', quantity: 15, color: '#0d6efd' },
  { id: '7', name: 'Indique Amigo: 30% OFF', quantity: 10, color: '#e11d48' }
];

let prizes = [];
let winnersHistory = [];
let isSoundEnabled = true;

// Estado da Roleta
let isSpinning = false;
let currentRotation = 0; // em radianos
let lastTickSliceIndex = -1;

// Elementos DOM
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const centerSpinBtn = document.getElementById('centerSpinBtn');
const pointerEl = document.getElementById('wheelPointer');
const totalStockText = document.getElementById('totalStockText');
const wheelContainer = document.getElementById('wheelContainer');
const emptyStateCard = document.getElementById('emptyStateCard');
const emptyStateAdminBtn = document.getElementById('emptyStateAdminBtn');

// Modais
const winnerModal = document.getElementById('winnerModal');
const winnerPrizeName = document.getElementById('winnerPrizeName');
const winnerRemainingText = document.getElementById('winnerRemainingText');
const closeWinnerBtn = document.getElementById('closeWinnerBtn');

const adminModal = document.getElementById('adminModal');
const openAdminBtn = document.getElementById('openAdminBtn');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const prizesList = document.getElementById('prizesList');
const addPrizeForm = document.getElementById('addPrizeForm');
const newPrizeNameInput = document.getElementById('newPrizeName');
const newPrizeQtyInput = document.getElementById('newPrizeQty');
const historyList = document.getElementById('historyList');
const historyCountText = document.getElementById('historyCountText');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const importJsonInput = document.getElementById('importJsonInput');
const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');

// Botões do Header
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundOnIcon = document.getElementById('soundOnIcon');
const soundOffIcon = document.getElementById('soundOffIcon');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// ==========================================
// SISTEMA DE SOM COM WEB AUDIO API
// ==========================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTickSound() {
  if (!isSoundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch (e) {
    console.warn('Erro áudio tick:', e);
  }
}

function playVictoryFanfare() {
  if (!isSoundEnabled || !audioCtx) return;
  try {
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.16 }, // C5
      { freq: 659.25, time: 0.13, dur: 0.16 }, // E5
      { freq: 783.99, time: 0.26, dur: 0.22 }, // G5
      { freq: 1046.50, time: 0.42, dur: 0.70 } // C6
    ];

    notes.forEach(note => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, audioCtx.currentTime + note.time);

      gain.gain.setValueAtTime(0.28, audioCtx.currentTime + note.time);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + note.time + note.dur);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime + note.time);
      osc.stop(audioCtx.currentTime + note.time + note.dur);
    });
  } catch (e) {
    console.warn('Erro áudio vitória:', e);
  }
}

// ==========================================
// PERSISTÊNCIA EM LOCALSTORAGE
// ==========================================
function loadData() {
  try {
    const storedPrizes = localStorage.getItem(STORAGE_KEYS.PRIZES);
    if (storedPrizes) {
      prizes = JSON.parse(storedPrizes);
    } else {
      prizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));
      savePrizes();
    }

    const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (storedHistory) {
      winnersHistory = JSON.parse(storedHistory);
    } else {
      winnersHistory = [];
    }

    const storedSound = localStorage.getItem(STORAGE_KEYS.SOUND);
    if (storedSound !== null) {
      isSoundEnabled = storedSound === 'true';
    }
  } catch (e) {
    console.error('Falha ao carregar do LocalStorage:', e);
    prizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));
  }
  updateSoundIcon();
}

function savePrizes() {
  try {
    localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
  } catch (e) {
    console.error('Falha ao salvar brindes:', e);
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(winnersHistory));
  } catch (e) {
    console.error('Falha ao salvar histórico:', e);
  }
}

// Retorna apenas os brindes com estoque > 0
function getAvailablePrizes() {
  return prizes.filter(p => p.quantity > 0);
}

function getTotalStockCount() {
  return prizes.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
}

// ==========================================
// RENDERIZAÇÃO DA ROLETA EM CANVAS
// ==========================================
function setupCanvasResolution() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(rect.width, rect.height) || 520;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);
}

function drawWheel() {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 16;

  ctx.clearRect(0, 0, width, height);

  const available = getAvailablePrizes();
  const totalStock = getTotalStockCount();

  totalStockText.textContent = `${totalStock} brinde(s) em estoque • ${available.length} prêmio(s) ativos`;

  if (available.length === 0) {
    wheelContainer.style.display = 'none';
    emptyStateCard.classList.add('active');
    spinBtn.disabled = true;
    return;
  } else {
    wheelContainer.style.display = 'flex';
    emptyStateCard.classList.remove('active');
    if (!isSpinning) spinBtn.disabled = false;
  }

  // Se houver 1 brinde, desenhamos com 2 fatias espelhadas para girar normalmente
  let slicesToDraw = available;
  if (available.length === 1) {
    slicesToDraw = [available[0], available[0]];
  }

  const numSlices = slicesToDraw.length;
  const arcAngle = (2 * Math.PI) / numSlices;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(currentRotation);

  // 1. Fatias Coloridas
  for (let i = 0; i < numSlices; i++) {
    const item = slicesToDraw[i];
    const startAngle = i * arcAngle;
    const endAngle = startAngle + arcAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = item.color || WHEEL_COLORS[i % WHEEL_COLORS.length];
    ctx.fill();

    // Divisória branca suave
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    // 2. Textos do Brinde na Fatia
    ctx.save();
    ctx.rotate(startAngle + arcAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const textRadius = radius - 30;
    ctx.fillStyle = '#ffffff';

    // Responsividade da fonte conforme número de fatias
    let fontSize = numSlices > 10 ? 12 : (numSlices > 6 ? 14 : 16);
    ctx.font = `800 ${fontSize}px sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    let title = item.name;
    const maxChars = numSlices > 8 ? 20 : 25;
    if (title.length > maxChars) {
      title = title.substring(0, maxChars - 2) + '...';
    }

    // Nome do brinde
    ctx.fillText(title, textRadius, -8);

    // Indicador de estoque restante (ex: "10 rest.")
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${fontSize - 3}px sans-serif`;
    const qtyText = `[${item.quantity} un.]`;
    ctx.fillText(qtyText, textRadius, 11);

    ctx.restore();
  }

  // 3. Pinos cromados nos vértices de cada fatia
  for (let i = 0; i < numSlices; i++) {
    const pinAngle = i * arcAngle;
    const pinX = Math.cos(pinAngle) * (radius - 6);
    const pinY = Math.sin(pinAngle) * (radius - 6);

    ctx.beginPath();
    ctx.arc(pinX, pinY, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0056b3';
    ctx.stroke();
  }

  ctx.restore();

  // 4. Borda Externa Luxuosa Azul Royal e Branco
  ctx.save();
  ctx.translate(centerX, centerY);

  // Anel Branco / Cromado
  ctx.beginPath();
  ctx.arc(0, 0, radius + 2, 0, 2 * Math.PI);
  ctx.lineWidth = 12;
  const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
  rimGrad.addColorStop(0, '#ffffff');
  rimGrad.addColorStop(0.5, '#e0f2fe');
  rimGrad.addColorStop(1, '#90caf9');
  ctx.strokeStyle = rimGrad;
  ctx.stroke();

  // Anel Azul Fino Externo
  ctx.beginPath();
  ctx.arc(0, 0, radius + 8, 0, 2 * Math.PI);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00d2ff';
  ctx.stroke();

  // LEDs Luminosos em torno da borda
  const numLeds = 24;
  for (let i = 0; i < numLeds; i++) {
    const ledAngle = (i * 2 * Math.PI) / numLeds;
    const ledX = Math.cos(ledAngle) * (radius + 2);
    const ledY = Math.sin(ledAngle) * (radius + 2);

    ctx.beginPath();
    ctx.arc(ledX, ledY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#00d2ff';
    ctx.shadowColor = '#00d2ff';
    ctx.shadowBlur = 6;
    ctx.fill();
  }

  ctx.restore();
}

// ==========================================
// ANIMAÇÃO DE GIRO DA ROLETA
// ==========================================
function spinWheel() {
  if (isSpinning) return;

  initAudio();

  const available = getAvailablePrizes();
  if (available.length === 0) {
    alert('Nenhum brinde disponível no momento!');
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;
  centerSpinBtn.disabled = true;

  let slices = available;
  if (available.length === 1) {
    slices = [available[0], available[0]];
  }

  const numSlices = slices.length;
  const arcAngle = (2 * Math.PI) / numSlices;

  // Sorteio aleatório entre os brindes com estoque > 0
  const winningPrizeIndex = Math.floor(Math.random() * available.length);
  const winningPrize = available[winningPrizeIndex];

  let targetSliceIndex = slices.findIndex(s => s.id === winningPrize.id);
  if (targetSliceIndex === -1) targetSliceIndex = 0;

  // Ponteiro fica fixo no topo (-PI / 2)
  const pointerAngle = -Math.PI / 2;

  // Giros completos (7 a 10 voltas para emoção no tablet)
  const fullRotations = (7 + Math.floor(Math.random() * 3)) * (2 * Math.PI);

  // Ponto seguro dentro da fatia
  const slicePadding = arcAngle * 0.22;
  const randomOffsetInSlice = slicePadding + Math.random() * (arcAngle - slicePadding * 2);

  const startRotation = currentRotation % (2 * Math.PI);
  const targetSliceCenter = targetSliceIndex * arcAngle + randomOffsetInSlice;
  let finalTargetRotation = pointerAngle - targetSliceCenter;

  while (finalTargetRotation < startRotation) {
    finalTargetRotation += 2 * Math.PI;
  }
  const totalRotationNeeded = (finalTargetRotation - startRotation) + fullRotations;
  const endRotation = startRotation + totalRotationNeeded;

  const duration = 6500;
  const startTime = performance.now();

  function animateSpin(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing Quartic Out (desaceleração cinematográfica)
    const easeOut = 1 - Math.pow(1 - progress, 4);

    currentRotation = startRotation + totalRotationNeeded * easeOut;

    // Detecta passagem dos pinos sob o ponteiro
    const normalizedRot = (currentRotation % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
    const currentSliceUnderPointer = Math.floor(((pointerAngle - normalizedRot) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI) / arcAngle);

    if (currentSliceUnderPointer !== lastTickSliceIndex) {
      lastTickSliceIndex = currentSliceUnderPointer;
      playTickSound();
      pointerEl.classList.add('tick-bounce');
      setTimeout(() => pointerEl.classList.remove('tick-bounce'), 45);
    }

    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animateSpin);
    } else {
      currentRotation = endRotation;
      drawWheel();
      isSpinning = false;
      spinBtn.disabled = false;
      centerSpinBtn.disabled = false;

      handleWin(winningPrize);
    }
  }

  requestAnimationFrame(animateSpin);
}

// ==========================================
// PROCESSAMENTO DO GANHADOR
// ==========================================
function handleWin(prizeWon) {
  // 1. Decrementa o estoque do brinde ganho
  const prizeItem = prizes.find(p => p.id === prizeWon.id);
  if (prizeItem && prizeItem.quantity > 0) {
    prizeItem.quantity -= 1;
    savePrizes();
  }

  // 2. Registra no histórico
  const historyEntry = {
    id: Date.now().toString(),
    prizeName: prizeWon.name,
    timestamp: new Date().toLocaleString('pt-BR')
  };
  winnersHistory.unshift(historyEntry);
  saveHistory();

  // 3. Efeitos de celebração
  playVictoryFanfare();
  startConfetti();

  // 4. Modal
  winnerPrizeName.textContent = prizeWon.name;
  if (prizeItem) {
    if (prizeItem.quantity === 0) {
      winnerRemainingText.textContent = `Atenção: Este brinde acabou de se esgotar no estoque!`;
    } else {
      winnerRemainingText.textContent = `Restam ${prizeItem.quantity} unidade(s) disponíveis deste item.`;
    }
  }
  winnerModal.classList.add('open');

  renderPrizesList();
  renderHistoryList();
}

// ==========================================
// CONFETES EM CANVAS
// ==========================================
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimationId = null;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

function startConfetti() {
  resizeConfetti();
  confettiParticles = [];
  const colors = ['#ffffff', '#00d2ff', '#0d6efd', '#ffd166', '#ec4899', '#10b981'];

  for (let i = 0; i < 180; i++) {
    confettiParticles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 40,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.75) * 20,
      size: Math.random() * 9 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 14,
      opacity: 1,
      decay: Math.random() * 0.005 + 0.005
    });
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  animateConfetti();
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  let activeCount = 0;
  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.38;
    p.vx *= 0.98;
    p.rotation += p.rotationSpeed;
    p.opacity -= p.decay;

    if (p.opacity > 0 && p.y < confettiCanvas.height + 60) {
      activeCount++;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.globalAlpha = Math.max(0, p.opacity);
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    }
  });

  if (activeCount > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ==========================================
// PAINEL DE GERENCIAMENTO (ADMIN)
// ==========================================
function renderPrizesList() {
  prizesList.innerHTML = '';

  if (prizes.length === 0) {
    prizesList.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.9rem;">
        Nenhum brinde cadastrado. Adicione um novo no formulário acima!
      </div>
    `;
    return;
  }

  prizes.forEach(prize => {
    const isDepleted = prize.quantity <= 0;
    const card = document.createElement('div');
    card.className = `stock-card ${isDepleted ? 'depleted' : ''}`;

    card.innerHTML = `
      <div class="stock-card-left">
        <span class="stock-color-dot" style="background:${prize.color};"></span>
        <div style="min-width:0;">
          <div class="stock-title" title="${prize.name}">${prize.name}</div>
          <span class="badge-status ${isDepleted ? 'empty' : 'in-stock'}">
            ${isDepleted ? 'Esgotado (Oculto da Roleta)' : `${prize.quantity} un. em estoque`}
          </span>
        </div>
      </div>
      <div class="stock-card-right">
        <div class="stepper">
          <button class="btn-step btn-minus" data-id="${prize.id}" title="Diminuir">-</button>
          <span class="step-num">${prize.quantity}</span>
          <button class="btn-step btn-plus" data-id="${prize.id}" title="Aumentar">+</button>
        </div>
        <button class="btn-trash" data-id="${prize.id}" title="Excluir item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    `;

    card.querySelector('.btn-minus').addEventListener('click', () => adjustQuantity(prize.id, -1));
    card.querySelector('.btn-plus').addEventListener('click', () => adjustQuantity(prize.id, 1));
    card.querySelector('.btn-trash').addEventListener('click', () => {
      if (confirm(`Deseja remover o brinde "${prize.name}"?`)) {
        deletePrize(prize.id);
      }
    });

    prizesList.appendChild(card);
  });
}

function adjustQuantity(id, delta) {
  const item = prizes.find(p => p.id === id);
  if (!item) return;

  item.quantity = Math.max(0, item.quantity + delta);
  savePrizes();
  renderPrizesList();
  drawWheel();
}

function deletePrize(id) {
  prizes = prizes.filter(p => p.id !== id);
  savePrizes();
  renderPrizesList();
  drawWheel();
}

function renderHistoryList() {
  historyList.innerHTML = '';
  historyCountText.textContent = `${winnersHistory.length} brinde(s) sorteado(s)`;

  if (winnersHistory.length === 0) {
    historyList.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.9rem;">
        Nenhum brinde sorteado até o momento.
      </div>
    `;
    return;
  }

  winnersHistory.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-entry';
    item.innerHTML = `
      <div>
        <div style="font-weight:700;">🎁 ${entry.prizeName}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${entry.timestamp}</div>
      </div>
    `;
    historyList.appendChild(item);
  });
}

// Formulário de Adicionar Brinde
addPrizeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = newPrizeNameInput.value.trim();
  const qty = parseInt(newPrizeQtyInput.value, 10);

  if (!name || isNaN(qty) || qty < 1) return;

  const colorIndex = prizes.length % WHEEL_COLORS.length;
  const newPrize = {
    id: Date.now().toString(),
    name: name,
    quantity: qty,
    color: WHEEL_COLORS[colorIndex]
  };

  prizes.push(newPrize);
  savePrizes();

  newPrizeNameInput.value = '';
  newPrizeQtyInput.value = '5';

  renderPrizesList();
  drawWheel();
});

// Limpar Histórico
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Deseja limpar todo o histórico de sorteios?')) {
    winnersHistory = [];
    saveHistory();
    renderHistoryList();
  }
});

// Exportar Backup
exportJsonBtn.addEventListener('click', () => {
  const data = {
    exportDate: new Date().toISOString(),
    store: 'Home Ótica',
    prizes: prizes,
    history: winnersHistory
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-roleta-home-otica-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Importar Backup
importJsonInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (Array.isArray(parsed.prizes)) {
        prizes = parsed.prizes;
        if (Array.isArray(parsed.history)) {
          winnersHistory = parsed.history;
        }
        savePrizes();
        saveHistory();
        renderPrizesList();
        renderHistoryList();
        drawWheel();
        alert('Backup importado com sucesso!');
      } else {
        alert('Formato de backup inválido.');
      }
    } catch (err) {
      alert('Erro ao importar arquivo: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Restaurar Padrões da Campanha
resetDefaultsBtn.addEventListener('click', () => {
  if (confirm('Deseja restaurar a lista oficial de brinquedos da Home Ótica?')) {
    prizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));
    savePrizes();
    renderPrizesList();
    drawWheel();
  }
});

// Alternar Abas no Modal Admin
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(btn.getAttribute('data-tab'));
    if (target) target.classList.add('active');
  });
});

// ==========================================
// EVENTOS E INTERAÇÕES
// ==========================================
spinBtn.addEventListener('click', spinWheel);
centerSpinBtn.addEventListener('click', spinWheel);

closeWinnerBtn.addEventListener('click', () => {
  winnerModal.classList.remove('open');
  drawWheel();
});

openAdminBtn.addEventListener('click', () => {
  renderPrizesList();
  renderHistoryList();
  adminModal.classList.add('open');
});

emptyStateAdminBtn.addEventListener('click', () => {
  renderPrizesList();
  renderHistoryList();
  adminModal.classList.add('open');
});

closeAdminBtn.addEventListener('click', () => {
  adminModal.classList.remove('open');
  drawWheel();
});

// Fechar ao clicar fora
[winnerModal, adminModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      drawWheel();
    }
  });
});

// Som
function updateSoundIcon() {
  if (isSoundEnabled) {
    soundOnIcon.style.display = 'block';
    soundOffIcon.style.display = 'none';
  } else {
    soundOnIcon.style.display = 'none';
    soundOffIcon.style.display = 'block';
  }
}

soundToggleBtn.addEventListener('click', () => {
  initAudio();
  isSoundEnabled = !isSoundEnabled;
  localStorage.setItem(STORAGE_KEYS.SOUND, isSoundEnabled.toString());
  updateSoundIcon();
});

// Tela Cheia (Essencial para Tablet)
fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Erro ao entrar em tela cheia:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
});

// Redimensionamento
window.addEventListener('resize', () => {
  setupCanvasResolution();
  drawWheel();
});

// Inicialização robusta para Vite/Vercel
function initApp() {
  loadData();
  setupCanvasResolution();
  drawWheel();
  renderPrizesList();
  renderHistoryList();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
