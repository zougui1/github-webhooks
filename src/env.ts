import path from 'node:path';

import { config } from 'dotenv';
import envVar from 'env-var';

config({
  path: path.join(__dirname, '../.env'),
});

const NODE_ENV = envVar.get('NODE_ENV').default('development').asEnum(['development', 'production']);

export const env = {
  isDev: NODE_ENV === 'development',

  port: envVar.get('PORT').required().asPortNumber(),
  webhookSecret: envVar.get('WEBHOOK_SECRET').required().asString(),

  database: {
    uri: envVar.get('DATABASE.URI').required().asString(),
    name: envVar.get('DATABASE.NAME').required().asString(),
  },
};
