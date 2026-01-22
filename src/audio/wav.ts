import { writeFileSync } from "fs";
import { ensureDir } from "../util.js";
import { dirname } from "path";

export function writeSilenceWav(path: string, durationSec: number, sampleRateHz = 44100): void {
  const frames = Math.ceil(durationSec * sampleRateHz);
  const numSamples = frames;
  const dataSize = numSamples * 2; // 16-bit mono

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRateHz, 24);
  header.writeUInt32LE(sampleRateHz * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  const silence = Buffer.alloc(dataSize);
  ensureDir(dirname(path));
  writeFileSync(path, Buffer.concat([header, silence]));
}
