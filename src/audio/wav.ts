import { readFileSync, writeFileSync } from "fs";
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

type WavInfo = {
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  data: Buffer;
};

function parseWav(buffer: Buffer, path: string): WavInfo {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`Invalid WAV header: ${path}`);
  }
  let fmt: { audioFormat: number; numChannels: number; sampleRate: number; bitsPerSample: number } | null = null;
  let data: Buffer | null = null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === "fmt ") {
      fmt = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        numChannels: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14),
      };
    } else if (chunkId === "data") {
      data = buffer.subarray(chunkStart, chunkStart + chunkSize);
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }
  if (!fmt || !data) {
    throw new Error(`Missing WAV chunks: ${path}`);
  }
  return { ...fmt, data };
}

export function concatWavFiles(outPath: string, segmentPaths: string[]): void {
  const infos = segmentPaths.map((p) => parseWav(readFileSync(p), p));
  const [first] = infos;
  for (const info of infos) {
    if (
      info.audioFormat !== first.audioFormat ||
      info.numChannels !== first.numChannels ||
      info.sampleRate !== first.sampleRate ||
      info.bitsPerSample !== first.bitsPerSample
    ) {
      throw new Error("WAV format mismatch");
    }
  }
  const dataSize = infos.reduce((sum, info) => sum + info.data.length, 0);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(first.audioFormat, 20);
  header.writeUInt16LE(first.numChannels, 22);
  header.writeUInt32LE(first.sampleRate, 24);
  const byteRate = first.sampleRate * first.numChannels * (first.bitsPerSample / 8);
  header.writeUInt32LE(byteRate, 28);
  const blockAlign = first.numChannels * (first.bitsPerSample / 8);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(first.bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  const payload = Buffer.concat(infos.map((i) => i.data));
  ensureDir(dirname(outPath));
  writeFileSync(outPath, Buffer.concat([header, payload]));
}
