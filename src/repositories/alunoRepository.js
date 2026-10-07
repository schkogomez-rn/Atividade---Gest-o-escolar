const pool = require('../config/db');

// ============================================================
// CAMADA DE REPOSITÓRIO - Alunos
// Responsabilidade: executar as queries SQL referentes a Alunos.
// Não contém regras de negócio, apenas acesso ao banco.
// ============================================================

/**
 * Busca todos os alunos com suporte a paginação.
 * @param {number} limit  - Quantidade de registros por página
 * @param {number} offset - Quantidade de registros a pular
 * @returns {Promise<Array>} Lista de alunos
 */
const findAll = async (limit, offset) => {
    const query = `
        SELECT id, nome, email, nascimento
        FROM alunos
        ORDER BY nome ASC
        LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
};

/**
 * Conta o total de alunos cadastrados (usado para paginação).
 * @returns {Promise<number>} Total de alunos
 */
const countAll = async () => {
    const result = await pool.query('SELECT COUNT(*) FROM alunos');
    return parseInt(result.rows[0].count, 10);
};

/**
 * Busca um único aluno pelo seu ID.
 * @param {number} id - ID do aluno
 * @returns {Promise<Object|null>} Dados do aluno ou null se não encontrado
 */
const findById = async (id) => {
    const result = await pool.query(
        'SELECT id, nome, email, nascimento FROM alunos WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Verifica se um e-mail já está cadastrado (para evitar duplicatas).
 * @param {string} email - E-mail a ser verificado
 * @returns {Promise<Object|null>} Aluno com o e-mail ou null
 */
const findByEmail = async (email) => {
    const result = await pool.query(
        'SELECT id FROM alunos WHERE email = $1',
        [email]
    );
    return result.rows[0] || null;
};

/**
 * Insere um novo aluno no banco de dados.
 * @param {string} nome       - Nome completo do aluno
 * @param {string} email      - E-mail do aluno (único)
 * @param {string} nascimento - Data de nascimento (YYYY-MM-DD)
 * @returns {Promise<Object>} Aluno criado
 */
const create = async (nome, email, nascimento) => {
    const result = await pool.query(
        'INSERT INTO alunos (nome, email, nascimento) VALUES ($1, $2, $3) RETURNING *',
        [nome, email, nascimento]
    );
    return result.rows[0];
};

/**
 * Atualiza os dados de um aluno existente.
 * @param {number} id         - ID do aluno
 * @param {string} nome       - Novo nome
 * @param {string} email      - Novo e-mail
 * @param {string} nascimento - Nova data de nascimento
 * @returns {Promise<Object|null>} Aluno atualizado ou null se não encontrado
 */
const update = async (id, nome, email, nascimento) => {
    const result = await pool.query(
        `UPDATE alunos
         SET nome = $1, email = $2, nascimento = $3
         WHERE id = $4
         RETURNING *`,
        [nome, email, nascimento, id]
    );
    return result.rows[0] || null;
};

/**
 * Remove um aluno do banco de dados.
 * Obs: o CASCADE no banco garante que as turmas vinculadas também são removidas.
 * @param {number} id - ID do aluno
 * @returns {Promise<Object|null>} Aluno removido ou null se não encontrado
 */
const remove = async (id) => {
    const result = await pool.query(
        'DELETE FROM alunos WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0] || null;
};

module.exports = {
    findAll,
    countAll,
    findById,
    findByEmail,
    create,
    update,
    remove,
};
