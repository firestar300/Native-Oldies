/**
 * Frequently asked questions.
 *
 * Rendered as visible HTML and as FAQPage JSON-LD at build time
 * (see scripts/vite-plugin-seo.js), so both always stay in sync.
 *
 * @typedef {Object} FaqItem
 * @property {string} question
 * @property {string} answer   Plain text, no markup.
 */

/** @type {FaqItem[]} */
export const faqItems = [
  {
    question: 'What is a native PC port of a classic game?',
    answer:
      'A native PC port is a version of an older console or arcade game that runs directly on your computer as a regular program, without an emulator. Fan-made ports are usually built from a decompilation, a static recompilation or a reimplementation of the original game, and often add widescreen, high framerates, modern controls and mods.',
  },
  {
    question: 'What is the difference between decompilation, static recompilation and reimplementation?',
    answer:
      'A decompilation rebuilds readable source code from the original game binary, which is then compiled for PC. A static recompilation automatically translates the original machine code into code that runs natively on PC, without needing the source. A reimplementation rewrites the game engine from scratch while reusing the original assets. Native Oldies lists all three.',
  },
  {
    question: 'Do I need an emulator to play these ports?',
    answer:
      'No. The ports listed on Native Oldies run natively on Windows, and often on Linux and macOS too. They are not emulators: they are standalone programs built from the game itself.',
  },
  {
    question: 'Do the ports include the games?',
    answer:
      'No. Native Oldies hosts no games, ROMs or ports. Almost every project requires you to provide your own legally obtained game files, such as a ROM, a disc image or the data of the original release, and extracts the assets locally.',
  },
  {
    question: 'What do the Complete, Playable and WIP statuses mean?',
    answer:
      'Complete means the port can be played from start to finish with only minor issues. Playable means the game runs but some features are missing or rough. WIP means the project is still in active development and may crash or lack content.',
  },
]
