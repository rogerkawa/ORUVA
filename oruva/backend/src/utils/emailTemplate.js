
const emailTemplate = {

    layout({ title, preheader, content, actionUrl, actionText }) {

        const logoUrl = process.env.MAIL_LOGO_URL;

        return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
        </head>

        <body style="margin:0; padding:0; background:#f4f5f7; font-family:Arial,sans-serif; color:#202124;">

            <div style="display:none; max-height:0; overflow:hidden;">
                ${preheader || ''}
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#f4f5f7; padding:40px 16px;">

                <tr>
                    <td align="center">

                        <table width="100%" cellpadding="0" cellspacing="0" border="0"
                            style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden;">

                            <tr>
                                <td align="center" style="padding:36px 30px 24px;">

                                    ${logoUrl ? `
                                        <img
                                            src="${logoUrl}"
                                            alt="Oruva"
                                            width="150"
                                            style="display:block; width:150px; max-width:100%; height:auto;"
                                        >
                                    ` : `
                                        <h1 style="margin:0; font-size:28px; color:#202124;">
                                            Oruva
                                        </h1>
                                    `}

                                </td>
                            </tr>

                            <tr>
                                <td style="padding:10px 36px 36px;">

                                    <h2 style="margin:0 0 20px; font-size:23px; line-height:1.4; color:#202124;">
                                        ${title}
                                    </h2>

                                    <div style="font-size:15px; line-height:1.8; color:#555b64;">
                                        ${content}
                                    </div>

                                    ${actionUrl && actionText ? `
                                        <div style="margin-top:30px; text-align:center;">
                                            <a
                                                href="${actionUrl}"
                                                style="
                                                    display:inline-block;
                                                    padding:15px 28px;
                                                    background:#202124;
                                                    color:#ffffff;
                                                    text-decoration:none;
                                                    border-radius:8px;
                                                    font-size:14px;
                                                    font-weight:bold;
                                                "
                                            >
                                                ${actionText}
                                            </a>
                                        </div>
                                    ` : ''}

                                </td>
                            </tr>

                            <tr>
                                <td style="padding:24px 30px; background:#fafafa; border-top:1px solid #eeeeee; text-align:center;">

                                    <p style="margin:0 0 8px; font-size:12px; color:#777;">
                                        Este e-mail foi enviado automaticamente pela plataforma Oruva.
                                    </p>

                                    <p style="margin:0; font-size:12px; color:#999;">
                                        Gestão inteligente de processos e solicitações.
                                    </p>

                                </td>
                            </tr>

                        </table>

                    </td>
                </tr>
            </table>

        </body>
        </html>
        `;
    }

};

export default emailTemplate;
