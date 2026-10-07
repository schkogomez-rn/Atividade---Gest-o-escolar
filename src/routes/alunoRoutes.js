const { Router } = require('express');
const alunoController = require('../controllers/alunoController');

// ============================================================
// CAMADA DE ROTAS - Alunos
// Responsabilidade: mapear as URLs HTTP para os controllers.
// NÃO contém lógica de negócio.
// ============================================================

const router = Router();

// GET    /alunos          → Lista todos os alunos (paginação)
// POST   /alunos          → Cria um novo aluno
// GET    /alunos/:id      → Busca aluno por ID
// PUT    /alunos/:id      → Atualiza aluno por ID
// DELETE /alunos/:id      → Remove aluno por ID

router.get('/',     alunoController.listarAlunos);
router.post('/',    alunoController.criarAluno);
router.get('/:id',  alunoController.buscarAluno);
router.put('/:id',  alunoController.atualizarAluno);
router.delete('/:id', alunoController.deletarAluno);

module.exports = router;
