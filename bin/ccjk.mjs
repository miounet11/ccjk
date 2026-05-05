#!/usr/bin/env node
// Suppress i18next promotional message
import '../dist/cli.mjs';

process.env.I18NEXT_SUPPRESS_WARNING = '1';
