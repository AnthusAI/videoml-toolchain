/**
 * ECS Worker Entrypoint
 *
 * This worker is designed to run as a Fargate task.
 * It processes ONE render job and then exits.
 *
 * Key differences from worker-cloud.ts:
 * - No polling loop (triggered per job)
 * - Receives JOB_ID via environment variable
 * - Exits with code 0 (success) or 1 (failure)
 * - Designed for ECS task lifecycle
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { signIn } from 'aws-amplify/auth';
import { uploadData, downloadData } from 'aws-amplify/storage';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { processRenderJob, updateJobStatus } from './worker-lib.js';

// Polyfill for WebSocket (Amplify Data uses WS for subscriptions)
import { WebSocket } from 'ws';
// @ts-ignore
global.WebSocket = WebSocket;

// Load Amplify config from environment variable or file
const amplifyConfig = process.env.AMPLIFY_OUTPUTS
  ? JSON.parse(process.env.AMPLIFY_OUTPUTS)
  : existsSync('/app/amplify_outputs.json')
  ? JSON.parse(readFileSync('/app/amplify_outputs.json', 'utf8'))
  : JSON.parse(readFileSync('amplify_outputs.json', 'utf8'));

Amplify.configure(amplifyConfig);

const client = generateClient<any>({
  authMode: 'userPool'
});

const storage = {
  uploadData,
  downloadData
};

/**
 * Authenticate worker with Cognito
 */
async function login() {
  const username = process.env.WORKER_EMAIL;
  const password = process.env.WORKER_PASSWORD;

  if (!username || !password) {
    throw new Error('WORKER_EMAIL and WORKER_PASSWORD environment variables must be set');
  }

  console.log(`Authenticating as ${username}...`);
  const { isSignedIn } = await signIn({ username, password });

  if (!isSignedIn) {
    throw new Error('Worker authentication failed');
  }

  console.log('Worker authenticated successfully');
}

/**
 * Process one render job and exit
 */
async function processOneJob() {
  // Get job ID from environment (passed by trigger Lambda)
  const jobId = process.env.JOB_ID;
  if (!jobId) {
    throw new Error('JOB_ID environment variable not set');
  }

  console.log(`ECS task processing job: ${jobId}`);

  // Fetch job from DynamoDB
  const { data: job, errors } = await client.models.Job.get({ id: jobId });
  if (errors || !job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Validate job kind
  if (job.kind !== 'render') {
    throw new Error(`Invalid job kind for ECS task: ${job.kind}. Expected 'render', got '${job.kind}'`);
  }

  // Validate job status
  if (job.status !== 'queued') {
    console.warn(`Job ${jobId} has status '${job.status}', expected 'queued'. Processing anyway...`);
  }

  // Set work directory
  const workDir = join(process.cwd(), '.babulus', 'worker', job.id);

  // Process the render job
  console.log(`Starting render job processing...`);
  const result = await processRenderJob(job, client, storage, workDir);

  if (!result.success) {
    throw new Error(result.error || 'Render job failed');
  }

  // Update job status to succeeded
  await updateJobStatus(client, job.id, 'succeeded');

  console.log(`ECS task completed job: ${jobId}`);
  console.log(`MP4 artifact: ${result.artifactKeys?.mp4ArtifactKey}`);
}

/**
 * Main entry point
 */
async function main() {
  const startTime = Date.now();

  try {
    console.log('=== ECS Render Worker Starting ===');
    console.log(`Worker ID: ${process.env.WORKER_ID || 'unknown'}`);
    console.log(`Job ID: ${process.env.JOB_ID || 'unknown'}`);
    console.log(`Node version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);

    await login();
    await processOneJob();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== ECS Render Worker Completed Successfully (${duration}s) ===`);
    process.exit(0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`=== ECS Render Worker Failed (${duration}s) ===`);
    console.error('Error:', error);

    // Try to mark job as failed if we have the job ID
    if (process.env.JOB_ID) {
      try {
        await updateJobStatus(
          client,
          process.env.JOB_ID,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }
    }

    process.exit(1);
  }
}

// Start the worker
main();
