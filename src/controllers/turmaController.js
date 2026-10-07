const turmaRepository  = require('../repositories/turmaRepository');
const alunoRepository  = require('../repositories/alunoRepository');
const cursoRepository  = require('../repositories/cursoRepository');

// ============================================================
// CAMADA DE CONTROLLER - Turmas (Matrículas)
// Responsabilidade: receber requisições HTTP, aplicar a
// REGRA DE OURO (verificar vagas antes de matricular),
// e retornar respostas formatadas.
// ============================================================

/**
 * GET /turmas
 * Lista todas as matrículas com dados do aluno e curso.
 * Query params: ?page=1&limit=10
 */
const listarTurmas = async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (limit > 100) {
            return res.status(400).json({
                erro: 'O limite máximo por página é 100 registros.'
            });
        }

        const offset = (page - 1) * limit;

        const [turmas, total] = await Promise.all([
            turmaRepository.findAll(limit, offset),
            turmaRepository.countAll(),
        ]);

        return res.status(200).json({
            dados: turmas,
            paginacao: {
                total,
                pagina_atual: page,
                total_paginas: Math.ceil(total / limit),
                limite: limit,
            },
        });
    } catch (error) {
        console.error('[TurmaController] Erro ao listar turmas:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * GET /turmas/:id
 * Busca uma matrícula pelo ID.
 */
const buscarTurma = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const turma = await turmaRepository.findById(id);

        if (!turma) {
            return res.status(404).json({ erro: `Matrícula com ID ${id} não encontrada.` });
        }

        return res.status(200).json(turma);
    } catch (error) {
        console.error('[TurmaController] Erro ao buscar turma:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * GET /turmas/aluno/:alunoId
 * Lista todos os cursos em que um aluno está matriculado.
 */
const listarTurmasPorAluno = async (req, res) => {
    try {
        const { alunoId } = req.params;

        if (isNaN(alunoId) || parseInt(alunoId) <= 0) {
            return res.status(400).json({ erro: 'ID do aluno inválido.' });
        }

        // Verifica se o aluno existe
        const aluno = await alunoRepository.findById(alunoId);
        if (!aluno) {
            return res.status(404).json({ erro: `Aluno com ID ${alunoId} não encontrado.` });
        }

        const turmas = await turmaRepository.findByAluno(alunoId);

        return res.status(200).json({
            aluno: { id: aluno.id, nome: aluno.nome, email: aluno.email },
            total_matriculas: turmas.length,
            matriculas: turmas,
        });
    } catch (error) {
        console.error('[TurmaController] Erro ao listar turmas do aluno:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * POST /turmas
 * ⭐ MATRÍCULA - Aplica a REGRA DE OURO do sistema.
 *
 * Body: { aluno_id, curso_id }
 *
 * Fluxo da Regra de Negócio:
 * 1. Valida os campos do body
 * 2. Verifica se o aluno existe
 * 3. Verifica se o curso existe
 * 4. ⚠️  Verifica se o curso ainda tem VAGAS DISPONÍVEIS
 * 5. Verifica se o aluno já não está matriculado nesse curso
 * 6. Executa a matrícula via transação (desconta vaga + cria registro)
 */
const matricularAluno = async (req, res) => {
    try {
        const { aluno_id, curso_id } = req.body;

        // --- VALIDAÇÕES DE ENTRADA ---
        if (!aluno_id || !curso_id) {
            return res.status(400).json({
                erro: 'Os campos "aluno_id" e "curso_id" são obrigatórios.'
            });
        }

        if (isNaN(aluno_id) || parseInt(aluno_id) <= 0) {
            return res.status(400).json({ erro: '"aluno_id" deve ser um número inteiro positivo.' });
        }

        if (isNaN(curso_id) || parseInt(curso_id) <= 0) {
            return res.status(400).json({ erro: '"curso_id" deve ser um número inteiro positivo.' });
        }

        // --- VERIFICAÇÃO DO ALUNO ---
        const aluno = await alunoRepository.findById(aluno_id);
        if (!aluno) {
            return res.status(404).json({
                erro: `Aluno com ID ${aluno_id} não encontrado.`
            });
        }

        // --- VERIFICAÇÃO DO CURSO ---
        const curso = await cursoRepository.findById(curso_id);
        if (!curso) {
            return res.status(404).json({
                erro: `Curso com ID ${curso_id} não encontrado.`
            });
        }

        // --- ⚠️  REGRA DE OURO: VERIFICAÇÃO DE VAGAS ---
        if (curso.vagas <= 0) {
            return res.status(409).json({
                erro: `O curso "${curso.nome}" não possui vagas disponíveis.`,
                vagas_disponiveis: 0,
            });
        }

        // --- VERIFICAÇÃO DE MATRÍCULA DUPLICADA ---
        const matriculaExistente = await turmaRepository.findByAlunoAndCurso(aluno_id, curso_id);
        if (matriculaExistente) {
            return res.status(409).json({
                erro: `O aluno "${aluno.nome}" já está matriculado no curso "${curso.nome}".`
            });
        }

        // --- EXECUÇÃO DA MATRÍCULA (via transação no repository) ---
        const novaMatricula = await turmaRepository.criarMatricula(aluno_id, curso_id);

        // Proteção extra: se a transação falhou silenciosamente (race condition)
        if (!novaMatricula) {
            return res.status(409).json({
                erro: `Falha ao matricular: o curso "${curso.nome}" não possui vagas disponíveis.`,
                vagas_disponiveis: 0,
            });
        }

        return res.status(201).json({
            mensagem: `✅ Matrícula realizada com sucesso!`,
            matricula: {
                id: novaMatricula.id,
                aluno: { id: aluno.id, nome: aluno.nome },
                curso: { id: curso.id, nome: curso.nome, vagas_restantes: curso.vagas - 1 },
                data_matricula: novaMatricula.data_matricula,
            },
        });

    } catch (error) {
        console.error('[TurmaController] Erro ao matricular aluno:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

/**
 * DELETE /turmas/:id
 * Cancela uma matrícula.
 * Obs: NÃO devolve a vaga automaticamente neste exemplo.
 */
const cancelarMatricula = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({ erro: 'ID inválido.' });
        }

        const matriculaDeletada = await turmaRepository.remove(id);

        if (!matriculaDeletada) {
            return res.status(404).json({
                erro: `Matrícula com ID ${id} não encontrada.`
            });
        }

        return res.status(200).json({
            mensagem: `Matrícula ID ${id} cancelada com sucesso.`,
            matricula: matriculaDeletada,
        });
    } catch (error) {
        console.error('[TurmaController] Erro ao cancelar matrícula:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
};

module.exports = {
    listarTurmas,
    buscarTurma,
    listarTurmasPorAluno,
    matricularAluno,
    cancelarMatricula,
};
