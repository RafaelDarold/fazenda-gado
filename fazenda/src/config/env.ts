import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value)
    throw new Error(`Variavel de ambiente obrigatoria nao definida: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  db: {
    host: optional("DB_HOST", "localhost"),
    port: parseInt(optional("DB_PORT", "3306"), 10),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: optional("DB_NAME", "fazenda_gado"),
    connectionLimit: parseInt(optional("DB_CONNECTION_LIMIT", "10"), 10),
  },
  app: {
    port: parseInt(optional("APP_PORT", "3000"), 10),
    env: optional("APP_ENV", "development"),
    isDev: optional("APP_ENV", "development") === "development",
  },
  upload: {
    dir: optional("UPLOAD_DIR", "./uploads"),
    maxSizeMb: parseInt(optional("MAX_FILE_SIZE_MB", "10"), 10),
  },
} as const;

export type Env = typeof env;

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET ?? "fazenda_secret_key_dev_2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
};
