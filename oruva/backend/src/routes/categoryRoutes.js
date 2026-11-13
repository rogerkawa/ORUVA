import { Router } from 'express';

import categoryController from '../controllers/categoryController.js';
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
            message: 'Você não possui permissão para gerenciar categorias.'
        });
    }

    next();
}

router.use(authMiddleware);
router.use(validarEmpresa);

// Consultas
router.get('/', categoryController.listar);
router.get('/:id', categoryController.buscarPorId);

// Gerenciamento
router.post(
    '/',
    autorizarGerenciamento,
    categoryController.criar
);

router.put(
    '/:id',
    autorizarGerenciamento,
    categoryController.atualizar
);

router.patch(
    '/:id/status',
    autorizarGerenciamento,
    categoryController.atualizarStatus
);

export default router;