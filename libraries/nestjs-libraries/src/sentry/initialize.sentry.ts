import * as Sentry from '@sentry/nestjs';
import { capitalize } from 'lodash';

export const initializeSentry = (appName: string, allowLogs = false) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }

  try {
    const integrations: any[] = [];
    try {
      // Optional profiling: native binding may be unavailable for some Node/OS combos.
      // We keep Sentry booting even when profiling cannot be loaded.
      const { nodeProfilingIntegration } = require('@sentry/profiling-node');
      integrations.push(nodeProfilingIntegration());
    } catch (_err) {
      // Intentionally ignore profiler load failures in local/dev environments.
    }

    integrations.push(
      Sentry.consoleLoggingIntegration({
        levels: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'],
      }),
      Sentry.openAIIntegration({
        recordInputs: true,
        recordOutputs: true,
      })
    );

    Sentry.init({
      initialScope: {
        tags: {
          service: appName,
          component: 'nestjs',
        },
        contexts: {
          app: {
            name: `SwiftsAI ${capitalize(appName)}`,
          },
        },
      },
      environment: process.env.NODE_ENV || 'development',
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      spotlight: process.env.SENTRY_SPOTLIGHT === '1',
      integrations,
      tracesSampleRate: 1.0,
      enableLogs: true,

      // Profiling
      profileSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.45,
      profileLifecycle: 'trace',
    });
  } catch (err) {
    console.log(err);
  }
  return true;
};
