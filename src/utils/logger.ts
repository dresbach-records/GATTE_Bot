import winston from 'winston';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Logger com Masking LGPD
// Nenhum dado pessoal em texto claro nos logs
// ══════════════════════════════════════════════════════════

const MASKING_RULES: Array<{ pattern: RegExp; replace: string }> = [
  // Telefone: +5511999999999 → +5511*****9999
  { pattern: /(\+\d{2}\d{2})(\d{5})(\d{4})/g, replace: '$1*****$3' },
  // E-mail: usuario@dominio.com → us***@dominio.com
  { pattern: /([a-z]{2})[a-z0-9._%+-]*(@[a-z0-9.-]+\.[a-z]+)/gi, replace: '$1***$2' },
  // CNPJ: 12.345.678/0001-90 → 12.***.***/**-90
  { pattern: /(\d{2})\.\d{3}\.\d{3}\/\d{4}-(\d{2})/g, replace: '$1.***.***/**-$2' },
  // CPF: 123.456.789-00 → ***.***.***-00
  { pattern: /\d{3}\.\d{3}\.\d{3}-(\d{2})/g, replace: '***.***.***-$1' },
  // Cartao 16 digitos
  { pattern: /\b(\d{4})\d{8}(\d{4})\b/g, replace: '$1 **** **** $2' },
];

export function maskSensitive(text: string): string {
  return MASKING_RULES.reduce(
    (acc, rule) => acc.replace(rule.pattern, rule.replace),
    text
  );
}

// ─── Formato customizado com masking ───
const maskedFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = maskSensitive(info.message);
  }
  if (info.phone) info.phone = maskSensitive(String(info.phone));
  if (info.email) info.email = maskSensitive(String(info.email));
  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    maskedFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const extras = Object.keys(meta).length
              ? ' ' + JSON.stringify(meta)
              : '';
            return `${timestamp} [${level}] ${message}${extras}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
