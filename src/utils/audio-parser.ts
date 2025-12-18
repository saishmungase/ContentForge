import Groq from "groq-sdk";
import fs from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import 'dotenv/config';
import { Logger } from "motia";

if (!process.env.GROQ_API_KEY) {
  throw new Error('Missing GROQ_API_KEY environment variable');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface TranscriptOptions {
  audioFilePath?: string; 
}

async function downloadTempFile(url: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileName = `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
  const filePath = path.join(tempDir, fileName);

  console.log(`⬇️ Downloading audio via yt-dlp: ${url}`);

  try {
    await youtubedl(url, {
      format: 'bestaudio[ext=webm]/bestaudio',
      output: filePath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    if (!fs.existsSync(filePath)) {
        throw new Error('File downloaded but not found at expected path.');
    }

    console.log(`✅ File saved locally: ${filePath}`);
    return filePath;

  } catch (err) {
    throw new Error(`YouTube Download Failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export const get_transcript = async (
  url: string, 
  purpose: string,
  logger : Logger,
  options: TranscriptOptions = {}
): Promise<string> => {
  
  let currentFilePath: string | null = null;
  let isTempFile = false;

  try {
    if (!url || typeof url !== 'string') throw new Error('Valid URL is required');
    if (!purpose || typeof purpose !== 'string') throw new Error('Valid purpose is required');

    logger.info(`⬇️ Downloading audio via yt-dlp...`, { url });
    if (options.audioFilePath) {
      currentFilePath = options.audioFilePath;
      if (!fs.existsSync(currentFilePath)) {
        throw new Error(`Local audio file not found at: ${currentFilePath}`);
      }
    } else {
      currentFilePath = await downloadTempFile(url);
      isTempFile = true; 
    }

    console.log(`📝 Transcribing audio...`);
    const stream = fs.createReadStream(currentFilePath);

    logger.info(`📝 Transcribing audio with Whisper...`);
    const completion = await groq.audio.transcriptions.create({
      file: stream,
      model: "whisper-large-v3",
      response_format: "json",
      language: "en",
    });

    const transcript = completion.text;

    if (!transcript) throw new Error('Failed to generate transcript');
    console.log(`✅ Transcription complete (${transcript.length} chars)`); 

    logger.info(`🧠 Generating ${purpose} with Llama 3.3...`);
    console.log(`🧠 Generating ${purpose}...`);

    const response = await groq.chat.completions.create({
      messages: [
        { 
          role: "user", 
          content: `You are an expert technical writer. Turn this transcript into a ${purpose}. 
          keep in mind no header like here is you content or not footer just main content and body.
          Transcript:
          ${transcript}` 
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedContent = response.choices[0]?.message?.content;
    
    if (!generatedContent) throw new Error('Failed to generate content');

    console.log(`✅ Content generated successfully`);
    return generatedContent;

  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw error;
  } finally {
    if (isTempFile && currentFilePath && fs.existsSync(currentFilePath)) {
      try {
        fs.unlinkSync(currentFilePath);
        console.log(`🧹 Deleted temp file: ${path.basename(currentFilePath)}`);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to delete temp file:', cleanupError);
      }
    }
  }
};