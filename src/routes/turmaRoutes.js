const { Router } = require('express');
const turmaController = require('../controllers/turmaController');

// ============================================================
// CAMADA DE ROTAS - Turmas (Matrículas)
// Responsabilidade: mapear as URLs HTTP para os controllers.
// NÃO contém lógica de negócio.
// ============================================================

const router = Router();

// GET    /turmas              → Lista todas as matrículas (paginação)
// POST   /turmas              → Realiza uma matrícula (REGRA DE OURO)
// GET    /turmas/:id          → Busca matrícula por ID
// DELETE /turmas/:id          → Cancela matrícula por ID
// GET    /turmas/aluno/:alunoId → Lista matrículas de um aluno específico

// ⚠️  ATENÇÃO: A rota estática /aluno/:alunoId deve vir ANTES de /:id
// para evitar que o Express interprete "aluno" como um ID numérico.
router.get('/aluno/:alunoId', turmaController.listarTurmasPorAluno);

router.get('/',     turmaController.listarTurmas);
router.post('/',    turmaController.matricularAluno);
router.get('/:id',  turmaController.buscarTurma);
router.delete('/:id', turmaController.cancelarMatricula);

module.exports = router;
