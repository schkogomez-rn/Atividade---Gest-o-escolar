const cursoRepository = require('../repositories/cursoRepository');

// ============================================================
// CAMADA DE CONTROLLER - Cursos
// Responsabilidade: receber requisições HTTP, aplicar regras
// de negócio e retornar respostas formatadas.
// NÃO executa SQL diretamente - delega ao Repository.
// ============================================================

/**
 * GET /cursos
 * Lista todos os cursos com paginação.
 * Query params: ?page=1&limit=10
 */
const listarCursos = async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (limit > 100) {
            return res.status(400).json({
                erro: 'O limite máximo por página é 100 registros.'
            });
        }

        const offset = (page - 1) * limit;

        const [cursos, total] = await Promise.all([
            cursoRepository.findAll(limit, offset),
            cursoRepository.countAll(),
        ]);

        return res.status(200).json({
            dados: cursos,
            paginacao: {
                total,
                pagina_atual: page,
                total_paginas: Math.ceil(total / limit),
                limite: limit,
            },
        });
    } catch (error) {
        console.error('[CursoController] Erro ao listar cursos:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * GET /cursos/:id
 * Busca um curso pelo ID.
 */
const buscarCurso = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const curso = await cursoRepository.findById(id);

        if (!curso) {
            return res.status(404).json({ erro: `Curso com ID ${id} não encontrado.` });
        }

        return res.status(200).json(curso);
    } catch (error) {
        console.error('[CursoController] Erro ao buscar curso:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * POST /cursos
 * Cria um novo curso.
 * Body: { nome, descricao, vagas }
 */
const criarCurso = async (req, res) => {
    try {
        const { nome, descricao, vagas } = req.body;

        // Regra de negócio: nome é obrigatório
        if (!nome) {
            return res.status(400).json({ erro: 'O campo "nome" é obrigatório.' });
        }

        // Regra de negócio: vagas deve ser um número inteiro positivo
        const vagasInt = parseInt(vagas);
        if (isNaN(vagasInt) || vagasInt < 1) {
            return res.status(400).json({
                erro: 'O campo "vagas" deve ser um número inteiro maior que zero.'
            });
        }

        const novoCurso = await cursoRepository.create(nome, descricao || null, vagasInt);

        return res.status(201).json(novoCurso);
    } catch (error) {
        console.error('[CursoController] Erro ao criar curso:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * PUT /cursos/:id
 * Atualiza os dados de um curso.
 * Body: { nome, descricao, vagas }
 */
const atualizarCurso = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, vagas } = req.body;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        if (!nome) {
            return res.status(400).json({ erro: 'O campo "nome" é obrigatório.' });
        }

        const vagasInt = parseInt(vagas);
        if (isNaN(vagasInt) || vagasInt < 0) {
            return res.status(400).json({
                erro: 'O campo "vagas" deve ser um número inteiro não negativo.'
            });
        }

        // Verifica se o curso existe antes de atualizar
        const cursoExistente = await cursoRepository.findById(id);
        if (!cursoExistente) {
            return res.status(404).json({ erro: `Curso com ID ${id} não encontrado.` });
        }

        const cursoAtualizado = await cursoRepository.update(
            id, nome, descricao || null, vagasInt
        );

        return res.status(200).json(cursoAtualizado);
    } catch (error) {
        console.error('[CursoController] Erro ao atualizar curso:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * DELETE /cursos/:id
 * Remove um curso do sistema.
 */
const deletarCurso = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const cursoDeletado = await cursoRepository.remove(id);

        if (!cursoDeletado) {
            return res.status(404).json({ erro: `Curso com ID ${id} não encontrado.` });
        }

        return res.status(200).json({
            mensagem: `Curso "${cursoDeletado.nome}" removido com sucesso.`,
            curso: cursoDeletado,
        });
    } catch (error) {
        console.error('[CursoController] Erro ao deletar curso:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

module.exports = {
    listarCursos,
    buscarCurso,
    criarCurso,
    atualizarCurso,
    deletarCurso,
};
