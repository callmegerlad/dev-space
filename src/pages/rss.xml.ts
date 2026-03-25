import { SITE } from '@/consts'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getAllTaggedContent } from '@/lib/data-utils'

export async function GET(context: APIContext) {
  try {
    const items = await getAllTaggedContent()

    return rss({
      title: SITE.title,
      description: SITE.description,
      site: context.site ?? SITE.href,
      items: items.map((item) => ({
        title:
          item.type === 'blog'
            ? item.entry.data.title
            : item.entry.data.name,
        description: item.entry.data.description,
        pubDate: item.date,
        link:
          item.type === 'blog'
            ? `/notes/${item.entry.id}/`
            : `/projects/${item.entry.id}/`,
      })),
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return new Response('Error generating RSS feed', { status: 500 })
  }
}
