import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
initializeSentry('orchestrator', true);
import 'source-map-support/register';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

import { NestFactory } from '@nestjs/core';
import { AppModule } from '@gitroom/orchestrator/app.module';
import * as dns from 'node:dns';
import { Connection } from '@temporalio/client';
dns.setDefaultResultOrder('ipv4first');

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 2000;

async function waitForTemporal(retries = MAX_RETRIES): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await Connection.connect({ address: TEMPORAL_ADDRESS });
      connection.close();
      console.log(`Temporal ready at ${TEMPORAL_ADDRESS}`);
      return;
    } catch {
      console.log(`Waiting for Temporal at ${TEMPORAL_ADDRESS} (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  console.error(`Temporal not reachable at ${TEMPORAL_ADDRESS} after ${retries} retries, continuing anyway`);
}

async function bootstrap() {
  await waitForTemporal();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = process.env.ORCHESTRATOR_PORT || 3002;
  await app.listen(port);
  console.log(`Orchestrator health check listening on port ${port}`);
}

bootstrap();
