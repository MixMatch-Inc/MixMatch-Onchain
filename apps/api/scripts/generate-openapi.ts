import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { openApiDocument } from '../src/openapi/document';

const outputPath = path.resolve(process.cwd(), '../../docs/openapi/v1.json');

const generate = async () => {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
  process.stdout.write(`Generated ${outputPath}\n`);
};

generate().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
