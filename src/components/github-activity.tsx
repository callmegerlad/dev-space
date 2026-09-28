// Adapted from rareui's GitHubActivity (https://rareui.com/components/githubactivity)
import { cn } from '@/lib/utils'
import { CircleChevronDown, ExternalLink } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from 'motion/react'
import * as React from 'react'
import { createPortal } from 'react-dom'

type Level = 0 | 1 | 2 | 3 | 4
type Day = { date: string; count: number; level: Level }
type Repo = { fullName: string; owner: string; name: string; pushes: number }
type Activity = { total: number; days: Day[]; repos: Repo[] }
type ActivityState =
  | { status: 'loading' | 'error' }
  | ({ status: 'ready' } & Activity)
type HoveredDay = { date: string; count: number; x: number; y: number }

const CALENDAR_API = 'https://github-contributions-api.jogruber.de/v4'
const GITHUB_API = 'https://api.github.com'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
// owner/repo in GitHub's charset; anything else never reaches a URL
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/

const REPO_LIMIT = 3
const PLACEHOLDER_WEEKS = 53
const MIN_CELL = 7
const MAX_CELL = 14
const MIN_LABEL_WEEKS = 3
const LEVEL_OPACITY = [0, 0.3, 0.52, 0.76, 1] as const

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const SPRING = { type: 'spring', bounce: 0.2, duration: 0.62 } as const
const HEADER_SPRING = { ...SPRING, bounce: 0.45 } as const
const ROW_SPRING = { ...SPRING, bounce: 0.26, delay: 0.08 } as const
const ROW_OFFSET = 16
const CELL_FADE = { duration: 0.2, ease: EASE_OUT } as const
const COLUMN_STAGGER = 0.012
const LABEL_REVEAL = { duration: 0.45, ease: EASE_OUT } as const
const TOOLTIP_FADE = { duration: 0.14, ease: EASE_OUT } as const
const TOOLTIP_EDGE = 8
const INSTANT = { duration: 0 } as const

// Dates are calendar days, so pin parsing and formatting to UTC to stop TZ drift
const toUtc = (date: string) => new Date(`${date}T00:00:00Z`)
const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const plural = (count: number, noun: string) =>
  `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : 's'}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function parseCalendar(json: unknown): Pick<Activity, 'total' | 'days'> {
  if (!isRecord(json) || !Array.isArray(json.contributions)) {
    throw new Error('Malformed contributions response')
  }

  const days = json.contributions.flatMap((day): Day[] =>
    isRecord(day) &&
    typeof day.date === 'string' &&
    DATE_PATTERN.test(day.date) &&
    Number.isSafeInteger(day.count) &&
    (day.count as number) >= 0 &&
    typeof day.level === 'number'
      ? [
          {
            date: day.date,
            count: day.count as number,
            level: Math.min(4, Math.max(0, Math.round(day.level))) as Level,
          },
        ]
      : [],
  )
  if (!days.length) throw new Error('Empty contributions response')

  // Columns are Sun–Sat weeks; starting mid-week would shear every column
  const sunday = days.findIndex((day) => toUtc(day.date).getUTCDay() === 0)
  return {
    total: days.reduce((sum, day) => sum + day.count, 0),
    days: days.slice(Math.max(0, sunday)),
  }
}

// The public events API (last 90 days) no longer ships commit lists, so rank by pushes
function parseTopRepos(json: unknown): Repo[] {
  if (!Array.isArray(json)) return []

  const pushes = new Map<string, number>()
  for (const event of json) {
    if (!isRecord(event) || event.type !== 'PushEvent') continue
    const fullName = isRecord(event.repo) ? event.repo.name : undefined
    if (typeof fullName !== 'string' || !REPO_PATTERN.test(fullName)) continue
    pushes.set(fullName, (pushes.get(fullName) ?? 0) + 1)
  }

  return [...pushes]
    .sort(([, a], [, b]) => b - a)
    .slice(0, REPO_LIMIT)
    .map(([fullName, count]) => {
      const [owner = '', name = ''] = fullName.split('/')
      return { fullName, owner, name, pushes: count }
    })
}

function useGitHubActivity(username: string): ActivityState {
  const [state, setState] = React.useState<ActivityState>({
    status: 'loading',
  })

  React.useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const login = encodeURIComponent(username)

    Promise.allSettled([
      getJson(`${CALENDAR_API}/${login}?y=last`, signal).then(parseCalendar),
      getJson(
        `${GITHUB_API}/users/${login}/events/public?per_page=100`,
        signal,
      ).then(parseTopRepos),
    ]).then(([calendar, repos]) => {
      if (signal.aborted) return
      // Repos are secondary: a rate-limited events API only hides the panel
      setState(
        calendar.status === 'fulfilled'
          ? {
              status: 'ready',
              ...calendar.value,
              repos: repos.status === 'fulfilled' ? repos.value : [],
            }
          : { status: 'error' },
      )
    })

    return () => controller.abort()
  }, [username])

  return state
}

const gapFor = (cell: number) => Math.max(2, Math.round(cell / 4))

// Largest cell that fits every week; below MIN_CELL, drop the oldest weeks instead
function fitGrid(width: number, weeks: number) {
  for (let cell = MAX_CELL; cell > MIN_CELL; cell--) {
    const gap = gapFor(cell)
    if (weeks * (cell + gap) - gap <= width)
      return { cell, gap, columns: weeks }
  }
  const gap = gapFor(MIN_CELL)
  const columns = Math.floor((width + gap) / (MIN_CELL + gap))
  return { cell: MIN_CELL, gap, columns: Math.max(1, Math.min(weeks, columns)) }
}

function useElementWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [width, setWidth] = React.useState<number>()

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

function toWeeks(days: Day[]) {
  const weeks: Day[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

function monthLabels(weeks: Day[][]) {
  const labels: (string | null)[] = weeks.map(() => null)
  const monthOf = (index: number) => weeks[index]?.[0]?.date.slice(0, 7)

  let start = 0
  for (let i = 1; i <= weeks.length; i++) {
    if (i < weeks.length && monthOf(i) === monthOf(start)) continue
    // A run narrower than its label would collide with the next month's
    const first = weeks[start]?.[0]
    if (first && i - start >= MIN_LABEL_WEEKS) {
      labels[start] = MONTH_FORMAT.format(toUtc(first.date))
    }
    start = i
  }

  return labels
}

const Tooltip = ({
  hovered,
  animate,
}: {
  hovered: HoveredDay
  animate: boolean
}) => {
  const ref = React.useRef<HTMLDivElement>(null)
  const [left, setLeft] = React.useState(hovered.x)

  // Clamp to the viewport so edge cells don't push the tooltip off-screen
  React.useLayoutEffect(() => {
    const edge = TOOLTIP_EDGE + (ref.current?.offsetWidth ?? 0) / 2
    setLeft(Math.min(Math.max(hovered.x, edge), window.innerWidth - edge))
  }, [hovered])

  return createPortal(
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left,
        top: hovered.y,
        transform: 'translate(-50%, calc(-100% - 8px))',
      }}
    >
      <motion.div
        ref={ref}
        className="bg-foreground text-background rounded-lg px-2 py-1 text-[11px] font-medium whitespace-nowrap shadow-md"
        initial={animate ? { opacity: 0, scale: 0.94 } : false}
        animate={{ opacity: 1, scale: 1 }}
        exit={animate ? { opacity: 0, scale: 0.94 } : { opacity: 0 }}
        transition={animate ? TOOLTIP_FADE : INSTANT}
      >
        {plural(hovered.count, 'contribution')} on{' '}
        {DAY_FORMAT.format(toUtc(hovered.date))}
      </motion.div>
    </div>,
    document.body,
  )
}

// Memoised so tooltip state changes don't re-render hundreds of motion cells
const Cells = React.memo(function Cells({
  weeks,
  placeholderWeeks,
  cell,
  gap,
  accent,
  animate,
}: {
  weeks: Day[][] | null
  placeholderWeeks: number
  cell: number
  gap: number
  accent: string
  animate: boolean
}) {
  const size = { width: cell, height: cell }
  const base = 'bg-foreground/8 shrink-0 rounded-[3px]'

  if (!weeks) {
    return Array.from({ length: placeholderWeeks }, (_, week) => (
      <div key={week} className="flex flex-col" style={{ gap }}>
        {Array.from({ length: 7 }, (_, day) => (
          <div key={day} className={base} style={size} />
        ))}
      </div>
    ))
  }

  return weeks.map((week, weekIndex) => (
    <div key={week[0]?.date} className="flex flex-col" style={{ gap }}>
      {week.map((day) => (
        <motion.div
          key={day.date}
          data-date={day.date}
          data-count={day.count}
          className={base}
          style={size}
          initial={animate ? { opacity: 0, scale: 0.4 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            animate
              ? { ...CELL_FADE, delay: weekIndex * COLUMN_STAGGER }
              : INSTANT
          }
        >
          {day.level > 0 && (
            <div
              className="size-full rounded-[3px]"
              style={{
                backgroundColor: accent,
                opacity: LEVEL_OPACITY[day.level],
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  ))
})

const ContributionGrid = ({
  days,
  accent,
  label,
  showMonths,
  animate,
}: {
  days: Day[] | null
  accent: string
  label: string
  showMonths: boolean
  animate: boolean
}) => {
  const allWeeks = React.useMemo(() => (days ? toWeeks(days) : null), [days])
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hovered, setHovered] = React.useState<HoveredDay>()

  // Unmeasured (SSR, first paint) renders at max size; the overflow is clipped
  const { cell, gap, columns } = fitGrid(
    width ?? Infinity,
    allWeeks?.length ?? PLACEHOLDER_WEEKS,
  )
  const weeks = React.useMemo(
    () => allWeeks?.slice(-columns) ?? null,
    [allWeeks, columns],
  )
  const labels = React.useMemo(
    () => (showMonths && weeks ? monthLabels(weeks) : null),
    [showMonths, weeks],
  )
  const sweepEnd = (columns - 1) * COLUMN_STAGGER + CELL_FADE.duration

  // One delegated listener instead of a handler per cell
  const onPointerOver = (event: React.PointerEvent) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-date]')
    const { date, count } = target?.dataset ?? {}
    if (!target || !date || !count) return
    const rect = target.getBoundingClientRect()
    setHovered({
      date,
      count: Number(count),
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      aria-busy={!days}
      className="relative"
      // Width comes from the parent only, so the cells can't widen the layout.
      // Inline, not a utility class: layout must not hinge on generated CSS
      style={{ contain: 'inline-size' }}
    >
      {showMonths && (
        <div className="flex justify-center" style={{ gap, marginBottom: gap }}>
          {Array.from({ length: columns }, (_, index) => (
            <div
              key={index}
              className="relative h-3 shrink-0"
              style={{ width: cell }}
            >
              {labels?.[index] && (
                <motion.span
                  className="text-muted-foreground absolute top-0 left-0 text-[10px] leading-none"
                  initial={
                    animate ? { opacity: 0, filter: 'blur(6px)' } : false
                  }
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={
                    animate ? { ...LABEL_REVEAL, delay: sweepEnd } : INSTANT
                  }
                >
                  {labels[index]}
                </motion.span>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        className="flex justify-center overflow-hidden"
        style={{ gap }}
        onPointerOver={onPointerOver}
        onPointerLeave={() => setHovered(undefined)}
      >
        <Cells
          weeks={weeks}
          placeholderWeeks={columns}
          cell={cell}
          gap={gap}
          accent={accent}
          animate={animate}
        />
      </div>

      <AnimatePresence>
        {hovered && (
          <Tooltip key="tooltip" hovered={hovered} animate={animate} />
        )}
      </AnimatePresence>
    </div>
  )
}

const RepoAvatar = ({
  repo,
  username,
  layoutId,
  transition,
  className,
}: {
  repo: Repo
  username: string
  layoutId: string
  transition: Transition
  className?: string
}) => (
  <motion.span
    layoutId={layoutId}
    transition={transition}
    className={cn(
      'bg-muted text-muted-foreground ring-background grid size-7 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-medium uppercase ring-2',
      className,
    )}
  >
    {/* GitHub has no repo logos; own repos fall back to their initial */}
    {repo.owner.toLowerCase() === username.toLowerCase() ? (
      repo.name.charAt(0)
    ) : (
      <img
        src={`https://github.com/${encodeURIComponent(repo.owner)}.png?size=56`}
        alt=""
        width={28}
        height={28}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-full object-cover"
      />
    )}
  </motion.span>
)

const RepoPanel = ({
  repos,
  username,
  label,
  defaultOpen,
  animate,
}: {
  repos: Repo[]
  username: string
  label: string
  defaultOpen: boolean
  animate: boolean
}) => {
  const uid = React.useId()
  const [open, setOpen] = React.useState(defaultOpen)

  const transition = animate ? SPRING : INSTANT
  const kick = animate ? { x: ROW_OFFSET, y: ROW_OFFSET } : {}
  const avatarId = (repo: Repo) => `${uid}-${repo.fullName}`

  return (
    <motion.div
      layout
      id={`${uid}-panel`}
      data-state={open ? 'open' : 'closed'}
      className={cn(
        'bg-muted/90 absolute inset-x-3 bottom-3 overflow-hidden backdrop-blur-xl',
        open && 'top-3',
      )}
      style={{ borderRadius: 8 }}
      transition={transition}
    >
      <motion.div
        layout="position"
        transition={animate ? HEADER_SPRING : INSTANT}
        className="flex items-center justify-between gap-3 px-4 py-3"
      >
        <span className="truncate text-sm">{label}</span>

        <div className="flex items-center gap-3">
          {!open && (
            <div className="flex items-center">
              {repos.map((repo) => (
                <RepoAvatar
                  key={repo.fullName}
                  repo={repo}
                  username={username}
                  layoutId={avatarId(repo)}
                  transition={transition}
                  className="-ml-2 first:ml-0"
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={`${uid}-panel`}
            aria-label={
              open ? 'Hide top repositories' : 'Show top repositories'
            }
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-7 shrink-0 cursor-pointer place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <motion.span
              className="grid"
              initial={false}
              animate={{ rotate: open ? 180 : 0 }}
              transition={transition}
            >
              <CircleChevronDown className="size-7" strokeWidth={1.25} />
            </motion.span>
          </button>
        </div>
      </motion.div>

      <AnimatePresence initial={false} mode="popLayout">
        {open && (
          <motion.ul
            key="list"
            layout="position"
            initial={{ opacity: 0, ...kick }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...kick }}
            transition={animate ? ROW_SPRING : INSTANT}
            className="px-0.5 pb-1"
          >
            {repos.map((repo) => (
              <li key={repo.fullName}>
                <a
                  href={`https://github.com/${repo.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-foreground/5 mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                >
                  <RepoAvatar
                    repo={repo}
                    username={username}
                    layoutId={avatarId(repo)}
                    transition={transition}
                  />
                  <span className="flex-1 truncate text-sm">{repo.name}</span>
                  <span
                    className="text-muted-foreground text-sm tabular-nums"
                    title={`${plural(repo.pushes, 'push')} in the last 90 days`}
                  >
                    {repo.pushes}
                    <span className="sr-only">
                      {' '}
                      {repo.pushes === 1 ? 'push' : 'pushes'}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export type GitHubActivityProps = React.ComponentProps<'div'> & {
  username: string
  /** Any CSS colour; levels are rendered as graded opacities of it. */
  accent?: string
  showMonths?: boolean
  label?: string
  defaultOpen?: boolean
}

const GitHubActivity = ({
  username,
  accent = 'var(--accent)',
  showMonths = true,
  label = 'Top contributions in:',
  defaultOpen = false,
  className,
  ...props
}: GitHubActivityProps) => {
  const animate = !useReducedMotion()
  const activity = useGitHubActivity(username)
  const ready = activity.status === 'ready' ? activity : null
  const repos = ready?.repos ?? []

  const heading = ready
    ? `${plural(ready.total, 'contribution')} in the last year`
    : activity.status === 'error'
      ? 'Contributions are unavailable right now'
      : 'Loading contributions…'

  return (
    <div
      className={cn(
        'bg-background relative overflow-hidden rounded-xl border p-4 shadow-sm',
        repos.length > 0 && 'pb-19',
        className,
      )}
      {...props}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <p className="text-sm font-medium" aria-live="polite">
          {heading}
        </p>
        <a
          href={`https://github.com/${encodeURIComponent(username)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
        >
          View full activity on GitHub
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>

      <ContributionGrid
        days={ready?.days ?? null}
        accent={accent}
        label={heading}
        showMonths={showMonths}
        animate={animate}
      />

      {repos.length > 0 && (
        <RepoPanel
          repos={repos}
          username={username}
          label={label}
          defaultOpen={defaultOpen}
          animate={animate}
        />
      )}
    </div>
  )
}

export default GitHubActivity
