import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: 'https://pg.staysync.online',
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://staysync.online',
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://staysync.online/product/front-office',
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://staysync.online/product/housekeeping',
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://staysync.online/product/folio',
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://staysync.online/legal',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
