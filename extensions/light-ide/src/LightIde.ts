import { exec } from "child_process";
import type { ContinueRcJson, FileStatsMap, FileType, IDE, IdeInfo, IdeSettings, IndexTag, Location, Problem, Range, RangeInFile, Thread } from "core";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export class LightIde implements IDE {
  private webviewProtocolPromise: Promise<any>;

  constructor(webviewProtocolPromise: Promise<any>) {
    this.webviewProtocolPromise = webviewProtocolPromise;
  }

  private resolveProjectPath(filePath: string): string {
    if (filePath.startsWith("file://")) {
      try {
        const url = new URL(filePath);
        // On Windows, url.pathname may start with a slash, e.g. /C:/...
        // On Unix, it's just the absolute path.
        let absPath = url.pathname;
        // Remove leading slash on Windows
        if (process.platform === "win32" && absPath.startsWith("/")) {
          absPath = absPath.slice(1);
        }
        return absPath;
      } catch {
        // fallback: strip file://
        filePath = filePath.replace(/^file:\/\//, '');
      }
    }
    // If already absolute, return as is
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    // Otherwise, resolve relative to projects
    return path.join(process.cwd(), "projects", filePath);
  }

  async getIdeInfo(): Promise<IdeInfo> {
    return {
      ideType: "vscode",
      name: "LightIde",
      version: "1.0.0",
      remoteName: "local",
      extensionVersion: "1.0.0",
    };
  }

  async getIdeSettings(): Promise<IdeSettings> {
    return {
      remoteConfigServerUrl: undefined,
      remoteConfigSyncPeriod: 60,
      userToken: "anonymous",
      continueTestEnvironment: "production",
      pauseCodebaseIndexOnStart: false,
    };
  }

  async getDiff(includeUnstaged: boolean): Promise<string[]> {
    try {
      const cwd = path.join(process.cwd(), "projects");
      const { stdout } = await execAsync(`git diff ${includeUnstaged ? "" : "--cached"} --name-only`, { cwd });
      return stdout.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }

  async getClipboardContent(): Promise<{ text: string; copiedAt: string }> {
    return {
      text: "",
      copiedAt: new Date().toISOString(),
    };
  }

  async isTelemetryEnabled(): Promise<boolean> {
    return true;
  }

  async getUniqueId(): Promise<string> {
    return crypto.createHash("sha256").update(os.hostname()).digest("hex");
  }

  async getTerminalContents(): Promise<string> {
    return "";
  }

  async getDebugLocals(): Promise<string> {
    return "";
  }

  async getTopLevelCallStackSources(): Promise<string[]> {
    return [];
  }

  async getAvailableThreads(): Promise<Thread[]> {
    return [];
  }

  async getWorkspaceDirs(): Promise<string[]> {
    const projectsPath = path.join(os.homedir(), "projects");
    // Create a proper file URL that works cross-platform
    const fileUrl = new URL(projectsPath, "file://");
    return [fileUrl.toString()];
  }

  async getWorkspaceConfigs(): Promise<ContinueRcJson[]> {
    try {
      const configPath = path.join(process.cwd(), "projects", ".continuerc.json");
      const content = await fs.readFile(configPath, "utf-8");
      return [JSON.parse(content)];
    } catch {
      return [];
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolveProjectPath(filePath);
      await fs.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }

  async writeFile(filePath: string, contents: string): Promise<void> {
    const resolvedPath = this.resolveProjectPath(filePath);
    await fs.writeFile(resolvedPath, contents, "utf-8");
  }

  async showVirtualFile(title: string, contents: string): Promise<void> {
    console.log(`--- ${title} ---\n${contents}`);
  }

  async openFile(filePath: string): Promise<void> {
    const resolvedPath = this.resolveProjectPath(filePath);
    console.log(`Open file: ${resolvedPath}`);
  }

  async openUrl(url: string): Promise<void> {
    const cmd = process.platform === "win32" ? `start "" "${url}"` :
      process.platform === "darwin" ? `open "${url}"` :
        `xdg-open "${url}"`;
    await execAsync(cmd);
  }

  async runCommand(command: string): Promise<void> {
    try {
      const cwd = path.join(process.cwd(), "projects");
      await execAsync(command, { cwd });
    } catch (error: any) {
      console.error(`Error running command "${command}":`, error?.stderr || error);
    }
  }

  async saveFile(fileUri: string): Promise<void> {
    try {
      const resolvedPath = this.resolveProjectPath(fileUri);
      await this.writeFile(resolvedPath, '');
      return;
    } catch (error) {
      console.error(`Error saving file ${fileUri}:`, error);
      throw error;
    }
  }

  async readFile(fileUri: string): Promise<string> {
    const resolvedPath = this.resolveProjectPath(fileUri);
    return await fs.readFile(resolvedPath, "utf-8");
  }

  async readRangeInFile(fileUri: string, range: Range): Promise<string> {
    const content = await this.readFile(fileUri);
    const lines = content.split("\n").slice(range.start.line, range.end.line + 1);
    return lines.join("\n");
  }

  async showLines(fileUri: string, startLine: number, endLine: number): Promise<void> {
    const content = await this.readFile(fileUri);
    const lines = content.split("\n").slice(startLine, endLine + 1);
    console.log(lines.join("\n"));
  }

  async getOpenFiles(): Promise<string[]> {
    return [];
  }

  async getCurrentFile(): Promise<undefined | { isUntitled: boolean; path: string; contents: string }> {
    return undefined;
  }

  async getPinnedFiles(): Promise<string[]> {
    return [];
  }

  async getSearchResults(query: string): Promise<string> {
    return "";
  }

  async getFileResults(pattern: string): Promise<string[]> {
    return [];
  }

  async subprocess(command: string, cwd?: string): Promise<[string, string]> {
    const resolvedCwd = cwd ? this.resolveProjectPath(cwd) : path.join(process.cwd(), "projects");
    const { stdout, stderr } = await execAsync(command, { cwd: resolvedCwd });
    return [stdout, stderr];
  }

  async getProblems(fileUri?: string | undefined): Promise<Problem[]> {
    return [];
  }

  async getBranch(dir: string): Promise<string> {
    try {
      const resolvedDir = this.resolveProjectPath(dir);
      const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", { cwd: resolvedDir });
      return stdout.trim();
    } catch {
      return "main";
    }
  }

  async getTags(artifactId: string): Promise<IndexTag[]> {
    return [];
  }

  async getRepoName(dir: string): Promise<string | undefined> {
    const resolvedDir = this.resolveProjectPath(dir);
    return path.basename(path.resolve(resolvedDir));
  }

  async showToast(
    ...params: any[]
  ): Promise<void> {
    const [type, message, ...otherParams] = params;
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  async getGitRootPath(dir: string): Promise<string | undefined> {
    try {
      const resolvedDir = this.resolveProjectPath(dir);
      const { stdout } = await execAsync("git rev-parse --show-toplevel", { cwd: resolvedDir });
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  async listDir(dir: string): Promise<[string, FileType][]> {
    const resolvedDir = this.resolveProjectPath(dir);
    const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
    return entries.map((entry) => [
      entry.name,
      entry.isDirectory() ? 2 : 1,
    ]);
  }

  async getFileStats(files: string[]): Promise<FileStatsMap> {
    const stats: FileStatsMap = {};
    for (const file of files) {
      try {
        const resolvedFile = this.resolveProjectPath(file);
        const stat = await fs.stat(resolvedFile);
        stats[file] = {
          size: stat.size,
          lastModified: stat.mtimeMs,
        };
      } catch { }
    }
    return stats;
  }

  async readSecrets(): Promise<Record<string, string>> {
    return {};
  }

  async writeSecrets(): Promise<void> {
    return;
  }

  async gotoDefinition(location: Location): Promise<RangeInFile[]> {
    return [];
  }

  onDidChangeActiveTextEditor(_callback: (fileUri: string) => void): void {
    // Not supported in CLI
  }
}
