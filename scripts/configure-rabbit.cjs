const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const rootPath = '.env';
let root = fs.existsSync(rootPath) ? fs.readFileSync(rootPath, 'utf8') : fs.readFileSync('.env.example', 'utf8');
const current = dotenv.parse(root);
const user = current.RABBITMQ_USER || 'petshop';
const password = current.RABBITMQ_PASSWORD || crypto.randomBytes(24).toString('hex');
const url = `amqp://${encodeURIComponent(user)}:${encodeURIComponent(password)}@localhost:5672/%2F`;
function set(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'gm');
  return pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
}
for (const [key, value] of Object.entries({ RABBITMQ_USER: user, RABBITMQ_PASSWORD: password, RABBITMQ_URL: url })) root = set(root, key, value);
fs.writeFileSync(rootPath, root);
for (const servicePath of ['microsservicos/loja', 'microsservicos/cadastros', 'microsservicos/agendamentos']) {
 const envPath = `${servicePath}/.env`;
 const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : fs.readFileSync(`${envPath}.example`, 'utf8');
 fs.writeFileSync(envPath, set(content, 'RABBITMQ_URL', url));
}
console.log('RabbitMQ configurado na infraestrutura e nos tres servicos; credenciais preservadas localmente.');
