const { Router } = require('express');
const turmaController = require('../controllers/turmaController');

// Importa os dois seguranças (Middlewares)
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// ============================================================
// CAMADA DE ROTAS - Turmas / Matrículas (Protegidas por RBAC)
// ============================================================

const router = Router();

// Todas as rotas de turmas exigem autenticação (1º Segurança)
router.use(authMiddleware);

// --- Consulta: Qualquer usuário com crachá válido (admin, secretaria, professor) ---
router.get('/aluno/:alunoId', turmaController.listarTurmasPorAluno);
router.get('/',               turmaController.listarTurmas);
router.get('/:id',            turmaController.buscarTurma);

// --- Matrícula: Permitido para 'admin' e 'secretaria' ---
router.post('/',              roleMiddleware('admin', 'secretaria'), turmaController.matricularAluno);

// --- Cancelamento de Matrícula: Exclusivo para 'admin' ---
router.delete('/:id',         roleMiddleware('admin'), turmaController.cancelarMatricula);

module.exports = router;
