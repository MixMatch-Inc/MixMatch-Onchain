import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openApiDocument } from '../src/openapi/document';

const outputPath = path.resolve(process.cwd(), '../../docs/openapi/v1.json');

const check = async () => {
  const actual = await readFile(outputPath, 'utf8').catch(() => '');
  const expected = `${JSON.stringify(openApiDocument, null, 2)}\n`;

  if (actual !== expected) {
    process.stderr.write(
      'OpenAPI document is out of date. Run `pnpm --filter api openapi:generate`.\n',
    );
    process.exit(1);
  }

  process.stdout.write('OpenAPI document is up to date.\n');
};

check().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
