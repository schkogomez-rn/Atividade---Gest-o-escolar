const { Router } = require('express');
const cursoController = require('../controllers/cursoController');

// ============================================================
// CAMADA DE ROTAS - Cursos
// Responsabilidade: mapear as URLs HTTP para os controllers.
// NÃO contém lógica de negócio.
// ============================================================

const router = Router();

// GET    /cursos          → Lista todos os cursos (paginação)
// POST   /cursos          → Cria um novo curso
// GET    /cursos/:id      → Busca curso por ID
// PUT    /cursos/:id      → Atualiza curso por ID
// DELETE /cursos/:id      → Remove curso por ID

router.get('/',     cursoController.listarCursos);
router.post('/',    cursoController.criarCurso);
router.get('/:id',  cursoController.buscarCurso);
router.put('/:id',  cursoController.atualizarCurso);
router.delete('/:id', cursoController.deletarCurso);

module.exports = router;
