import { Store } from "./Store";
import type { MediaProbe } from "../../shared/types";

export interface ClipEntry {
  path: string;
  fileName: string;
  probe: MediaProbe | null;
  probing: boolean;
}

interface ClipLibraryState {
  clips: ClipEntry[];
  selected: Set<string>;
}

/**
 * Single owner of "what videos has the user imported and which are
 * selected right now." Every component (bin list, operation panel, export
 * summary) reads from this instead of each keeping its own copy — so
 * selecting a clip in the bin is guaranteed to be reflected everywhere
 * at once.
 */
class ClipLibraryStore extends Store<ClipLibraryState> {
  constructor() {
    super({ clips: [], selected: new Set() });
  }

  async addFiles(paths: string[]): Promise<void> {
    const existing = new Set(this.state.clips.map((c) => c.path));
    const fresh = paths.filter((p) => !existing.has(p));
    if (fresh.length === 0) return;

    const newEntries: ClipEntry[] = fresh.map((p) => ({
      path: p,
      fileName: p.split(/[\\/]/).pop() ?? p,
      probe: null,
      probing: true,
    }));

    this.setState((s) => ({
      ...s,
      clips: [...s.clips, ...newEntries],
      selected: new Set([...s.selected, ...fresh]),
    }));

    for (const entry of newEntries) {
      if (!window.api) return;
      const probe = await window.api.probe(entry.path);
      this.setState((s) => ({
        ...s,
        clips: s.clips.map((c) => (c.path === entry.path ? { ...c, probe, probing: false } : c)),
      }));
    }
  }

  remove(clipPath: string): void {
    this.setState((s) => {
      const selected = new Set(s.selected);
      selected.delete(clipPath);
      return { clips: s.clips.filter((c) => c.path !== clipPath), selected };
    });
  }

  toggleSelected(clipPath: string): void {
    this.setState((s) => {
      const selected = new Set(s.selected);
      if (selected.has(clipPath)) selected.delete(clipPath);
      else selected.add(clipPath);
      return { ...s, selected };
    });
  }

  selectOnly(clipPath: string): void {
    this.setState((s) => ({ ...s, selected: new Set([clipPath]) }));
  }

  get selectedClips(): ClipEntry[] {
    return this.state.clips.filter((c) => this.state.selected.has(c.path));
  }
}

export const clipLibrary = new ClipLibraryStore();
