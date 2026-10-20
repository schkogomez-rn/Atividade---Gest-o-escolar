const ContaRepository = require('../repositories/contaRepository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Cargos permitidos no sistema escolar
const CARGOS_PERMITIDOS = ['admin', 'secretaria', 'professor'];

// ============================================================
// CONTROLADOR: Contas (RBAC: Gestão de Usuários e Autenticação)
// ============================================================

// 1. CADASTRAR: Apenas administradores (ou criação autorizada)
const registrar = async (req, res) => {
    try {
        const { nome, email, senha, cargo } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios.' });
        }

        // Valida se o cargo informado é permitido
        const cargoDefinido = cargo || 'professor';
        if (!CARGOS_PERMITIDOS.includes(cargoDefinido)) {
            return res.status(400).json({ 
                mensagem: `Cargo inválido. Valores permitidos: [${CARGOS_PERMITIDOS.join(', ')}]` 
            });
        }

        // Verifica se o e-mail já está cadastrado
        const contaExistente = await ContaRepository.buscarContaPorEmail(email);
        if (contaExistente) {
            return res.status(409).json({ mensagem: 'Este email já está cadastrado.' });
        }

        // Criptografa a senha antes de salvar
        const senha_hash = await bcrypt.hash(senha, 10);

        // Salva no banco enviando o HASH e o CARGO
        const novaConta = await ContaRepository.criarConta(nome, email, senha_hash, cargoDefinido);

        return res.status(201).json(novaConta);
    } catch (erro) {
        console.error('Erro ao cadastrar conta:', erro);
        return res.status(500).json({ mensagem: 'Erro interno ao criar conta.' });
    }
};

// 2. LOGIN: Todos podem fazer
const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
        }

        // Procura a conta pelo e-mail
        const conta = await ContaRepository.buscarContaPorEmail(email);
        if (!conta) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
        }

        // Confere a senha com o hash do banco
        const senhaValida = await bcrypt.compare(senha, conta.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
        }

        // 💡 PONTO CHAVE: Gravamos o ID e o CARGO dentro do Crachá (Token) JWT!
        // Assim a API sempre saberá quem é o usuário e qual o cargo dele em cada requisição.
        const token = jwt.sign(
            { id: conta.id, cargo: conta.cargo }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        return res.json({
            mensagem: 'Login realizado com sucesso!',
            token: token
        });
    } catch (erro) {
        console.error('Erro no login:', erro);
        return res.status(500).json({ mensagem: 'Erro interno ao realizar login.' });
    }
};

// 3. PERFIL: O usuário logado vê seus próprios dados
const verPerfil = async (req, res) => {
    try {
        // O ID foi colocado no 'req' pelo authMiddleware
        const id = req.usuario_id;
        const usuario = await ContaRepository.buscarContaPorId(id);

        if (!usuario) {
            return res.status(404).json({ mensagem: 'Conta não encontrada.' });
        }

        return res.json(usuario);
    } catch (erro) {
        console.error('Erro ao buscar perfil:', erro);
        return res.status(500).json({ mensagem: 'Erro ao buscar perfil.' });
    }
};

// 4. LISTAR: Apenas Administrador
const listar = async (req, res) => {
    try {
        const contas = await ContaRepository.listarContas();
        return res.json(contas);
    } catch (erro) {
        console.error('Erro ao listar contas:', erro);
        return res.status(500).json({ mensagem: 'Erro interno ao listar contas.' });
    }
};

// 5. REMOVER: Apenas Administrador
const remover = async (req, res) => {
    try {
        const { id } = req.params;
        const contaRemovida = await ContaRepository.removerConta(id);
        if (!contaRemovida) {
            return res.status(404).json({ mensagem: 'Conta não encontrada.' });
        }
        return res.status(200).json({ mensagem: 'Conta removida com sucesso.', conta: contaRemovida });
    } catch (erro) {
        console.error('Erro ao remover conta:', erro);
        return res.status(500).json({ mensagem: 'Erro interno ao remover conta.' });
    }
};

module.exports = { 
    registrar, 
    login, 
    verPerfil, 
    listar, 
    remover,
    // Aliases para máxima compatibilidade
    criarUsuario: registrar,
    me: verPerfil
};
