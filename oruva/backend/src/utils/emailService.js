
import { google } from 'googleapis';
import 'dotenv/config';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
});

const emailService = {

    async enviar({ to, subject, html }) {
        const remetente = process.env.MAIL_USER;

        if (
            !remetente ||
            !process.env.GOOGLE_REFRESH_TOKEN
        ) {
            throw new Error('CONFIGURACAO_GMAIL_INCOMPLETA');
        }

        if (!to || !to.trim()) {
            throw new Error('DESTINATARIO_INVALIDO');
        }

        // Codificar nome do remetente em UTF-8
        const nomeRemetente = `=?UTF-8?B?${Buffer
            .from(process.env.MAIL_FROM_NAME || 'Oruva', 'utf8')
            .toString('base64')}?=`;

        // Codificar assunto em UTF-8
        const assunto = `=?UTF-8?B?${Buffer
            .from(subject, 'utf8')
            .toString('base64')}?=`;

        const mensagem = [
            `From: ${nomeRemetente} <${remetente}>`,
            `To: ${to.trim()}`,
            `Subject: ${assunto}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            '',
            html
        ].join('\r\n');

        const raw = Buffer
            .from(mensagem, 'utf8')
            .toString('base64url');

        const resultado = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw
            }
        });

        return resultado.data;
    }

};

export default emailService;
