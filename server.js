import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { writeFile, readFile, unlink, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import ffmpegPath from "ffmpeg-static";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── AWS clients (S3 + Transcribe + Bedrock share the same credentials chain) ─
const AWS_REGION = process.env.AWS_REGION || "eu-central-1";
const s3         = new S3Client({ region: AWS_REGION });
const transcribe = new TranscribeClient({ region: AWS_REGION });
const bedrock    = new BedrockRuntimeClient({ region: AWS_REGION });
const S3_BUCKET  = process.env.S3_BUCKET;

// Bedrock model used for /api/ai/generate (summarize, pitch, etc.)
// If your region requires a cross-region inference profile, set BEDROCK_MODEL_ID
// in .env to something like `eu.anthropic.claude-haiku-4-5-20251001-v1:0`.
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID
  || "anthropic.claude-haiku-4-5-20251001-v1:0";

// ── Azure OpenAI config (server-side — NEVER sent to browser) ───────────────
const AZURE_CONFIG = {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o",
};

// ── Demo credentials (POC only) ────────────────────────────────────────────
const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo.agenticai@corporate.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "AgenticAI@2026";
const MANAGER_EMAIL = process.env.MANAGER_EMAIL || "manager.demo@corporate.com";
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || "Manager@2026";

// ── Helper: call Azure OpenAI ──────────────────────────────────────────────
async function callAzureOpenAI({ messages, maxTokens = 500, temperature = 0.7 }) {
  const url = `${AZURE_CONFIG.endpoint}/openai/deployments/${AZURE_CONFIG.deployment}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_CONFIG.apiKey,
    },
    body: JSON.stringify({
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Azure OpenAI error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ── Helper: call AWS Bedrock (Claude) ──────────────────────────────────────
// Used by /api/ai/generate for summarize, pitch generation, etc.
// Uses the Converse API which is model-agnostic across Bedrock's providers.
async function callBedrock({ systemPrompt, userPrompt, maxTokens = 500, temperature = 0.7 }) {
  const response = await bedrock.send(new ConverseCommand({
    modelId:  BEDROCK_MODEL_ID,
    system:   systemPrompt ? [{ text: systemPrompt }] : undefined,
    messages: [{ role: "user", content: [{ text: userPrompt }] }],
    inferenceConfig: { maxTokens, temperature },
  }));
  const text = response?.output?.message?.content?.[0]?.text || "";
  return text.trim();
}

// ── API Routes ─────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth ───────────────────────────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    return res.json({
      success: true,
      token: "demo-token-poc",
      user: {
        name: "Marcus Schmidt",
        role: "C1 Europe Sales Executive",
        territory: "C1 Europe",
        isManager: false,
      },
    });
  }

  if (email === MANAGER_EMAIL && password === MANAGER_PASSWORD) {
    return res.json({
      success: true,
      token: "manager-token-poc",
      user: {
        name: "Anna Weber",
        role: "Regional Sales Manager",
        territory: "C1 Europe",
        isManager: true,
      },
    });
  }

  return res.status(401).json({
    success: false,
    error: "Invalid Username & Password",
  });
});

// ── AI: Chat (for ChatBot) ─────────────────────────────────────────────────
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, systemContext } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const allMessages = [];
    if (systemContext) {
      allMessages.push({ role: "system", content: systemContext });
    }
    allMessages.push(...messages);

    const reply = await callAzureOpenAI({
      messages: allMessages,
      maxTokens: 500,
      temperature: 0.7,
    });

    res.json({ reply });
  } catch (err) {
    console.error("[/api/ai/chat] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── AI: Generate (pitch, summary, email — general purpose) ────────────────
// Runs on AWS Bedrock (Claude Haiku). /api/ai/chat still uses Azure OpenAI.
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { systemPrompt, userPrompt, maxTokens = 350, temperature = 0.7 } = req.body || {};

    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: "systemPrompt and userPrompt are required" });
    }

    const reply = await callBedrock({ systemPrompt, userPrompt, maxTokens, temperature });
    res.json({ reply });
  } catch (err) {
    console.error("[/api/ai/generate] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: concatenate two audio buffers via ffmpeg ──────────────────────
// Uses filter_complex concat (re-encodes), which handles any input format
// including WebM-with-headers from separate MediaRecorder sessions.
async function concatenateAudio(existingBuffer, newBuffer, ext) {
  const dir = await mkdtemp(path.join(tmpdir(), "audio-concat-"));
  const file1  = path.join(dir, `existing.${ext}`);
  const file2  = path.join(dir, `new.${ext}`);
  const output = path.join(dir, `combined.${ext}`);

  try {
    await writeFile(file1, existingBuffer);
    await writeFile(file2, newBuffer);

    await new Promise((resolve, reject) => {
      const args = [
        "-y",
        "-i", file1,
        "-i", file2,
        "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1[out]",
        "-map", "[out]",
        output,
      ];
      const proc = spawn(ffmpegPath, args);
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
      });
      proc.on("error", reject);
    });

    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Helper: fetch an existing S3 object as a Buffer, or null if missing ───
async function getS3BufferOrNull(key) {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of obj.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

// ── AI: Transcribe audio → text (AWS Transcribe) + store concatenated audio ─
// Flow: upload chunk to temp S3 key → Transcribe just the chunk → if a combined
//       file already exists for this visit, concatenate old + new via ffmpeg and
//       re-upload; otherwise promote chunk to final key. Delete temp chunk.
// Expects JSON body: { audio: "data:<mimeType>;base64,...", mimeType, visitId, folder }
// Returns: { transcript: string, audioKey: string | null }
app.post("/api/ai/transcribe", async (req, res) => {
  let chunkKey = null;
  try {
    const { audio, mimeType = "audio/webm", visitId, folder = "dealer" } = req.body || {};
    if (!audio) return res.status(400).json({ error: "audio is required" });
    if (!S3_BUCKET) return res.status(500).json({ error: "S3_BUCKET is not configured" });

    // Decode base64 data URL → Buffer. MIME types like "audio/webm;codecs=opus"
    // contain semicolons so we locate ";base64," by index, not regex.
    const base64Marker = ";base64,";
    const markerIndex = audio.indexOf(base64Marker);
    if (markerIndex === -1) return res.status(400).json({ error: "Invalid audio data URL" });
    const chunkBuffer = Buffer.from(audio.substring(markerIndex + base64Marker.length), "base64");
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";

    const fileId        = visitId || randomUUID();
    const finalAudioKey = `voice-notes/${folder}/${fileId}.${ext}`;
    chunkKey            = `voice-notes/${folder}/_temp/${fileId}-${Date.now()}.${ext}`;

    // ── Step 1: Upload the new chunk to S3 so AWS Transcribe can read it ────
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET, Key: chunkKey, Body: chunkBuffer, ContentType: mimeType,
    }));

    // ── Step 2: Transcribe just the new chunk ─────────────────────────────
    const jobName     = `visit-${fileId}-${Date.now()}`;
    const mediaFormat = ext === "mp4" ? "mp4" : "webm";

    await transcribe.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: "en-US",            // future: pass from request for multi-language
      MediaFormat:  mediaFormat,
      Media:        { MediaFileUri: `s3://${S3_BUCKET}/${chunkKey}` },
    }));

    let transcript = "";
    const MAX_ATTEMPTS = 60;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const { TranscriptionJob: job } = await transcribe.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
      );
      const status = job?.TranscriptionJobStatus;
      if (status === "COMPLETED") {
        const transcriptUri = job.Transcript?.TranscriptFileUri;
        const transcriptRes = await fetch(transcriptUri);
        const data = await transcriptRes.json();
        transcript = data?.results?.transcripts?.[0]?.transcript || "";
        break;
      }
      if (status === "FAILED") {
        throw new Error(`Transcription job failed: ${job?.FailureReason || "unknown"}`);
      }
    }

    if (!transcript) {
      return res.status(504).json({ error: "Transcription timed out" });
    }

    // ── Step 3: Concatenate with any existing audio for this visit ────────
    const existingBuffer = await getS3BufferOrNull(finalAudioKey);
    const finalBuffer = existingBuffer
      ? await concatenateAudio(existingBuffer, chunkBuffer, ext)
      : chunkBuffer;

    // ── Step 4: Upload combined (or single) audio to the final key ────────
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: finalAudioKey,
      Body: finalBuffer,
      ContentType: mimeType,
      StorageClass: "INTELLIGENT_TIERING",
    }));

    res.json({ transcript, audioKey: finalAudioKey });
  } catch (err) {
    console.error("[/api/ai/transcribe] Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    // Always clean up the temp chunk, success or failure
    if (chunkKey) {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: chunkKey })).catch(() => {});
    }
  }
});

// ── Photo pre-signed URL ───────────────────────────────────────────────────
app.get("/api/photo-url", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "key is required" });
    if (!S3_BUCKET) return res.status(500).json({ error: "S3_BUCKET is not configured" });

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
      { expiresIn: 3600 }
    );
    res.json({ url });
  } catch (err) {
    console.error("[/api/photo-url] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Photo upload → S3 ─────────────────────────────────────────────────────
app.post("/api/upload-photo", async (req, res) => {
  try {
    const { base64, fileName, folder = "misc" } = req.body || {};
    if (!base64 || !fileName) {
      return res.status(400).json({ error: "base64 and fileName are required" });
    }
    if (!S3_BUCKET) {
      return res.status(500).json({ error: "S3_BUCKET is not configured" });
    }

    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: "Invalid base64 data URL" });
    }
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const ext = fileName.split(".").pop() || "jpg";
    const key = `competitor-photos/${folder}/${randomUUID()}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    const region = process.env.AWS_REGION || "eu-central-1";
    const url = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
    res.json({ url, key });
  } catch (err) {
    console.error("[/api/upload-photo] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Serve static files from dist (production) ──────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));

// React Router support — all non-API routes serve index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ── Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`   API:   http://localhost:${PORT}/api`);
});
