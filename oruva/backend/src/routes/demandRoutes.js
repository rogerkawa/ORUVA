
import { Router } from 'express';

import demandController from '../controllers/demandController.js';
import demandMessageController from '../controllers/demandMessageController.js';
import demandHistoryController from '../controllers/demandHistoryController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', demandController.listar);
router.get('/:id', demandController.buscarPorId);
router.get('/:id/history', demandHistoryController.listar);
router.post('/', demandController.criar);

router.post('/:id/assign', demandController.atribuir);
router.post('/:id/transfer', demandController.transferir);
router.patch('/:id/status', demandController.alterarStatus);

router.get('/:id/messages', demandMessageController.listar);
router.post('/:id/messages', demandMessageController.criar);

export default router;
