---
name: Jazz Taste Analysis
description: Diagnostic dashboard for the jazz recommendation model.
colors:
  midnight: "#07111f"
  panel: "#0f1f38"
  panel-2: "#0b1a30"
  ink: "#d7e6f7"
  muted: "#87a2c3"
  muted-2: "#8aa6c8"
  blue: "#4a9eff"
  amber: "#ffc144"
  green: "#50c878"
  red: "#ff6b6b"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.4rem, 4vw, 1.8rem)"
    fontWeight: 900
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
spacing:
  sm: "8px"
  md: "14px"
  lg: "22px"
---

# Design System: Jazz Taste Analysis

## Overview

**Creative North Star: "The Lab Notebook"**

A dense midnight-navy diagnostic surface. Panels are flat sections separated by hairlines, not cards inside cards. Blue carries data, amber carries emphasis, green and red carry good/bad. The dashboard should read like a lab notebook: legible, honest, and unhurried.

## Colors

Midnight navy ground with a single panel tone. Blue is the primary data accent; amber is secondary emphasis; green and red are reserved for outcome states. Muted blue-gray text stays above 4.5:1.

## Typography

System UI for fast scanning. Large section headings, 11px floor for labels, and a 68ch measure for explanatory copy.

## Layout

Responsive panel grid with a max content width, a sticky top navigation, and flat tables that scroll horizontally on phones.

## Shapes

18px panel containers; 14px controls; flat inner sections. Side rules are 1px, never thick color tabs.

## Do's and Don'ts

**Do** keep panels flat, keep takeaway copy short, and keep data text readable.
**Don't** nest cards, add thick side tabs, use kickers above headings, or put gray text on colored surfaces.
