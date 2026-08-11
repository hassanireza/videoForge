import path from "path";
import { existsSync } from "fs";
import type { OperationKind } from "../../shared/types";
import { operationMeta } from "../../shared/operationCatalog";

/**
 * Every operation used to decide its own output filename/extension in an
 * ad-hoc way (see the original scripts: `.with_suffix(".mp3")`,
 * `_no_audio.mp4`, `_panned.mp4`, etc). That's fine for a CLI tool run once,
 * but it doesn't scale to a UI that must (a) preview the destination before
 * running, (b) support batch export across many clips into one folder
 * without collisions, and (c) let the user override the extension per
 * operation (e.g. convert -> gif vs mp4).
 *
 * OutputResolver is the single place that owns this decision. Every caller
 * (single-file "Save As" flow and multi-file "export to folder" flow) goes
 * through it, so there is exactly one naming/collision policy in the app.
 */
export class OutputResolver {
  /** Suggested filename (no directory) for a single clip + operation. */
  static suggestedFileName(inputPath: string, kind: OperationKind, overrideExt?: string): string {
    const meta = operationMeta(kind);
    const base = path.basename(inputPath, path.extname(inputPath));
    const ext = overrideExt ?? meta.defaultExt ?? path.extname(inputPath) ?? ".mp4";
    return `${base}${meta.suffix}${ext}`;
  }

  /**
   * Resolve output paths for a batch of inputs into a single destination
   * folder, guaranteeing no two outputs collide with each other or with a
   * pre-existing file (appends " (2)", " (3)", ... deterministically).
   */
  static resolveBatch(
    inputPaths: string[],
    destFolder: string,
    kind: OperationKind,
    overrideExt?: string
  ): string[] {
    const used = new Set<string>();
    return inputPaths.map((input) => {
      const fileName = this.suggestedFileName(input, kind, overrideExt);
      let candidate = path.join(destFolder, fileName);
      let n = 2;
      const ext = path.extname(candidate);
      const stem = candidate.slice(0, candidate.length - ext.length);
      while (used.has(candidate) || existsSync(candidate)) {
        candidate = `${stem} (${n})${ext}`;
        n++;
      }
      used.add(candidate);
      return candidate;
    });
  }

  /** Validate that an input/output pair is sane before a job is queued. */
  static validate(inputPath: string, outputPath: string): string | null {
    if (!existsSync(inputPath)) return `Input file not found: ${inputPath}`;
    if (path.resolve(inputPath) === path.resolve(outputPath)) {
      return "Output path must differ from the input path.";
    }
    const destDir = path.dirname(outputPath);
    if (!existsSync(destDir)) return `Destination folder does not exist: ${destDir}`;
    return null;
  }
}
