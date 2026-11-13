
import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';

import cloudinary from '../config/cloudinary.js';
import demandAttachmentModel from '../models/demandAttachmentModel.js';

// Tipos de arquivo permitidos
const TIPOS_PERMITIDOS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
};

// Valida IDs BIGINT sem converter para Number
function validarId(id) {
    return typeof id === 'string' && /^[1-9]\d*$/.test(id);
}

// Envia o arquivo para o Cloudinary
function uploadCloudinary(buffer, demandId, extension) {
    return new Promise((resolve, reject) => {
        const publicId = `${randomUUID()}.${extension}`;

        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                type: 'authenticated',
                folder: `oruva/demands/${demandId}`,
                public_id: publicId,
                use_filename: false,
                unique_filename: false,
                overwrite: false
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve(result);
            }
        );

        stream.end(buffer);
    });
}

// Gera uma URL temporária para download
function gerarUrlTemporaria(publicId) {
    const extension = publicId.split('.').pop();

    return cloudinary.utils.private_download_url(
        publicId,
        extension,
        {
            resource_type: 'raw',
            type: 'authenticated',
            expires_at: Math.floor(Date.now() / 1000) + 300,
            attachment: true
        }
    );
}

// Remove o arquivo do Cloudinary
async function removerCloudinary(publicId) {
    return cloudinary.uploader.destroy(
        publicId,
        {
            resource_type: 'raw',
            type: 'authenticated'
        }
    );
}

const demandAttachmentController = {

    // GET /api/demands/:id/attachments
    async listar(req, res) {
        try {
            const { id } = req.params;

            if (!validarId(id)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'ID da demanda inválido.'
                });
            }

            const anexos = await demandAttachmentModel.listar({
                demandId: id,
                companyId: req.empresa.company_id,
                memberId: req.sessao.company_member_id,
                role: req.empresa.role
            });

            // Gera uma URL temporária para cada arquivo
            const dados = anexos.map((anexo) => ({
                id: anexo.id,
                demand_id: anexo.demand_id,
                message_id: anexo.message_id,
                uploaded_by_member_id: anexo.uploaded_by_member_id,
                original_name: anexo.original_name,
                mime_type: anexo.mime_type,
                file_size: anexo.file_size,
                created_at: anexo.created_at,
                download_url: gerarUrlTemporaria(anexo.file_name)
            }));

            return res.status(200).json({
                sucesso: true,
                dados
            });

        } catch (error) {
            console.error('Erro ao listar anexos:', error);

            if (error.message === 'DEMAND_NOT_FOUND') {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Demanda não encontrada.'
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao listar os anexos.'
            });
        }
    },

    // POST /api/demands/:id/attachments
    async criar(req, res) {
        let uploadedFile = null;

        try {
            const { id } = req.params;

            const messageId = req.body.messageId || null;

            if (!validarId(id)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'ID da demanda inválido.'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Selecione um arquivo para enviar.'
                });
            }

            if (
                messageId !== null &&
                !validarId(String(messageId))
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'ID da mensagem inválido.'
                });
            }

            // Verifica o conteúdo real do arquivo
            const tipoDetectado = await fileTypeFromBuffer(
                req.file.buffer
            );

            if (
                !tipoDetectado ||
                !TIPOS_PERMITIDOS[tipoDetectado.mime]
            ) {
                return res.status(415).json({
                    sucesso: false,
                    mensagem: 'Tipo de arquivo não permitido. Envie PDF, JPEG, PNG ou WebP.'
                });
            }

            const extension = TIPOS_PERMITIDOS[tipoDetectado.mime];

            // Envia o arquivo ao Cloudinary
            uploadedFile = await uploadCloudinary(
                req.file.buffer,
                id,
                extension
            );

            if (!uploadedFile?.secure_url || !uploadedFile?.public_id) {
                throw new Error('CLOUDINARY_UPLOAD_FAILED');
            }

            // Salva as informações do arquivo no banco
            const anexo = await demandAttachmentModel.criar({
                demandId: id,
                companyId: req.empresa.company_id,
                memberId: req.sessao.company_member_id,
                role: req.empresa.role,
                messageId: messageId ? String(messageId) : null,
                originalName: req.file.originalname,
                fileName: uploadedFile.public_id,
                fileUrl: uploadedFile.secure_url,
                mimeType: tipoDetectado.mime,
                fileSize: req.file.size
            });

            // Não expõe file_name nem file_url ao frontend
            return res.status(201).json({
                sucesso: true,
                mensagem: 'Anexo enviado com sucesso.',
                dados: {
                    id: anexo.id,
                    demand_id: anexo.demand_id,
                    message_id: anexo.message_id,
                    original_name: anexo.original_name,
                    mime_type: anexo.mime_type,
                    file_size: anexo.file_size,
                    download_url: gerarUrlTemporaria(anexo.file_name)
                }
            });

        } catch (error) {
            // Se o banco falhar depois do upload, tenta remover o arquivo
            if (uploadedFile?.public_id) {
                try {
                    await removerCloudinary(uploadedFile.public_id);
                } catch (cleanupError) {
                    console.error(
                        'Erro ao remover upload incompleto:',
                        cleanupError
                    );
                }
            }

            console.error('Erro ao criar anexo:', error);

            const erros = {
                DEMAND_NOT_FOUND: [
                    404,
                    'Demanda não encontrada.'
                ],
                DEMAND_NOT_AVAILABLE: [
                    409,
                    'Não é possível anexar arquivos a uma demanda encerrada.'
                ],
                MEMBER_NOT_FOUND: [
                    403,
                    'Membro não autorizado.'
                ],
                MESSAGE_NOT_FOUND: [
                    404,
                    'Mensagem não encontrada nesta demanda.'
                ],
                MESSAGE_NOT_AVAILABLE: [
                    403,
                    'Você não pode anexar arquivos a esta mensagem.'
                ],
                PUBLIC_MESSAGE_REQUIRED: [
                    400,
                    'Vincule o arquivo a uma mensagem pública.'
                ]
            };

            const resposta = erros[error.message];

            if (resposta) {
                return res.status(resposta[0]).json({
                    sucesso: false,
                    mensagem: resposta[1]
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao enviar o anexo.'
            });
        }
    },

    // DELETE /api/demands/:id/attachments/:attachmentId
    async excluir(req, res) {
        try {
            const { id, attachmentId } = req.params;

            if (!validarId(id) || !validarId(attachmentId)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Identificador inválido.'
                });
            }

            const dados = {
                demandId: id,
                companyId: req.empresa.company_id,
                memberId: req.sessao.company_member_id,
                role: req.empresa.role
            };

            // Busca o anexo e verifica o acesso à demanda
            const anexo = await demandAttachmentModel.buscarPorId({
                ...dados,
                attachmentId
            });

            if (!anexo) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Anexo não encontrado.'
                });
            }

            // Admin e manager podem excluir qualquer anexo.
            // Os demais só podem excluir os próprios.
            const podeExcluir =
                ['admin', 'manager'].includes(req.empresa.role) ||
                String(anexo.uploaded_by_member_id) ===
                    String(req.sessao.company_member_id);

            if (!podeExcluir) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Você não tem permissão para excluir este anexo.'
                });
            }

            // Remove o arquivo do Cloudinary
            const resultado = await removerCloudinary(anexo.file_name);

            if (!['ok', 'not found'].includes(resultado.result)) {
                throw new Error('CLOUDINARY_DELETE_FAILED');
            }

            // Remove o registro do banco
            await demandAttachmentModel.excluir({
                attachmentId,
                ...dados
            });

            return res.status(200).json({
                sucesso: true,
                mensagem: 'Anexo removido com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao excluir anexo:', error);

            if (error.message === 'DEMAND_NOT_FOUND') {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Demanda não encontrada.'
                });
            }

            if (error.message === 'ATTACHMENT_NOT_FOUND') {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Anexo não encontrado.'
                });
            }

            if (error.message === 'CLOUDINARY_DELETE_FAILED') {
                return res.status(502).json({
                    sucesso: false,
                    mensagem: 'Não foi possível remover o arquivo do armazenamento.'
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao excluir o anexo.'
            });
        }
    }
};

export default demandAttachmentController;
