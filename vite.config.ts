import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/activate-license' && req.method === 'POST') {
          try {
            // @ts-ignore -- dev server dynamic import
            const { default: handler } = await import('./api/activate-license.js');
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                (req as any).body = JSON.parse(body || '{}');
              } catch {
                (req as any).body = {};
              }
              const mockRes = {
                status(code: number) {
                  res.statusCode = code;
                  return this;
                },
                setHeader(name: string, val: string) {
                  res.setHeader(name, val);
                  return this;
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return this;
                },
              };
              await handler(req, mockRes);
            });
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ valid: false, message: err?.message || 'Server error' }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  test: {
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**'],
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('node_modules/xmlbuilder2') || norm.includes('node_modules/@oozcitak')) {
            return 'vendor-xml';
          }
          if (norm.includes('node_modules/jszip') || norm.includes('node_modules/pako') || norm.includes('node_modules/file-saver') || norm.includes('node_modules/lie') || norm.includes('node_modules/immediate') || norm.includes('node_modules/readable-stream')) {
            return 'vendor-zip';
          }
          if (norm.includes('node_modules/docx')) {
            return 'vendor-docx';
          }
          if (norm.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (norm.includes('node_modules/react') || norm.includes('node_modules/react-dom') || norm.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          if (norm.includes('/src/utils/docx/')) {
            return 'docx-exporters';
          }
          if (norm.includes('/src/utils/asesmen/')) {
            return 'knowledge-asesmen';
          }
          if (norm.includes('/src/utils/rangkuman/')) {
            return 'knowledge-rangkuman';
          }
        },
      },
    },
  },
});
