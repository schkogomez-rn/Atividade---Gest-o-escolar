const pool = require('../config/db');

// ============================================================
// CAMADA DE REPOSITÓRIO - Cursos
// Responsabilidade: executar as queries SQL referentes a Cursos.
// Não contém regras de negócio, apenas acesso ao banco.
// ============================================================

/**
 * Busca todos os cursos com suporte a paginação.
 * @param {number} limit  - Quantidade de registros por página
 * @param {number} offset - Quantidade de registros a pular
 * @returns {Promise<Array>} Lista de cursos
 */
const findAll = async (limit, offset) => {
    const query = `
        SELECT id, nome, descricao, vagas
        FROM cursos
        ORDER BY nome ASC
        LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
};

/**
 * Conta o total de cursos cadastrados (usado para paginação).
 * @returns {Promise<number>} Total de cursos
 */
const countAll = async () => {
    const result = await pool.query('SELECT COUNT(*) FROM cursos');
    return parseInt(result.rows[0].count, 10);
};

/**
 * Busca um único curso pelo seu ID.
 * @param {number} id - ID do curso
 * @returns {Promise<Object|null>} Dados do curso ou null se não encontrado
 */
const findById = async (id) => {
    const result = await pool.query(
        'SELECT id, nome, descricao, vagas FROM cursos WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Insere um novo curso no banco de dados.
 * @param {string} nome     - Nome do curso
 * @param {string} descricao - Descrição do curso
 * @param {number} vagas    - Número de vagas disponíveis
 * @returns {Promise<Object>} Curso criado
 */
const create = async (nome, descricao, vagas) => {
    const result = await pool.query(
        'INSERT INTO cursos (nome, descricao, vagas) VALUES ($1, $2, $3) RETURNING *',
        [nome, descricao, vagas]
    );
    return result.rows[0];
};

/**
 * Atualiza os dados de um curso existente.
 * @param {number} id       - ID do curso
 * @param {string} nome     - Novo nome
 * @param {string} descricao - Nova descrição
 * @param {number} vagas    - Nova quantidade de vagas
 * @returns {Promise<Object|null>} Curso atualizado ou null se não encontrado
 */
const update = async (id, nome, descricao, vagas) => {
    const result = await pool.query(
        `UPDATE cursos
         SET nome = $1, descricao = $2, vagas = $3
         WHERE id = $4
         RETURNING *`,
        [nome, descricao, vagas, id]
    );
    return result.rows[0] || null;
};

/**
 * Remove um curso do banco de dados.
 * @param {number} id - ID do curso
 * @returns {Promise<Object|null>} Curso removido ou null se não encontrado
 */
const remove = async (id) => {
    const result = await pool.query(
        'DELETE FROM cursos WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Decrementa em 1 o número de vagas de um curso.
 * ⚠️ REGRA DE NEGÓCIO CRÍTICA: Chamada apenas após confirmar que há vagas.
 * Usa WHERE vagas > 0 como proteção extra para evitar vagas negativas.
 * @param {number} id - ID do curso
 * @param {Object} client - Cliente de transação do pg (opcional)
 * @returns {Promise<Object|null>} Curso com vagas atualizadas ou null
 */
const decrementarVagas = async (id, client = pool) => {
    const result = await client.query(
        `UPDATE cursos
         SET vagas = vagas - 1
         WHERE id = $1 AND vagas > 0
         RETURNING *`,
        [id]
    );
    return result.rows[0] || null;
};

module.exports = {
    findAll,
    countAll,
    findById,
    create,
    update,
    remove,
    decrementarVagas,
};
