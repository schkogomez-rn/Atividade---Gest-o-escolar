const jwt = require('jsonwebtoken');

const autenticarToken = (req, res, next) => {
    // 1. Procura o crachá no cabeçalho (Header) da requisição
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ mensagem: 'Acesso negado. Cadê o seu crachá (Token)?' });
    }

    // 2. Extrai o token ignorando a palavra "Bearer "
    const token = authHeader.split(' ')[1];

    try {
        // 3. Verifica se o carimbo (assinatura) é válido
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Anota o ID e o CARGO do usuário na requisição para a próxima etapa
        req.usuario_id = payload.id;
        req.usuario_cargo = payload.cargo;

        // 5. Libera a passagem!
        next();
    } catch (erro) {
        return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
    }
};

module.exports = autenticarToken;
