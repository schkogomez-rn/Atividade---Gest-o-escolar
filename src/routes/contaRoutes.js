const express = require('express');
const router = express.Router();
const contaController = require('../controllers/contaController');
const authMiddleware = require('../middlewares/authMiddleware'); // 👈 Importa o segurança

// ============================================================
// ROTAS: Contas
// ============================================================

// POST /contas/registrar  →  Cadastra nova conta com senha criptografada
router.post('/registrar', contaController.registrar);

// POST /contas/login  →  Valida credenciais e realiza o login
router.post('/login', contaController.login);

// ROTA PROTEGIDA! Rota -> Middleware -> Controller
// GET /contas/perfil  →  Retorna os dados da conta autenticada
router.get('/perfil', authMiddleware, contaController.verPerfil);

module.exports = router;

