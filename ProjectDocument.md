# Chess Review Studio

## Overview
Chess Review Studio is a client-side web app for loading Chess.com games, reviewing move quality, and receiving coach-style commentary. It uses chess logic powered by `Chess.js`, plus speech and evaluation features for an interactive review experience.

## Tech Stack
- HTML
- CSS via Tailwind CSS CDN
- JavaScript
- Chess.js (`0.10.3`)
- Browser APIs:
  - `fetch`
  - `SpeechSynthesis`
  - `Web Audio API`
  - DOM manipulation

## Key Features
- Load games from Chess.com archives
- Review board with move-by-move navigation
- Automatic position evaluation and classification
- Coach commentary for mistakes, inaccuracies, and strong moves
- Visual board arrows for suggested continuations
- Retry mode for key mistakes
- Light ad overlay to support monetization

## Files
- `index.html` — entire app in one file
- `.gitignore` — ignores temporary `New file`

## Usage
1. Open `index.html` in a browser
2. Enter a Chess.com username
3. Fetch archived games
4. Click a game to review
5. Use board navigation and coach commentary

## Monetization
The app currently includes a simulated 5-second ad overlay before opening a review. To monetize with real ads, integrate a supported ad network such as Google AdSense and replace the overlay with a real ad container.

## Notes
- No backend is included; the app is fully static and client-side
- Chess evaluation uses a lightweight 2-ply minimax heuristic
- The app is designed for mobile-friendly review gameplay