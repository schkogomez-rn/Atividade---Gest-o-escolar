const pool = require('../config/db');

// ============================================================
// REPOSITÓRIO: Contas
// Responsável apenas por acessar o banco de dados.
// Não entende de criptografia — recebe o hash já pronto.
// ============================================================

// Salva a conta no banco (recebe o hash pronto do Controller)
const criarConta = async (nome, email, senha_hash) => {
    const sql = 'INSERT INTO contas (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email';
    const resultado = await pool.query(sql, [nome, email, senha_hash]);
    return resultado.rows[0];
};

// Busca a conta pelo email para conferir a senha no login
const buscarContaPorEmail = async (email) => {
    const sql = 'SELECT * FROM contas WHERE email = $1';
    const resultado = await pool.query(sql, [email]);
    return resultado.rows[0];
};

// Busca a conta pelo ID (para ver perfil, sem expor a senha)
const buscarContaPorId = async (id) => {
    const sql = 'SELECT id, nome, email FROM contas WHERE id = $1';
    const resultado = await pool.query(sql, [id]);
    return resultado.rows[0];
};

module.exports = { criarConta, buscarContaPorEmail, buscarContaPorId };

