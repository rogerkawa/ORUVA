
import conect from '../config/database.js';
import bcrypt from 'bcrypt';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// Solicita uma informação pelo terminal
async function perguntar(mensagem) {
    const rl = readline.createInterface({
        input: stdin,
        output: stdout
    });

    const resposta = await rl.question(mensagem);
    rl.close();

    return resposta.trim();
}

// Solicita uma senha sem exibi-la no terminal
async function perguntarSenha(mensagem) {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
        throw new Error('Execute este script diretamente em um terminal interativo.');
    }

    stdout.write(mensagem);

    return new Promise((resolve, reject) => {
        let senha = '';

        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        function finalizar(erro = null) {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', receberDados);

            stdout.write('\n');

            if (erro) {
                reject(erro);
            } else {
                resolve(senha);
            }
        }

        function receberDados(tecla) {
            if (tecla === '\u0003') {
                finalizar(new Error('Operação cancelada.'));
                return;
            }

            if (tecla === '\r' || tecla === '\n') {
                finalizar();
                return;
            }

            if (tecla === '\u007f' || tecla === '\b') {
                senha = senha.slice(0, -1);
                return;
            }

            if (tecla >= ' ') {
                senha += tecla;
            }
        }

        stdin.on('data', receberDados);
    });
}

async function criarSuperAdmin() {
    try {
        console.log('\n================================');
        console.log('       ORUVA - SUPERADMIN');
        console.log('================================\n');

        const name = await perguntar('Nome completo: ');
        const email = (await perguntar('E-mail: ')).toLowerCase();

        if (!name || !email) {
            throw new Error('Nome e e-mail são obrigatórios.');
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!emailValido) {
            throw new Error('Informe um endereço de e-mail válido.');
        }

        // Verifica se já existe um usuário com esse e-mail
        const [usuariosExistentes] = await conect.execute(
            'SELECT id FROM users WHERE email = ? LIMIT 1',
            [email]
        );

        if (usuariosExistentes.length > 0) {
            throw new Error('Já existe um usuário cadastrado com esse e-mail.');
        }

        const password = await perguntarSenha('Senha: ');
        const confirmacao = await perguntarSenha('Confirme a senha: ');

        if (password.length < 8) {
            throw new Error('A senha deve possuir pelo menos 8 caracteres.');
        }

        if (password !== confirmacao) {
            throw new Error('As senhas não coincidem.');
        }

        // Gera o hash da senha
        const passwordHash = await bcrypt.hash(password, 12);

        // Cria o SuperAdmin
        const [resultado] = await conect.execute(
            `INSERT INTO users (
                name,
                email,
                password,
                system_role,
                status
            ) VALUES (?, ?, ?, 'superadmin', 'active')`,
            [
                name,
                email,
                passwordHash
            ]
        );

        console.log('\n================================');
        console.log(' SuperAdmin criado com sucesso!');
        console.log('================================');
        console.log(`ID: ${resultado.insertId}`);
        console.log(`Nome: ${name}`);
        console.log(`E-mail: ${email}`);
        console.log('Função: superadmin');
        console.log('Status: active\n');

    } catch (error) {
        console.error('\nErro ao criar SuperAdmin:', error.message);
        process.exitCode = 1;

    } finally {
        await conect.end();
    }
}

criarSuperAdmin();
