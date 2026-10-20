const { Router } = require('express');
const alunoController = require('../controllers/alunoController');

// Importa os dois seguranças (Middlewares)
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// ============================================================
// CAMADA DE ROTAS - Alunos (Protegidas por RBAC)
// ============================================================

const router = Router();

// Todas as rotas de alunos exigem autenticação (1º Segurança)
router.use(authMiddleware);

// --- Consulta: Qualquer usuário com crachá válido (admin, secretaria, professor) ---
router.get('/',    alunoController.listarAlunos);
router.get('/:id', alunoController.buscarAluno);

// --- Criação e Edição: Permitido para 'admin' e 'secretaria' ---
router.post('/',   roleMiddleware('admin', 'secretaria'), alunoController.criarAluno);
router.put('/:id', roleMiddleware('admin', 'secretaria'), alunoController.atualizarAluno);

// --- Exclusão: Exclusivo para 'admin' ---
router.delete('/:id', roleMiddleware('admin'), alunoController.deletarAluno);

module.exports = router;
