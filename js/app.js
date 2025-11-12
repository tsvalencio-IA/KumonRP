// App.js - Plataforma de Diário de Reuniões Kumon
// RE-ARQUITETADO PARA FLUXO DE 2 ETAPAS (100% GEMINI)
// VERSÃO DASHBOARD: Relatórios Gerenciais com Gráficos e Listas de Risco
const App = {
    state: {
        userId: null,
        db: null, // Instância do Realtime Database
        students: {},
        currentStudentId: null,
        reportData: null, 
        audioFile: null,
        charts: {} // Para armazenar instâncias dos gráficos
    },
    elements: {},

    init(user, databaseInstance) {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.classList.add('hidden');
        }

        document.getElementById('app-container').classList.remove('hidden');
        this.state.userId = user.uid;
        this.state.db = databaseInstance; 
        
        document.getElementById('userEmail').textContent = user.email;
        this.mapDOMElements();
        this.addEventListeners();
        this.loadStudents();
    },

    mapDOMElements() {
        this.elements = {
            // Geral
            logoutButton: document.getElementById('logout-button'),
            systemOptionsBtn: document.getElementById('system-options-btn'),
            dashboardBtn: document.getElementById('dashboard-btn'), // **NOVO**
            
            // Dashboard
            dashboardModal: document.getElementById('dashboardModal'),
            closeDashboardBtn: document.getElementById('closeDashboardBtn'),
            riskList: document.getElementById('riskList'),
            starList: document.getElementById('starList'),

            // Diário de Reuniões
            meetingDate: document.getElementById('meetingDate'),
            meetingStudentSelect: document.getElementById('meetingStudentSelect'), 
            audioUpload: document.getElementById('audioUpload'),
            audioFileName: document.getElementById('audioFileName'),
            additionalNotes: document.getElementById('additionalNotes'),
            transcribeAudioBtn: document.getElementById('transcribeAudioBtn'),
            
            // Módulo de Transcrição
            transcriptionModule: document.getElementById('transcriptionModule'),
            transcriptionOutput: document.getElementById('transcriptionOutput'),
            analyzeTranscriptionBtn: document.getElementById('analyzeTranscriptionBtn'),

            // Relatórios
            reportSection: document.getElementById('reportSection'),
            reportContent: document.getElementById('reportContent'),
            downloadReportBtn: document.getElementById('downloadReportBtn'),
            
            // Módulo de Alunos
            addStudentBtn: document.getElementById('addStudentBtn'),
            studentSearch: document.getElementById('studentSearch'),
            studentList: document.getElementById('student-list'),
            studentModal: document.getElementById('studentModal'),
            modalTitle: document.getElementById('modalTitle'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            studentForm: document.getElementById('studentForm'),
            studentIdInput: document.getElementById('studentId'),
            saveStudentBtn: document.getElementById('saveStudentBtn'),
            deleteStudentBtn: document.getElementById('deleteStudentBtn'),
            programmingForm: document.getElementById('programmingForm'),
            reportForm: document.getElementById('reportForm'),
            performanceForm: document.getElementById('performanceForm'),
            studentAnalysisContent: document.getElementById('student-analysis-content'),
            programmingHistory: document.getElementById('programmingHistory'),
            reportHistory: document.getElementById('reportHistory'),
            performanceLog: document.getElementById('performanceHistory'), 

            // Módulo Brain
            brainFileUpload: document.getElementById('brainFileUpload'),
            uploadBrainFileBtn: document.getElementById('uploadBrainFileBtn'),
        };
    },

    addEventListeners() {
        // Geral
        this.elements.logoutButton.addEventListener('click', () => firebase.auth().signOut());
        this.elements.systemOptionsBtn.addEventListener('click', () => this.promptForReset());
        this.elements.dashboardBtn.addEventListener('click', () => this.openDashboard()); // **NOVO**
        this.elements.closeDashboardBtn.addEventListener('click', () => this.closeDashboard()); // **NOVO**
        this.elements.dashboardModal.addEventListener('click', (e) => { if (e.target === this.elements.dashboardModal) this.closeDashboard(); });

        // Diário de Reuniões
        this.elements.audioUpload.addEventListener('change', () => this.handleFileUpload());
        this.elements.meetingStudentSelect.addEventListener('change', () => this.handleFileUpload());
        this.elements.transcribeAudioBtn.addEventListener('click', () => this.transcribeAudioGemini()); 
        this.elements.analyzeTranscriptionBtn.addEventListener('click', () => this.analyzeTranscriptionGemini()); 
        
        this.elements.downloadReportBtn.addEventListener('click', () => this.downloadReport());
        this.elements.uploadBrainFileBtn.addEventListener('click', () => this.handleBrainFileUpload());
        
        // Alunos
        this.elements.addStudentBtn.addEventListener('click', () => this.openStudentModal());
        this.elements.studentSearch.addEventListener('input', () => this.renderStudentList());
        this.elements.closeModalBtn.addEventListener('click', () => this.closeStudentModal());
        this.elements.saveStudentBtn.addEventListener('click', () => this.saveStudent());
        this.elements.deleteStudentBtn.addEventListener('click', () => this.deleteStudent());
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab)));
        this.elements.programmingForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'programmingHistory', this.elements.programmingForm));
        this.elements.reportForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'reportHistory', this.elements.reportForm));
        this.elements.performanceForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'performanceLog', this.elements.performanceForm)); 
        this.elements.studentModal.addEventListener('click', (e) => { if (e.target === this.elements.studentModal) this.closeStudentModal(); });
    },

    // =====================================================================
    // ================== LÓGICA DO DASHBOARD (NOVO) =======================
    // =====================================================================

    openDashboard() {
        this.elements.dashboardModal.classList.remove('hidden');
        this.generateDashboardData();
    },

    closeDashboard() {
        this.elements.dashboardModal.classList.add('hidden');
    },

    generateDashboardData() {
        const students = Object.values(this.state.students);
        
        // 1. Dados para o Gráfico de Estágios (Matemática)
        const stages = {};
        students.forEach(s => {
            if (s.mathStage) {
                // Pega só a letra (Ex: "D150" -> "D")
                const stageLetter = s.mathStage.charAt(0).toUpperCase();
                stages[stageLetter] = (stages[stageLetter] || 0) + 1;
            }
        });

        // 2. Dados de Risco/Motivação (Baseado na última análise da IA)
        const riskStudents = [];
        const starStudents = [];
        let riskCount = 0;
        let starCount = 0;
        let neutralCount = 0;

        students.forEach(s => {
            if (s.meetingHistory && s.meetingHistory.length > 0) {
                // Pega a última análise
                const lastReport = s.meetingHistory[s.meetingHistory.length - 1];
                // Converte o JSON em string para buscar palavras-chave
                const reportText = JSON.stringify(lastReport).toLowerCase();

                // Heurística simples para categorizar (baseado no texto da IA)
                const hasRisk = reportText.includes("dificuldade") || reportText.includes("desmotivado") || reportText.includes("desistência") || reportText.includes("atraso") || reportText.includes("resistência");
                const hasStar = reportText.includes("elogio") || reportText.includes("avanço") || reportText.includes("excelente") || reportText.includes("motivado") || reportText.includes("parabéns");

                if (hasRisk) {
                    riskStudents.push(s);
                    riskCount++;
                } else if (hasStar) {
                    starStudents.push(s);
                    starCount++;
                } else {
                    neutralCount++;
                }
            } else {
                neutralCount++; // Sem análise ainda
            }
        });

        // Renderizar Listas
        this.renderDashboardList(this.elements.riskList, riskStudents, '⚠️');
        this.renderDashboardList(this.elements.starList, starStudents, '⭐');

        // Renderizar Gráficos (Chart.js)
        this.renderCharts(stages, { risk: riskCount, star: starCount, neutral: neutralCount });
    },

    renderDashboardList(element, list, icon) {
        element.innerHTML = list.length ? '' : '<li class="text-gray-500">Nenhum aluno nesta categoria.</li>';
        list.forEach(s => {
            const li = document.createElement('li');
            li.style.padding = "5px 0";
            li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `<strong>${icon} ${s.name}</strong> <span style="font-size:0.8em; color:#666;">(${s.responsible})</span>`;
            // Ao clicar, abre a ficha do aluno
            li.style.cursor = "pointer";
            li.onclick = () => {
                this.closeDashboard();
                this.openStudentModal(Object.keys(this.state.students).find(key => this.state.students[key] === s));
            };
            element.appendChild(li);
        });
    },

    renderCharts(stageData, moodData) {
        // Destruir gráficos antigos se existirem (para não sobrepor)
        if (this.state.charts.stages) this.state.charts.stages.destroy();
        if (this.state.charts.mood) this.state.charts.mood.destroy();

        // Gráfico de Estágios (Barra)
        const ctxStages = document.getElementById('stagesChart').getContext('2d');
        this.state.charts.stages = new Chart(ctxStages, {
            type: 'bar',
            data: {
                labels: Object.keys(stageData).sort(),
                datasets: [{
                    label: 'Qtd Alunos',
                    data: Object.keys(stageData).sort().map(k => stageData[k]),
                    backgroundColor: '#0078c1'
                }]
            },
            options: { responsive: true }
        });

        // Gráfico de Humor (Pizza)
        const ctxMood = document.getElementById('moodChart').getContext('2d');
        this.state.charts.mood = new Chart(ctxMood, {
            type: 'doughnut',
            data: {
                labels: ['Em Risco', 'Motivados', 'Neutros/Sem Análise'],
                datasets: [{
                    data: [moodData.risk, moodData.star, moodData.neutral],
                    backgroundColor: ['#d62828', '#28a745', '#eaf6ff']
                }]
            },
            options: { responsive: true }
        });
    },

    // =====================================================================
    // ================== LÓGICA DE UPLOAD DE ÁUDIO ===================
    // =====================================================================

    handleFileUpload() {
        const file = this.elements.audioUpload.files[0];
        const studentSelected = this.elements.meetingStudentSelect.value;

        if (file) {
            this.state.audioFile = file; // Salva o arquivo do upload
            this.elements.audioFileName.textContent = `Arquivo selecionado: ${file.name}`;
        } else {
            this.state.audioFile = null;
            this.elements.audioFileName.textContent = '';
        }

        // Só ativa o botão se AMBOS estiverem preenchidos
        if (this.state.audioFile && studentSelected) {
            this.elements.transcribeAudioBtn.disabled = false;
        } else {
            this.elements.transcribeAudioBtn.disabled = true;
        }
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    },

    // ETAPA 1: Transcrever o Áudio
    async transcribeAudioGemini() {
        this.elements.transcriptionOutput.value = 'Processando áudio com IA (Gemini)...';
        this.elements.transcriptionOutput.style.color = 'inherit';
        this.elements.transcriptionModule.classList.remove('hidden');
        this.elements.transcriptionModule.scrollIntoView({ behavior: 'smooth' });

        const studentId = this.elements.meetingStudentSelect.value;
        if (!studentId) {
             alert('Erro: Nenhum aluno foi selecionado para esta reunião.');
             this.elements.transcriptionModule.classList.add('hidden');
             return;
        }

        try {
            if (!this.state.audioFile) {
                throw new Error('Nenhum áudio encontrado. Envie um arquivo primeiro.');
            }
            if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY.includes("COLE_SUA_CHAVE")) {
                throw new Error('GEMINI_API_KEY não configurada em js/config.js.');
            }

            const mimeType = this.state.audioFile.type;
            if (!mimeType.startsWith('audio/')) {
                throw new Error(`Tipo de arquivo não suportado: ${mimeType}.`);
            }

            this.elements.transcriptionOutput.value = 'Convertendo áudio para Base64 (pode demorar)...';
            const base64Data = await this.fileToBase64(this.state.audioFile);
            
            this.elements.transcriptionOutput.value = 'Enviando áudio para IA (Gemini Transcrição)...';
            const transcriptionText = await this.callGeminiForTranscription(base64Data, mimeType);
            
            this.elements.transcriptionOutput.value = transcriptionText;

        } catch (error) {
            console.error('Erro ao transcrever:', error);
            this.elements.transcriptionOutput.value = `Erro ao transcrever: ${error.message}`;
            this.elements.transcriptionOutput.style.color = 'red';
        }
    },

    async callGeminiForTranscription(base64Data, mimeType) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${window.GEMINI_API_KEY}`;
        
        const requestBody = {
            "contents": [{
                "role": "user",
                "parts": [
                    { "text": "Transcreva este áudio em português do Brasil. Retorne apenas o texto puro." },
                    { "inlineData": { "mimeType": mimeType, "data": base64Data } }
                ]
            }]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`Erro API Gemini: ${response.statusText}`);
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    },

    // ETAPA 2: Analisar o Texto (Super Orientadora)
    async analyzeTranscriptionGemini() {
        const transcriptionText = this.elements.transcriptionOutput.value;
        const notes = this.elements.additionalNotes.value; 
        
        if (!transcriptionText || transcriptionText.startsWith('Erro')) {
            alert('Transcrição inválida.');
            return;
        }

        const studentId = this.elements.meetingStudentSelect.value;
        const studentData = this.state.students[studentId];
        
        if (!studentData) {
            alert('Erro: Aluno não encontrado.');
            return;
        }

        this.elements.reportContent.textContent = `Analisando como Orientadora Sênior para: ${studentData.name}...`;
        this.elements.reportContent.style.color = 'inherit';
        this.elements.reportSection.classList.remove('hidden');
        this.elements.reportSection.scrollIntoView({ behavior: 'smooth' });

        try {
            const brainData = await this.fetchBrainData();

            const analysis = await this.callGeminiForAnalysis(transcriptionText, notes, brainData || {}, studentData);

            if (analysis.erro) {
                throw new Error(`Filtro Kumon: ${analysis.erro}`);
            }

            if (!analysis.meta) analysis.meta = {};
            analysis.meta.meetingDate = this.elements.meetingDate.value || new Date().toISOString().split('T')[0];
            analysis.meta.studentId = studentId;
            analysis.meta.studentName = studentData.name;

            this.state.reportData = analysis;
            this.renderReport(analysis);

            if (!this.state.students[studentId].meetingHistory) {
                this.state.students[studentId].meetingHistory = [];
            }
            this.state.students[studentId].meetingHistory.push(analysis);
            
            await this.setData('alunos/lista_alunos', { students: this.state.students });

            alert(`Análise da Orientadora salva com sucesso na ficha de ${studentData.name}!`);
            
            this.elements.transcriptionOutput.value = "";
            this.elements.transcriptionModule.classList.add('hidden');
            this.elements.audioUpload.value = null;
            this.elements.transcribeAudioBtn.disabled = true;

        } catch (error) {
            console.error('Erro na análise:', error);
            this.elements.reportContent.textContent = `Erro na análise: ${error.message}`;
            this.elements.reportContent.style.color = 'red';
        }
    },

    async callGeminiForAnalysis(transcriptionText, manualNotes, brainData, studentData) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${window.GEMINI_API_KEY}`;
        
        const textPrompt = `
ATUE COMO: Orientadora Sênior do Método Kumon e Psicóloga Educacional com 20 anos de experiência.
OBJETIVO: Analisar uma reunião de pais/alunos, cruzar com os dados técnicos da ficha do aluno e gerar um plano de ação pedagógico e comportamental.

CONTEXTO DO ALUNO (Ficha Técnica Real):
${JSON.stringify(studentData, null, 2)}

CONTEXTO DA FRANQUIA (Diretrizes Gerais):
${JSON.stringify(brainData, null, 2)}

DADOS DA REUNIÃO (A Verdade do Momento):
Transcrição do Áudio: "${transcriptionText}"
Notas do Orientador: "${manualNotes}"

---
SUAS DIRETRIZES RÍGIDAS (LEIS):
1. **VERDADE ABSOLUTA:** Baseie-se APENAS nos dados acima. Não alucine.
2. **MÉTODO KUMON:** Use a terminologia correta (Ponto de Partida, Estágio, Bloqueio, Repetição, Autodidatismo).
3. **ANÁLISE CRUZADA:** Compare o que foi dito na reunião com o "historico_desempenho" e "historico_boletins" do aluno.
4. **PSICOLOGIA:** Analise o tom da reunião. Há ansiedade dos pais? Falta de rotina?
5. **FILTRO DE RELEVÂNCIA:** Se o texto não for sobre educação, aluno ou Kumon, retorne JSON com campo "erro".

RETORNE APENAS JSON (Sem markdown) NESTE FORMATO:
{
  "resumo_executivo": "Resumo profissional da reunião focando nos pontos pedagógicos.",
  "analise_psicopedagogica": "Análise comportamental. Ex: Pai ansioso, aluno desmotivado, falta de rotina.",
  "diagnostico_kumon": {
      "estagio_atual": "Análise do estágio atual versus o ideal.",
      "ritmo": "O tempo de resolução está adequado?",
      "qualidade": "A precisão (notas 100%) está boa?"
  },
  "discrepancias": "Liste contradições entre o que foi dito e o que está nos dados.",
  "plano_acao_imediato": [
      { "responsavel": "Orientador", "acao": "Ação sugerida" },
      { "responsavel": "Pais", "acao": "Ação sugerida" }
  ],
  "ajuste_programacao": "Sugestão técnica de material.",
  "requer_validacao_humana": true
}
`;

        const requestBody = {
            "contents": [{ "parts": [{ "text": textPrompt }] }],
            "generationConfig": { "responseMimeType": "application/json" }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`Erro API Gemini: ${response.statusText}`);
        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Erro parse JSON:', text);
            throw new Error('IA retornou formato inválido.');
        }
    },
    
    renderReport(reportData) {
        this.elements.reportContent.textContent = JSON.stringify(reportData, null, 2);
    },

    downloadReport() {
        if (!this.state.reportData) return alert('Sem dados.');
        const blob = new Blob([JSON.stringify(this.state.reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Analise_Kumon_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },
    
    getNodeRef(nodePath) {
        if (!this.state.userId) return null;
        return this.state.db.ref(`gestores/${this.state.userId}/${nodePath}`);
    },

    async fetchData(nodePath) {
        const nodeRef = this.getNodeRef(nodePath);
        if (!nodeRef) return null;
        const snapshot = await nodeRef.get();
        return snapshot.exists() ? snapshot.val() : null;
    },

    async setData(nodePath, data) {
        const nodeRef = this.getNodeRef(nodePath);
        if (nodeRef) await nodeRef.set(data);
    },

    async fetchBrainData() {
        return (await this.fetchData('brain')) || {};
    },
    
    async saveBrainData(brainData) {
        await this.setData('brain', brainData); 
    },
    
    async handleBrainFileUpload() {
        const file = this.elements.brainFileUpload.files[0];
        if (!file) return alert('Selecione um arquivo JSON.');
        
        try {
            const text = await file.text();
            const newBrain = JSON.parse(text);
            const currentBrain = await this.fetchBrainData();
            const merged = { ...currentBrain, ...newBrain };
            await this.saveBrainData(merged);
            alert('Cérebro atualizado!');
        } catch (e) {
            alert('Erro no arquivo JSON.');
        }
    },

    async loadStudents() {
        const data = await this.fetchData('alunos/lista_alunos');
        this.state.students = (data && data.students) ? data.students : {};
        this.renderStudentList();
        this.populateMeetingStudentSelect();
    },

    populateMeetingStudentSelect() {
        const select = this.elements.meetingStudentSelect;
        if (!select) return;
        select.innerHTML = '<option value="" disabled selected>Selecione um aluno...</option>';
        
        Object.entries(this.state.students)
            .sort(([, a], [, b]) => a.name.localeCompare(b.name))
            .forEach(([id, student]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = student.name;
                select.appendChild(option);
            });
    },

    renderStudentList() {
        const term = this.elements.studentSearch.value.toLowerCase();
        const list = Object.entries(this.state.students)
            .filter(([, s]) => s.name.toLowerCase().includes(term) || s.responsible.toLowerCase().includes(term));

        if (list.length === 0) {
            this.elements.studentList.innerHTML = `<div class="empty-state"><p>Nenhum aluno encontrado.</p></div>`;
            return;
        }
        
        this.elements.studentList.innerHTML = list
            .sort(([, a], [, b]) => a.name.localeCompare(b.name))
            .map(([id, s]) => `
                <div class="student-card" onclick="App.openStudentModal('${id}')">
                    <div class="student-card-header">
                        <div><h3 class="student-name">${s.name}</h3><p class="student-responsible">${s.responsible}</p></div>
                    </div>
                    <div class="student-stages">
                        ${s.mathStage ? `<div class="stage-item">Mat: ${s.mathStage}</div>` : ''}
                    </div>
                </div>`).join('');
    },

    openStudentModal(id) {
        this.state.currentStudentId = id;
        this.elements.studentModal.classList.remove('hidden');
        this.elements.studentForm.reset();
        
        if (id) {
            const s = this.state.students[id];
            this.elements.modalTitle.textContent = `Ficha de ${s.name}`;
            this.elements.studentIdInput.value = id;
            document.getElementById('studentName').value = s.name;
            document.getElementById('studentResponsible').value = s.responsible;
            document.getElementById('studentContact').value = s.contact;
            document.getElementById('mathStage').value = s.mathStage;
            document.getElementById('portStage').value = s.portStage;
            document.getElementById('engStage').value = s.engStage;
            this.elements.deleteStudentBtn.style.display = 'block';
            
            this.loadStudentHistories(id);
            
            const lastReport = s.meetingHistory ? s.meetingHistory[s.meetingHistory.length - 1] : null;
            this.elements.studentAnalysisContent.textContent = lastReport ? JSON.stringify(lastReport, null, 2) : "Sem análises.";
        } else {
            this.elements.modalTitle.textContent = 'Novo Aluno';
            this.elements.deleteStudentBtn.style.display = 'none';
            this.clearStudentHistories();
        }
        this.switchTab('programming');
    },

    closeStudentModal() {
        this.elements.studentModal.classList.add('hidden');
        this.state.currentStudentId = null;
    },

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');
    },

    async saveStudent() {
        const id = this.elements.studentIdInput.value || Date.now().toString();
        const s = this.state.students[id] || {};
        
        const newData = {
            ...s,
            name: document.getElementById('studentName').value,
            responsible: document.getElementById('studentResponsible').value,
            contact: document.getElementById('studentContact').value,
            mathStage: document.getElementById('mathStage').value,
            portStage: document.getElementById('portStage').value,
            engStage: document.getElementById('engStage').value,
            updatedAt: new Date().toISOString()
        };
        
        this.state.students[id] = newData;
        await this.setData('alunos/lista_alunos', { students: this.state.students });
        this.renderStudentList();
        this.populateMeetingStudentSelect();
        if (!this.state.currentStudentId) this.openStudentModal(id);
        alert('Salvo!');
    },

    async deleteStudent() {
        if (!confirm('Tem certeza?')) return;
        delete this.state.students[this.state.currentStudentId];
        await this.setData('alunos/lista_alunos', { students: this.state.students });
        this.renderStudentList();
        this.populateMeetingStudentSelect();
        this.closeStudentModal();
        alert('Excluído!');
    },

    loadStudentHistories(id) {
        const s = this.state.students[id];
        this.renderHistory('programmingHistory', s.programmingHistory);
        this.renderHistory('reportHistory', s.reportHistory);
        this.renderHistory('performanceLog', s.performanceLog);
    },

    clearStudentHistories() {
        this.elements.programmingHistory.innerHTML = '';
        this.elements.reportHistory.innerHTML = '';
        this.elements.performanceLog.innerHTML = '';
    },

    async addHistoryEntry(e, type, form) {
        e.preventDefault();
        if (!this.state.currentStudentId) return alert('Salve o aluno antes.');
        
        const entry = { id: Date.now().toString(), createdAt: new Date().toISOString() };
        
        if (type === 'programmingHistory') {
            entry.date = form.querySelector('#programmingDate').value;
            entry.material = form.querySelector('#programmingMaterial').value;
            entry.notes = form.querySelector('#programmingNotes').value;
        } else if (type === 'reportHistory') {
            entry.date = form.querySelector('#reportDate').value;
            entry.subject = form.querySelector('#reportSubject').value;
            entry.grade = form.querySelector('#reportGrade').value;
            const file = form.querySelector('#reportFile').files[0];
            if (file) entry.fileurl = await this.uploadFileToCloudinary(file, 'boletins');
        } else if (type === 'performanceLog') {
            entry.date = form.querySelector('#performanceDate').value;
            entry.type = form.querySelector('#performanceType').value;
            entry.details = form.querySelector('#performanceDetails').value;
        }

        const s = this.state.students[this.state.currentStudentId];
        if (!s[type]) s[type] = [];
        s[type].push(entry);
        
        await this.setData('alunos/lista_alunos', { students: this.state.students });
        this.renderHistory(type, s[type]);
        form.reset();
    },

    renderHistory(type, data) {
        const container = this.elements[type];
        if (!data || !data.length) {
            container.innerHTML = '<p>Sem registros.</p>';
            return;
        }
        container.innerHTML = data.sort((a,b) => new Date(b.date)-new Date(a.date)).map(e => `
            <div class="history-item">
                <div class="history-item-header"><strong>${e.date || 'Data?'}</strong></div>
                <div>${this.getHistoryDetails(type, e)}</div>
                <button onclick="App.deleteHistoryEntry('${type}','${e.id}')" class="delete-history-btn">&times;</button>
            </div>
        `).join('');
    },

    getHistoryDetails(type, e) {
        if (type === 'programmingHistory') return `${e.material} - ${e.notes}`;
        if (type === 'reportHistory') return `${e.subject}: ${e.grade} ${e.fileurl ? '<a href="'+e.fileurl+'" target="_blank">Anexo</a>' : ''}`;
        return `${e.type}: ${e.details}`;
    },

    async deleteHistoryEntry(type, id) {
        if (!confirm('Excluir?')) return;
        const s = this.state.students[this.state.currentStudentId];
        s[type] = s[type].filter(e => e.id !== id);
        await this.setData('alunos/lista_alunos', { students: this.state.students });
        this.renderHistory(type, s[type]);
    },

    async uploadFileToCloudinary(file, folder) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', `${this.state.userId}/${folder}`);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, { method: 'POST', body: formData });
        return (await res.json()).secure_url;
    },

    promptForReset() {
        if (prompt('Código:') === '*177' && prompt('Confirmar APAGAR TUDO?') === 'APAGAR TUDO') {
            this.hardResetUserData();
        }
    },

    async hardResetUserData() {
        await this.getNodeRef('').remove();
        location.reload();
    }
};