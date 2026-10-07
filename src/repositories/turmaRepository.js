const pool = require('../config/db');

// ============================================================
// CAMADA DE REPOSITÓRIO - Turmas
// Responsabilidade: executar as queries SQL referentes a Turmas
// (matrículas). Contém a lógica de transação para garantir
// a integridade dos dados durante a matrícula.
// ============================================================

/**
 * Busca todas as turmas/matrículas com dados do aluno e do curso.
 * Usa JOIN para retornar informações completas em uma única query.
 * @param {number} limit  - Quantidade de registros por página
 * @param {number} offset - Quantidade de registros a pular
 * @returns {Promise<Array>} Lista de matrículas enriquecidas
 */
const findAll = async (limit, offset) => {
    const query = `
        SELECT
            t.id             AS matricula_id,
            t.data_matricula,
            a.id             AS aluno_id,
            a.nome           AS aluno_nome,
            a.email          AS aluno_email,
            c.id             AS curso_id,
            c.nome           AS curso_nome,
            c.vagas          AS vagas_restantes
        FROM turmas t
        INNER JOIN alunos a ON t.aluno_id = a.id
        INNER JOIN cursos c ON t.curso_id = c.id
        ORDER BY t.data_matricula DESC
        LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
};

/**
 * Conta o total de matrículas (usado para paginação).
 * @returns {Promise<number>} Total de matrículas
 */
const countAll = async () => {
    const result = await pool.query('SELECT COUNT(*) FROM turmas');
    return parseInt(result.rows[0].count, 10);
};

/**
 * Busca uma única matrícula pelo ID, com dados do aluno e curso.
 * @param {number} id - ID da turma/matrícula
 * @returns {Promise<Object|null>} Matrícula ou null se não encontrada
 */
const findById = async (id) => {
    const query = `
        SELECT
            t.id             AS matricula_id,
            t.data_matricula,
            a.id             AS aluno_id,
            a.nome           AS aluno_nome,
            a.email          AS aluno_email,
            c.id             AS curso_id,
            c.nome           AS curso_nome,
            c.vagas          AS vagas_restantes
        FROM turmas t
        INNER JOIN alunos a ON t.aluno_id = a.id
        INNER JOIN cursos c ON t.curso_id = c.id
        WHERE t.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
};

/**
 * Busca todas as matrículas de um aluno específico.
 * @param {number} alunoId - ID do aluno
 * @returns {Promise<Array>} Lista de cursos em que o aluno está matriculado
 */
const findByAluno = async (alunoId) => {
    const query = `
        SELECT
            t.id             AS matricula_id,
            t.data_matricula,
            c.id             AS curso_id,
            c.nome           AS curso_nome,
            c.descricao      AS curso_descricao,
            c.vagas          AS vagas_restantes
        FROM turmas t
        INNER JOIN cursos c ON t.curso_id = c.id
        WHERE t.aluno_id = $1
        ORDER BY t.data_matricula DESC
    `;
    const result = await pool.query(query, [alunoId]);
    return result.rows;
};

/**
 * Verifica se um aluno já está matriculado em determinado curso.
 * @param {number} alunoId - ID do aluno
 * @param {number} cursoId - ID do curso
 * @returns {Promise<Object|null>} Matrícula existente ou null
 */
const findByAlunoAndCurso = async (alunoId, cursoId) => {
    const result = await pool.query(
        'SELECT id FROM turmas WHERE aluno_id = $1 AND curso_id = $2',
        [alunoId, cursoId]
    );
    return result.rows[0] || null;
};

/**
 * ⭐ FUNÇÃO PRINCIPAL: Cria uma matrícula usando TRANSAÇÃO.
 *
 * O que é uma TRANSAÇÃO?
 * É um conjunto de operações que deve ser executado de forma atômica:
 * ou TUDO acontece com sucesso, ou NADA é salvo no banco.
 *
 * Por que usar aqui?
 * Precisamos fazer duas operações em sequência:
 *   1. Decrementar a vaga do curso (UPDATE)
 *   2. Inserir a matrícula na tabela turmas (INSERT)
 *
 * Se o INSERT falhar após o UPDATE, sem transação a vaga seria
 * descontada sem uma matrícula real. Com transação, o banco faz
 * ROLLBACK e tudo volta ao estado original. ✅
 *
 * @param {number} alunoId - ID do aluno a ser matriculado
 * @param {number} cursoId - ID do curso desejado
 * @returns {Promise<Object>} Matrícula criada com dados completos
 */
const criarMatricula = async (alunoId, cursoId) => {
    // Obtém um client exclusivo do pool para a transação
    const client = await pool.connect();

    try {
        // Inicia a transação
        await client.query('BEGIN');

        // PASSO 1: Tenta decrementar a vaga do curso
        // O WHERE vagas > 0 é uma proteção extra no banco
        const cursoAtualizado = await client.query(
            `UPDATE cursos
             SET vagas = vagas - 1
             WHERE id = $1 AND vagas > 0
             RETURNING *`,
            [cursoId]
        );

        // Se nenhuma linha foi atualizada, significa que não há vagas
        if (cursoAtualizado.rows.length === 0) {
            await client.query('ROLLBACK');
            return null; // Sinaliza para o controller que não há vagas
        }

        // PASSO 2: Cria o registro na tabela de turmas
        const turmaResult = await client.query(
            `INSERT INTO turmas (aluno_id, curso_id)
             VALUES ($1, $2)
             RETURNING *`,
            [alunoId, cursoId]
        );

        // Confirma a transação (salva todas as alterações)
        await client.query('COMMIT');

        return turmaResult.rows[0];

    } catch (error) {
        // Em caso de qualquer erro inesperado, desfaz tudo
        await client.query('ROLLBACK');
        throw error; // Repassa o erro para o controller tratar
    } finally {
        // SEMPRE libera o client de volta para o pool
        client.release();
    }
};

/**
 * Remove uma matrícula do banco de dados.
 * @param {number} id - ID da matrícula (turma)
 * @returns {Promise<Object|null>} Matrícula removida ou null se não encontrada
 */
const remove = async (id) => {
    const result = await pool.query(
        'DELETE FROM turmas WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0] || null;
};

module.exports = {
    findAll,
    countAll,
    findById,
    findByAluno,
    findByAlunoAndCurso,
    criarMatricula,
    remove,
};
