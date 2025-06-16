// Categorias disponíveis
const categorias = [
  'Despesas Médicas', 'Alimentação', 'Moradia', 'Contas de Consumo', 'Transporte', 'Lazer e Entretenimento', 'Outras Despesas'
];

// IndexedDB helpers
const DB_NAME = "NotasFiscaisDB";
const DB_VERSION = 1;
const STORE_NAME = "notas";
let db = null;

function abrirDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (event) => {
      const dbUpgrade = event.target.result;
      if (!dbUpgrade.objectStoreNames.contains(STORE_NAME)) {
        dbUpgrade.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}
function addNota(nota) {
  return abrirDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(nota);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function getNotas() {
  return abrirDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function deleteNota(id) {
  return abrirDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}
function updateNota(nota) {
  return abrirDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(nota);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

// Estado global
let todasNotas = [];
let categoriaSelecionada = categorias[0];
let mesSelecionado = null;

// Utilitários
function formatarData(dataStr) {
  if (!dataStr) return '';
  const [y, m, d] = dataStr.split('-');
  return `${d}/${m}/${y}`;
}
function formatarValor(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function getAnoMes(data) {
  return data ? data.slice(0,7) : '';
}
function mesNome(anoMes) {
  if (!anoMes) return '';
  const [ano, mes] = anoMes.split('-');
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${nomes[parseInt(mes,10)-1]}/${ano}`;
}

// Popula select de mês de acordo com as notas existentes
function preencherMeses() {
  const select = document.getElementById('mesSelect');
  const meses = Array.from(new Set(
    todasNotas
      .filter(n => categoriaSelecionada === "Todas" ? true : n.categoria === categoriaSelecionada)
      .map(n => getAnoMes(n.data))
  )).sort((a,b)=>b.localeCompare(a));
  select.innerHTML = '';
  if (meses.length === 0) {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0,7);
    select.innerHTML = `<option value="${mesAtual}">${mesNome(mesAtual)}</option>`;
    mesSelecionado = mesAtual;
    return;
  }
  meses.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = mesNome(m);
    select.appendChild(opt);
  });
  if (!mesSelecionado || !meses.includes(mesSelecionado)) mesSelecionado = meses[0];
  select.value = mesSelecionado;
}

// Mostra total do mês selecionado
function mostrarTotalMes() {
  const totalSpan = document.getElementById('valorTotalMes');
  const total = todasNotas.filter(n =>
    (categoriaSelecionada === "Todas" ? true : n.categoria === categoriaSelecionada) && getAnoMes(n.data) === mesSelecionado
  ).reduce((soma, n) => soma + Number(n.valor), 0);
  totalSpan.textContent = `Total do mês: ${formatarValor(total)}`;
}

// Renderiza notas filtradas por categoria, mês e busca
function renderizarNotas() {
  preencherMeses();
  mostrarTotalMes();
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = '';
  const busca = document.getElementById('searchInput').value.toLowerCase();
  const notasFiltradas = todasNotas
    .filter(nota =>
      (categoriaSelecionada === "Todas" ? true : nota.categoria === categoriaSelecionada) &&
      getAnoMes(nota.data) === mesSelecionado &&
      (
        nota.descricao.toLowerCase().includes(busca) ||
        formatarData(nota.data).includes(busca) ||
        formatarValor(nota.valor).includes(busca)
      )
    ).sort((a, b) => b.id - a.id);

  if (notasFiltradas.length === 0) {
    notesList.innerHTML = `<div style="color:var(--muted);padding:32px;font-size:1.1rem;">Nenhuma nota encontrada para esta categoria e mês.</div>`;
    return;
  }

  notasFiltradas.forEach(nota => {
    let iconeArquivo = '';
    let linkArquivo = '';
    if (nota.arquivo && nota.arquivo.name) {
      if (nota.arquivo.type === 'application/pdf') iconeArquivo = '📄';
      else if (nota.arquivo.type && nota.arquivo.type.startsWith('image/')) iconeArquivo = '🖼️';
      else iconeArquivo = '📎';
      const blob = new Blob([nota.arquivo.data], { type: nota.arquivo.type });
      const url = URL.createObjectURL(blob);
      linkArquivo = `<a href="${url}" class="note-link" target="_blank" rel="noopener"><span>${iconeArquivo}</span><span>${nota.arquivo.name}</span></a>`;
    } else {
      linkArquivo = `<span class="note-link" style="color:var(--muted);font-style:italic;"><span>📎</span><span>Nenhum arquivo</span></span>`;
    }
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <div class="note-title">${nota.descricao}</div>
      <div class="note-info">
        <span><strong>Categoria:</strong> ${nota.categoria}</span>
        <span><strong>Data:</strong> ${formatarData(nota.data)}</span>
        <span><strong>Valor:</strong> ${formatarValor(nota.valor)}</span>
      </div>
      ${linkArquivo}
      <div class="note-actions">
        <button onclick="visualizarNota(${nota.id})">Visualizar</button>
        <button onclick="editarNota(${nota.id})">Editar</button>
        <button onclick="excluirNota(${nota.id})">Excluir</button>
      </div>
    `;
    notesList.appendChild(card);
  });
}

// Visualizar nota (placeholder)
function visualizarNota(id) {
  const nota = todasNotas.find(n => n.id === id);
  alert(
    `Descrição: ${nota.descricao}\nCategoria: ${nota.categoria}\nData: ${formatarData(nota.data)}\nValor: ${formatarValor(nota.valor)}`
  );
}

// Excluir nota
function excluirNota(id) {
  if (confirm('Deseja realmente excluir esta nota fiscal?')) {
    deleteNota(id).then(() => {
      todasNotas = todasNotas.filter(n => n.id !== id);
      renderizarNotas();
    });
  }
}
window.visualizarNota = visualizarNota;
window.editarNota = editarNota;
window.excluirNota = excluirNota;

// Modal de nova nota/edição
const modalOverlay = document.getElementById('modalOverlay');
const addNoteBtn = document.getElementById('addNoteBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const noteForm = document.getElementById('noteForm');
const arquivoAtualDiv = document.getElementById('arquivoAtual');
const modalTitulo = document.getElementById('modalTitulo');
const editIdInput = document.getElementById('editId');

function abrirModal(nota = null) {
  noteForm.reset();
  arquivoAtualDiv.innerHTML = '';
  editIdInput.value = '';
  modalTitulo.textContent = nota ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal';
  if (nota) {
    document.getElementById('categoria').value = nota.categoria;
    document.getElementById('descricao').value = nota.descricao;
    document.getElementById('data').value = nota.data;
    document.getElementById('valor').value = nota.valor;
    editIdInput.value = nota.id;
    if (nota.arquivo && nota.arquivo.name) {
      let icone = '📎';
      if (nota.arquivo.type === 'application/pdf') icone = '📄';
      else if (nota.arquivo.type && nota.arquivo.type.startsWith('image/')) icone = '🖼️';
      const blob = new Blob([nota.arquivo.data], { type: nota.arquivo.type });
      const url = URL.createObjectURL(blob);
      arquivoAtualDiv.innerHTML = `<small>Arquivo atual: <a href="${url}" target="_blank">${icone} ${nota.arquivo.name}</a></small>`;
    }
  } else {
    document.getElementById('categoria').value = categoriaSelecionada !== "Todas" ? categoriaSelecionada : '';
  }
  modalOverlay.classList.remove('hidden');
  setTimeout(() => { document.getElementById('descricao').focus(); }, 120);
}
function fecharModal() { modalOverlay.classList.add('hidden'); }

addNoteBtn.addEventListener('click', ()=>abrirModal());
closeModalBtn.addEventListener('click', fecharModal);
cancelBtn.addEventListener('click', fecharModal);
modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) fecharModal(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) fecharModal(); });

noteForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const categoria = document.getElementById('categoria').value;
  const descricao = document.getElementById('descricao').value.trim();
  const data = document.getElementById('data').value;
  const valor = parseFloat(document.getElementById('valor').value);
  const arquivoInput = document.getElementById('arquivo');
  const editId = editIdInput.value ? Number(editIdInput.value) : null;
  let notaAntiga = editId ? todasNotas.find(n=>n.id===editId) : null;
  function salvarNotaComArquivo(arquivo) {
    if (editId) {
      const notaEditada = {
        id: editId,
        categoria, descricao, data, valor,
        arquivo: arquivo !== null ? arquivo : (notaAntiga ? notaAntiga.arquivo : null)
      };
      updateNota(notaEditada).then(()=>{
        const idx = todasNotas.findIndex(n=>n.id===editId);
        todasNotas[idx] = notaEditada;
        fecharModal();
        categoriaSelecionada = categoria;
        renderizarNotas();
      });
    } else {
      const novaNota = { categoria, descricao, data, valor, arquivo };
      addNota(novaNota).then(id=>{
        novaNota.id = id;
        todasNotas.unshift(novaNota);
        fecharModal();
        categoriaSelecionada = categoria;
        renderizarNotas();
      });
    }
  }
  if (arquivoInput.files.length > 0) {
    const f = arquivoInput.files[0];
    const reader = new FileReader();
    reader.onload = function(evt) {
      const arquivo = {
        name: f.name,
        type: f.type,
        data: evt.target.result
      };
      salvarNotaComArquivo(arquivo);
    };
    reader.readAsArrayBuffer(f);
  } else {
    salvarNotaComArquivo(null);
  }
});

function editarNota(id) {
  const nota = todasNotas.find(n => n.id === id);
  if (!nota) return;
  abrirModal(nota);
}

document.getElementById('searchInput').addEventListener('input', renderizarNotas);

document.querySelectorAll('aside nav a').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('aside nav a').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
    categoriaSelecionada = this.dataset.category;
    renderizarNotas();
  });
});

document.getElementById('mesSelect').addEventListener('change', function() {
  mesSelecionado = this.value;
  renderizarNotas();
});

function inicializar() {
  getNotas().then(notas => {
    todasNotas = notas;
    renderizarNotas();
  });
}
inicializar();

// ==== Botão baixar resumo em PDF ====

document.getElementById('baixarResumoBtn').addEventListener('click', function() {
  const notasMes = todasNotas.filter(n =>
    (categoriaSelecionada === "Todas" ? true : n.categoria === categoriaSelecionada) && getAnoMes(n.data) === mesSelecionado
  );
  if (notasMes.length === 0) {
    alert('Não há lançamentos para exportar neste mês/categoria.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const tituloCategoria = categoriaSelecionada === "Todas" ? "Todas as Despesas" : categoriaSelecionada;
  doc.setFontSize(16);
  doc.text(`Resumo de Gastos - ${tituloCategoria}`, 10, 15);
  doc.setFontSize(11);
  doc.text(`Mês: ${mesNome(mesSelecionado)}`, 10, 23);

  const startY = 32;
  let y = startY;

  doc.setFont('helvetica','bold');
  doc.text('Categoria', 10, y);
  doc.text('Descrição', 48, y);
  doc.text('Data', 120, y);
  doc.text('Valor', 150, y);
  doc.setFont('helvetica','normal');
  y += 6;

  notasMes.forEach(nota => {
    doc.text(nota.categoria, 10, y, { maxWidth: 36 });
    doc.text(nota.descricao, 48, y, { maxWidth: 70 });
    doc.text(formatarData(nota.data), 120, y);
    doc.text(formatarValor(nota.valor), 150, y);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
  });

  const total = notasMes.reduce((soma, n) => soma + Number(n.valor), 0);
  y += 6;
  doc.setFont('helvetica','bold');
  doc.text(`Total do mês: ${formatarValor(total)}`, 10, y);

  const nomeArquivo = `Resumo-${tituloCategoria.replace(/\s/g,'')}-${mesSelecionado}.pdf`;
  doc.save(nomeArquivo);
});
