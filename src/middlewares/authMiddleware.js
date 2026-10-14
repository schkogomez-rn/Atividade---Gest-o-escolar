const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // 1. O segurança olha para o cabeçalho (Header) da requisição
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ mensagem: 'Acesso negado. Cadê o seu crachá (Token)?' });
    }

    // O padrão da internet é enviar o token assim: "Bearer kdfjdfkjdfjk..."
    // Então cortamos a string no espaço e pegamos só a parte do código.
    const token = authHeader.split(' ')[1];

    try {
        // 2. O segurança verifica se o carimbo do crachá é verdadeiro
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Se for verdadeiro, ele descobre quem é você e anota na prancheta (req)
        req.usuario_id = payload.id; 
        
        // 4. Libera a catraca para o Controller assumir!
        next(); 
    } catch (erro) {
        return res.status(401).json({ mensagem: 'Crachá inválido ou vencido!' });
    }
};

module.exports = verificarToken;
