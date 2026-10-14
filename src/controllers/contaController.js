const ContaRepository = require('../repositories/contaRepository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ============================================================
// CONTROLADOR: Contas
// ============================================================

// ✅ O COFRE: Rota de Cadastro
// Recebe a senha em texto limpo, gera o hash e salva apenas o hash.
const registrar = async (req, res) => {
    const { nome, email, senha } = req.body;

    // 1. Verifica se o e-mail já está cadastrado
    const contaExistente = await ContaRepository.buscarContaPorEmail(email);
    if (contaExistente) {
        return res.status(400).json({ mensagem: 'Email já cadastrado.' });
    }

    // 2. Criptografa a senha com custo 10
    //    O bcrypt gera um Salt aleatório e o incorpora no hash final.
    const senha_hash = await bcrypt.hash(senha, 10);

    // 3. Salva no banco enviando o HASH — nunca a senha em texto limpo
    const novaConta = await ContaRepository.criarConta(nome, email, senha_hash);

    res.status(201).json(novaConta);
};

// 🚪 A PORTARIA: Rota de Login
// Compara a senha digitada com o hash armazenado no banco.
const login = async (req, res) => {
    const { email, senha } = req.body;

    // 1. Busca se o e-mail existe no banco
    const contaEncontrada = await ContaRepository.buscarContaPorEmail(email);
    if (!contaEncontrada) {
        // Por segurança, não informamos qual campo está errado
        return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
    }

    // 2. Compara a senha digitada com o hash do banco
    //    O bcrypt extrai o Salt automaticamente do hash armazenado
    const senhaValida = await bcrypt.compare(senha, contaEncontrada.senha_hash);

    if (!senhaValida) {
        return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
    }

    // 3. A EMISSÃO DO CRACHÁ (Token JWT)
    // O primeiro parâmetro é o "Payload" (o que vai escrito no crachá. Ex: o ID do usuário).
    // O segundo é o carimbo oficial guardado no .env.
    // O terceiro é a validade do crachá (ex: expira em 1 hora).
    const token = jwt.sign(
        { id: contaEncontrada.id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '10h' }
    );

    // Agora devolvemos o crachá para o usuário guardar no bolso (front-end)
    res.json({ 
        mensagem: 'Login realizado com sucesso!', 
        token: token 
    });
};

// 🔒 SALA RESTRITA: Rota de Perfil
const verPerfil = async (req, res) => {
    // O segurança (middleware) já fez o trabalho duro e pendurou o ID do usuário no "req"
    const id = req.usuario_id;
    
    // Busca os dados completos no banco (reaproveitando a função do repositório)
    const dadosUsuario = await ContaRepository.buscarContaPorId(id);
    
    res.json(dadosUsuario);
};

module.exports = { registrar, login, verPerfil };

