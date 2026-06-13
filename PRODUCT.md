# Product

## Register

product

## Users

Developer teams (up to ~50 concurrent users per workspace) using DobSpace for day-to-day project management: Kanban boards, calendars, sprints, and an AI assistant that understands project context. Used during active work sessions — standups, planning, triage — not as a marketing surface.

## Product Purpose

Project management web app for dev teams with an AI chatbot that understands project context. Core loop: see what's going on across the workspace (dashboard/overview), drill into a project (Kanban), and act on tasks (status, priority, assignment, due dates).

## Brand Personality

Friendly and approachable with a bit of playfulness — warm without being cute. Confidence comes from clarity (clean hierarchy, obvious affordances), and personality comes from color and small interaction details (per-accent theming already exists: indigo/yellow/blue/pink/green/kimmy), not from decorative chrome.

## Anti-references

Generic AI SaaS template look. Specifically avoid: hero-metric cards (big number + small label + supporting stats + accent), side-stripe color borders on cards/list items, gradient text, tiny uppercase tracked eyebrow labels above sections, identical icon+heading+text card grids, glassmorphism.

## Design Principles

- Respect the existing token system (`app/globals.css` `@theme`, OKLCH, per-accent variables) — extend it, don't bypass it with one-off colors.
- Functional clarity first: every element should help someone scan status or take an action; nothing purely decorative.
- Warmth and personality live in color, motion, and micro-interaction — not in SaaS-template scaffolding (eyebrows, hero metrics, stripe accents).
- Cards are not the default — use the structure (list, table, flex row) that best fits the data; avoid nested cards.
- Vary spacing and density deliberately for rhythm rather than uniform padding everywhere.

## Accessibility & Inclusion

WCAG AA: body text ≥4.5:1 contrast, large/bold text ≥3:1, visible focus states, keyboard-operable interactive elements, `prefers-reduced-motion` alternatives for any animation.
