// App.js - Plataforma de Diário de Reuniões Kumon
// RE-ARQUITETADO PARA FLUXO DE 2 ETAPAS (100% GEMINI)
const App = {
    state: {
        userId: null,
        db: null, // Instância do Realtime Database
        students: {},
        currentStudentId: null,
        reportData: null, // Armazena o JSON final da ANÁLISE
        audioFile: null // Armazena o arquivo de áudio
    },
    elements: {},

    // =====================================================================
    // ======================== INICIALIZAÇÃO E SETUP ======================
    // =====================================================================
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
            
            // Diário de Reuniões (Etapa 1: Upload)
            meetingDate: document.getElementById('meetingDate'),
            audioUpload: document.getElementById('audioUpload'),
            audioFileName: document.getElementById('audioFileName'),
            additionalNotes: document.getElementById('additionalNotes'),
            transcribeAudioBtn: document.getElementById('transcribeAudioBtn'),
            
            // Módulo de Transcrição (Etapa 2: Análise)
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
            refreshAnalysisBtn: document.getElementById('refreshAnalysisBtn'),
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
        
        // Diário de Reuniões (Novo Fluxo Gemini)
        this.elements.audioUpload.addEventListener('change', () => this.handleFileUpload());
        this.elements.transcribeAudioBtn.addEventListener('click', () => this.transcribeAudioGemini()); // ETAPA 1
        this.elements.analyzeTranscriptionBtn.addEventListener('click', () => this.analyzeTranscriptionGemini()); // ETAPA 2
        
        this.elements.downloadReportBtn.addEventListener('click', () => this.downloadReport());
        
        // Módulo Brain
        this.elements.uploadBrainFileBtn.addEventListener('click', () => this.handleBrainFileUpload());
        
        // Alunos
        this.elements.addStudentBtn.addEventListener('click', () => this.openStudentModal());
        this.elements.studentSearch.addEventListener('input', () => this.renderStudentList());
        this.elements.closeModalBtn.addEventListener('click', () => this.closeStudentModal());
        this.elements.saveStudentBtn.addEventListener('click', () => this.saveStudent());
        this.elements.deleteStudentBtn.addEventListener('click', () => this.deleteStudent());
        this.elements.refreshAnalysisBtn.addEventListener('click', () => this.analyzeStudent(this.state.currentStudentId));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab)));
        this.elements.programmingForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'programmingHistory', this.elements.programmingForm));
        this.elements.reportForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'reportHistory', this.elements.reportForm));
        this.elements.performanceForm.addEventListener('submit', (e) => this.addHistoryEntry(e, 'performanceLog', this.elements.performanceForm)); 
        this.elements.studentModal.addEventListener('click', (e) => { if (e.target === this.elements.studentModal) this.closeStudentModal(); });
    },
    
    // =====================================================================
    // ================== LÓGICA DE UPLOAD DE ÁUDIO ===================
    // =====================================================================

    handleFileUpload() {
        const file = this.elements.audioUpload.files[0];
        if (file) {
            this.state.audioFile = file; // Salva o arquivo do upload
            this.elements.audioFileName.textContent = `Arquivo selecionado: ${file.name}`;
            this.elements.transcribeAudioBtn.disabled = false;
        } else {
            this.state.audioFile = null;
            this.elements.audioFileName.textContent = '';
            this.elements.transcribeAudioBtn.disabled = true;
        }
    },

    // =====================================================================
    // ================== NOVA ARQUITETURA DE IA (GEMINI) ================
    // =====================================================================

    /**
     * Helper para converter um Arquivo (File) em string Base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            // Extrai apenas o dado Base64, removendo o prefixo "data:mime/type;base64,"
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    },

    /**
     * ETAPA 1: Transcrever o Áudio usando a API Gemini (Flash).
     */
    async transcribeAudioGemini() {
        this.elements.transcriptionOutput.value = 'Processando áudio com IA (Gemini)...';
        this.elements.transcriptionOutput.style.color = 'inherit';
        this.elements.transcriptionModule.classList.remove('hidden');
        this.elements.transcriptionModule.scrollIntoView({ behavior: 'smooth' });

        try {
            if (!this.state.audioFile) {
                throw new Error('Nenhum áudio encontrado. Envie um arquivo primeiro.');
            }
            if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === "COLE_SUA_CHAVE_DA_API_GEMINI_AQUI") {
                throw new Error('GEMINI_API_KEY não encontrada ou não configurada em js/config.js.');
            }

            const mimeType = this.state.audioFile.type;
            // Gemini aceita uma variedade de tipos, ex: audio/ogg, audio/mpeg, audio/wav
            if (!mimeType.startsWith('audio/')) {
                throw new Error(`Tipo de arquivo não suportado: ${mimeType}. Use um formato de áudio padrão.`);
            }

            this.elements.transcriptionOutput.value = 'Convertendo áudio para Base64 (pode demorar)...';
            const base64Data = await this.fileToBase64(this.state.audioFile);
            
            this.elements.transcriptionOutput.value = 'Enviando áudio para IA (Gemini Transcrição)...';
            const transcriptionText = await this.callGeminiForTranscription(base64Data, mimeType);
            
            this.elements.transcriptionOutput.value = transcriptionText;

            // Limpa o áudio após o processamento
            this.state.audioFile = null;
            this.elements.audioUpload.value = null;
            this.elements.audioFileName.textContent = "";
            this.elements.transcribeAudioBtn.disabled = true;

        } catch (error) {
            console.error('Erro ao transcrever áudio:', error);
            this.elements.transcriptionOutput.value = `Erro ao transcrever áudio: ${error.message}\n\nVerifique se a GEMINI_API_KEY está correta e se a API "Generative Language" está ativada (e com faturamento) no seu projeto Google Cloud.`;
            this.elements.transcriptionOutput.style.color = 'red';
        }
    },

    /**
     * Função HELPER para chamar o Gemini com dados de áudio (Etapa 1)
     */
    async callGeminiForTranscription(base64Data, mimeType) {
        // Usando gemini-2.5-flash-preview-09-2025 que é otimizado para áudio e visão
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${window.GEMINI_API_KEY}`;
        
        const requestBody = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        // 1. O Prompt de Texto
                        { "text": "Transcreva este áudio em português. Retorne apenas o texto puro da transcrição, sem nenhuma formatação, cabeçalhos ou texto adicional." },
                        // 2. O Áudio em Base64
                        {
                            "inlineData": {
                                "mimeType": mimeType,
                                "data": base64Data
                            }
                        }
                    ]
                }
            ]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro da API Gemini (Transcrição): ${errorData.error?.message || 'Erro desconhecido'}`);
        }

        const data = await response.json();
        
        // Verifica se a resposta foi bloqueada ou não tem conteúdo
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
             if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`Áudio bloqueado pela API Gemini. Motivo: ${data.promptFeedback.blockReason}`);
            }
            throw new Error('Resposta inesperada da API Gemini (Transcrição). O áudio pode ser inaudível ou estar vazio.');
        }

        return data.candidates[0].content.parts[0].text;
    },

    /**
     * ETAPA 2: Analisar o Texto da Transcrição usando Gemini.
     */
    async analyzeTranscriptionGemini() {
        const transcriptionText = this.elements.transcriptionOutput.value;
        if (!transcriptionText || transcriptionText.startsWith('Erro ao transcrever')) {
            alert('Não há transcrição válida para analisar.');
            return;
        }

        this.elements.reportContent.textContent = 'Analisando transcrição com IA (Gemini Análise)...';
        this.elements.reportContent.style.color = 'inherit';
        this.elements.reportSection.classList.remove('hidden');
        this.elements.reportSection.scrollIntoView({ behavior: 'smooth' });

        try {
            if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === "COLE_SUA_CHAVE_DA_API_GEMINI_AQUI") {
                throw new Error('GEMINI_API_KEY não encontrada ou não configurada em js/config.js.');
            }

            const brainData = await this.fetchBrainData();

            // Chamar a API Gemini com o TEXTO e modo JSON
            const analysis = await this.callGeminiForAnalysis(transcriptionText, brainData || {});

            // Salvar relatório no estado e exibir
            this.state.reportData = analysis;
            this.renderReport(analysis);

        } catch (error) {
            console.error('Erro ao analisar transcrição:', error);
            this.elements.reportContent.textContent = `Erro ao analisar transcrição: ${error.message}`;
            this.elements.reportContent.style.color = 'red';
        }
    },

    /**
     * Função HELPER (Modificada) para chamar o Gemini com texto e modo JSON (Etapa 2)
     */
    async callGeminiForAnalysis(transcriptionText, brainData) {
        // Usamos o gemini-2.5-flash-preview-09-2025 pois ele suporta responseSchema (modo JSON)
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${window.GEMINI_API_KEY}`;
        
        // PROMPT ATUALIZADO PARA RECEBER TEXTO
        // Este prompt define as regras de negócio e a persona.
        const textPrompt = `
Você é uma assistente sênior de análise do Método Kumon, com muitos anos de experiência. Sua tarefa é analisar a TRANSCRIÇÃO de uma reunião (fornecida abaixo) e o CONTEXTO (brain.json) e retornar um JSON ESTRITO.

REGRA DE OURO (NÃO QUEBRE JAMAIS):
A IA JAMAIS PODE CRIAR, INVENTAR OU SE ALUCINAR. Tudo que for gerado deve ser 100% com a verdade baseada na transcrição. O "brain.json" serve apenas para IDENTIFICAR alunos e fornecer contexto, NUNCA para inventar fatos sobre a reunião. A vida de pessoas está em jogo. Somente a VERDADE é permitida.

TRANSCRIÇÃO DA REUNIÃO (Fonte da Verdade):
---
${transcriptionText}
---

CONTEXTO (brain.json - Usar apenas para identificar alunos e estágios):
${JSON.stringify(brainData, null, 2)}

PROCESSE A TRANSCRIÇÃO e retorne APENAS o JSON. O JSON deve seguir o schema definido.

`;

        // DEFINIR O SCHEMA DE SAÍDA PARA O GEMINI
        // Este schema é baseado no seu prompt original para a OpenAI
        const responseSchema = {
            type: "OBJECT",
            properties: {
                "meta": { 
                    type: "OBJECT",
                    properties: {
                        "created_at": { type: "STRING" },
                        "sala_id": { type: "STRING" },
                        "source": { type: "STRING" }
                    }
                },
                "mentions_alunos": { 
                    type: "ARRAY", 
                    items: { 
                        type: "OBJECT",
                        properties: {
                            "aluno_id": { type: "STRING" },
                            "nome": { type: "STRING" },
                            "context": { type: "STRING" },
                            "confidence": { type: "NUMBER" }
                        }
                    } 
                },
                "resumo_executivo": { type: "STRING" },
                "decisoes_sugeridas": { 
                    type: "ARRAY", 
                    items: { 
                        type: "OBJECT",
                        properties: {
                            "texto": { type: "STRING" },
                            "responsavel_sugerido": { type: "STRING" },
                            "prazo_sugerido_days": { type: "NUMBER" },
                            "source_evidence": { type: "STRING" }
                        }
                    } 
                },
                "itens_acao": { 
                    type: "ARRAY", 
                    items: { 
                        type: "OBJECT",
                        properties: {
                            "descricao": { type: "STRING" },
                            "responsavel": { type: "STRING" },
                            "prazo_days": { type: "NUMBER" },
                            "prioridade": { type: "STRING" }
                        }
                    } 
                },
                "dores_familia": { 
                    type: "ARRAY", 
                    items: { 
                        type: "OBJECT",
                        properties: {
                            "familia_nome": { type: "STRING" },
                            "dor_texto": { type: "STRING" },
                            "evidencia_texto": { type: "STRING" },
                            "confidence": { type: "NUMBER" }
                        }
                    } 
                },
                "dores_unidade": { 
                    type: "ARRAY", 
                    items: { 
                        type: "OBJECT",
                        properties: {
                            "dor_texto": { type: "STRING" },
                            "impacto": { type: "STRING" },
                            "evidencia": { type: "STRING" }
                        }
                    } 
                },
                "recomendacoes": { 
                    type: "ARRAY", 
                    items: { 
                        type: "OBJECT",
                        properties: {
                            "tipo": { type: "STRING" },
                            "acao": { type: "STRING" },
                            "justificativa": { type: "STRING" },
                            "evidencia": { type: "STRING" }
                        }
                    } 
                },
                "audit_log": { 
                    type: "ARRAY", 
                    items: { 
                        type: "OBJECT",
                        properties: {
                            "action": { type: "STRING" },
                            "by": { type: "STRING" },
                            "timestamp": { type: "STRING" },
                            "details": { type: "STRING" }
                        }
                    } 
                },
                "requer_validacao_humana": { type: "BOOLEAN" },
                "sources": { type: "ARRAY", items: { type: "STRING" } }
            },
            // Definindo quais campos são obrigatórios (ajuste conforme necessário)
            required: ["meta", "resumo_executivo", "dores_familia", "recomendacoes", "requer_validacao_humana"]
        };

        const requestBody = {
            "contents": [{ "parts": [{ "text": textPrompt }] }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": responseSchema
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro da API Gemini (Análise): ${errorData.error?.message || 'Erro desconhecido'}`);
        }

        const data = await response.json();
        
        // Verifica se a resposta foi bloqueada ou não tem conteúdo
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
             if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`Análise bloqueada pela API Gemini. Motivo: ${data.promptFeedback.blockReason}`);
            }
            throw new Error('Resposta inesperada da API Gemini (Análise).');
        }

        const text = data.candidates[0].content.parts[0].text;
        
        try {
            // O Gemini retorna o JSON como uma string de texto
            const resultJson = JSON.parse(text);
            return resultJson;
        } catch (e) {
            console.error('Erro ao parsear JSON da Gemini:', e.message);
            console.error('Texto retornado (esperava JSON):', text);
            throw new Error('O modelo retornou um JSON inválido ou uma resposta inesperada.');
        }
    },
    
    // =====================================================================
    // ================== RENDERIZAÇÃO E DOWNLOAD (Inalterado) =============
    // =====================================================================
    
    renderReport(reportData) {
        this.elements.reportContent.textContent = JSON.stringify(reportData, null, 2);
    },

    downloadReport() {
        if (!this.state.reportData) {
            alert('Nenhum relatório para download.');
            return;
        }

        const content = JSON.stringify(this.state.reportData, null, 2);
        const filename = `Relatorio_Analise_${this.elements.meetingDate.value || new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // =====================================================================
    // ======================== LÓGICA DE DADOS (CORE) =====================
    // =====================================================================
    
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

    // =====================================================================
    // ======================== GESTÃO DO BRAIN.JSON =======================
    // =====================================================================
    
    async fetchBrainData() {
        const brainData = await this.fetchData('brain'); 
        if (brainData) {
            return brainData;
        } else {
            console.warn("Nó 'brain' não encontrado no Realtime Database. O modelo não terá contexto.");
            return {};
        }
    },
    
    async saveBrainData(brainData) {
        await this.setData('brain', brainData); 
    },
    
    async handleBrainFileUpload() {
        const fileInput = this.elements.brainFileUpload;
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Por favor, selecione um arquivo JSON para enviar.');
            return;
        }

        const file = fileInput.files[0];
        if (!file.name.toLowerCase().endsWith('.json')) {
            alert('Por favor, selecione um arquivo com extensão .json.');
            return;
        }

        try {
            const fileContent = await file.text();
            let newBrainData;
            try {
                newBrainData = JSON.parse(fileContent);
            } catch (e) {
                throw new Error('O arquivo selecionado não é um JSON válido.');
            }

            let currentBrainData = await this.fetchBrainData();
            const mergedBrainData = this.deepMerge(currentBrainData, newBrainData);
            
            await this.saveBrainData(mergedBrainData);

            alert('Arquivo JSON enviado e "brain.json" atualizado com sucesso no Firebase!');
            fileInput.value = '';

        } catch (error) {
            console.error('Erro ao processar o arquivo JSON:', error);
            alert(`Erro ao processar o arquivo: ${error.message}`);
        }
    },

    deepMerge(target, source) {
        const output = { ...target };
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    },

    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    },

    // =====================================================================
    // ======================= MÓDULO DE ALUNOS ============================
    // =====================================================================
    
    async loadStudents() {
        try {
            const data = await this.fetchData('alunos/lista_alunos');
            this.state.students = (data && data.students) ? data.students : {};
            this.renderStudentList();
        } catch (error) {
            console.error('Erro ao carregar alunos:', error);
            alert('Não foi possível carregar os dados dos alunos.');
        }
    },

    renderStudentList() {
        const searchTerm = this.elements.studentSearch.value.toLowerCase();
        
        const filteredStudents = Object.entries(this.state.students).filter(([id, student]) =>
            (student.name && student.name.toLowerCase().includes(searchTerm)) ||
            (student.responsible && student.responsible.toLowerCase().includes(searchTerm))
        );

        if (filteredStudents.length === 0) {
            this.elements.studentList.innerHTML = `<div class="empty-state"><p>📚 ${searchTerm ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}</p><p>Clique em "Adicionar Novo Aluno" para começar!</p></div>`;
            return;
        }
        
        this.elements.studentList.innerHTML = filteredStudents
            .sort(([, a], [, b]) => a.name.localeCompare(b.name))
            .map(([id, student]) => `
                <div class="student-card" onclick="App.openStudentModal('${id}')">
                    <div class="student-card-header">
                        <div>
                            <h3 class="student-name">${student.name}</h3>
                            <p class="student-responsible">Responsável: ${student.responsible}</p>
                        </div>
                    </div>
                    <div class="student-stages">
                        ${student.mathStage ? `<div class="stage-item"><span class="stage-label">Mat</span>${student.mathStage}</div>` : ''}
                        ${student.portStage ? `<div class="stage-item"><span class="stage-label">Port</span>${student.portStage}</div>` : ''}
                        ${student.engStage ? `<div class="stage-item"><span class="stage-label">Ing</span>${student.engStage}</div>` : ''}
                    </div>
                </div>
            `).join('');
    },

    openStudentModal(studentId = null) {
        this.state.currentStudentId = studentId;
        this.elements.studentModal.classList.remove('hidden');
        this.elements.studentForm.reset(); 
        if (studentId) {
            const student = this.state.students[studentId];
            this.elements.modalTitle.textContent = `📋 Ficha de ${student.name}`;
            this.elements.studentIdInput.value = studentId;
            document.getElementById('studentName').value = student.name || '';
            document.getElementById('studentResponsible').value = student.responsible || '';
            document.getElementById('studentContact').value = student.contact || '';
            document.getElementById('mathStage').value = student.mathStage || '';
            document.getElementById('portStage').value = student.portStage || '';
            document.getElementById('engStage').value = student.engStage || '';
            this.elements.deleteStudentBtn.style.display = 'block';
            this.loadStudentHistories(studentId); 
            this.elements.studentAnalysisContent.textContent = 'Clique em "Gerar Nova Análise" para começar.';
        } else {
            this.elements.modalTitle.textContent = '👨‍🎓 Adicionar Novo Aluno';
            this.elements.studentIdInput.value = '';
            this.elements.deleteStudentBtn.style.display = 'none';
            this.clearStudentHistories(); 
            this.elements.studentAnalysisContent.textContent = 'Salve o aluno para poder gerar uma análise.';
        }
        this.switchTab('programming');
    },

    closeStudentModal() {
        this.elements.studentModal.classList.add('hidden');
        this.state.currentStudentId = null;
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    },

    async saveStudent() {
        if (!this.elements.studentForm.checkValidity()) {
            this.elements.studentForm.reportValidity();
            return;
        }
        
        const studentId = this.elements.studentIdInput.value || Date.now().toString();
        
        const studentData = {
            name: document.getElementById('studentName').value.trim(),
            responsible: document.getElementById('studentResponsible').value.trim(),
            contact: document.getElementById('studentContact').value.trim(),
            mathStage: document.getElementById('mathStage').value.trim(),
            portStage: document.getElementById('portStage').value.trim(),
            engStage: document.getElementById('engStage').value.trim(),
            programmingHistory: this.state.students[studentId]?.programmingHistory || [],
            reportHistory: this.state.students[studentId]?.reportHistory || [],
            performanceLog: this.state.students[studentId]?.performanceLog || [],
            createdAt: this.state.students[studentId]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.state.students[studentId] = studentData;
        
        try {
            await this.setData('alunos/lista_alunos', { students: this.state.students });
            
            this.renderStudentList();
            if (!this.state.currentStudentId) {
                this.state.currentStudentId = studentId;
                this.elements.studentIdInput.value = studentId;
                this.elements.modalTitle.textContent = `📋 Ficha de ${studentData.name}`;
                this.elements.deleteStudentBtn.style.display = 'block';
            }
            
            await this.updateBrainFromStudents();
            alert('Aluno salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar aluno:', error);
            alert('Erro ao salvar aluno. Tente novamente.');
        }
    },

    async deleteStudent() {
        if (!this.state.currentStudentId) return;
        const studentName = this.state.students[this.state.currentStudentId].name;
        if (!confirm(`Tem certeza que deseja excluir o aluno "${studentName}"? Esta ação é irreversível.`)) return;
        
        delete this.state.students[this.state.currentStudentId];
        
        try {
            await this.setData('alunos/lista_alunos', { students: this.state.students });
            this.renderStudentList();
            this.closeStudentModal();
            
            await this.updateBrainFromStudents();
            alert('Aluno excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir aluno:', error);
            alert('Erro ao excluir aluno. Tente novamente.');
        }
    },
    
    async updateBrainFromStudents() {
        let currentBrainData = await this.fetchBrainData();
        let updatedBrain = { ...currentBrainData }; 

        if (!updatedBrain.alunos) {
            updatedBrain.alunos = {};
        }
        
        const currentStudentIds = Object.keys(this.state.students);
        for (const brainId in updatedBrain.alunos) {
            if (!currentStudentIds.includes(brainId)) {
                delete updatedBrain.alunos[brainId];
            }
        }

        for (const [id, student] of Object.entries(this.state.students)) {
            updatedBrain.alunos[id] = {
                id: id,
                nome: student.name,
                responsavel: student.responsible,
                contato: student.contact,
                estagio_matematica: student.mathStage,
                estagio_portugues: student.portStage,
                estagio_ingles: student.engStage,
                historico: student.performanceLog || [],
                metas: updatedBrain.alunos[id]?.metas || {}, 
                observacoes: updatedBrain.alunos[id]?.observacoes || [] 
            };
        }
        
        await this.saveBrainData(updatedBrain);
        console.log("brain.json atualizado com base nos alunos da plataforma (Realtime DB).");
    },

    loadStudentHistories(studentId) {
        const student = this.state.students[studentId];
        if (!student) return this.clearStudentHistories();
        this.renderHistory('programmingHistory', student.programmingHistory || []);
        this.renderHistory('reportHistory', student.reportHistory || []);
        this.renderHistory('performanceLog', student.performanceLog || []);
    },

    clearStudentHistories() {
        if (this.elements.programmingHistory) {
            this.elements.programmingHistory.innerHTML = '<p>Nenhuma programação registrada.</p>';
        }
        if (this.elements.reportHistory) {
            this.elements.reportHistory.innerHTML = '<p>Nenhum boletim registrado.</p>';
        }
        if (this.elements.performanceLog) { 
            this.elements.performanceLog.innerHTML = '<p>Nenhum registro de desempenho.</p>';
        }
    },
    
    // =====================================================================
    // ================ CÓDIGO DE HISTÓRICO (SEM ALTERAÇÕES) ===============
    // =====================================================================
    async addHistoryEntry(event, historyType, formElement) {
        event.preventDefault();
        if (!this.state.currentStudentId) {
            alert('É necessário salvar o aluno antes de adicionar registros ao histórico.');
            return;
        }

        if (!formElement.checkValidity()) {
            formElement.reportValidity(); 
            return;
        }

        const entry = { id: Date.now().toString(), createdAt: new Date().toISOString() };

        try {
            if (historyType === 'programmingHistory') {
                entry.date = formElement.querySelector('#programmingDate').value;
                entry.material = formElement.querySelector('#programmingMaterial').value;
                entry.notes = formElement.querySelector('#programmingNotes').value;
            } else if (historyType === 'reportHistory') {
                entry.date = formElement.querySelector('#reportDate').value;
                entry.subject = formElement.querySelector('#reportSubject').value;
                entry.grade = formElement.querySelector('#reportGrade').value;
                
                const fileInput = formElement.querySelector('#reportFile');
                if (fileInput.files.length > 0) {
                    entry.fileurl = await this.uploadFileToCloudinary(fileInput.files[0], 'boletins');
                }
            } else if (historyType === 'performanceLog') {
                entry.date = formElement.querySelector('#performanceDate').value;
                entry.type = formElement.querySelector('#performanceType').value;
                entry.details = formElement.querySelector('#performanceDetails').value;
            }
        } catch (e) {
            console.error("Erro ao ler dados do formulário:", e);
            alert("Erro interno ao ler o formulário.");
            return;
        }
        
        if (!this.state.students[this.state.currentStudentId][historyType]) {
            this.state.students[this.state.currentStudentId][historyType] = [];
        }
        
        this.state.students[this.state.currentStudentId][historyType].push(entry);
        
        try {
            await this.setData('alunos/lista_alunos', { students: this.state.students });
            
            this.renderHistory(historyType, this.state.students[this.state.currentStudentId][historyType]);
            formElement.reset();
            await this.updateBrainFromStudents();
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
            alert('Falha ao salvar o registro.');
            this.state.students[this.state.currentStudentId][historyType].pop();
        }
    },

    renderHistory(historyType, historyData) {
        const container = this.elements[historyType]; 
        if (!container) {
            console.error(`Elemento de container '${historyType}' não encontrado no DOM.`);
            return;
        }
        
        const historyArray = Array.isArray(historyData) ? historyData : Object.values(historyData || {});

        if (!historyArray || historyArray.length === 0) {
            container.innerHTML = `<p>Nenhum registro encontrado.</p>`;
            return;
        }
        container.innerHTML = historyArray
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
            .map(entry => this.createHistoryItemHTML(historyType, entry))
            .join('');
    },

    createHistoryItemHTML(type, entry) {
        let detailsHTML = '';
        
        const entryDateStr = entry.date || entry.createdAt;
        let date = 'Data Inválida';

        if (entryDateStr) {
            if (entryDateStr.includes('T')) {
                date = new Date(entryDateStr).toLocaleDateString('pt-BR');
            } else if (entryDateStr.includes('-')) {
                // Constrói como UTC para evitar problemas de fuso horário
                const parts = entryDateStr.split('-');
                const localDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                date = localDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            }
        }

        switch (type) {
            case 'programmingHistory':
                detailsHTML = `<div class="history-details"><strong>Material:</strong> ${entry.material || ''}</div>${entry.notes ? `<div class="history-details"><strong>Obs:</strong> ${entry.notes}</div>` : ''}`;
                break;
            case 'reportHistory':
                detailsHTML = `<div class="history-details"><strong>${entry.subject || ''}:</strong> Nota ${entry.grade || 'N/A'}</div>${entry.fileurl ? `<div class="history-file">📎 <a href="${entry.fileurl}" target="_blank">Ver anexo</a></div>` : ''}`;
                break;
            case 'performanceLog':
                detailsHTML = `<div class="history-details"><strong>${entry.type || 'REGISTRO'}:</strong> ${entry.details || ''}</div>`;
                break;
        }
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-date">${date}</span>
                </div>
                ${detailsHTML}
                <button class="delete-history-btn" onclick="App.deleteHistoryEntry('${type}', '${entry.id}')" title="Excluir">&times;</button>
            </div>`;
    },
    
    async deleteHistoryEntry(historyType, entryId) {
        if (!confirm('Tem certeza que deseja excluir este registro do histórico?')) return;
        
        const student = this.state.students[this.state.currentStudentId];
        
        let historyArray = Array.isArray(student[historyType]) ? student[historyType] : Object.values(student[historyType] || {});
        student[historyType] = historyArray.filter(entry => entry.id !== entryId);
        
        try {
            await this.setData('alunos/lista_alunos', { students: this.state.students });
            this.renderHistory(historyType, student[historyType]);
            await this.updateBrainFromStudents();
        } catch (error) {
            alert('Falha ao excluir o registro.');
            console.error(error);
            this.loadStudents(); 
        }
    },
    
    // Esta análise é um placeholder local, não usa IA. (Inalterado)
    async analyzeStudent(studentId) {
        if (!studentId) return;
        const analysisContent = this.elements.studentAnalysisContent;
        analysisContent.textContent = 'Analisando dados do aluno...';
        const student = this.state.students[studentId];
        if (!student) {
            analysisContent.textContent = 'Erro: Dados do aluno não encontrados.';
            return;
        }
        
        const performanceLog = Array.isArray(student.performanceLog) ? student.performanceLog : Object.values(student.performanceLog || {});
        const reportHistory = Array.isArray(student.reportHistory) ? student.reportHistory : Object.values(student.reportHistory || {});
        const programmingHistory = Array.isArray(student.programmingHistory) ? student.programmingHistory : Object.values(student.programmingHistory || {});
        
        const totalHistoryEntries = performanceLog.length + reportHistory.length + programmingHistory.length;

        let analysis = `ANÁLISE INTELIGENTE - ${student.name}
${'='.repeat(50)}
`;
        let hasInsights = false;
        
        if (totalHistoryEntries < 2) {
            analysis += `💡 DADOS INSUFICIENTES:
   Ainda não há histórico suficiente para gerar uma análise de tendências.
   
   AÇÃO: Continue registrando o desempenho, programação e boletins do aluno.
`;
        } else {
            const repetitions = performanceLog.filter(e => e.type === 'REPETICAO');
            if (repetitions.length >= 3) {
                analysis += `🚨 ALERTA DE PLATÔ: ${repetitions.length} repetições registradas.
   AÇÃO: Revisar material e agendar orientação individual.
`;
                hasInsights = true;
            } else if (repetitions.length > 0) {
                analysis += `⚠️ ATENÇÃO: ${repetitions.length} repetição(ões) registrada(s).
   AÇÃO: Monitorar o próximo bloco com atenção.
`;
                hasInsights = true;
            }
            
            const lowGrades = reportHistory.filter(e => parseFloat(e.grade) < 7);
            if (lowGrades.length > 0) {
                analysis += `📊 PONTO DE ATENÇÃO (BOLETIM):
   Nota(s) abaixo de 7.0 em: ${lowGrades.map(e => e.subject).join(', ')}.
   AÇÃO: Agendar reunião com os pais para alinhar estratégias.
`;
                hasInsights = true;
            }
            
            const alerts = performanceLog.filter(e => e.type === 'ALERTA');
            if (alerts.length > 0) {
                const lastAlert = alerts[alerts.length - 1];
                const alertDate = lastAlert.date || lastAlert.createdAt;
                const displayDate = alertDate ? new Date(alertDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'data desconhecida';
                analysis += `⚡️ ALERTA(S) MANUAL(IS) REGISTRADO(S):
   - "${lastAlert.details}" (${displayDate})
   AÇÃO: Verificar se o problema foi resolvido.
`;
                hasInsights = true;
            }
            
            analysis += `💡 SUGESTÃO ESTRATÉGGICA:
`;
            if (repetitions.length >= 3 && lowGrades.length > 0) {
                analysis += `   Prioridade máxima: agendar reunião com os pais. O platô no Kumon pode estar correlacionado com a dificuldade na escola.
`;
            } else if (!hasInsights) {
                analysis += `   O progresso parece estável. Manter o acompanhamento e registrar elogios para reforço positivo.
`;
            } else {
                 analysis += `   Revisar os pontos de atenção acima e focar nas ações sugeridas.
`;
            }
        }
        
        analysis += `
Última atualização: ${new Date().toLocaleString('pt-BR')}`;
        analysisContent.textContent = analysis;
    },

    // Esta função é usada APENAS para anexos de boletins (Inalterada)
    async uploadFileToCloudinary(file, folder) {
        if (!cloudinaryConfig || !cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
            throw new Error('Configuração do Cloudinary não encontrada em js/config.js');
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', `${this.state.userId}/${folder}`);
        formData.append('resource_type', 'auto');
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Erro no upload para Cloudinary');
        const result = await response.json();
        return result.secure_url;
    },

    // Reset (Inalterado)
    promptForReset() {
        const code = prompt("Para aceder às opções de sistema, digite o código de segurança:");
        if (code === '*177') {
            const confirmation = prompt("ATENÇÃO: AÇÃO IRREVERSÍVEL!\nIsto irá apagar TODOS os seus diários, inventário e DADOS DE ALUNOS para SEMPRE.\nPara confirmar, digite 'APAGAR TUDO' e clique em OK.");
            if (confirmation === 'APAGAR TUDO') {
                this.hardResetUserData();
            } else {
                alert("Operação de reset cancelada.");
            }
        } else if (code !== null) {
            alert("Código incorreto.");
        }
    },

    async hardResetUserData() {
        alert("A iniciar o reset completo do sistema. A página será recarregada ao concluir.");
        try {
            const userRootRef = this.getNodeRef('');
            await userRootRef.remove();
            
            alert("Sistema resetado com sucesso.");
            location.reload();
        } catch (error) {
            console.error("Erro no reset:", error);
            alert("Ocorreu um erro ao tentar resetar o sistema.");
        }
    }
};
