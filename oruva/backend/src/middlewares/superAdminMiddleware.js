
function superAdminMiddleware(req, res, next) {
    if (!req.usuario || req.usuario.system_role !== 'superadmin') {
        return res.status(403).json({
            message: 'Acesso restrito ao SuperAdmin.'
        });
    }

    next();
}

export default superAdminMiddleware;
