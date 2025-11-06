// =====================================================================
// =====================================================================
// 🔑 ARQUIVO DE CONFIGURAÇÃO - COLE AS SUAS CHAVES DO FIREBASE AQUI 🔑
// =====================================================================
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDFrbeT1ZLXwHRZCu9KKY2cSYMMSQTOrmE",
    authDomain: "comando-kumon-app-192eb.firebaseapp.com",
    projectId: "comando-kumon-app-192eb",
    storageBucket: "comando-kumon-app-192eb.firebasestorage.app",
    messagingSenderId: "1061275561465",
    appId: "1:1061275561465:web:6ee3bd8e95e2716796e128"
  };

// --- Configuração do Cloudinary (PREENCHA ESTES VALORES) ---
const cloudinaryConfig = {
    cloudName: "dpaayfwlj",
    uploadPreset: "kumon-ia" // Vamos criar este no próximo passo
};

// --- Configuração da GEMINI API (APENAS PARA FRONTEND - USO DEMO) ---
// AVISO: Esta chave será exposta no frontend. Use apenas para demonstração interna.
// Após aprovação, remova esta chave e migre para um backend proxy seguro.
window.GEMINI_API_KEY = "<COLOQUE_AQUI_SUA_GEMINI_API_KEY>"; // Ex: "AIzaSy..."
