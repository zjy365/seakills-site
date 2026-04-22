"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ExternalLink, Star, X } from "lucide-react"

import { GITHUB_URL, REPO } from "@/lib/constants"

const IS_PRODUCTION = process.env.NODE_ENV === "production"
const PROMPT_DELAY_MS = IS_PRODUCTION ? 14_000 : 1_500
const PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000
const PROMPT_HIDE_UNTIL_KEY = "seakills-star-prompt-hide-until"
const ENABLE_COOLDOWN = IS_PRODUCTION

function formatStarCount(stars: number | null) {
  if (stars == null) {
    return null
  }

  return new Intl.NumberFormat("en", {
    notation: stars >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(stars)
}

function readHideUntil() {
  if (typeof window === "undefined" || !ENABLE_COOLDOWN) {
    return 0
  }

  const value = window.localStorage.getItem(PROMPT_HIDE_UNTIL_KEY)
  return value ? Number(value) : 0
}

function persistCooldown() {
  if (typeof window === "undefined" || !ENABLE_COOLDOWN) {
    return
  }

  window.localStorage.setItem(
    PROMPT_HIDE_UNTIL_KEY,
    String(Date.now() + PROMPT_COOLDOWN_MS),
  )
}

export function StarPrompt() {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [stars, setStars] = useState<number | null>(null)

  const starLabel = useMemo(() => formatStarCount(stars), [stars])

  useEffect(() => {
    const controller = new AbortController()

    async function loadStars() {
      try {
        const response = await fetch(`https://api.github.com/repos/${REPO}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/vnd.github+json",
          },
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { stargazers_count?: number }

        if (typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count)
        }
      } catch {
        // Ignore GitHub API failures and keep the prompt lightweight.
      }
    }

    loadStars()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (readHideUntil() > Date.now()) {
      return
    }

    let closed = false

    const timer = window.setTimeout(() => {
      if (closed) {
        return
      }

      persistCooldown()
      setOpen(true)
    }, PROMPT_DELAY_MS)

    return () => {
      closed = true
      window.clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    persistCooldown()
    setOpen(false)
  }

  const handleStarClick = () => {
    persistCooldown()
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="fixed inset-x-4 bottom-4 z-40 md:inset-x-auto md:right-6 md:bottom-6 md:w-[min(36rem,calc(100vw-3rem))]"
        >
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary">
                    <Star className="h-4 w-4 fill-current" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Open Source Support
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground md:flex-nowrap md:whitespace-nowrap">
                      <span>Like seakills?</span>
                      <span className="font-mono text-foreground">Star {REPO}</span>
                      {starLabel ? (
                        <motion.span
                          key={starLabel}
                          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
                          className="font-mono text-primary"
                        >
                          [{starLabel}]
                        </motion.span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleStarClick}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 font-mono text-xs text-primary transition-colors hover:border-primary/50 hover:bg-primary/14"
                >
                  star repo
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Dismiss star prompt"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
