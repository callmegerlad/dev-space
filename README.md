<div align="center">

# [dev.geraldkjk.com](https://dev.geraldkjk.com)
My personal developer space

</div>

<div align="center">
<a href="#getting-started">Getting Started</a> &nbsp;&bull;&nbsp;
<a href="#adding-content">Adding Content</a>
</div>

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/callmegerlad/dev-space.git
   cd dev-space
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:1234` to get started. The following commands are also available:

   | Command            | Description                                                     |
   | ------------------ | --------------------------------------------------------------- |
   | `npm run start`    | Alias for `npm run dev`                                         |
   | `npm run build`    | Run type checking and build the project                         |
   | `npm run preview`  | Previews the built project                                      |
   | `npm run astro`    | Run Astro CLI commands                                          |
   | `npm run prettier` | Blanket format all files using [Prettier](https://prettier.io/) |

### Site configuration

Edit the `src/consts.ts` file to update your site's metadata, navigation links, and social links:

```ts
export const SITE: Site = {
  title: "Gerald's Dev Space",
  description:
    'My personal development space where I share my projects, notes and learnings.',
  href: 'https://dev.geraldkjk.com',
  author: 'geraldkjk',
  locale: 'en-SG',
  featuredPostCount: 1,
  postsPerPage: 3,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/notes',
    label: 'notes',
  },
  {
    href: '/projects',
    label: 'projects',
  },
  {
    href: '/about',
    label: 'about',
  },
  // ...
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/callmegerlad',
    label: 'GitHub',
  },
  {
    href: 'mailto:geraldkjk@gmail.com',
    label: 'Email',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
  },
  // ...
]
```

### Color palette

Colors are defined in `src/styles/global.css` in [OKLCH format](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch), using the [shadcn/ui](https://ui.shadcn.com/) convention:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

[data-theme='dark'] {
  /* ... */
}
```

## Adding Content

### Notes

Add new notes as Markdown or MDX files in the `src/content/notes/` directory. Nested folders are supported for subnotes. Use the following frontmatter structure:

```yml
---
title: 'Your Post Title'
description: 'A brief description of your post!'
date: 2024-01-01
order: 0
tags: ['tag1', 'tag2']
image: './image.png'
authors: ['author1', 'author2']
draft: false
---
```

The notes schema is defined as follows:

| Field         | Type (Zod)      | Requirements                                                                                                                                                                    | Required |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `title`       | `string`        | n/a                                                                                                                                                                             | Yes      |
| `description` | `string`        | n/a                                                                                                                                                                             | Yes      |
| `date`        | `coerce.date()` | Must be in `YYYY-MM-DD` format.                                                                                                                                                 | Yes      |
| `order`       | `number`        | Sort order for sibling subnotes.                                                                                                                                               | Optional |
| `image`       | `image()`       | Use a local image path relative to the content file (e.g. `./banner.png`).                                                                                                     | Optional |
| `tags`        | `string[]`      | Preferably use consistent casing across tags.                                                                                                                                   | Optional |
| `authors`     | `string[]`      | If the author has a profile, use the id associated with their Markdown file in `src/content/authors/` (e.g. if their file is named `jane-doe.md`, use `jane-doe` in the array). | Optional |
| `draft`       | `boolean`       | Defaults to `false` if not provided.                                                                                                                                            | Optional |

### Authors

Add author information in `src/content/authors/` as Markdown or MDX files. A file named `[author-name].md` can be associated with a note if `"author-name"` (the id) is added to the `authors` field:

```yml
---
name: 'geraldkjk'
pronouns: 'he/him'
avatar: 'https://gravatar.com/avatar/9bfdc4ec972793cf05cb91efce5f4aaaec2a0da1bf4ec34dad0913f1d845faf6.webp?size=256'
bio: 'd(-_-)b'
website: 'https://www.geraldkjk.com'
twitter: 'https://twitter.com/XXX'
github: 'https://github.com/callmegerlad'
mail: 'geraldkjk@gmail.com'
---
```

The author schema is defined as follows:

| Field      | Type (Zod)                                 | Requirements                                                                                                                                                             | Required |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `name`     | `string`                                   | n/a                                                                                                                                                                      | Yes      |
| `pronouns` | `string`                                   | n/a                                                                                                                                                                      | Optional |
| `avatar`   | `string.url()` or `string.startsWith('/')` | Should be either a valid URL or a path starting with `/`. Preferably use [Gravatar](https://en.gravatar.com/site/implement/images/) with the `?size=256` size parameter. | Yes      |
| `bio`      | `string`                                   | n/a                                                                                                                                                                      | Optional |
| `mail`     | `string.email()`                           | Must be a valid email address.                                                                                                                                           | Optional |
| `website`  | `string.url()`                             | Must be a valid URL.                                                                                                                                                     | Optional |
| `twitter`  | `string.url()`                             | Must be a valid URL.                                                                                                                                                     | Optional |
| `github`   | `string.url()`                             | Must be a valid URL.                                                                                                                                                     | Optional |
| `linkedin` | `string.url()`                             | Must be a valid URL.                                                                                                                                                     | Optional |
| `discord`  | `string.url()`                             | Must be a valid URL.                                                                                                                                                     | Optional |

> [!TIP]
> You can add as many social media links as you want, as long as you adjust the schema and support the new field in `src/components/social-icons.astro`.

### Projects

Add projects in `src/content/projects/` as Markdown files:

```yml
---
name: 'Project A'
description: 'This is an example project description! You should replace this with a description of your own project.'
tags: ['Framework A', 'Library B', 'Tool C', 'Resource D']
image: './banner.png'
link: 'https://example.com'
startDate: '2024-01-01'
endDate: '2024-01-01'
---
```

The project schema is defined as follows:

| Field         | Type (Zod)      | Requirements                            | Required |
| ------------- | --------------- | --------------------------------------- | -------- |
| `name`        | `string`        | n/a                                     | Yes      |
| `description` | `string`        | n/a                                     | Yes      |
| `tags`        | `string[]`      | n/a                                     | Yes      |
| `image`       | `image()`       | Use a local image path relative to the content file (e.g. `./banner.png`). | Yes      |
| `link`        | `string.url()`  | Must be a valid URL.                    | Yes      |
| `startDate`   | `coerce.date()` | Must be in `YYYY-MM-DD` format.         | Optional |
| `endDate`     | `coerce.date()` | Must be in `YYYY-MM-DD` format.         | Optional |

### Pages

Add page content in `src/content/pages/` as Markdown or MDX files. These entries power dynamic page sections like the home hero and the about profile.

Common fields include:

| Field                        | Type (Zod)                                 | Required |
| ---------------------------- | ------------------------------------------ | -------- |
| `title`                      | `string`                                   | Optional |
| `description`                | `string`                                   | Optional |
| `pageTitle`                  | `string`                                   | Optional |
| `eyebrow`, `headline`        | `string`                                   | Optional |
| `heroTitle`, `heroSubtitle`  | `string`                                   | Optional |
| `heroImage`                  | `string.url()` or `string.startsWith('/')` | Optional |
| `profileImage`               | `string.url()` or `string.startsWith('/')` | Optional |
| `profileInfoItems`           | `array` of `{ icon, label, value, href? }` | Optional |
| `featuredSelectionMode`      | `'latest' \| 'manual'`                    | Optional |
| `featuredNoteId`             | `string`                                   | Optional |

See `src/content/pages/index.mdx` and `src/content/pages/about.mdx` for concrete examples.

## License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ by [geraldkjk](https://www.geraldkjk.com/)!

[Stargazers]: https://img.shields.io/github/stars/callmegerlad/dev-space?color=fafafa&logo=github&logoColor=fff&style=for-the-badge
[License]: https://img.shields.io/github/license/callmegerlad/dev-space?color=0a0a0a&logo=github&logoColor=fff&style=for-the-badge
