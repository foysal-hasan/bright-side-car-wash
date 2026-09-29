import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ejs = require('ejs');

@Injectable()
export class TemplateRendererService {
  async render(templateName: string, context: Record<string, unknown> = {}): Promise<string> {
    const normalizedName = templateName.replace(/^\.?\//, '');
    const filename = normalizedName.endsWith('.ejs') ? normalizedName : `${normalizedName}.ejs`;

    const candidatePaths = [
      join(process.cwd(), 'dist', 'mail', 'templates', filename),
      join(process.cwd(), 'src', 'mail', 'templates', filename),
    ];

    const templatePath = candidatePaths.find((path) => existsSync(path));
    if (!templatePath) {
      throw new Error(`Mail template not found: ${filename}`);
    }

    const templateContent = await readFile(templatePath, 'utf8');
    return ejs.render(templateContent, context);
  }
}
