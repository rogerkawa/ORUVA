
import companyRequestModel from '../models/companyRequestModel.js';

function gerarSlug(texto) {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// Remove pontuação e padroniza o CNPJ
function normalizarCNPJ(valor) {
    if (typeof valor !== 'string') return '';

    return valor
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
}

// Converte cada caractere para o valor usado no cálculo oficial
function valorCNPJ(caractere) {
    return caractere.charCodeAt(0) - 48;
}

// Calcula um dígito verificador pelo módulo 11
function calcularDigitoVerificador(base, pesos) {
    const soma = [...base].reduce((total, caractere, index) => {
        return total + valorCNPJ(caractere) * pesos[index];
    }, 0);

    const resto = soma % 11;

    return resto < 2 ? 0 : 11 - resto;
}

// Valida CNPJ numérico e alfanumérico
function validarCNPJ(cnpj) {
    if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) {
        return false;
    }

    // Impede sequências repetidas, como 00000000000000
    if (/^([A-Z0-9])\1{13}$/.test(cnpj)) {
        return false;
    }

    const base = cnpj.slice(0, 12);

    const primeiroDigito = calcularDigitoVerificador(
        base,
        [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    const segundoDigito = calcularDigitoVerificador(
        base + primeiroDigito,
        [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    return cnpj === `${base}${primeiroDigito}${segundoDigito}`;
}

const companyRequestController = {

    // POST /api/company-requests
    async criar(req, res) {
        try {
            const {
                companyName,
                tradeName,
                document,
                contactName,
                email,
                phone,
                message
            } = req.body;

            if (
                typeof companyName !== 'string' ||
                typeof contactName !== 'string' ||
                typeof email !== 'string' ||
                !companyName.trim() ||
                !contactName.trim() ||
                !email.trim()
            ) {
                return res.status(400).json({
                    message: 'Preencha o nome da empresa, o nome do responsável e o e-mail.'
                });
            }

            const nomeEmpresa = companyName.trim();
            const nomeResponsavel = contactName.trim();
            const emailNormalizado = email.trim().toLowerCase();

            const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!formatoEmail.test(emailNormalizado)) {
                return res.status(400).json({
                    message: 'Informe um endereço de e-mail válido.'
                });
            }

            if (nomeEmpresa.length > 150) {
                return res.status(400).json({
                    message: 'O nome da empresa deve ter no máximo 150 caracteres.'
                });
            }

            if (nomeResponsavel.length > 150) {
                return res.status(400).json({
                    message: 'O nome do responsável deve ter no máximo 150 caracteres.'
                });
            }

            const nomeFantasia = typeof tradeName === 'string'
                ? tradeName.trim()
                : '';

            const telefone = typeof phone === 'string'
                ? phone.trim()
                : '';

            const mensagem = typeof message === 'string'
                ? message.trim()
                : '';

            if (nomeFantasia.length > 150) {
                return res.status(400).json({
                    message: 'O nome fantasia deve ter no máximo 150 caracteres.'
                });
            }

            if (telefone.length > 30) {
                return res.status(400).json({
                    message: 'O telefone deve ter no máximo 30 caracteres.'
                });
            }

            // O CNPJ é opcional, mas, se informado, precisa ser válido.
            const cnpjNormalizado = normalizarCNPJ(
                typeof document === 'string' ? document : ''
            );

            if (document && !cnpjNormalizado) {
                return res.status(400).json({
                    message: 'Informe um CNPJ válido.'
                });
            }

            if (
                cnpjNormalizado &&
                !validarCNPJ(cnpjNormalizado)
            ) {
                return res.status(400).json({
                    message: 'O CNPJ informado é inválido. Verifique os caracteres e os dígitos verificadores.'
                });
            }

            // Verifica se já existe solicitação pendente para o e-mail.
            const solicitacaoPorEmail =
                await companyRequestModel.buscarPendentePorEmail(
                    emailNormalizado
                );

            if (solicitacaoPorEmail) {
                return res.status(409).json({
                    message: 'Já existe uma solicitação pendente para este e-mail.'
                });
            }

            // Verifica se o CNPJ já pertence a uma empresa
            // ou está em outra solicitação pendente.
            if (cnpjNormalizado) {
                const duplicidade =
                    await companyRequestModel.buscarDuplicidadeDocumento(
                        cnpjNormalizado
                    );

                if (duplicidade?.tipo === 'empresa') {
                    return res.status(409).json({
                        message: 'Este CNPJ já está cadastrado em uma empresa na plataforma.'
                    });
                }

                if (duplicidade?.tipo === 'solicitacao') {
                    return res.status(409).json({
                        message: 'Já existe uma solicitação pendente utilizando este CNPJ.'
                    });
                }
            }

            const requestId = await companyRequestModel.criar({
                companyName: nomeEmpresa,
                tradeName: nomeFantasia,
                document: cnpjNormalizado || null,
                contactName: nomeResponsavel,
                email: emailNormalizado,
                phone: telefone,
                message: mensagem
            });

            return res.status(201).json({
                message: 'Solicitação enviada com sucesso! Aguarde a análise da equipe Oruva.',
                requestId
            });

        } catch (error) {
            console.error('Erro ao criar solicitação:', error);

            return res.status(500).json({
                message: 'Erro interno ao enviar a solicitação.'
            });
        }
    },

    // GET /api/company-requests
    async listar(req, res) {
        try {
            const { status } = req.query;

            const statusPermitidos = [
                'pending',
                'approved',
                'rejected'
            ];

            if (status && !statusPermitidos.includes(status)) {
                return res.status(400).json({
                    message: 'Status de solicitação inválido.'
                });
            }

            const solicitacoes = await companyRequestModel.listar(
                status || null
            );

            return res.status(200).json({
                solicitacoes
            });

        } catch (error) {
            console.error('Erro ao listar solicitações:', error);

            return res.status(500).json({
                message: 'Erro interno ao listar as solicitações.'
            });
        }
    },

    // PATCH /api/company-requests/:id/approve
    async aprovar(req, res) {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: 'ID de solicitação inválido.'
                });
            }

            const solicitacao = await companyRequestModel.buscarPorId(id);

            if (!solicitacao) {
                return res.status(404).json({
                    message: 'Solicitação não encontrada.'
                });
            }

            if (solicitacao.status !== 'pending') {
                return res.status(409).json({
                    message: 'Esta solicitação já foi analisada.'
                });
            }

            const nomeParaSlug =
                solicitacao.trade_name || solicitacao.company_name;

            const slugBase = gerarSlug(nomeParaSlug);

            if (!slugBase) {
                return res.status(400).json({
                    message: 'Não foi possível gerar um identificador para esta empresa.'
                });
            }

            const resultado = await companyRequestModel.aprovar(
                id,
                req.usuario.id,
                slugBase
            );

            return res.status(200).json({
                message: 'Empresa aprovada e cadastrada com sucesso!',
                empresa: resultado
            });

        } catch (error) {
            if (error.message === 'SOLICITACAO_NAO_ENCONTRADA') {
                return res.status(404).json({
                    message: 'Solicitação não encontrada.'
                });
            }

            if (error.message === 'SOLICITACAO_JA_ANALISADA') {
                return res.status(409).json({
                    message: 'Esta solicitação já foi analisada.'
                });
            }

            if (error.message === 'CNPJ_JA_CADASTRADO') {
                return res.status(409).json({
                    message: 'Não foi possível aprovar: este CNPJ já pertence a outra empresa cadastrada.'
                });
            }

            if (error.message === 'CNPJ_EM_SOLICITACAO') {
                return res.status(409).json({
                    message: 'Não foi possível aprovar: existe outra solicitação pendente utilizando este CNPJ.'
                });
            }

            console.error('Erro ao aprovar solicitação:', error);

            return res.status(500).json({
                message: 'Erro interno ao aprovar a solicitação.'
            });
        }
    },

    // PATCH /api/company-requests/:id/reject
    async recusar(req, res) {
        try {
            const id = Number(req.params.id);
            const { rejectionReason } = req.body;

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: 'ID de solicitação inválido.'
                });
            }

            const solicitacao = await companyRequestModel.buscarPorId(id);

            if (!solicitacao) {
                return res.status(404).json({
                    message: 'Solicitação não encontrada.'
                });
            }

            if (solicitacao.status !== 'pending') {
                return res.status(409).json({
                    message: 'Esta solicitação já foi analisada.'
                });
            }

            const recusada = await companyRequestModel.recusar(
                id,
                req.usuario.id,
                typeof rejectionReason === 'string'
                    ? rejectionReason.trim() || null
                    : null
            );

            if (!recusada) {
                return res.status(409).json({
                    message: 'Não foi possível recusar. A solicitação pode já ter sido analisada.'
                });
            }

            return res.status(200).json({
                message: 'Solicitação recusada com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao recusar solicitação:', error);

            return res.status(500).json({
                message: 'Erro interno ao recusar a solicitação.'
            });
        }
    }

};

export default companyRequestController;
