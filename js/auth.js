// Regista o Service Worker para a funcionalidade PWA (App Instalável)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('Service Worker registrado com sucesso:', registration.scope))
            .catch(error => console.error('Falha ao registrar Service Worker:', error));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebaseConfig === 'undefined') {
        alert("ERRO GRAVE: O ficheiro de configuração (config.js) não foi encontrado.");
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    } catch (e) {
        console.warn('Firebase já inicializado ou erro na inicialização.', e);
    }

    const auth = firebase.auth();
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    // Mostra a tela de login se o usuário não estiver logado
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário logado: esconde a tela de login e mostra a principal
            loginScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            // Inicia a aplicação
            if (typeof App !== "undefined" && App.init) {
                App.init(user, firebase.firestore());
            } else {
                console.error("Objeto 'App' não definido. Verifique a ordem de carregamento dos scripts no index.html.");
                document.getElementById('loading-overlay').innerHTML = '<p style="color:red;">Erro fatal na aplicação. Verifique a consola.</p>';
            }
        } else {
            // Usuário não logado: mostra a tela de login
            loginScreen.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    });

    // Lida com o envio do formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    // Login bem-sucedido: o evento onAuthStateChanged acima irá redirecionar automaticamente
                    // NÃO FAZEMOS NENHUM REDIRECIONAMENTO EXPLÍCITO PARA login.html
                })
                .catch(() => {
                    document.getElementById('login-error').textContent = "Email ou senha inválidos.";
                });
        });
    }
});
