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
      url: 'https://pg.staysync.online/#rooms',
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://pg.staysync.online/#food',
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://pg.staysync.online/#amenities',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://pg.staysync.online/#contact',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
