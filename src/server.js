require('dotenv').config();
const app = require('./app');

// ============================================================
// PONTO DE ENTRADA DO SERVIDOR
// Este arquivo é responsável apenas por iniciar o servidor.
// Toda a configuração do Express está em app.js.
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('================================================');
    console.log('🏫  API de Gestão Escolar');
    console.log('================================================');
    console.log(`🚀  Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📚  Alunos:              http://localhost:${PORT}/alunos`);
    console.log(`📖  Cursos:              http://localhost:${PORT}/cursos`);
    console.log(`🎓  Turmas/Matrículas:   http://localhost:${PORT}/turmas`);
    console.log(`👤  Contas (cadastro):   http://localhost:${PORT}/contas/registrar`);
    console.log(`🔐  Contas (login):      http://localhost:${PORT}/contas/login`);
    console.log('================================================');
});
