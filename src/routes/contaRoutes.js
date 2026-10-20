const express = require('express');
const router = express.Router();
const contaController = require('../controllers/contaController');

// Importa os nossos dois seguranças (Middlewares)
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// =====================================
// Rota Pública (Livre para todos)
// =====================================
router.post('/login', contaController.login);

// =====================================
// Rota Protegida 1: Perfil
// (Requer Apenas Autenticação)
// =====================================
// Disponível tanto em /contas/perfil quanto /contas/me
router.get('/perfil', authMiddleware, contaController.verPerfil);
router.get('/me', authMiddleware, contaController.verPerfil);

// =====================================
// Rotas Protegidas 2: Gestão de Contas
// (Requer Autenticação + Cargo 'admin')
// =====================================
// 1º: authMiddleware checa se o token existe e é válido (Erro 401 se não tiver)
// 2º: roleMiddleware checa se o cargo dentro do token é 'admin' (Erro 403 se não for)
router.post('/registrar', authMiddleware, roleMiddleware('admin'), contaController.registrar);
router.post('/', authMiddleware, roleMiddleware('admin'), contaController.registrar);
router.get('/', authMiddleware, roleMiddleware('admin'), contaController.listar);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), contaController.remover);

module.exports = router;
