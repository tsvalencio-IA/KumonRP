// =====================================================================
// =====================================================================
// 🔑 ARQUIVO DE CONFIGURAÇÃO - COLE AS SUAS CHAVES DO FIREBASE AQUI 🔑
// =====================================================================
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAEzkzfF9Pgy1-rxlnV_ekGhucirmvFXlQ",
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
    uploadPreset: "kumon_ia" // Usado para upload de boletins (anexos)
};

// --- ConfigURAÇÃO DA GOOGLE GEMINI API (NOVA ARQUITETURA) ---
// AVISO: Esta chave será exposta no frontend.
// Crie esta chave em: https://aistudio.google.com/app/apikey
// ATIVE A "Generative Language API" NO SEU PROJETO GOOGLE CLOUD
window.GEMINI_API_KEY = "AIzaSyDTKobrRmnPbolrBAMa42O3qsVvS5z6PxQ"; // Ex: "AIza..."
