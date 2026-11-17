
import dashboardModel from '../models/dashboardModel.js';

const dashboardController = {
    async buscar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            if (!companyId) {
                return res.status(403).json({
                    message: 'Empresa não identificada na sessão.'
                });
            }

            const period = Number(req.query.period || 30);

            if (![7, 30, 90].includes(period)) {
                return res.status(400).json({
                    message: 'Período inválido. Utilize 7, 30 ou 90 dias.'
                });
            }

            const dashboard = await dashboardModel.buscar(
                companyId,
                period
            );

            return res.status(200).json(dashboard);

        } catch (error) {
            console.error('Erro ao buscar dashboard:', error);

            return res.status(500).json({
                message: 'Erro interno ao carregar o dashboard.'
            });
        }
    }
};

export default dashboardController;
