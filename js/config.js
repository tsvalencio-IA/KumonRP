// =====================================================================
// =====================================================================
// 🔑 ARQUIVO DE CONFIGURAÇÃO - COLE AS SUAS CHAVES DO FIREBASE AQUI 🔑
// =====================================================================
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBc4bPhHBhZ-6wL7DUBGUhEtt9wt8BcbtE",
    authDomain: "kumon-c63a2.firebaseapp.com",
    databaseURL: "https://kumon-c63a2-default-rtdb.firebaseio.com",
    projectId: "kumon-c63a2",
    storageBucket: "kumon-c63a2.firebasestorage.app",
    messagingSenderId: "1087736846603",
    appId: "1:1087736846603:web:261294f3b5b28a3b792a0e"
  };

// --- Configuração do Cloudinary (PREENCHA ESTES VALORES) ---
const cloudinaryConfig = {
    cloudName: "djtiaygrs",
    uploadPreset: "kumon_ia" // Vamos criar este no próximo passo
};

// --- Configuração da GEMINI API (APENAS PARA FRONTEND - USO DEMO) ---
// AVISO: Esta chave será exposta no frontend. Use apenas para demonstração interna.
// Após aprovação, remova esta chave e migre para um backend proxy seguro.
window.GEMINI_API_KEY = "AIzaSyBpme4fuJ4etdCtZjt1nkujEd1b4SKP-ww"; // Ex: "AIzaSy..."
