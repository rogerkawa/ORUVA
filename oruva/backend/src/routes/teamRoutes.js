import { Router } from 'express';

import teamController from '../controllers/teamController.js';
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
            message: 'Você não possui permissão para gerenciar equipes.'
        });
    }

    next();
}

router.use(authMiddleware);
router.use(validarEmpresa);

// Consultas
router.get('/', teamController.listar);
router.get('/:id', teamController.buscarPorId);
router.get('/:id/members', teamController.listarMembros);

// Gerenciamento de equipes
router.post(
    '/',
    autorizarGerenciamento,
    teamController.criar
);

router.put(
    '/:id',
    autorizarGerenciamento,
    teamController.atualizar
);

router.patch(
    '/:id/status',
    autorizarGerenciamento,
    teamController.atualizarStatus
);

// Gerenciamento de integrantes
router.post(
    '/:id/members',
    autorizarGerenciamento,
    teamController.adicionarMembro
);

router.delete(
    '/:id/members/:memberId',
    autorizarGerenciamento,
    teamController.removerMembro
);

export default router;