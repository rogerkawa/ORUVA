import { Router } from 'express';

import departmentController from '../controllers/departmentController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// Verifica se o usuário possui uma empresa selecionada
function validarEmpresa(req, res, next) {
    if (!req.empresa?.company_id) {
        return res.status(400).json({
            message: 'Selecione uma empresa para continuar.'
        });
    }

    next();
}

// Permite gerenciamento apenas para admin e manager
function autorizarGerenciamento(req, res, next) {
    const role = req.empresa?.role;

    if (!['admin', 'manager'].includes(role)) {
        return res.status(403).json({
            message: 'Você não possui permissão para gerenciar departamentos.'
        });
    }

    next();
}

router.use(authMiddleware);
router.use(validarEmpresa);

// Consulta: todos os membros da empresa
router.get('/', departmentController.listar);
router.get('/:id', departmentController.buscarPorId);

// Gerenciamento: admin e manager
router.post(
    '/',
    autorizarGerenciamento,
    departmentController.criar
);

router.put(
    '/:id',
    autorizarGerenciamento,
    departmentController.atualizar
);

router.patch(
    '/:id/status',
    autorizarGerenciamento,
    departmentController.atualizarStatus
);

export default router;