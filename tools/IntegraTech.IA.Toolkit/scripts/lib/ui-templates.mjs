import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const templateRoot = fileURLToPath(new URL('../../fabrica/ui/react-vite/', import.meta.url));

/** Fixed, reviewed technical reference. The caller validates selection, name, gates and destination. */
export function reactInterfaceFiles({ name }) {
  const files = new Map();
  function visit(relative = '') {
    for (const entry of readdirSync(path.join(templateRoot, relative), { withFileTypes: true })) {
      const destination = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(destination);
      else if (entry.isFile()) files.set(`frontend/${destination}`, readFileSync(path.join(templateRoot, destination), 'utf8').replaceAll('__PROJECT_NAME__', name));
      else throw new Error(`Unsupported UI template entry: ${destination}`);
    }
  }
  visit();
  return files;
}
