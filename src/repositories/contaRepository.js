const pool = require('../config/db');

// ============================================================
// REPOSITÓRIO: Contas (Usuários do Sistema Escolar)
// Responsável apenas por acessar o banco de dados com queries parametrizadas.
// Não entende de criptografia — recebe o hash já pronto do Controller.
// ============================================================

// Grava uma nova conta e o cargo dela no banco
const criarConta = async (nome, email, senha_hash, cargo = 'professor') => {
    // Usamos aspas simples e concatenação para facilitar a leitura da query
    const sql = 'INSERT INTO contas (nome, email, senha_hash, cargo) ' +
                'VALUES ($1, $2, $3, $4) ' +
                'RETURNING id, nome, email, cargo, criado_em';
                
    const resultado = await pool.query(sql, [nome, email, senha_hash, cargo]);
    return resultado.rows[0];
};

// Busca conta por email (Usado na hora do Login)
const buscarContaPorEmail = async (email) => {
    const sql = 'SELECT * FROM contas WHERE email = $1';
    const resultado = await pool.query(sql, [email]);
    return resultado.rows[0]; // Retorna a conta ou undefined
};

// Busca dados por ID (Usado para a rota de Perfil)
const buscarContaPorId = async (id) => {
    const sql = 'SELECT id, nome, email, cargo, criado_em FROM contas WHERE id = $1';
    const resultado = await pool.query(sql, [id]);
    return resultado.rows[0];
};

// Lista todas as contas (Usado pelo Administrador)
const listarContas = async () => {
    const sql = 'SELECT id, nome, email, cargo, criado_em FROM contas ORDER BY id';
    const resultado = await pool.query(sql);
    return resultado.rows;
};

// Remove uma conta por ID (Apenas admin)
const removerConta = async (id) => {
    const sql = 'DELETE FROM contas WHERE id = $1 RETURNING id, nome, email';
    const resultado = await pool.query(sql, [id]);
    return resultado.rows[0];
};

module.exports = { 
    criarConta, 
    buscarContaPorEmail, 
    buscarContaPorId,
    listarContas,
    removerConta,
    // Aliases para compatibilidade com o padrão do tutorial
    criarUsuario: criarConta,
    buscarPorEmail: buscarContaPorEmail,
    buscarPorId: buscarContaPorId
};
