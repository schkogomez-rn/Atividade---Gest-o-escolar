const express = require('express');
const router = express.Router();
const contaController = require('../controllers/contaController');

// ============================================================
// ROTAS: Contas
// ============================================================

// POST /contas/registrar  →  Cadastra nova conta com senha criptografada
router.post('/registrar', contaController.registrar);

// POST /contas/login  →  Valida credenciais e realiza o login
router.post('/login', contaController.login);

module.exports = router;
