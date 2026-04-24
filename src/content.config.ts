import { glob } from 'astro/loaders'
import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      order: z.number().optional(),
      image: image().optional(),
      tags: z.array(z.string()).optional(),
      authors: z.array(z.string()).optional(),
      draft: z.boolean().optional(),
    }),
})

const authors = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    pronouns: z.string().optional(),
    avatar: z.url().or(z.string().startsWith('/')),
    bio: z.string().optional(),
    mail: z.email().optional(),
    website: z.url().optional(),
    twitter: z.url().optional(),
    github: z.url().optional(),
    linkedin: z.url().optional(),
    discord: z.url().optional(),
  }),
})

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      image: image(),
      link: z.url(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }),
})

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    pageTitle: z.string().optional(),
    eyebrow: z.string().optional(),
    headline: z.string().optional(),
    subtitle: z.string().optional(),
    name: z.string().optional(),
    handle: z.string().optional(),
    profileImage: z.url().or(z.string().startsWith('/')).optional(),
    profileImageAlt: z.string().optional(),
    profileInfoItems: z
      .array(
        z.object({
          icon: z.string(),
          label: z.string(),
          value: z.string(),
          href: z.url().optional(),
        }),
      )
      .optional(),
    githubContributionsTitle: z.string().optional(),
    heroEyebrow: z.string().optional(),
    heroTitle: z.string().optional(),
    heroTitleAccent: z.string().optional(),
    heroSubtitle: z.string().optional(),
    heroImage: z.url().or(z.string().startsWith('/')).optional(),
    heroImageAlt: z.string().optional(),
    heroName: z.string().optional(),
    heroLocation: z.string().optional(),
    featuredSectionTitle: z.string().optional(),
    featuredSelectionMode: z.enum(['latest', 'manual']).optional(),
    featuredContentType: z.enum(['note', 'project']).optional(),
    featuredContentId: z.string().optional(),
  }),
})

export const collections = { notes, authors, projects, pages }
