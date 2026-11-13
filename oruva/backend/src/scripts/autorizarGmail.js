
import { google } from 'googleapis';
import http from 'node:http';
import crypto from 'node:crypto';
import 'dotenv/config';

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    console.error('Configure as credenciais OAuth no arquivo .env.');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

const estado = crypto.randomBytes(24).toString('hex');

const urlAutorizacao = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
        'https://www.googleapis.com/auth/gmail.send'
    ],
    state: estado
});

const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, GOOGLE_REDIRECT_URI);

    if (url.pathname !== '/oauth2callback') {
        res.writeHead(404);
        return res.end('Rota não encontrada.');
    }

    if (url.searchParams.get('state') !== estado) {
        res.writeHead(400);
        res.end('Estado OAuth inválido.');
        servidor.close();
        return;
    }

    const code = url.searchParams.get('code');

    if (!code) {
        res.writeHead(400);
        res.end('Código de autorização não recebido.');
        servidor.close();
        return;
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\nAutorização concluída!');

        if (tokens.refresh_token) {
            console.log('\nSeu GOOGLE_REFRESH_TOKEN é:\n');
            console.log(tokens.refresh_token);
        } else {
            console.log(
                '\nNenhum refresh_token foi retornado. Tente autorizar novamente.'
            );
        }

        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        res.end(`
            <h2>Conta Gmail autorizada!</h2>
            <p>Você já pode fechar esta página e voltar ao terminal.</p>
        `);

    } catch (error) {
        console.error('Erro ao obter tokens:', error.message);

        res.writeHead(500);
        res.end('Não foi possível concluir a autorização.');

    } finally {
        servidor.close();
    }
});

servidor.listen(3334, () => {
    console.log('\nAcesse este endereço para autorizar o Oruva:\n');
    console.log(urlAutorizacao);
    console.log('\nAguardando autorização...');
});
