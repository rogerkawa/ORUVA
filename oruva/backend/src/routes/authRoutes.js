
import { Router } from 'express';

import authController from '../controllers/authController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// Login
router.post('/login', authController.login);

// Recuperar usuário autenticado
router.get('/me', authMiddleware, authController.me);

// Encerrar sessão
router.post('/logout', authMiddleware, authController.logout);

export default router;
