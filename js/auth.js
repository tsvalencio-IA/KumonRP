// js/auth.js - Gerenciador de Autenticação Robusto

// Regista o Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registrado:', registration.scope))
            .catch(error => console.error('Falha no SW:', error));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificação de Segurança da Configuração
    if (typeof firebaseConfig === 'undefined') {
        console.error("ERRO CRÍTICO: config.js não carregado.");
        alert("Erro de sistema: Configuração não encontrada.");
        return;
    }

    // 2. Inicialização do Firebase (Singleton Pattern)
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    } catch (e) {
        console.warn('Firebase já inicializado:', e);
    }

    const auth = firebase.auth();
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginErrorMsg = document.getElementById('login-error');

    // 3. Listener de Estado de Autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário LOGADO
            console.log("Usuário autenticado:", user.email);
            
            if (loginScreen) loginScreen.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');
            
            // Inicia a Aplicação Principal
            if (typeof App !== "undefined" && App.init) {
                // Passa o usuário e a instância do Database corretamente
                App.init(user, firebase.database());
            } else {
                console.error("ERRO: App.js não foi carregado corretamente.");
                alert("Erro de carregamento do sistema. Recarregue a página.");
            }
        } else {
            // Usuário NÃO LOGADO (ou fez Logout)
            console.log("Usuário não autenticado.");
            if (loginScreen) loginScreen.classList.remove('hidden');
            if (appContainer) appContainer.classList.add('hidden');
        }
    });

    // 4. Lógica de Login (Botão Entrar)
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Feedback visual de carregamento
            const btn = loginForm.querySelector('button');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Entrando...";
            loginErrorMsg.textContent = "";

            const email = loginForm.email.value;
            const password = loginForm.password.value;

            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    // Sucesso: O onAuthStateChanged vai lidar com a transição de tela
                    console.log("Login realizado com sucesso.");
                })
                .catch((error) => {
                    console.error("Erro de login:", error);
                    btn.disabled = false;
                    btn.textContent = originalText;
                    
                    // Tratamento de erros comuns
                    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                        loginErrorMsg.textContent = "Email ou senha incorretos.";
                    } else if (error.code === 'auth/too-many-requests') {
                        loginErrorMsg.textContent = "Muitas tentativas. Tente mais tarde.";
                    } else if (error.code === 'auth/network-request-failed') {
                        loginErrorMsg.textContent = "Erro de conexão. Verifique sua internet.";
                    } else {
                        loginErrorMsg.textContent = "Erro ao entrar: " + error.message;
                    }
                });
        });
    }
});
