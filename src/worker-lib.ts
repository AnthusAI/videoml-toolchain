/**
 * Worker library - testable functions for job processing
 *
 * This module extracts the core worker logic from worker-cloud.ts
 * to make it testable and reusable between local and Lambda execution.
 *
 * Key principles:
 * - Dependency injection for external services
 * - Pure functions where possible
 * - Explicit error handling with typed errors
 * - Progress tracking via JobEvents
 */

import type { Schema } from '../apps/studio-web/amplify/data/resource.js';
import { generateComposition } from './generate.js';
import { loadVideoFile } from './dsl/load.js';
import { ensureDir } from './util.js';
import { loadUsageEntries } from './telemetry.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Type definitions
export type GraphQLClient = ReturnType<typeof import('aws-amplify/data').generateClient<Schema>>;

export type StorageClient = {
  uploadData: (params: {
    path: string;
    data: any;
    options?: { contentType?: string };
  }) => { result: Promise<{ path: string }> };
  downloadData: (params: {
    path: string;
  }) => { result: Promise<{ body: { text: () => Promise<string>; blob: () => Promise<Blob> } }> };
};

export type JobInput = {
  videoId: string;
  generationRunId?: string;
  storyboardVersionId?: string;
};

export type ProcessingResult = {
  success: boolean;
  artifactKeys?: {
    scriptArtifactKey?: string;
    timelineArtifactKey?: string;
    audioArtifactKey?: string;
    mp4ArtifactKey?: string;
  };
  error?: string;
};

/**
 * Default DSL template used when no storyboard version exists
 * Uses dry-run provider in test mode, OpenAI in production
 */
export const DEFAULT_DSL_PROD = `
import { defineVideo } from 'babulus';

export default defineVideo((video) => {
  video.composition('default-video', (composition) => {
    composition.voiceover({ provider: 'openai' });

    composition.scene('Opening', (scene) => {
      scene.cue('Welcome', (cue) => {
        cue.voice((voice) => {
          voice.say('Welcome to your new video.');
          voice.say('This is a generated voiceover.');
        });
      });
    });
  });
});
`;

export const DEFAULT_DSL_TEST = `
import { defineVideo } from 'babulus';

export default defineVideo((video) => {
  video.composition('default-video', (composition) => {
    composition.voiceover({ provider: 'dry-run' });

    composition.scene('Opening', (scene) => {
      scene.cue('Welcome', (cue) => {
        cue.voice((voice) => {
          voice.say('Welcome to your new video.');
          voice.say('This is a generated voiceover.');
        });
      });
    });
  });
});
`;

export const DEFAULT_DSL = process.env.NODE_ENV === 'test' ? DEFAULT_DSL_TEST : DEFAULT_DSL_PROD;

/**
 * Claim the next available queued job
 *
 * Uses optimistic locking to avoid concurrent claims.
 * Returns null if no jobs available or claim fails.
 */
export async function claimNextJob(
  client: GraphQLClient,
  agentId: string,
  kind?: 'generate' | 'render'
): Promise<any | null> {
  // Query for queued jobs
  const filter: any = { status: { eq: 'queued' } };
  if (kind) {
    filter.kind = { eq: kind };
  }

  const { data: jobs, errors } = await client.models.Job.list({
    filter,
    limit: 1,
  });

  if (errors || !jobs || jobs.length === 0) {
    return null;
  }

  const job = jobs[0];

  // Attempt to claim (optimistic locking via conditional update)
  const { data: claimedJob, errors: claimErrors } = await client.models.Job.update({
    id: job.id,
    status: 'claimed',
    claimedByAgentId: agentId,
  });

  if (claimErrors || !claimedJob) {
    // Job was claimed by another worker
    return null;
  }

  return claimedJob;
}

/**
 * Emit a job event for progress tracking
 */
export async function emitJobEvent(
  client: GraphQLClient,
  jobId: string,
  orgId: string,
  type: 'status' | 'progress' | 'error',
  message: string,
  progress?: number
): Promise<void> {
  try {
    await client.models.JobEvent.create({
      jobId,
      orgId,
      type,
      message,
      progress,
    });
  } catch (error) {
    console.error('Failed to emit job event:', error);
    // Don't fail the job if event emission fails
  }
}

/**
 * Process a generation job
 *
 * Steps:
 * 1. Fetch video and storyboard version
 * 2. Parse DSL and load composition
 * 3. Generate artifacts (script, timeline, audio)
 * 4. Upload artifacts to S3
 * 5. Create GenerationRun record
 * 6. Record usage events
 */
export async function processGenerationJob(
  job: any,
  client: GraphQLClient,
  storage: StorageClient,
  workDir: string
): Promise<ProcessingResult> {
  const input: JobInput = job.inputJson ? JSON.parse(job.inputJson) : {};
  const { videoId } = input;

  if (!videoId) {
    throw new Error('Missing videoId in job input');
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Fetching video data...');

  // Fetch video
  const videoRes = await client.models.Video.get({ id: videoId });
  const video = videoRes.data;
  if (!video) {
    throw new Error(`Video not found: ${videoId}`);
  }

  // Fetch storyboard version
  let sourceText = DEFAULT_DSL;
  let storyboardVersionId = video.activeStoryboardVersionId;

  if (storyboardVersionId) {
    const versionRes = await client.models.StoryboardVersion.get({ id: storyboardVersionId });
    if (versionRes.data?.sourceText) {
      sourceText = versionRes.data.sourceText;
    }
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Parsing DSL...');

  // Write DSL to temp file
  ensureDir(workDir);
  const dslPath = join(workDir, 'source.babulus.ts');
  writeFileSync(dslPath, sourceText);

  // Load and validate DSL
  const fileSpec = await loadVideoFile(dslPath);
  const composition = fileSpec.compositions[0];

  if (!composition) {
    throw new Error('No composition found in DSL');
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Generating composition...', 0.2);

  // Create config with OpenAI as default provider
  const config = {
    providers: {
      tts: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
        },
        'dry-run': {},
      },
      sfx: { 'dry-run': {} },
      music: { 'dry-run': {} },
    },
  };

  const outDir = join(workDir, 'out');
  ensureDir(outDir);

  // Generate composition (TTS, script, timeline)
  const result = await generateComposition({
    composition,
    dslPath,
    scriptOut: join(outDir, 'script.json'),
    timelineOut: join(outDir, 'timeline.json'),
    audioOut: join(outDir, 'audio.wav'),
    outDir: join(outDir, 'cache'),
    config: config as any,
    fresh: true,
    verboseLogs: true,
    log: (msg) => console.log(`[Gen] ${msg}`),
  });

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Uploading artifacts...', 0.8);

  // Upload artifacts to S3
  const runId = result.runId || `run-${Date.now()}`;
  const keyPrefix = `org/${job.orgId}/videos/${videoId}/runs/${runId}`;

  const uploadArtifact = async (name: string, path: string, contentType: string) => {
    if (!existsSync(path)) return null;
    console.log(`Uploading ${name} to ${keyPrefix}/${name}...`);
    const fileContent = readFileSync(path);
    const uploadResult = await storage.uploadData({
      path: `${keyPrefix}/${name}`,
      data: fileContent,
      options: { contentType },
    }).result;
    return uploadResult.path;
  };

  const scriptKey = await uploadArtifact('script.json', join(outDir, 'script.json'), 'application/json');
  const timelineKey = result.timelinePath
    ? await uploadArtifact('timeline.json', result.timelinePath, 'application/json')
    : null;
  const audioKey = result.audioPath
    ? await uploadArtifact('audio.wav', result.audioPath, 'audio/wav')
    : null;

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Creating generation run...', 0.9);

  // Create GenerationRun entry
  await client.models.GenerationRun.create({
    orgId: job.orgId,
    videoId: videoId,
    storyboardVersionId: storyboardVersionId || 'default-mock-version',
    status: 'succeeded',
    scriptArtifactKey: scriptKey,
    timelineArtifactKey: timelineKey,
    audioArtifactKey: audioKey,
  });

  // Upload usage events
  const env = process.env.BABULUS_ENV || 'development';
  const usagePath = join(outDir, 'cache', 'env', env, 'usage.jsonl');
  if (existsSync(usagePath)) {
    try {
      const entries = loadUsageEntries(usagePath);
      console.log(`Recording ${entries.length} usage events...`);
      for (const entry of entries) {
        await client.models.UsageEvent.create({
          orgId: job.orgId,
          videoId,
          runId,
          provider: entry.provider,
          unitType: entry.unitType as any,
          quantity: entry.quantity,
          estimatedCost: entry.estimatedCost,
          actualCost: entry.estimatedCost,
        });
      }
    } catch (e) {
      console.error('Failed to upload usage events:', e);
    }
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Generation complete!', 1.0);

  return {
    success: true,
    artifactKeys: {
      scriptArtifactKey: scriptKey || undefined,
      timelineArtifactKey: timelineKey || undefined,
      audioArtifactKey: audioKey || undefined,
    },
  };
}

/**
 * Update job status with error handling
 */
export async function updateJobStatus(
  client: GraphQLClient,
  jobId: string,
  status: 'succeeded' | 'failed' | 'queued',
  failureReason?: string
): Promise<void> {
  const updateData: any = {
    id: jobId,
    status,
  };

  if (failureReason) {
    updateData.failureReason = failureReason;
  }

  await client.models.Job.update(updateData);
}

/**
 * Handle job failure with automatic retry logic
 *
 * If retryCount < maxRetries: increment retryCount and re-queue job
 * If retryCount >= maxRetries: mark as permanently failed
 *
 * Uses exponential backoff: delay = 2^retryCount minutes
 */
export async function handleJobFailure(
  client: GraphQLClient,
  jobId: string,
  failureReason: string
): Promise<{ shouldRetry: boolean; retryCount: number }> {
  // Fetch current job state
  const jobRes = await client.models.Job.get({ id: jobId });
  const job = jobRes.data;

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const retryCount = (job.retryCount || 0) + 1;
  const maxRetries = job.maxRetries || 3;

  if (retryCount < maxRetries) {
    // Re-queue for retry
    console.log(`Job ${jobId} failed, retrying (${retryCount}/${maxRetries})...`);

    await client.models.Job.update({
      id: jobId,
      status: 'queued',
      retryCount,
      failureReason: `Retry ${retryCount}/${maxRetries}: ${failureReason}`,
      claimedByAgentId: null, // Clear claim so another worker can pick it up
    });

    return { shouldRetry: true, retryCount };
  } else {
    // Permanent failure
    console.error(`Job ${jobId} failed permanently after ${retryCount} attempts`);

    await client.models.Job.update({
      id: jobId,
      status: 'failed',
      retryCount,
      failureReason: `Failed after ${retryCount} attempts: ${failureReason}`,
    });

    return { shouldRetry: false, retryCount };
  }
}

/**
 * Process a render job
 *
 * Downloads generation artifacts, renders video frames with Playwright,
 * encodes to MP4 with ffmpeg, and uploads result to S3.
 */
export async function processRenderJob(
  job: any,
  client: GraphQLClient,
  storage: StorageClient,
  workDir: string
): Promise<ProcessingResult> {
  const input: JobInput = job.inputJson ? JSON.parse(job.inputJson) : {};
  const { videoId, generationRunId } = input;

  if (!videoId || !generationRunId) {
    throw new Error('Missing videoId or generationRunId in job input');
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Fetching generation run...', 0.0);

  // Fetch Generation Run
  const runRes = await client.models.GenerationRun.get({ id: generationRunId });
  const run = runRes.data;
  if (!run) {
    throw new Error(`Generation run not found: ${generationRunId}`);
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Downloading artifacts...', 0.1);

  // Download artifacts
  const scriptPath = join(workDir, 'script.json');
  const timelinePath = join(workDir, 'timeline.json');
  const audioPath = join(workDir, 'audio.wav');
  const framesDir = join(workDir, 'frames');
  const outputMp4Path = join(workDir, 'output.mp4');

  ensureDir(framesDir);

  // Download script
  if (run.scriptArtifactKey) {
    console.log(`Downloading script from ${run.scriptArtifactKey}...`);
    const { body } = await storage.downloadData({ path: run.scriptArtifactKey }).result;
    const text = await body.text();
    writeFileSync(scriptPath, text);
  } else {
    throw new Error('No script artifact found in generation run');
  }

  // Download timeline (optional)
  if (run.timelineArtifactKey) {
    console.log(`Downloading timeline from ${run.timelineArtifactKey}...`);
    const { body } = await storage.downloadData({ path: run.timelineArtifactKey }).result;
    const text = await body.text();
    writeFileSync(timelinePath, text);
  }

  // Download audio (optional)
  if (run.audioArtifactKey) {
    console.log(`Downloading audio from ${run.audioArtifactKey}...`);
    const { body } = await storage.downloadData({ path: run.audioArtifactKey }).result;
    const blob = await body.blob();
    writeFileSync(audioPath, Buffer.from(await blob.arrayBuffer()));
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Rendering video...', 0.2);

  // Render video
  // Import renderStoryboardVideo dynamically to avoid loading heavy dependencies in tests
  const { renderStoryboardVideo } = await import('../packages/renderer/src/storyboard-render.js');

  console.log('Rendering video with Playwright + ffmpeg...');
  await renderStoryboardVideo({
    script: JSON.parse(readFileSync(scriptPath, 'utf8')),
    timeline: existsSync(timelinePath) ? JSON.parse(readFileSync(timelinePath, 'utf8')) : null,
    audioPath: existsSync(audioPath) ? audioPath : undefined,
    framesDir,
    outputPath: outputMp4Path,
    fps: 30,
    width: 1280,
    height: 720,
    workers: 4, // Parallel frame rendering
  });

  if (!existsSync(outputMp4Path)) {
    throw new Error('Render failed: output MP4 not created');
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Uploading video...', 0.8);

  // Upload MP4
  const runId = `render-${Date.now()}`;
  const keyPrefix = `org/${job.orgId}/videos/${videoId}/renders/${runId}`;
  console.log(`Uploading MP4 to ${keyPrefix}/output.mp4...`);

  const fileContent = readFileSync(outputMp4Path);
  const uploadResult = await storage.uploadData({
    path: `${keyPrefix}/output.mp4`,
    data: fileContent,
    options: { contentType: 'video/mp4' },
  }).result;

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Creating render run...', 0.9);

  // Create RenderRun record
  const { data: renderRun } = await client.models.RenderRun.create({
    orgId: job.orgId,
    videoId,
    generationRunId,
    status: 'succeeded',
    mp4ArtifactKey: uploadResult.path,
    createdAt: new Date().toISOString(),
  });

  // Record usage event
  if (renderRun) {
    try {
      const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
      const durationSec = script.meta?.durationSeconds || 0;
      const fps = script.meta?.fps || 30;
      const totalFrames = Math.ceil(durationSec * fps);

      await client.models.UsageEvent.create({
        orgId: job.orgId,
        videoId,
        runId: renderRun.id,
        provider: 'babulus-renderer',
        unitType: 'frames',
        quantity: totalFrames,
        estimatedCost: totalFrames * 0.001, // $0.001 per frame
        actualCost: totalFrames * 0.001,
      });

      console.log(`Recorded usage: ${totalFrames} frames`);
    } catch (e) {
      console.error('Failed to create render usage event:', e);
    }
  }

  await emitJobEvent(client, job.id, job.orgId, 'status', 'Render complete!', 1.0);

  return {
    success: true,
    artifactKeys: {
      mp4ArtifactKey: uploadResult.path,
    },
  };
}
