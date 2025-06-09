import { MongoClient } from 'mongodb';
import Papr, { schema, types } from 'papr';

import { env } from './env';

export const papr = new Papr();
let client: MongoClient | undefined;

export const ProjectModel = papr.model('projects', schema({
  name: types.string({ required: true }),
  path: types.string({ required: true }),
  build: types.string({ required: true }),
  service: types.string({ required: true }),
}));

export type ProjectType = Omit<typeof ProjectModel['schema'], '_id'>;

export const connect = async () => {
  if (client) {
    return;
  }

  client = await MongoClient.connect(env.database.uri);
  papr.initialize(client.db(env.database.name));
  await papr.updateSchemas();
}
