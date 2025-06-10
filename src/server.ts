import crypto from 'node:crypto';
import { exec } from 'node:child_process';

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { tryit } from 'radash';

import { connect, ProjectModel } from './database';
import { env } from './env';

const app = express();

app.use(express.json());

function verifySignature(req: Request, res: Response, buf: Buffer) {
  const signature = req.headers['x-hub-signature-256'];
  const hmac = crypto.createHmac('sha256', env.webhookSecret);
  hmac.update(buf);
  const digest = `sha256=${hmac.digest('hex')}`;

  if (signature !== digest) {
    throw new Error('Invalid signature.');
  }
}

const requestSchema = z.object({
  ref: z.string().optional(),
  repository: z.object({
    name: z.string().optional(),
  }).optional(),
});

app.post('/', express.json({ verify: verifySignature }), async (req, res) => {
  console.log('Webhook received');

  const { data } = requestSchema.safeParse(req.body);
  const repoName = data?.repository?.name;
  const branch = data?.ref?.split('/').pop();

  if (branch && branch !== 'main') {
    console.log('Ignored webhook for non-main branch');
    res.status(204).end();
    return;
  }

  if (!repoName) {
    console.error('Missing repository name');
    res.status(400).send('Missing repository');
    return;
  }

  const [error, project] = await tryit(ProjectModel.findOne)({
    name: repoName,
  });

  if (error) {
    console.error(`Could not retrieve project with name ${repoName}:`, error);
    res.status(500).send('Could not retrieve project');
    return;
  }

  if (!project) {
    console.error('Unrecognized repository:', repoName);
    res.status(404).send('Unknown repository');
    return;
  }

  const cmd = `
    cd ${project.path} && \
    git pull && \
    pnpm install && \
    ${project.build} && \
    sudo systemctl restart ${project.service}
  `;

  // Run your deployment commands
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error: ${stderr}`);
      return res.status(500).send('Deployment failed.');
    }

    console.log(`Output: ${stdout}`);
    res.status(200).send('Deployment successful.');
  });
});

app.listen(env.port, () => {
  console.log(`Listening on port ${env.port}`);
});

connect().catch(error => {
  console.error('Could not connect to the database:', error);
});
