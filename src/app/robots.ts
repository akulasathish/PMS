import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Bytespider',
          'CCBot',
          'cohere-ai'
        ],
        allow: '/',
      },
    ],
    sitemap: 'https://pg.staysync.online/sitemap.xml',
    host: 'https://pg.staysync.online',
  };
}
