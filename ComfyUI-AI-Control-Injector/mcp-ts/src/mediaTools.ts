import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type MediaResult = {
  ok: boolean;
  action: string;
  summary: string;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  suggested_fix?: string;
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);

export function getComfyOutputDir(): string {
  return process.env.COMFYAI_OUTPUT_DIR
    ?? "/Users/krishna/Desktop/ComfyAI/active/active-comfy/ComfyUI/output";
}

export function listOutputMedia(options: { limit?: number; outputDir?: string } = {}): MediaResult {
  const outputDir = options.outputDir ?? getComfyOutputDir();
  const limit = Math.max(1, Math.min(Number(options.limit ?? 20), 100));

  if (!fs.existsSync(outputDir)) {
    return {
      ok: false,
      action: "media.listOutputMedia",
      summary: "ComfyUI output directory was not found.",
      error: {
        code: "OUTPUT_DIR_NOT_FOUND",
        message: `Output directory does not exist: ${outputDir}`,
        details: { outputDir },
      },
      suggested_fix: "Set COMFYAI_OUTPUT_DIR to the active ComfyUI output folder.",
    };
  }

  const files = walkFiles(outputDir)
    .filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()) || VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .map((filePath) => {
      const stat = fs.statSync(filePath);
      const extension = path.extname(filePath).toLowerCase();
      return {
        path: filePath,
        name: path.basename(filePath),
        kind: VIDEO_EXTENSIONS.has(extension) ? "video" : "image",
        extension,
        size_bytes: stat.size,
        modified_at: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => Date.parse(b.modified_at) - Date.parse(a.modified_at))
    .slice(0, limit);

  return {
    ok: true,
    action: "media.listOutputMedia",
    summary: `Found ${files.length} recent ComfyUI output media file(s).`,
    data: {
      output_dir: outputDir,
      files,
      count: files.length,
    },
  };
}

export function extractVideoFrames(options: { path?: string; count?: number } = {}): { result: MediaResult; framePaths: string[] } {
  const videoPath = options.path;
  const frameCount = Math.max(1, Math.min(Number(options.count ?? 6), 12));

  if (!videoPath) {
    return {
      result: {
        ok: false,
        action: "media.extractVideoFrames",
        summary: "No video path was provided.",
        error: {
          code: "VIDEO_PATH_REQUIRED",
          message: "Pass args: [{ path: '/absolute/path/to/video.mp4', count: 6 }].",
        },
      },
      framePaths: [],
    };
  }

  if (!fs.existsSync(videoPath)) {
    return {
      result: {
        ok: false,
        action: "media.extractVideoFrames",
        summary: "Video file was not found.",
        error: {
          code: "VIDEO_NOT_FOUND",
          message: `Video file does not exist: ${videoPath}`,
          details: { path: videoPath },
        },
      },
      framePaths: [],
    };
  }

  const extension = path.extname(videoPath).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(extension)) {
    return {
      result: {
        ok: false,
        action: "media.extractVideoFrames",
        summary: "The provided file is not a supported video format.",
        error: {
          code: "UNSUPPORTED_VIDEO_TYPE",
          message: `Unsupported video extension: ${extension}`,
          details: { supported: Array.from(VIDEO_EXTENSIONS) },
        },
      },
      framePaths: [],
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "comfyai_video_frames_"));
  const pattern = path.join(tempDir, "frame_%03d.png");

  try {
    const duration = getVideoDurationSeconds(videoPath);
    const fps = duration > 0 ? Math.max(frameCount / duration, 0.1) : 1;
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      videoPath,
      "-vf",
      `fps=${fps},scale='min(1024,iw)':-2`,
      "-frames:v",
      String(frameCount),
      pattern,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      result: {
        ok: false,
        action: "media.extractVideoFrames",
        summary: "ffmpeg could not extract video frames.",
        error: {
          code: "FFMPEG_FRAME_EXTRACTION_FAILED",
          message,
          details: { path: videoPath },
        },
        suggested_fix: "Confirm the video file is readable and ffmpeg can decode it.",
      },
      framePaths: [],
    };
  }

  const framePaths = fs.readdirSync(tempDir)
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((name) => path.join(tempDir, name));

  return {
    result: {
      ok: framePaths.length > 0,
      action: "media.extractVideoFrames",
      summary: `Extracted ${framePaths.length} frame image(s) from the video.`,
      data: {
        video_path: videoPath,
        frame_count: framePaths.length,
        frames: framePaths,
        note: "Use these frames to inspect artifacts, malformations, prompt mismatch, temporal inconsistency, and workflow causes.",
      },
    },
    framePaths,
  };
}

function walkFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

function getVideoDurationSeconds(videoPath: string): number {
  try {
    const output = execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ], { encoding: "utf8" }).trim();
    const duration = Number(output);
    return Number.isFinite(duration) ? duration : 0;
  } catch {
    return 0;
  }
}
