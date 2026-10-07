const alunoRepository = require('../repositories/alunoRepository');

// ============================================================
// CAMADA DE CONTROLLER - Alunos
// Responsabilidade: receber requisições HTTP, aplicar regras
// de negócio e retornar respostas formatadas.
// NÃO executa SQL diretamente - delega ao Repository.
// ============================================================

/**
 * GET /alunos
 * Lista todos os alunos com paginação.
 * Query params: ?page=1&limit=10
 */
const listarAlunos = async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Regra de negócio: limit máximo de 100 registros por página
        if (limit > 100) {
            return res.status(400).json({
                erro: 'O limite máximo por página é 100 registros.'
            });
        }

        const offset = (page - 1) * limit;

        const [alunos, total] = await Promise.all([
            alunoRepository.findAll(limit, offset),
            alunoRepository.countAll(),
        ]);

        return res.status(200).json({
            dados: alunos,
            paginacao: {
                total,
                pagina_atual: page,
                total_paginas: Math.ceil(total / limit),
                limite: limit,
            },
        });
    } catch (error) {
        console.error('[AlunoController] Erro ao listar alunos:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * GET /alunos/:id
 * Busca um aluno pelo ID.
 */
const buscarAluno = async (req, res) => {
    try {
        const { id } = req.params;

        // Validação: ID deve ser um número inteiro positivo
        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const aluno = await alunoRepository.findById(id);

        if (!aluno) {
            return res.status(404).json({ erro: `Aluno com ID ${id} não encontrado.` });
        }

        return res.status(200).json(aluno);
    } catch (error) {
        console.error('[AlunoController] Erro ao buscar aluno:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * POST /alunos
 * Cria um novo aluno.
 * Body: { nome, email, nascimento }
 */
const criarAluno = async (req, res) => {
    try {
        const { nome, email, nascimento } = req.body;

        // Regra de negócio: campos obrigatórios
        if (!nome || !email) {
            return res.status(400).json({
                erro: 'Os campos "nome" e "email" são obrigatórios.'
            });
        }

        // Regra de negócio: formato de e-mail básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ erro: 'Formato de e-mail inválido.' });
        }

        // Regra de negócio: e-mail deve ser único
        const emailExistente = await alunoRepository.findByEmail(email);
        if (emailExistente) {
            return res.status(409).json({
                erro: `O e-mail "${email}" já está cadastrado no sistema.`
            });
        }

        const novoAluno = await alunoRepository.create(nome, email, nascimento || null);

        return res.status(201).json(novoAluno);
    } catch (error) {
        console.error('[AlunoController] Erro ao criar aluno:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * PUT /alunos/:id
 * Atualiza os dados de um aluno.
 * Body: { nome, email, nascimento }
 */
const atualizarAluno = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, nascimento } = req.body;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        if (!nome || !email) {
            return res.status(400).json({
                erro: 'Os campos "nome" e "email" são obrigatórios.'
            });
        }

        // Verifica se o aluno existe
        const alunoExistente = await alunoRepository.findById(id);
        if (!alunoExistente) {
            return res.status(404).json({ erro: `Aluno com ID ${id} não encontrado.` });
        }

        // Verifica se o novo e-mail já pertence a outro aluno
        const emailExistente = await alunoRepository.findByEmail(email);
        if (emailExistente && emailExistente.id !== parseInt(id)) {
            return res.status(409).json({
                erro: `O e-mail "${email}" já está sendo usado por outro aluno.`
            });
        }

        const alunoAtualizado = await alunoRepository.update(
            id, nome, email, nascimento || null
        );

        return res.status(200).json(alunoAtualizado);
    } catch (error) {
        console.error('[AlunoController] Erro ao atualizar aluno:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * DELETE /alunos/:id
 * Remove um aluno do sistema.
 */
const deletarAluno = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const alunoDeletado = await alunoRepository.remove(id);

        if (!alunoDeletado) {
            return res.status(404).json({ erro: `Aluno com ID ${id} não encontrado.` });
        }

        return res.status(200).json({
            mensagem: `Aluno "${alunoDeletado.nome}" removido com sucesso.`,
            aluno: alunoDeletado,
        });
    } catch (error) {
        console.error('[AlunoController] Erro ao deletar aluno:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

module.exports = {
    listarAlunos,
    buscarAluno,
    criarAluno,
    atualizarAluno,
    deletarAluno,
};
