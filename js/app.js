// App.js - Plataforma de Diário de Reuniões Kumon
// REFATORADO PARA USAR O REALTIME DATABASE E IA MULTIMODAL REAL
const App = {
    state: {
        userId: null,
        db: null, // Agora será uma instância do Realtime Database
        students: {},
        currentStudentId: null,
        mediaRecorder: null,
        recordingChunks: [],
        recordingInterval: null,
        recordingTime: 0,
        reportData: null
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
        this.state.db = databaseInstance; // Recebendo firebase.database()
        document.getElementById('userEmail').textContent = user.email;
        this.mapDOMElements();
        this.addEventListeners();
        this.loadStudents();
        this.setupRecording();
    },
    mapDOMElements() {
        this.elements = {
            // Geral
            logoutButton: document.getElementById('logout-button'),
            systemOptionsBtn: document.getElementById('system-options-btn'),
            // Diário de Reuniões
            meetingDate: document.getElementById('meetingDate'),
            audioUpload: document.getElementById('audioUpload'),
            startRecordingBtn: document.getElementById('startRecordingBtn'),
            recordingStatus: document.getElementById('recordingStatus'),
            recordingTime: document.getElementById('recordingTime'),
            additionalNotes: document.getElementById('additionalNotes'),
            processAudioBtn: document.getElementById('processAudioBtn'),
            viewReportBtn: document.getElementById('viewReportBtn'),
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
            programmingHistory: document.getElementById('programmingHistory'),
            reportHistory: document.getElementById('reportHistory'),
            performanceHistory: document.getElementById('performanceHistory'),
            studentAnalysisContent: document.getElementById('student-analysis-content'),
            // NOVO: Elementos para brain.json
            brainFileUpload: document.getElementById('brainFileUpload'),
            uploadBrainFileBtn: document.getElementById('uploadBrainFileBtn'),
        };
    },
    addEventListeners() {
        // Geral
        this.elements.logoutButton.addEventListener('click', () => firebase.auth().signOut());
        this.elements.systemOptionsBtn.addEventListener('click', () => this.promptForReset());
        // Diário de Reuniões
        this.elements.audioUpload.addEventListener('change', () => this.handleFileUpload());
        this.elements.startRecordingBtn.addEventListener('click', () => this.toggleRecording());
        this.elements.processAudioBtn.addEventListener('click', () => this.processAudioWithAI());
        this.elements.viewReportBtn.addEventListener('click', () => this.showReport());
        this.elements.downloadReportBtn.addEventListener('click', () => this.downloadReport());
        // NOVO: Evento para upload do brain.json
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
    setupRecording() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    // Tenta usar um formato mais compatível se possível, como webm
                    const options = { mimeType: 'audio/webm;codecs=opus' };
                    if (MediaRecorder.isTypeSupported(options.mimeType)) {
                        this.state.mediaRecorder = new MediaRecorder(stream, options);
                    } else {
                        console.warn('audio/webm;codecs=opus não suportado, usando padrão do navegador.');
                        this.state.mediaRecorder = new MediaRecorder(stream);
                    }
                    
                    this.state.mediaRecorder.ondataavailable = event => {
                        this.state.recordingChunks.push(event.data);
                    };
                    this.state.mediaRecorder.onstop = () => {
                        stream.getTracks().forEach(track => track.stop());
                        // Re-habilita o setup para a próxima gravação
                        this.setupRecording();
                    };
                })
                .catch(err => {
                    console.error('Erro ao acessar microfone:', err);
                    alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
                });
        } else {
            alert('Seu navegador não suporta gravação de áudio.');
        }
    },
    
    // =====================================================================
    // ================== CORREÇÃO: LÓGICA DE GRAVAÇÃO ===================
    // =====================================================================
    toggleRecording() {
        if (!this.state.mediaRecorder) {
            alert('Recursos de gravação não estão prontos. Tentando inicializar...');
            this.setupRecording();
            return;
        }

        const btn = this.elements.startRecordingBtn;

        if (this.state.mediaRecorder.state === 'recording') {
            // PARAR A GRAVAÇÃO
            this.state.mediaRecorder.stop();
            clearInterval(this.state.recordingInterval);
            this.elements.recordingStatus.classList.add('hidden');
            this.elements.processAudioBtn.disabled = false;
            
            btn.textContent = 'Iniciar Gravação';
            btn.classList.remove('btn-danger'); // Remove a cor vermelha

        } else {
            // INICIAR A GRAVAÇÃO
            this.state.recordingChunks = [];
            this.state.recordingTime = 0;
            this.elements.recordingTime.textContent = '00:00';
            this.state.mediaRecorder.start();
            
            this.elements.recordingStatus.classList.remove('hidden');
            this.elements.processAudioBtn.disabled = true;
            
            btn.textContent = 'Parar Gravação';
            btn.classList.add('btn-danger'); // Adiciona uma cor vermelha (definida no CSS)

            this.state.recordingInterval = setInterval(() => {
                this.state.recordingTime++;
                const minutes = Math.floor(this.state.recordingTime / 60).toString().padStart(2, '0');
                const seconds = (this.state.recordingTime % 60).toString().padStart(2, '0');
                this.elements.recordingTime.textContent = `${minutes}:${seconds}`;
            }, 1000);
        }
    },
    handleFileUpload() {
        const file = this.elements.audioUpload.files[0];
        if (file) {
            this.elements.processAudioBtn.disabled = false;
        }
    },

    // =====================================================================
    // ================== CORREÇÃO: ARQUITETURA DE IA REAL =================
    // =====================================================================

    /**
     * Converte um Blob de áudio para uma string Base64
     */
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                // Remove o prefixo "data:audio/webm;base64,"
                const base64Data = reader.result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = (error) => {
                reject(error);
            };
        });
    },

    async processAudioWithAI() {
        this.elements.reportContent.textContent = 'Processando áudio com IA... Esta operação pode levar alguns segundos.';
        this.elements.reportContent.style.color = 'inherit'; // Reseta a cor
        this.elements.reportSection.classList.remove('hidden');
        this.elements.reportSection.scrollIntoView({ behavior: 'smooth' });

        let audioBlob = null;
        let mimeType = '';

        try {
            const audioFile = this.elements.audioUpload.files[0];

            if (audioFile) {
                // Caso 1: Usuário enviou um arquivo
                audioBlob = audioFile;
                mimeType = audioFile.type;
            } else if (this.state.recordingChunks.length > 0) {
                // Caso 2: Usuário gravou um áudio
                // O mimeType é definido no setupRecording()
                mimeType = this.state.mediaRecorder.mimeType;
                audioBlob = new Blob(this.state.recordingChunks, { type: mimeType });
            } else {
                throw new Error('Nenhum áudio encontrado. Grave ou envie um arquivo primeiro.');
            }

            // Obter brain.json do Firebase (Contexto)
            const brainData = await this.fetchBrainData();
            if (!brainData) {
                throw new Error('Dados do "brain.json" não encontrados no Firebase. O modelo não pode operar sem o contexto dos alunos.');
            }

            // Converter o áudio para Base64 para envio direto ao Gemini
            this.elements.reportContent.textContent = 'Convertendo áudio para Base64...';
            const audioBase64 = await this.blobToBase64(audioBlob);

            // Chamar o Gemini com o áudio real e o contexto
            this.elements.reportContent.textContent = 'Enviando áudio e contexto para análise da IA (Gemini 1.5 Flash)...';
            const analysis = await this.callGeminiForAnalysis(audioBase64, mimeType, brainData);

            // Salvar relatório no estado e exibir
            this.state.reportData = analysis;
            this.renderReport(analysis);

        } catch (error) {
            console.error('Erro ao processar áudio:', error);
            this.elements.reportContent.textContent = `Erro ao processar áudio: ${error.message}`;
            this.elements.reportContent.style.color = 'red';
        }
    },

    /**
     * Chama a API multimodal do Gemini (1.5 Flash) enviando o áudio como Base64.
     */
    async callGeminiForAnalysis(audioBase64, mimeType, brainData) {
        if (!window.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY não encontrada em js/config.js. O sistema não pode processar o áudio sem uma chave válida.');
        }

        // CORREÇÃO: O modelo 'gemini-2.5-flash' não existe. Corrigido para 'gemini-1.5-flash'.
        // Usando a API v1beta, que suporta dados multimodais (áudio).
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;

        // O prompt de texto é enviado junto com o áudio
        const textPrompt = `
Você é um assistente especializado em processar áudios de reuniões de pais do Método Kumon. Sua tarefa é gerar um relatório estruturado em JSON com base no ÁUDIO EM ANEXO e nos dados de contexto do "brain.json".

O áudio foi gravado em uma reunião de pais. Siga rigorosamente as diretrizes abaixo:

1. **TRANSCREVA O ÁUDIO**: Primeiro, transcreva o áudio em português BR, segmentando por falante.
2. **NÃO INVENTE DADOS**: Toda afirmação sobre um aluno deve derivar explicitamente do áudio transcrito ou do "brain.json".
3. **Fuzzy Matching**: Identifique menções a alunos no áudio usando fuzzy matching com os nomes no "brain.json".
4. **Validação Humana**: Se houver ambiguidades, marque "requer_validacao_humana: true".
5. **Confiança**: Inclua "confidence" (0.0-1.0) para cada inferência.

O "brain.json" (contexto) contém os seguintes alunos:
${JSON.stringify(brainData, null, 2)}

Gere um JSON com os seguintes campos exatos, baseado NO ÁUDIO e no "brain.json":
{
  "meta": {
    "created_at": "${new Date().toISOString()}",
    "sala_id": "REUNIAO_LOCAL",
    "audio_url": null,
    "duration_s": "REAL_DURATION_IN_SECONDS",
    "parts": 1
  },
  "consentimentos": [],
  "transcription_raw": "string completa da transcrição do áudio",
  "speakers": [{"id": "string", "label": "string", "segments": [{"start": "number", "end": "number", "text": "string"}]}],
  "mentions_alunos": [{"aluno_id": "string", "nome": "string", "context": "string", "confidence": "number"}],
  "resumo_executivo": "string",
  "decisoes_sugeridas": [{"texto": "string", "responsavel_sugerido": "string", "prazo_sugerido_days": "number", "source_evidence": "string"}],
  "itens_acao": [{"descricao": "string", "responsavel": "string", "prazo_days": "number", "prioridade": "string"}],
  "dores_familia": [{"familia_nome": "string", "dor_texto": "string", "evidencia_texto": "string", "confidence": "number"}],
  "dores_unidade": [{"dor_texto": "string", "impacto": "string", "evidencia": "string"}],
  "recomendacoes": [{"tipo": "string", "acao": "string", "justificativa": "string", "evidencia": "string"}],
  "audit_log": [{"action": "string", "by": "model|user", "timestamp": "${new Date().toISOString()}", "details": "string"}],
  "requer_validacao_humana": true,
  "sources": ["brain.json", "audio_input"]
}
        `;

        // CORREÇÃO: Corpo da requisição formatado para multimodal (texto + áudio)
        const requestBody = {
            "contents": [
                {
                    "parts": [
                        { "text": textPrompt },
                        {
                            "inlineData": {
                                "mimeType": mimeType,
                                "data": audioBase64
                            }
                        }
                    ]
                }
            ],
            // Configuração para garantir que a saída seja JSON
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro da API Gemini: ${errorData.error?.message || 'Erro desconhecido'}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('Gemini não retornou um texto válido.');
        }
        
        // Como solicitamos JSON, o 'text' deve ser a string JSON
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Erro ao parsear JSON do Gemini:', e);
            console.error('Texto retornado (esperava JSON):', text);
            throw new Error('O modelo retornou um JSON inválido. Verifique o console para mais detalhes.');
        }
    },
    // =====================================================================
    // ====================== FIM DAS CORREÇÕES DE IA ======================
    // =====================================================================

    renderReport(reportData) {
        this.elements.reportContent.textContent = JSON.stringify(reportData, null, 2);
    },
    showReport() {
        if (this.state.reportData) {
            this.renderReport(this.state.reportData);
            this.elements.reportSection.classList.remove('hidden');
            this.elements.reportSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Nenhum relatório disponível. Processar o áudio primeiro.');
        }
    },
    downloadReport() {
        if (!this.state.reportData) {
            alert('Nenhum relatório para download.');
            return;
        }

        const content = JSON.stringify(this.state.reportData, null, 2);
        const filename = `Relatorio_Reuniao_${this.elements.meetingDate.value || new Date().toISOString().split('T')[0]}.json`;
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
    // ===================== REFATORADO PARA REALTIME DB ===================
    // =====================================================================
    
    /**
     * Retorna uma referência do Realtime Database para um caminho específico.
     * O caminho é 'gestores/{userId}/{collectionName}/{docId}'
     */
    getDocRef(collectionName, docId) {
        if (!this.state.userId) return null;
        // A estrutura de dados antiga (Firestore) era:
        // gestores/{userId}/alunos/lista_alunos
        // gestores/{userId}/gestores/brain
        // Vamos replicar isso no Realtime Database:
        return this.state.db.ref(`gestores/${this.state.userId}/${collectionName}/${docId}`);
    },

    /**
     * Busca dados de um caminho no Realtime Database.
     */
    async fetchData(collectionName, docId) {
        const docRef = this.getDocRef(collectionName, docId);
        if (!docRef) return null;
        const snapshot = await docRef.get();
        return snapshot.exists() ? snapshot.val() : null;
    },

    /**
     * Salva dados em um caminho no Realtime Database.
     * ATENÇÃO: Realtime DB não tem 'merge'. A IA anterior usava { merge: true }.
     * A função 'update' é o equivalente mais próximo de 'merge'.
     * A função 'set' sobrescreve tudo no nó.
     * Vamos usar 'update' para preservar dados não listados.
     */
    async saveData(collectionName, docId, data) {
        const docRef = this.getDocRef(collectionName, docId);
        if (docRef) await docRef.update(data); // Usando 'update' em vez de 'set' para simular { merge: true }
    },

    /**
     * Salva dados usando 'set' (sobrescreve completo).
     */
    async setData(collectionName, docId, data) {
        const docRef = this.getDocRef(collectionName, docId);
        if (docRef) await docRef.set(data);
    },

    // =====================================================================
    // ======================== NOVO: GESTÃO DO BRAIN.JSON =================
    // ===================== REFATORADO PARA REALTIME DB ===================
    // =====================================================================
    
    async fetchBrainData() {
        // O caminho agora é 'gestores/{userId}/gestores/brain'
        const brainData = await this.fetchData('gestores', 'brain');
        if (brainData && brainData.brain) {
            return brainData.brain;
        } else {
            console.warn("Nó 'brain' não encontrado no Realtime Database. O modelo não terá contexto.");
            return {};
        }
    },
    
    async saveBrainData(brainData) {
        // Salva o objeto 'brainData' no nó 'brain'
        // A estrutura será: gestores/{userId}/gestores/brain: { brain: {...} }
        await this.setData('gestores', 'brain', { brain: brainData });
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

            // Busca o brain.json atual no Firebase
            let currentBrainData = await this.fetchBrainData();

            // Mescla os dados do arquivo enviado com os dados atuais
            const mergedBrainData = this.deepMerge(currentBrainData, newBrainData);

            // Salva o brain.json mesclado de volta no Firebase
            await this.saveBrainData(mergedBrainData);

            alert('Arquivo JSON enviado e "brain.json" atualizado com sucesso no Firebase!');

            // Limpa o campo de upload
            fileInput.value = '';

        } catch (error) {
            console.error('Erro ao processar o arquivo JSON:', error);
            alert(`Erro ao processar o arquivo: ${error.message}`);
        }
    },
    deepMerge(target, source) {
        // Função auxiliar para mesclar objetos de forma profunda
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
    // ======================= MÓDULO DE ALUNOS (REVISADO) =================
    // ===================== REFATORADO PARA REALTIME DB ===================
    // =====================================================================
    async loadStudents() {
        try {
            // Busca o nó 'lista_alunos' em 'gestores/{userId}/alunos/lista_alunos'
            const data = await this.fetchData('alunos', 'lista_alunos');
            this.state.students = (data && data.students) ? data.students : {};
            this.renderStudentList();
            
            // Bug de apagar dados do 'brain' ao carregar foi corrigido
            // na minha primeira análise e permanece corrigido aqui.

        } catch (error) {
            console.error('Erro ao carregar alunos:', error);
            alert('Não foi possível carregar os dados dos alunos.');
        }
    },
    renderStudentList() {
        const searchTerm = this.elements.studentSearch.value.toLowerCase();
        
        // O state.students do Realtime DB pode vir como um objeto
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
        this.elements.studentForm.reset(); // Limpa o formulário sempre ao abrir
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
        
        // No Realtime DB, é melhor usar push() para gerar IDs únicos se for novo,
        // mas o ID 'Date.now()' funciona para esta estrutura.
        const studentId = this.elements.studentIdInput.value || Date.now().toString();
        
        const studentData = {
            name: document.getElementById('studentName').value.trim(),
            responsible: document.getElementById('studentResponsible').value.trim(),
            contact: document.getElementById('studentContact').value.trim(),
            mathStage: document.getElementById('mathStage').value.trim(),
            portStage: document.getElementById('portStage').value.trim(),
            engStage: document.getElementById('engStage').value.trim(),
            // Garante que os históricos sejam arrays (JSON não armazena arrays vazios)
            programmingHistory: this.state.students[studentId]?.programmingHistory || [],
            reportHistory: this.state.students[studentId]?.reportHistory || [],
            performanceLog: this.state.students[studentId]?.performanceLog || [],
            createdAt: this.state.students[studentId]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Atualiza o estado local
        this.state.students[studentId] = studentData;
        
        try {
            // Salva o objeto 'students' inteiro de volta no nó 'lista_alunos'
            await this.setData('alunos', 'lista_alunos', { students: this.state.students });
            
            this.renderStudentList();
            if (!this.state.currentStudentId) {
                this.state.currentStudentId = studentId;
                this.elements.studentIdInput.value = studentId;
                this.elements.modalTitle.textContent = `📋 Ficha de ${studentData.name}`;
                this.elements.deleteStudentBtn.style.display = 'block';
            }
            // ATUALIZAÇÃO: Sincroniza o brain.json após salvar o aluno
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
        
        // Remove do estado local
        delete this.state.students[this.state.currentStudentId];
        
        try {
            // Salva (sobrescreve) o objeto 'students' inteiro sem o aluno excluído
            await this.setData('alunos', 'lista_alunos', { students: this.state.students });

            this.renderStudentList();
            this.closeStudentModal();
            
            // ATUALIZAÇÃO: Sincroniza o brain.json após excluir o aluno
            await this.updateBrainFromStudents();
            alert('Aluno excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir aluno:', error);
            alert('Erro ao excluir aluno. Tente novamente.');
        }
    },
    // ATUALIZAÇÃO DO BRAIN (Refatorado para Realtime DB)
    async updateBrainFromStudents() {
        let currentBrainData = await this.fetchBrainData();
        let updatedBrain = { ...currentBrainData };

        if (!updatedBrain.alunos) {
            updatedBrain.alunos = {};
        }
        
        // Limpa alunos antigos que não existem mais no state.students
        // (necessário se o brain for mesclado de outra fonte)
        const currentStudentIds = Object.keys(this.state.students);
        for (const brainId in updatedBrain.alunos) {
            if (!currentStudentIds.includes(brainId)) {
                delete updatedBrain.alunos[brainId];
            }
        }

        // Atualiza ou adiciona os alunos do state.students no brain
        for (const [id, student] of Object.entries(this.state.students)) {
            updatedBrain.alunos[id] = {
                id: id,
                nome: student.name,
                responsavel: student.responsible,
                contato: student.contact,
                estagio_matematica: student.mathStage,
                estagio_portugues: student.portStage,
                estagio_ingles: student.engStage,
                // Garante que o histórico seja um array
                historico: student.performanceLog || [],
                metas: updatedBrain.alunos[id]?.metas || {}, // Preserva metas existentes
                observacoes: updatedBrain.alunos[id]?.observacoes || [] // Preserva observações
            };
        }

        // Salva o brain.json atualizado no Firebase
        await this.saveBrainData(updatedBrain);
        console.log("brain.json atualizado com base nos alunos da plataforma (Realtime DB).");
    },
    loadStudentHistories(studentId) {
        const student = this.state.students[studentId];
        if (!student) return this.clearStudentHistories();
        // O Realtime DB pode retornar 'undefined' para arrays vazios
        this.renderHistory('programmingHistory', student.programmingHistory || []);
        this.renderHistory('reportHistory', student.reportHistory || []);
        this.renderHistory('performanceLog', student.performanceLog || []);
    },
    clearStudentHistories() {
        this.elements.programmingHistory.innerHTML = '<p>Nenhuma programação registrada.</p>';
        this.elements.reportHistory.innerHTML = '<p>Nenhum boletim registrado.</p>';
        this.elements.performanceHistory.innerHTML = '<p>Nenhum registro de desempenho.</p>';
    },
    async addHistoryEntry(event, historyType, formElement) {
        event.preventDefault();
        if (!this.state.currentStudentId) {
            alert('É necessário salvar o aluno antes de adicionar registros ao histórico.');
            return;
        }
        const inputs = formElement.querySelectorAll('input, select, textarea');
        const entry = { id: Date.now().toString(), createdAt: new Date().toISOString() };
        let isValid = true;
        inputs.forEach(input => {
            if (input.required && !input.value) isValid = false;
            const key = input.id.replace(/^(programming|report|performance)/, '').charAt(0).toLowerCase() + input.id.slice(1).replace(/^(rogramming|eport|erformance)/, '');
            if(input.type !== 'file') entry[key] = input.value;
        });
        if (!isValid) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        if (historyType === 'reportHistory') {
            const fileInput = formElement.querySelector('input[type="file"]');
            if (fileInput.files.length > 0) {
                // Upload de anexos para o Cloudinary (que é o banco de arquivos)
                try { entry.fileurl = await this.uploadFileToCloudinary(fileInput.files[0], 'boletins'); } 
                catch (error) { console.error('Erro no upload:', error); alert('Erro no upload do arquivo.'); }
            }
        }
        
        // Garante que o array de histórico exista no estado local
        if (!this.state.students[this.state.currentStudentId][historyType]) {
            this.state.students[this.state.currentStudentId][historyType] = [];
        }
        
        this.state.students[this.state.currentStudentId][historyType].push(entry);
        
        try {
            // Salva o objeto 'students' inteiro
            await this.setData('alunos', 'lista_alunos', { students: this.state.students });
            
            this.renderHistory(historyType, this.state.students[this.state.currentStudentId][historyType]);
            formElement.reset();
            // ATUALIZAÇÃO: Sincroniza o brain.json
            await this.updateBrainFromStudents();
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
            alert('Falha ao salvar o registro.');
            this.state.students[this.state.currentStudentId][historyType].pop();
        }
    },
    renderHistory(historyType, historyData) {
        const container = this.elements[historyType];
        
        // Realtime DB pode retornar um objeto em vez de um array se as chaves forem numéricas
        // Garantimos que estamos lidando com um array
        const historyArray = Array.isArray(historyData) ? historyData : Object.values(historyData);

        if (!historyArray || historyArray.length === 0) {
            container.innerHTML = `<p>Nenhum registro encontrado.</p>`;
            return;
        }
        container.innerHTML = historyArray
            .sort((a, b) => new Date(b.date) - new Date(a.date)) // 'date' pode não existir, 'createdAt' seria melhor
            .map(entry => this.createHistoryItemHTML(historyType, entry))
            .join('');
    },
    createHistoryItemHTML(type, entry) {
        let detailsHTML = '';
        // Usa 'createdAt' como fallback se 'date' não estiver preenchido
        const entryDate = entry.date || entry.createdAt;
        const date = entryDate ? new Date(entryDate.startsWith('20') ? entryDate : new Date(entryDate + 'T12:00:00Z')).toLocaleDateString('pt-BR') : 'Data Inválida';
        
        switch (type) {
            case 'programmingHistory':
                detailsHTML = `<div class="history-details"><strong>Material:</strong> ${entry.material || ''}</div>${entry.notes ? `<div class="history-details"><strong>Obs:</strong> ${entry.notes}</div>` : ''}`;
                break;
            case 'reportHistory':
                detailsHTML = `<div class="history-details"><strong>${entry.subject || ''}:</strong> Nota ${entry.grade || 'N/A'}</div>${entry.fileurl ? `<div class="history-file">📎 <a href="${entry.fileurl}" target="_blank">Ver anexo</a></div>` : ''}`;
                break;
            case 'performanceLog':
                detailsHTML = `<div class="history-details">${entry.details || ''}</div>`;
                break;
        }
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-date">${date}</span>
                    <span class="history-type">${entry.type || 'REGISTRO'}</span>
                </div>
                ${detailsHTML}
                <button class="delete-history-btn" onclick="App.deleteHistoryEntry('${type}', '${entry.id}')" title="Excluir">&times;</button>
            </div>`;
    },
    async deleteHistoryEntry(historyType, entryId) {
        if (!confirm('Tem certeza que deseja excluir este registro do histórico?')) return;
        
        const student = this.state.students[this.state.currentStudentId];
        
        // Garante que é um array e filtra
        let historyArray = Array.isArray(student[historyType]) ? student[historyType] : Object.values(student[historyType]);
        student[historyType] = historyArray.filter(entry => entry.id !== entryId);
        
        try {
            // Salva o objeto 'students' inteiro
            await this.setData('alunos', 'lista_alunos', { students: this.state.students });
            
            this.renderHistory(historyType, student[historyType]);
            
            // ATUALIZAÇÃO: Sincroniza o brain.json
            await this.updateBrainFromStudents();
        } catch (error) {
            alert('Falha ao excluir o registro.');
            console.error(error);
            this.loadStudents(); // Recarrega tudo se der errado
        }
    },
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
        
        let analysis = `ANÁLISE INTELIGENTE - ${student.name}
${'='.repeat(50)}
`;
        const repetitions = performanceLog.filter(e => e.type === 'REPETICAO');
        if (repetitions.length >= 3) {
            analysis += `🚨 ALERTA DE PLATÔ: ${repetitions.length} repetições registradas.
   AÇÃO: Revisar material e agendar orientação individual.
`;
        } else if (repetitions.length > 0) {
            analysis += `⚠️ ATENÇÃO: ${repetitions.length} repetição(ões) registrada(s).
   AÇÃO: Monitorar o próximo bloco com atenção.
`;
        }
        const lowGrades = reportHistory.filter(e => parseFloat(e.grade) < 7);
        if (lowGrades.length > 0) {
            analysis += `📊 PONTO DE ATENÇÃO (BOLETIM):
   Nota(s) abaixo de 7.0 em: ${lowGrades.map(e => e.subject).join(', ')}.
   AÇÃO: Agendar reunião com os pais para alinhar estratégias.
`;
        }
        const alerts = performanceLog.filter(e => e.type === 'ALERTA');
        if (alerts.length > 0) {
            const lastAlert = alerts[alerts.length - 1];
            const alertDate = lastAlert.date || lastAlert.createdAt;
            analysis += `⚡️ ALERTA(S) MANUAL(IS) REGISTRADO(S):
   - "${lastAlert.details}" (${new Date(alertDate + 'T12:00:00Z').toLocaleDateString('pt-BR')})
   AÇÃO: Verificar se o problema foi resolvido.
`;
        }
        analysis += `💡 SUGESTÃO ESTRATÉGICA:
`;
        if (repetitions.length >= 3 && lowGrades.length > 0) {
            analysis += `   Prioridade máxima: agendar reunião com os pais. O platô no Kumon pode estar correlacionado com a dificuldade na escola.
`;
        } else if (!student.programmingHistory || student.programmingHistory.length === 0) {
            analysis += `   O aluno não possui programação registrada. Iniciar a programação de materiais é fundamental para acompanhar o progresso.
`;
        } else {
            analysis += `   O progresso parece estável. Manter o acompanhamento e registrar elogios para reforço positivo.
`;
        }
        analysis += `
Última atualização: ${new Date().toLocaleString('pt-BR')}`;
        analysisContent.textContent = analysis;
    },
    // O upload para o Cloudinary AINDA É USADO para anexos de boletins.
    async uploadFileToCloudinary(file, folder) {
        if (!cloudinaryConfig || !cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
            throw new Error('Configuração do Cloudinary não encontrada em js/config.js');
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', `${this.state.userId}/${folder}`);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Erro no upload para Cloudinary');
        const result = await response.json();
        return result.secure_url;
    },
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
            // Caminho para apagar todos os dados do usuário no Realtime DB
            const userRootRef = this.state.db.ref(`gestores/${this.state.userId}`);
            await userRootRef.remove();
            
            alert("Sistema resetado com sucesso.");
            location.reload();
        } catch (error) {
            console.error("Erro no reset:", error);
            alert("Ocorreu um erro ao tentar resetar o sistema.");
        }
    }
};
