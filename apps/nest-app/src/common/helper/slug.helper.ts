export class SlugHelper {
  static slugify(value?: string): string {
    const normalized = (value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'store';
  }
}
