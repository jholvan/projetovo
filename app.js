// Cole seu config do Firebase aqui (pegue no console do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyBKdc1KrdH3PGqyER_ySGyiqLCeYaciEgI",
  authDomain: "projetovo-a6c9c.firebaseapp.com",
  projectId: "projetovo-a6c9c",
  storageBucket: "projetovo-a6c9c.firebasestorage.app",
  messagingSenderId: "452953019157",
  appId: "1:452953019157:web:3a365894fc60cd01ef8f1c",
  measurementId: "G-R4J14EL62Y"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Autenticação ---
const authContainer = document.getElementById("auth-container");
const regContainer = document.getElementById("register-container");
const mainApp = document.getElementById("main-app");

document.getElementById("show-register").onclick = (e) => {
  e.preventDefault(); authContainer.style.display = "none"; regContainer.style.display = "block";
};
document.getElementById("show-login").onclick = (e) => {
  e.preventDefault(); regContainer.style.display = "none"; authContainer.style.display = "block";
};

// Login
document.getElementById("login-form").onsubmit = function(e){
  e.preventDefault();
  document.getElementById("login-erro").textContent = "";
  const email = document.getElementById("email").value;
  const senha = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, senha)
    .catch(err => document.getElementById("login-erro").textContent = err.message);
};

// Cadastro
document.getElementById("register-form").onsubmit = function(e){
  e.preventDefault();
  document.getElementById("register-erro").textContent = "";
  const email = document.getElementById("reg-email").value;
  const senha = document.getElementById("reg-password").value;
  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => { 
      regContainer.style.display="none";
      authContainer.style.display="block";
    })
    .catch(err => document.getElementById("register-erro").textContent = err.message);
};

// Logout
document.getElementById("logoutBtn").onclick = function(){
  auth.signOut();
};

// Controle de tela conforme login
auth.onAuthStateChanged(user => {
  if(user){
    authContainer.style.display = "none";
    regContainer.style.display = "none";
    mainApp.style.display = "block";
    inicializar();
  } else {
    authContainer.style.display = "block";
    regContainer.style.display = "none";
    mainApp.style.display = "none";
  }
});

// --- App Notas ---
const categorias = [
  'Despesas Médicas', 'Alimentação', 'Moradia', 'Contas de Consumo', 'Transporte', 'Lazer e Entretenimento', 'Outras Despesas'
];
let todasNotas = [];
let categoriaSelecionada = categorias[0];
let mesSelecionado = null;

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [y, m, d] = dataStr.split('-');
  return `${d}/${m}/${y}`;
}
function formatarValor(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function getAnoMes(data) { return data ? data.slice(0,7) : ''; }
function mesNome(anoMes) {
  if (!anoMes) return '';
  const [ano, mes] = anoMes.split('-');
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${nomes[parseInt(mes,10)-1]}/${ano}`;
}

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

function mostrarTotalMes() {
  const totalSpan = document.getElementById('valorTotalMes');
  const total = todasNotas.filter(n =>
    (categoriaSelecionada === "Todas" ? true : n.categoria === categoriaSelecionada) && getAnoMes(n.data) === mesSelecionado
  ).reduce((soma, n) => soma + Number(n.valor), 0);
  totalSpan.textContent = `Total do mês: ${formatarValor(total)}`;
}

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
    ).sort((a, b) => b.id.localeCompare(a.id));
  if (notasFiltradas.length === 0) {
    notesList.innerHTML = `<div style="color:var(--muted);padding:32px;font-size:1.1rem;">Nenhuma nota encontrada para esta categoria e mês.</div>`;
    return;
  }
  notasFiltradas.forEach(nota => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <div class="note-title">${nota.descricao}</div>
      <div class="note-info">
        <span><strong>Categoria:</strong> ${nota.categoria}</span>
        <span><strong>Data:</strong> ${formatarData(nota.data)}</span>
        <span><strong>Valor:</strong> ${formatarValor(nota.valor)}</span>
      </div>
      <div class="note-actions">
        <button onclick="visualizarNota('${nota.id}')">Visualizar</button>
        <button onclick="editarNota('${nota.id}')">Editar</button>
        <button onclick="excluirNota('${nota.id}')">Excluir</button>
      </div>
    `;
    notesList.appendChild(card);
  });
}

function visualizarNota(id) {
  const nota = todasNotas.find(n => n.id === id);
  alert(
    `Descrição: ${nota.descricao}\nCategoria: ${nota.categoria}\nData: ${formatarData(nota.data)}\nValor: ${formatarValor(nota.valor)}`
  );
}
function excluirNota(id) {
  if (confirm('Deseja realmente excluir esta nota fiscal?')) {
    db.collection("notas").doc(id).delete().then(()=>{
      todasNotas = todasNotas.filter(n => n.id !== id);
      renderizarNotas();
    });
  }
}
window.visualizarNota = visualizarNota;
window.editarNota = editarNota;
window.excluirNota = excluirNota;

const modalOverlay = document.getElementById('modalOverlay');
const addNoteBtn = document.getElementById('addNoteBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const noteForm = document.getElementById('noteForm');
const modalTitulo = document.getElementById('modalTitulo');
const editIdInput = document.getElementById('editId');

function abrirModal(nota = null) {
  noteForm.reset();
  editIdInput.value = '';
  modalTitulo.textContent = nota ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal';
  if (nota) {
    document.getElementById('categoria').value = nota.categoria;
    document.getElementById('descricao').value = nota.descricao;
    document.getElementById('data').value = nota.data;
    document.getElementById('valor').value = nota.valor;
    editIdInput.value = nota.id;
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
  const editId = editIdInput.value ? editIdInput.value : null;
  if (editId) {
    db.collection("notas").doc(editId).set({categoria, descricao, data, valor}).then(()=>{
      const idx = todasNotas.findIndex(n=>n.id===editId);
      todasNotas[idx] = {id: editId, categoria, descricao, data, valor};
      fecharModal();
      categoriaSelecionada = categoria;
      renderizarNotas();
    });
  } else {
    db.collection("notas").add({categoria, descricao, data, valor}).then(docRef=>{
      todasNotas.unshift({id: docRef.id, categoria, descricao, data, valor});
      fecharModal();
      categoriaSelecionada = categoria;
      renderizarNotas();
    });
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
  db.collection("notas").get().then(snapshot => {
    todasNotas = [];
    snapshot.forEach(doc => {
      todasNotas.push({...doc.data(), id: doc.id});
    });
    renderizarNotas();
  });
}

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
