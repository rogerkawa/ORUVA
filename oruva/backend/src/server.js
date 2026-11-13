
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import conect from './config/database.js';
import routes from './routes/index.js';

const app = express();

const PORT = process.env.PORT || 3333;

// Configuração do proxy (Render)
app.set('trust proxy', 1);

// Middlewares
const origensPermitidas = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(
        origem => origem.trim()
    )
    : [];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origensPermitidas.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origem não permitida pelo CORS.'));
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rotas
app.use('/api', routes);

// Rota inicial
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Servidor Oruva rodando!',
        status: 'online'
    });
});

// Inicialização do servidor
async function iniciarServidor() {
    try {
        await conect.query('SELECT 1');

        console.log('Conexão com MySQL estabelecida!');

        app.listen(PORT, () => {
            console.log(`Servidor Oruva rodando na porta ${PORT}`);
        });

    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error.message);
        process.exit(1);
    }
}

iniciarServidor();
