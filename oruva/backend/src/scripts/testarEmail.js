
import 'dotenv/config';

import emailService from '../utils/emailService.js';
import emailTemplate from '../utils/emailTemplate.js';

async function testarEmail() {
    try {
        console.log('Enviando e-mail personalizado...');

        const html = emailTemplate.layout({
            title: 'Bem-vindo ao Oruva!',
            preheader: 'Conheça nossa plataforma de gestão de processos.',
            content: `
                <p>Olá!</p>

                <p>
                    Este é um e-mail de teste da identidade visual
                    do <strong>Oruva</strong>.
                </p>

                <p>
                    Estamos preparando uma experiência mais organizada
                    para gerenciar processos e solicitações internas.
                </p>

                <p>
                    Se você está recebendo esta mensagem, nossa integração
                    de e-mail está funcionando!
                </p>
            `,
            actionUrl: 'https://www.google.com',
            actionText: 'Conhecer o Oruva'
        });

        const resultado = await emailService.enviar({
            to: process.env.MAIL_USER,
            subject: 'Conheça o Oruva | Gestão Inteligente',
            html
        });

        console.log('E-mail personalizado enviado!');
        console.log('ID:', resultado.id);

    } catch (error) {
        console.error('Erro ao enviar e-mail:', error.message);
        process.exitCode = 1;
    }
}

testarEmail();
