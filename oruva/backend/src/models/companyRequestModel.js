
import conect from '../config/database.js';

// Normaliza documentos antigos que possam estar armazenados
// com pontuação ou letras minúsculas.
const documentoNormalizadoSQL = `
    UPPER(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(document, '.', ''),
                    '/',
                    ''
                ),
                '-',
                ''
            ),
            ' ',
            ''
        )
    )
`;

const companyRequestModel = {

    // Criar uma solicitação de acesso
    async criar({
        companyName,
        tradeName,
        document,
        contactName,
        email,
        phone,
        message
    }) {
        const [resultado] = await conect.execute(
            `INSERT INTO company_requests (
                company_name,
                trade_name,
                document,
                contact_name,
                email,
                phone,
                message
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                companyName,
                tradeName || null,
                document || null,
                contactName,
                email,
                phone || null,
                message || null
            ]
        );

        return resultado.insertId;
    },

    // Listar solicitações
    async listar(status = null) {
        let sql = `
            SELECT
                cr.*,
                u.name AS reviewer_name
            FROM company_requests cr
            LEFT JOIN users u
                ON u.id = cr.reviewed_by_user_id
        `;

        const parametros = [];

        if (status) {
            sql += ' WHERE cr.status = ?';
            parametros.push(status);
        }

        sql += ' ORDER BY cr.created_at DESC';

        const [resultado] = await conect.execute(sql, parametros);

        return resultado;
    },

    // Buscar uma solicitação pelo ID
    async buscarPorId(id) {
        const [resultado] = await conect.execute(
            `SELECT *
            FROM company_requests
            WHERE id = ?
            LIMIT 1`,
            [id]
        );

        return resultado[0] || null;
    },

    // Verificar se já existe solicitação pendente para o e-mail
    async buscarPendentePorEmail(email) {
        const [resultado] = await conect.execute(
            `SELECT id
            FROM company_requests
            WHERE email = ?
                AND status = 'pending'
            LIMIT 1`,
            [email]
        );

        return resultado[0] || null;
    },

    // Verificar se o CNPJ já está cadastrado ou em outra solicitação pendente
    async buscarDuplicidadeDocumento(documento) {

        // Primeiro verifica empresas já cadastradas
        const [empresas] = await conect.execute(
            `SELECT id
            FROM companies
            WHERE document IS NOT NULL
                AND document <> ''
                AND ${documentoNormalizadoSQL} = ?
            LIMIT 1`,
            [documento]
        );

        if (empresas.length > 0) {
            return {
                tipo: 'empresa',
                id: empresas[0].id
            };
        }

        // Depois verifica solicitações ainda pendentes
        const [solicitacoes] = await conect.execute(
            `SELECT id
            FROM company_requests
            WHERE document IS NOT NULL
                AND document <> ''
                AND ${documentoNormalizadoSQL} = ?
                AND status = 'pending'
            LIMIT 1`,
            [documento]
        );

        if (solicitacoes.length > 0) {
            return {
                tipo: 'solicitacao',
                id: solicitacoes[0].id
            };
        }

        return null;
    },

    // Aprovar solicitação e criar empresa em uma única transação
    async aprovar(id, reviewerId, slug) {
        const conexao = await conect.getConnection();

        try {
            await conexao.beginTransaction();

            // 1. Bloqueia a solicitação durante a operação
            const [solicitacoes] = await conexao.execute(
                `SELECT *
                FROM company_requests
                WHERE id = ?
                FOR UPDATE`,
                [id]
            );

            const solicitacao = solicitacoes[0];

            if (!solicitacao) {
                throw new Error('SOLICITACAO_NAO_ENCONTRADA');
            }

            if (solicitacao.status !== 'pending') {
                throw new Error('SOLICITACAO_JA_ANALISADA');
            }

            // 2. Verifica novamente o CNPJ antes de criar a empresa
            if (solicitacao.document) {

                // Verifica se já existe uma empresa com o documento
                const [empresasExistentes] = await conexao.execute(
                    `SELECT id
                    FROM companies
                    WHERE document IS NOT NULL
                        AND document <> ''
                        AND ${documentoNormalizadoSQL} = ?
                    LIMIT 1
                    FOR UPDATE`,
                    [solicitacao.document]
                );

                if (empresasExistentes.length > 0) {
                    throw new Error('CNPJ_JA_CADASTRADO');
                }

                // Verifica se existe outra solicitação pendente
                // utilizando o mesmo CNPJ.
                const [outrasSolicitacoes] = await conexao.execute(
                    `SELECT id
                    FROM company_requests
                    WHERE document IS NOT NULL
                        AND document <> ''
                        AND ${documentoNormalizadoSQL} = ?
                        AND status = 'pending'
                        AND id <> ?
                    LIMIT 1
                    FOR UPDATE`,
                    [
                        solicitacao.document,
                        id
                    ]
                );

                if (outrasSolicitacoes.length > 0) {
                    throw new Error('CNPJ_EM_SOLICITACAO');
                }
            }

            // 3. Garante que o slug seja único
            let slugFinal = slug;
            let contador = 1;

            while (true) {
                const [slugsExistentes] = await conexao.execute(
                    `SELECT id
                    FROM companies
                    WHERE slug = ?
                    LIMIT 1`,
                    [slugFinal]
                );

                if (slugsExistentes.length === 0) {
                    break;
                }

                slugFinal = `${slug}-${contador}`;
                contador++;
            }

            // 4. Cria a empresa
            const [empresa] = await conexao.execute(
                `INSERT INTO companies (
                    name,
                    trade_name,
                    slug,
                    document,
                    email,
                    phone,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
                [
                    solicitacao.company_name,
                    solicitacao.trade_name,
                    slugFinal,
                    solicitacao.document,
                    solicitacao.email,
                    solicitacao.phone
                ]
            );

            const companyId = empresa.insertId;

            // 5. Atualiza a solicitação
            await conexao.execute(
                `UPDATE company_requests
                SET
                    status = 'approved',
                    reviewed_by_user_id = ?,
                    reviewed_at = CURRENT_TIMESTAMP,
                    company_id = ?
                WHERE id = ?`,
                [
                    reviewerId,
                    companyId,
                    id
                ]
            );

            await conexao.commit();

            return {
                requestId: Number(id),
                companyId,
                companyName: solicitacao.company_name,
                slug: slugFinal
            };

        } catch (error) {
            await conexao.rollback();
            throw error;

        } finally {
            conexao.release();
        }
    },

    // Recusar solicitação
    async recusar(id, reviewerId, rejectionReason) {
        const [resultado] = await conect.execute(
            `UPDATE company_requests
            SET
                status = 'rejected',
                reviewed_by_user_id = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                rejection_reason = ?
            WHERE id = ?
                AND status = 'pending'`,
            [
                reviewerId,
                rejectionReason,
                id
            ]
        );

        return resultado.affectedRows > 0;
    }

};

export default companyRequestModel;
