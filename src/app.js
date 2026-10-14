const express = require('express');
const path = require('path');

const alunoRoutes = require('./routes/alunoRoutes');
const cursoRoutes = require('./routes/cursoRoutes');
const turmaRoutes = require('./routes/turmaRoutes');
const contaRoutes = require('./routes/contaRoutes');

// ============================================================
// CONFIGURAÇÃO DO EXPRESS
// Este arquivo configura os middlewares globais e registra
// todas as rotas da aplicação.
// ============================================================

const app = express();

// --- MIDDLEWARES GLOBAIS ---

// Habilita CORS para permitir conexões de qualquer cliente
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Interpreta o body das requisições como JSON
app.use(express.json());

// Servir arquivos estáticos do frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// --- REGISTRO DAS ROTAS ---

// Rota raiz: Se for navegador buscando HTML, serve o frontend; se for cliente HTTP/JSON, retorna status
app.get('/', (req, res) => {
    if (req.accepts('html')) {
        return res.sendFile(path.join(__dirname, '../public/index.html'));
    }
    res.status(200).json({
        mensagem: '🏫 API de Gestão Escolar está funcionando!',
        versao: '1.0.0',
        endpoints: {
            alunos: '/alunos',
            cursos: '/cursos',
            turmas: '/turmas',
            contas: '/contas',
        },
    });
});

// Registra os roteadores em seus respectivos prefixos
app.use('/alunos', alunoRoutes);
app.use('/cursos', cursoRoutes);
app.use('/turmas', turmaRoutes);
app.use('/contas', contaRoutes);

// --- MIDDLEWARE DE ERRO 404 ---
// Captura qualquer rota não encontrada
app.use((req, res) => {
    res.status(404).json({
        erro: `Rota "${req.method} ${req.originalUrl}" não encontrada.`,
    });
});

// --- MIDDLEWARE DE ERRO GLOBAL ---
// Captura qualquer erro não tratado nos controllers
app.use((err, req, res, next) => {
    console.error('❌ Erro global não tratado:', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

module.exports = app;
