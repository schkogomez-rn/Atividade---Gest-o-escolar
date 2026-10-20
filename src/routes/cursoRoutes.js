const { Router } = require('express');
const cursoController = require('../controllers/cursoController');

// Importa os dois seguranças (Middlewares)
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// ============================================================
// CAMADA DE ROTAS - Cursos (Protegidas por RBAC)
// ============================================================

const router = Router();

// Todas as rotas de cursos exigem autenticação (1º Segurança)
router.use(authMiddleware);

// --- Consulta: Qualquer usuário com crachá válido (admin, secretaria, professor) ---
router.get('/',    cursoController.listarCursos);
router.get('/:id', cursoController.buscarCurso);

// --- Modificações: Exclusivo para o cargo 'admin' (2º Segurança) ---
router.post('/',      roleMiddleware('admin'), cursoController.criarCurso);
router.put('/:id',    roleMiddleware('admin'), cursoController.atualizarCurso);
router.delete('/:id', roleMiddleware('admin'), cursoController.deletarCurso);

module.exports = router;
