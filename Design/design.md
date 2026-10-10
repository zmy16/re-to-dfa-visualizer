---
name: Hemory Editorial Design System
description: Minimalist, typography-driven editorial design system for ambient AI memory and developer tooling
colors:
  primary: "#C85A32"
  primary-hover: "#B34E2A"
  background: "#F7F6F2"
  surface: "#FFFFFF"
  surface-subtle: "#EFECE6"
  text-primary: "#121212"
  text-secondary: "#71717A"
  text-tertiary: "#A1A1AA"
  border: "#E5E2DC"
  success: "#16A34A"
  warning: "#D97706"
  error: "#DC2626"
typography:
  eyebrow:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.12em"
    textTransform: "uppercase"
  h1:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h2:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body-md:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.01em"
  label-sm:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    fontWeight: 500
    fontSize: "0.875rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    fontWeight: 500
    fontSize: "0.875rem"
  button-secondary-hover:
    backgroundColor: "{colors.surface-subtle}"
  card:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
---

## Overview
Hemory is an ambient context and persistent memory infrastructure built for AI agents communicating via the Model Context Protocol (MCP). The aesthetic balances modern Swiss editorial clarity with warm, organic earth tones (warm off-white #F7F6F2 and terracotta #C85A32), projecting trustworthiness, calm focus, and developer craftsmanship without sterile corporate cliches.

## Colors
- **Primary (#C85A32):** Burnt terracotta / rust. Strictly reserved for main call-to-actions, active links, and brand emphasis.
- **Background (#F7F6F2):** Off-white canvas with a subtle warm undertone, avoiding the eye fatigue of pure #FFFFFF and the halation of high-contrast stark themes.
- **Surface (#FFFFFF):** Used for elevated cards, inputs, and active tooltips against the warm canvas.
- **Text-primary (#121212):** Deep charcoal soft black ensuring high contrast (>16:1) while remaining warm.
- **Text-secondary (#71717A):** Medium stone gray used for sub-headlines, secondary headline parts, and metadata.
- **Border (#E5E2DC):** Delicate hairline border for crisp structural framing without heavy dropshadows.

## Typography
- **Font Choice:** Modern grotesque sans-serif (Inter, Geist, or Neue Montreal) prioritizing legible tight tracking in display sizes.
- **Editorial Two-Tone Headline:** Headlines use intentional color hierarchy where the lead proposition is rendered in `#121212` and the functional elaboration is rendered in `#71717A`.
- **Vertical Rhythm:** Heading margins observe an asymmetric ratio: generous spacing above, tight proximity to accompanying subcopy below.

## Layout & Spacing
- **Base Grid:** 8px harmonic spacing system.
- **Max Width:** 1280px container with 48px desktop horizontal gutters.
- **Whitespace Philosophy:** Generous breathing room (>45% canvas) reinforcing a premium, focused product demeanor.

## Shape & Elevation
- **Border Radius:** Restrained 8px on actions and 12px on content cards to maintain crisp architectural feel.
- **Depth:** Strictly flat-line design. Elevation is articulated via subtle surface shifts and 1px `#E5E2DC` dividers rather than diffuse shadows.

## Rules to Never Break
- Never use saturated blue or generic tech purple accents.
- Never apply heavy box shadows or glassmorphism blur backgrounds.
- Never set background to pure `#000000` or `#FFFFFF`.
- Always preserve the two-tone contrast within the main hero headline.