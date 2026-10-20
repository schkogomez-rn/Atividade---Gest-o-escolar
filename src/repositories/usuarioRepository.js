const pool = require('../config/db');

// Grava um novo usuário e o cargo dele no banco
const criarUsuario = async (nome, email, senha_hash, cargo) => {
    // Usamos aspas simples e concatenação para facilitar a leitura da query
    const sql = 'INSERT INTO usuarios (nome, email, senha_hash, cargo) ' +
        'VALUES ($1, $2, $3, $4) ' +
        'RETURNING id, nome, email, cargo, criado_em';

    const resultado = await pool.query(sql, [nome, email, senha_hash, cargo]);
    return resultado.rows[0];
};

// Busca usuário por email (Usado na hora do Login)
const buscarPorEmail = async (email) => {
    const sql = 'SELECT * FROM usuarios WHERE email = $1';
    const resultado = await pool.query(sql, [email]);
    return resultado.rows[0]; // Retorna a conta ou undefined
};

// Busca dados por ID (Usado para a rota de Perfil)
const buscarPorId = async (id) => {
    const sql = 'SELECT id, nome, email, cargo, criado_em FROM usuarios WHERE id = $1';
    const resultado = await pool.query(sql, [id]);
    return resultado.rows[0];
};

module.exports = { criarUsuario, buscarPorEmail, buscarPorId };