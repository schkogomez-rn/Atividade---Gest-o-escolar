const UsuarioRepository = require('../repositories/usuarioRepository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. CADASTRAR: Apenas GERENTES vão conseguir chegar até aqui!
const criarUsuario = async (req, res) => {
    try {
        const { nome, email, senha, cargo } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios.' });
        }

        const usuarioExistente = await UsuarioRepository.buscarPorEmail(email);
        if (usuarioExistente) {
            return res.status(400).json({ mensagem: 'Este email já está cadastrado.' });
        }

        // Criptografa a senha antes de salvar
        const senha_hash = await bcrypt.hash(senha, 10);

        // Se a requisição não informar um cargo, forçamos 'funcionario' por padrão
        const cargoDefinido = cargo || 'funcionario';

        const novoUsuario = await UsuarioRepository.criarUsuario(nome, email, senha_hash, cargoDefinido);

        res.status(201).json(novoUsuario);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ mensagem: 'Erro interno ao criar usuário.' });
    }
};

// 2. LOGIN: Todos podem fazer
const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Procura a conta
        const usuario = await UsuarioRepository.buscarPorEmail(email);
        if (!usuario) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
        }

        // Confere a senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
        }

        // 💡 PONTO CHAVE: Gravamos o ID e o CARGO dentro do Crachá (Token) JWT!
        // Assim a API sempre saberá quem é o usuário e qual o cargo dele.
        const token = jwt.sign(
            { id: usuario.id, cargo: usuario.cargo },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token: token
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ mensagem: 'Erro interno ao realizar login.' });
    }
};

// 3. PERFIL: O usuário logado vê seus próprios dados
const verPerfil = async (req, res) => {
    try {
        // O ID foi colocado no 'req' pelo authMiddleware
        const id = req.usuario_id;
        const usuario = await UsuarioRepository.buscarPorId(id);
        res.json(usuario);
    } catch (erro) {
        res.status(500).json({ mensagem: 'Erro ao buscar perfil.' });
    }
};

module.exports = { criarUsuario, login, verPerfil };