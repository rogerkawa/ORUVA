
import { Router } from 'express';
import demandController from '../controllers/demandController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', demandController.listar);
router.get('/:id', demandController.buscarPorId);
router.post('/', demandController.criar);

router.post('/:id/assign', demandController.atribuir);
router.post('/:id/transfer', demandController.transferir);


export default router;
