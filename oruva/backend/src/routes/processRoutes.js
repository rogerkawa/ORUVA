
import { Router } from 'express';

import processController from '../controllers/processController.js';

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

function autorizarAcesso(req, res, next) {
    const role = req.empresa?.role;

    const rolesPermitidas = [
        'admin',
        'manager',
        'agent'
    ];

    if (!rolesPermitidas.includes(role)) {
        return res.status(403).json({
            success: false,
            message: 'Você não tem permissão para acessar os processos.'
        });
    }

    next();
}

// =====================================================
// AUTENTICAÇÃO E CONTEXTO DA EMPRESA
// =====================================================

router.use(authMiddleware);
router.use(validarEmpresa);
router.use(autorizarAcesso);

// =====================================================
// PROCESSOS
// =====================================================

// Listar processos
router.get(
    '/',
    processController.listar
);

// Criar processo
router.post(
    '/',
    processController.criar
);

// Buscar processo por ID
router.get(
    '/:id',
    processController.buscarPorId
);

// =====================================================
// MOVIMENTAÇÕES
// =====================================================

// Avançar para próxima etapa
router.post(
    '/:id/advance',
    processController.avancarEtapa
);

// Pausar processo
router.patch(
    '/:id/pause',
    processController.pausar
);

// Retomar processo
router.patch(
    '/:id/resume',
    processController.retomar
);

// Concluir processo
router.patch(
    '/:id/complete',
    processController.concluir
);

// Cancelar processo
router.patch(
    '/:id/cancel',
    processController.cancelar
);

// =====================================================
// HISTÓRICO
// =====================================================

router.get(
    '/:id/history',
    processController.listarHistorico
);

export default router;
