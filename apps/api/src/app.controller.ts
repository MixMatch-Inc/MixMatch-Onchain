import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('openapi.json')
  openApi() {
    return {
      openapi: '3.0.3',
      info: {
        title: 'MixMatch API',
        version: '0.0.1',
      },
      paths: {
        '/': {
          get: {
            summary: 'Health check root',
            responses: { 200: { description: 'OK' } },
          },
        },
        '/health': {
          get: {
            summary: 'Health check',
            responses: { 200: { description: 'OK' } },
          },
        },
      },
    };
  }

  @Get('docs')
  @Header('Content-Type', 'text/html; charset=utf-8')
  docs() {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MixMatch API Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/openapi.json',
          dom_id: '#swagger-ui',
        });
      };
    </script>
  </body>
</html>`;
  }
}
