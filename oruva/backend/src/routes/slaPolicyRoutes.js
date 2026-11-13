import { Router } from 'express';

import slaPolicyController from '../controllers/slaPolicyController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

function validarEmpresa(req, res, next) {
    if (!req.empresa?.company_id) {
        return res.status(400).json({
            message: 'Selecione uma empresa para continuar.'
        });
    }

    next();
}

function autorizarGerenciamento(req, res, next) {
    const role = req.empresa?.role;

    if (!['admin', 'manager'].includes(role)) {
        return res.status(403).json({
            message: 'Você não possui permissão para gerenciar políticas de SLA.'
        });
    }

    next();
}

router.use(authMiddleware);
router.use(validarEmpresa);

// Consultas
router.get('/', slaPolicyController.listar);
router.get('/:id', slaPolicyController.buscarPorId);

// Gerenciamento
router.post(
    '/',
    autorizarGerenciamento,
    slaPolicyController.criar
);

router.put(
    '/:id',
    autorizarGerenciamento,
    slaPolicyController.atualizar
);

router.patch(
    '/:id/status',
    autorizarGerenciamento,
    slaPolicyController.atualizarStatus
);

export default router;