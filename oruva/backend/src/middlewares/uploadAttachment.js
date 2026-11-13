import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
}).single('file');

function uploadAttachment(req, res, next) {
    upload(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    sucesso: false,
                    mensagem: 'O arquivo ultrapassa o limite de 10 MB.'
                });
            }

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não foi possível processar o arquivo enviado.'
            });
        }

        return res.status(400).json({
            sucesso: false,
            mensagem: 'Erro ao receber o arquivo.'
        });
    });
}

export default uploadAttachment;