import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function send(options = {}) {
  const title = options.title || 'Claude Monitor';
  const message = options.message || '';
  const sound = options.sound ?? true;

  try {
    switch (process.platform) {
      case 'darwin':
        await execAsync(
          `osascript -e 'display notification "${message.replace(/'/g, "'\\''")}" with title "${title.replace(/'/g, "'\\''")}"'`
        );
        break;
      case 'linux':
        try {
          await execAsync(`notify-send "${title}" "${message}"`);
        } catch {
          console.log('[notifier] notify-send not available');
        }
        break;
      case 'win32':
        const { execSync } = await import('child_process');
        try {
          execSync(
            `powershell -Command "New-BurntToastNotification -Text '${title}', '${message}'"`
          );
        } catch {
          console.log('[notifier] BurntToast module not available');
        }
        break;
      default:
        console.log(`[notifier] Unsupported platform: ${process.platform}`);
    }
  } catch (err) {
    console.warn('[notifier] Failed to send notification:', err.message);
  }
}

export function alert(label, question) {
  const short = question.length > 80 ? question.slice(0, 77) + '...' : question;
  send({ title: 'Claude Monitor', message: `${label}: ${short}` });
}