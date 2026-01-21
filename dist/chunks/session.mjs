import 'node:fs';
import 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import 'node:process';
import 'ansis';
import 'inquirer';

join(homedir(), ".ccjk", "sessions");
join(homedir(), ".ccjk");
join(homedir(), ".claude");
