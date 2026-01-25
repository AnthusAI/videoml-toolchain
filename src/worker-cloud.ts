import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { signIn } from 'aws-amplify/auth';
import { uploadData, downloadData } from 'aws-amplify/storage';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import * as readline from 'readline';
import { generateComposition } from './generate.js';
import { loadVideoFile } from './dsl/load.js';
import { ensureDir } from './util.js';
import { loadUsageEntries } from './telemetry.js';
// @ts-ignore
import { renderStoryboardVideo } from '../packages/renderer/src/storyboard-render.js';

// Polyfill for WebSocket if needed (Amplify Data uses WS for subscriptions, but we use list/HTTP mostly)
import { WebSocket } from 'ws';
// @ts-ignore
global.WebSocket = WebSocket;

// Load config
const outputs = JSON.parse(readFileSync('amplify_outputs.json', 'utf8'));

Amplify.configure(outputs);

const client = generateClient<any>({
  authMode: 'userPool'
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

// Default DSL if none exists
const DEFAULT_DSL = `
import { composition, scene, voice, audio } from '../../../src/dsl/index.ts';

export default composition('default-video', () => {
  voice({ provider: 'dry-run' });
  
  scene('scene-1', 'Opening', () => {
    voice.cue('Welcome to your new video.');
    voice.cue('This is a generated voiceover.');
  });
});
`;

async function login() {
  try {
    const username = process.env.WORKER_EMAIL;
    const password = process.env.WORKER_PASSWORD;
    
    if (username && password) {
       console.log(`Signing in as ${username}...`);
       const { isSignedIn } = await signIn({ username, password });
       if (isSignedIn) {
         console.log('Successfully signed in.');
         return;
       }
    }

    const email = await question('Email: ');
    const pwd = await question('Password: ');
    const { isSignedIn } = await signIn({ username: email, password: pwd });
     if (isSignedIn) {
       console.log('Successfully signed in.');
     } else {
       console.log('Sign in required confirmation (not supported in this script yet).');
       process.exit(1);
     }

  } catch (error) {
    console.error('Login failed:', error);
    process.exit(1);
  }
}

// Default timeout: 15 minutes
const JOB_TIMEOUT_MS = 15 * 60 * 1000;

async function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    // @ts-ignore
    clearTimeout(timeoutId);
  }
}

async function processRenderJob(job: any) {
  console.log(`Processing render job ${job.id}...`);
  try {
    // 1. Claim job
    const claimRes = await client.models.Job.update({
      id: job.id,
      status: 'claimed',
      claimedByAgentId: 'local-worker-1'
    });
    if (claimRes.errors) throw new Error(claimRes.errors[0].message);

    await withTimeout((async () => {
        // 2. Parse input
        const input = job.inputJson ? JSON.parse(job.inputJson) : {};
        const { videoId, generationRunId } = input;
        if (!videoId || !generationRunId) {
          throw new Error('Missing videoId or generationRunId in job input');
        }

        // 3. Fetch Generation Run
        const runRes = await client.models.GenerationRun.get({ id: generationRunId });
        const run = runRes.data;
        if (!run) throw new Error(`Generation run not found: ${generationRunId}`);

        const workDir = join(process.cwd(), '.babulus', 'worker', job.id);
        ensureDir(workDir);

        // 4. Download artifacts
        const scriptPath = join(workDir, 'script.json');
        const timelinePath = join(workDir, 'timeline.json');
        const audioPath = join(workDir, 'audio.wav');
        const framesDir = join(workDir, 'frames');
        const outputMp4Path = join(workDir, 'output.mp4');

        if (run.scriptArtifactKey) {
            console.log(`Downloading script from ${run.scriptArtifactKey}...`);
            const { body } = await downloadData({ path: run.scriptArtifactKey }).result;
            const text = await body.text();
            writeFileSync(scriptPath, text);
        }
        if (run.timelineArtifactKey) {
            console.log(`Downloading timeline from ${run.timelineArtifactKey}...`);
            const { body } = await downloadData({ path: run.timelineArtifactKey }).result;
            const text = await body.text();
            writeFileSync(timelinePath, text);
        }
        if (run.audioArtifactKey) {
            console.log(`Downloading audio from ${run.audioArtifactKey}...`);
            const { body } = await downloadData({ path: run.audioArtifactKey }).result;
            const blob = await body.blob();
            writeFileSync(audioPath, Buffer.from(await blob.arrayBuffer()));
        }

        // 5. Render
        console.log('Rendering video...');
        await renderStoryboardVideo({
            script: JSON.parse(readFileSync(scriptPath, 'utf8')),
            timeline: existsSync(timelinePath) ? JSON.parse(readFileSync(timelinePath, 'utf8')) : null,
            audioPath: existsSync(audioPath) ? audioPath : undefined,
            framesDir,
            outputPath: outputMp4Path,
            fps: 30,
            width: 1280,
            height: 720,
            workers: 4 // Use 4 workers
        });

        // 6. Upload MP4
        const runId = `render-${Date.now()}`;
        const keyPrefix = `org/${job.orgId}/videos/${videoId}/renders/${runId}`;
        console.log(`Uploading MP4 to ${keyPrefix}/output.mp4...`);
        const fileContent = readFileSync(outputMp4Path);
        const uploadRes = await uploadData({
            path: `${keyPrefix}/output.mp4`,
            data: fileContent,
            options: { contentType: 'video/mp4' }
        }).result;
        
        // 8. Create RenderRun
        const { data: renderRun } = await client.models.RenderRun.create({
            orgId: job.orgId,
            videoId,
            generationRunId,
            status: 'succeeded',
            mp4ArtifactKey: uploadRes.path,
            createdAt: new Date().toISOString()
        });

        // 9. Create Usage Event for Render
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
                    estimatedCost: totalFrames * 0.001, // Example rate: $0.001 per frame
                    actualCost: totalFrames * 0.001
                });
                console.log(`Recorded usage: ${totalFrames} frames`);
            } catch (e) {
                console.error('Failed to create render usage event:', e);
            }
        }
    })(), JOB_TIMEOUT_MS, `Render job timed out after ${JOB_TIMEOUT_MS}ms`);

    // 7. Update Job (Success)
    await client.models.Job.update({
        id: job.id,
        status: 'succeeded'
    });

    console.log(`Render job ${job.id} succeeded.`);

  } catch (error) {
    console.error(`Render job ${job.id} failed:`, error);
    await client.models.Job.update({
      id: job.id,
      status: 'failed'
    });
  }
}

async function processJob(job: any) {
  console.log(`Processing job ${job.id} (${job.kind})...`);
  
  try {
    // 1. Claim job
    const claimRes = await client.models.Job.update({
      id: job.id,
      status: 'claimed',
      claimedByAgentId: 'local-worker-1'
    });
    if (claimRes.errors) throw new Error(claimRes.errors[0].message);
    
    await withTimeout((async () => {
        // 2. Parse input
        const input = job.inputJson ? JSON.parse(job.inputJson) : {};
        const { videoId } = input;
        
        if (!videoId) {
          throw new Error('Missing videoId in job input');
        }
        
        // 3. Fetch video and version
        const videoRes = await client.models.Video.get({ id: videoId });
        const video = videoRes.data;
        if (!video) throw new Error(`Video not found: ${videoId}`);
        
        let sourceText = DEFAULT_DSL;
        let storyboardVersionId = video.activeStoryboardVersionId;
        
        if (storyboardVersionId) {
          const versionRes = await client.models.StoryboardVersion.get({ id: storyboardVersionId });
          if (versionRes.data?.sourceText) {
            sourceText = versionRes.data.sourceText;
          }
        } else {
          console.log('No active storyboard version, using default DSL');
        }
        
        // 4. Write DSL to temp file
        const workDir = join(process.cwd(), '.babulus', 'worker', job.id);
        ensureDir(workDir);
        const dslPath = join(workDir, 'source.babulus.ts');
        writeFileSync(dslPath, sourceText);
        
        // 5. Load and Generate
        console.log('Generating composition...');
        
        // Create a dummy config for generation
        const config = {
          providers: {
            tts: { 'dry-run': {} },
            sfx: { 'dry-run': {} },
            music: { 'dry-run': {} }
          }
        };
        
        const fileSpec = await loadVideoFile(dslPath);
        const composition = fileSpec.compositions[0]; // Take first
        
        const outDir = join(workDir, 'out');
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
          log: (msg) => console.log(`[Gen] ${msg}`)
        });
        
        console.log('Generation complete.');
        
        // 6. Upload Artifacts to S3
        const runId = result.runId || `run-${Date.now()}`;
        const keyPrefix = `org/${job.orgId}/videos/${videoId}/runs/${runId}`;
        
        const uploadArtifact = async (name: string, path: string, contentType: string) => {
            if (!existsSync(path)) return null;
            console.log(`Uploading ${name} to ${keyPrefix}/${name}...`);
            const fileContent = readFileSync(path);
            const result = await uploadData({
                path: `${keyPrefix}/${name}`,
                data: fileContent,
                options: {
                    contentType
                }
            }).result;
            return result.path;
        };

        const scriptKey = await uploadArtifact('script.json', result.script ? join(outDir, 'script.json') : join(outDir, 'script.json'), 'application/json');
        const timelineKey = await uploadArtifact('timeline.json', result.timelinePath, 'application/json');
        const audioKey = result.audioPath ? await uploadArtifact('audio.wav', result.audioPath, 'audio/wav') : null;

        // 8. Create GenerationRun entry
        await client.models.GenerationRun.create({
          orgId: job.orgId,
          videoId: videoId,
          storyboardVersionId: storyboardVersionId || 'default-mock-version',
          status: 'succeeded',
          scriptArtifactKey: scriptKey,
          timelineArtifactKey: timelineKey,
          audioArtifactKey: audioKey,
          createdAt: new Date().toISOString()
        });

        // 9. Upload Usage Events
        const env = process.env.BABULUS_ENV || 'development';
        const usagePath = join(outDir, 'cache', 'env', env, 'usage.jsonl');
        if (existsSync(usagePath)) {
            try {
                const entries = loadUsageEntries(usagePath);
                console.log(`Uploading ${entries.length} usage events...`);
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
    })(), JOB_TIMEOUT_MS, `Generation job timed out after ${JOB_TIMEOUT_MS}ms`);

    // 7. Update Job (Success)
    await client.models.Job.update({
      id: job.id,
      status: 'succeeded'
    });

    console.log(`Job ${job.id} succeeded. Artifacts uploaded.`);
    
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await client.models.Job.update({
      id: job.id,
      status: 'failed'
    });
  }
}

async function run() {
  await login();
  
  console.log('Worker started. Polling for jobs...');
  
  while (true) {
    try {
      const { data: jobs } = await client.models.Job.list({
        filter: {
          status: { eq: 'queued' }
        }
      });
      
      if (jobs && jobs.length > 0) {
        const job = jobs[0]; // Process one at a time
        if (job.kind === 'generate') {
            await processJob(job);
        } else if (job.kind === 'render') {
            await processRenderJob(job);
        } else {
            console.log(`Skipping unsupported job kind: ${job.kind}`);
        }
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
    
    await new Promise(r => setTimeout(r, 5000));
  }
}

run();
