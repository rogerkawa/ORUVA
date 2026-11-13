
import { Router } from 'express';
import approvalController from '../controllers/approvalController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

// Configuração de aprovadores por categoria
router.get(
    '/categories/:categoryId/steps',
    approvalController.listarEtapasCategoria
);

router.put(
    '/categories/:categoryId/steps',
    approvalController.atualizarEtapasCategoria
);

router.delete(
    '/categories/:categoryId/steps',
    approvalController.removerEtapasCategoria
);

// Aprovações pendentes do membro autenticado
router.get(
    '/pending',
    approvalController.listarPendentes
);

// Fluxo de aprovação de uma demanda
router.get(
    '/demands/:demandId',
    approvalController.buscarFluxoDemanda
);

// Decisões
router.post(
    '/:approvalId/approve',
    approvalController.aprovar
);

router.post(
    '/:approvalId/reject',
    approvalController.rejeitar
);

export default router;
