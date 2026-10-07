const { Pool } = require('pg');
require('dotenv').config();

// Cria um pool de conexões com o PostgreSQL
// O pool reutiliza conexões abertas, o que é mais eficiente
// do que abrir e fechar uma conexão para cada requisição.
const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Teste de conexão ao iniciar a aplicação
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('✅ Conexão com o PostgreSQL estabelecida com sucesso!');
        release();
    }
});

module.exports = pool;
