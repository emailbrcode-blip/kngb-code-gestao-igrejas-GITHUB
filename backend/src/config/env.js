import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  port: process.env.PORT || 3333,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: required('DATABASE_URL'),
  // Aceita uma ou várias origens separadas por vírgula — útil em
  // produção quando o frontend responde em mais de um domínio
  // (ex: com e sem "www", ou um ambiente de staging).
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3333}`,
  domain: process.env.DOMAIN || null,
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: required('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};
