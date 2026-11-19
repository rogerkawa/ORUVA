
import { Router } from 'express';

import processTemplateController from '../controllers/processTemplateController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// =====================================================
// MIDDLEWARES
// =====================================================

function validarEmpresa(req, res, next) {
    if (!req.empresa?.company_id) {
        return res.status(400).json({
            success: false,
            message: 'Selecione uma empresa para continuar.'
        });
    }

    next();
}

function autorizarGerenciamento(req, res, next) {
    const role = req.empresa?.role;

    const rolesPermitidas = ['admin', 'manager'];

    if (!rolesPermitidas.includes(role)) {
        return res.status(403).json({
            success: false,
            message: 'Você não tem permissão para gerenciar modelos de processos.'
        });
    }

    next();
}

// =====================================================
// AUTENTICAÇÃO E CONTEXTO DA EMPRESA
// =====================================================

router.use(authMiddleware);
router.use(validarEmpresa);

// =====================================================
// MODELOS DE PROCESSOS
// =====================================================

// Listar modelos
router.get(
    '/',
    processTemplateController.listar
);

// Buscar modelo por ID
router.get(
    '/:id',
    processTemplateController.buscarPorId
);

// Criar modelo
router.post(
    '/',
    autorizarGerenciamento,
    processTemplateController.criar
);

// Atualizar modelo
router.put(
    '/:id',
    autorizarGerenciamento,
    processTemplateController.atualizar
);

// Ativar / desativar modelo
router.patch(
    '/:id/status',
    autorizarGerenciamento,
    processTemplateController.atualizarStatus
);

// =====================================================
// ETAPAS DOS MODELOS
// =====================================================

// Listar etapas
router.get(
    '/:templateId/steps',
    processTemplateController.listarEtapas
);

// Criar etapa
router.post(
    '/:templateId/steps',
    autorizarGerenciamento,
    processTemplateController.criarEtapa
);

// Reordenar etapas
// Deve ficar antes da rota genérica de atualização.
router.put(
    '/:templateId/steps/reorder',
    autorizarGerenciamento,
    processTemplateController.reordenarEtapas
);

// Atualizar etapa
router.put(
    '/:templateId/steps/:stepId',
    autorizarGerenciamento,
    processTemplateController.atualizarEtapa
);

// Remover etapa
router.delete(
    '/:templateId/steps/:stepId',
    autorizarGerenciamento,
    processTemplateController.removerEtapa
);

export default router;
