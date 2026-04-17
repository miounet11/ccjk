# CCJK → myclaude / Clavue Adaptation Blueprint

Date: 2026-04-17
Audience: CCJK product, architecture, and implementation teams
Target repo reviewed: https://github.com/miounet11/ccjk

---

## 1. Executive summary

CCJK already does many valuable things well:

- fast onboarding
- permission presets
- provider discovery
- memory/context helpers
- MCP and workflow installation
- multi-runtime support

But today its product position is still mostly **"setup layer on top of multiple coding tools"**.

If the goal is to make CCJK fit **myclaude / Clavue** better, and to let CCJK evolve into a **general adaptation layer** for different work styles and product forms, then the right upgrade is:

1. Treat **myclaude / Clavue as the core execution engine**.
2. Treat **CCJK as the adaptation, orchestration, and packaging layer**.
3. Stop thinking in terms of only "tool install presets".
4. Start thinking in terms of **capability profiles + domain archetypes + workflow packs**.

In that model:

- myclaude / Clavue is the high-order execution substrate.
- CCJK becomes the control plane that shapes it for different use cases.
- Different end products are created by switching capability packs, not by forking the runtime model.

That is the path that best supports:

- PC software development tools
- App/mobile development tools
- text creation tools
- service-operation tools
- research / analysis tools
- future vertical tools not yet defined

---

## 2. The product model CCJK should adopt

## Current implicit model

From the current repo surface, CCJK behaves like this:

- a bootstrapper
- a config manager
- a permission preset system
- a provider/MCP/workflow convenience layer
- a multi-runtime installer

That is useful, but it still frames CCJK as a **support utility**.

## Recommended future model

CCJK should explicitly define itself as:

> A runtime adaptation platform that configures myclaude / Clavue into domain-specific AI workstations.

That means CCJK should own:

- environment shaping
- runtime compatibility
- settings synthesis
- capability selection
- workflow packaging
- domain archetype switching
- policy and safety defaults
- memory/context strategy

And it should **not** try to replace the runtime's core identity.

Important rule:

> CCJK should adapt myclaude / Clavue, not overwrite its product identity.

So when targeting myclaude / Clavue:

- keep runtime identity as `myclaude` / `Clavue`
- let CCJK describe the operating mode around it
- do not present CCJK itself as the assistant
- present it as the environment / adapter / cockpit

---

## 3. The architecture shift: from presets to capability composition

CCJK currently has good foundations for this shift:

- `src/config-manager.ts`
- `src/commands/init.ts`
- `src/commands/zero-config.ts`
- `src/commands/providers.ts`
- `src/utils/claude-config`
- `src/utils/code-type-resolver`
- `src/config/*`

The next step is to move from **static setup presets** to a **composable capability model**.

## Recommended four-layer architecture

### Layer A — Execution substrate

This is the real engine:

- myclaude / Clavue runtime
- its command system
- its provider profile system
- its tools / workflows / route policy
- its memory + task + plan execution model

CCJK should treat this as authoritative.

### Layer B — Adaptation control plane

This is CCJK's core value.

It should decide:

- which runtime to target
- which provider profile shape to use
- which capabilities are enabled
- which permissions are granted
- which MCP/tool packs are installed
- which workflow packs are activated
- which operating archetype is selected

### Layer C — Domain packs

These are the reusable vertical packs:

- PC development pack
- mobile/app development pack
- text creation pack
- service operations pack
- research pack
- data analysis pack
- customer support pack
- education/training pack

Each pack should define:

- workflow goals
- required permissions
- recommended MCP servers
- suggested slash commands / skills
- prompt framing rules
- output style defaults
- safety rules
- memory policy

### Layer D — Workspace/project overlays

Per-project overlays should refine the selected domain pack with:

- repo-specific instructions
- language/framework detection
- service topology
- local scripts
- test/build/verification paths
- environment constraints
- human workflow preferences

---

## 4. The core design principle for myclaude / Clavue compatibility

CCJK should become **runtime-aware**, not just runtime-selecting.

That means there is a big difference between:

- "supporting myclaude as one more code tool"
- and
- "understanding the execution model of myclaude / Clavue and shaping config around it"

For myclaude / Clavue specifically, CCJK should align to these principles:

1. **Execution first**
   - The runtime is built for real software work, not just chat.
   - CCJK should optimize for reversible execution, verification, and coherent units of work.

2. **Product identity remains runtime-owned**
   - CCJK must not make the assistant appear to be CCJK.
   - It should configure the environment, not rename the agent.

3. **Provider routing is a capability, not the identity**
   - CCJK should expose provider setup and repair, but not let provider selection define the product.

4. **Workflow tools must be route-compatible**
   - If a route cannot reliably support planning/task/team workflow tools, CCJK should downgrade gracefully rather than pretending native support exists.

5. **Settings should separate concerns clearly**
   - UI language, provider routing, permissions, task behavior, memory behavior, and domain archetype should all be independent settings.

---

## 5. What CCJK should add to its settings model

Today CCJK has strong config mechanics, but the config surface still needs a clearer product grammar.

## Recommended top-level config model

CCJK should add a new unified settings concept like this:

```json
{
  "runtime": {
    "target": "myclaude",
    "distribution": "clavue",
    "compatMode": "native",
    "providerStrategy": "profile-based"
  },
  "archetype": {
    "id": "pc-dev",
    "name": "PC Software Development",
    "goal": "Build, debug, test, and ship desktop/server software efficiently"
  },
  "capabilities": {
    "coding": true,
    "planning": true,
    "taskTracking": true,
    "memory": true,
    "browserAutomation": false,
    "research": true,
    "documentAuthoring": false,
    "serviceOps": false,
    "multiAgent": true
  },
  "policies": {
    "permissionPreset": "dev",
    "verificationMode": "required",
    "destructiveActionPolicy": "confirm",
    "workflowFallbackMode": "graceful"
  },
  "context": {
    "memoryMode": "project-aware",
    "compressionMode": "runtime-native",
    "instructionLayering": "runtime-first"
  },
  "profiles": {
    "providerProfile": "kimi-main",
    "workflowPack": "desktop-engineering",
    "toolPack": "typescript-node-react"
  },
  "ui": {
    "language": "zh-CN",
    "outputStyle": "concise",
    "operatorMode": "execution-first"
  }
}
```

## Why this matters

Right now CCJK mostly answers:

- which commands should be allowed?
- which providers are available?
- which MCPs should be installed?

It should also answer:

- what kind of tool are we building?
- which runtime behavior is primary?
- how should the runtime behave under this domain?
- what capability mix is appropriate?
- what should be strict vs flexible?

---

## 6. Replace coarse permission presets with archetype-aware capability presets

`src/commands/zero-config.ts` is a good starting point, but `max/dev/safe` is too shallow for the future state.

It should evolve into two dimensions.

## Dimension 1 — safety level

Keep:

- `safe`
- `dev`
- `max`

## Dimension 2 — operating archetype

Add:

- `pc-dev`
- `app-dev`
- `text-studio`
- `service-ops`
- `research`
- `automation`

Then combine them.

Examples:

- `pc-dev + dev`
- `app-dev + dev`
- `text-studio + safe`
- `service-ops + max`

## Example preset matrix

### PC software development

Use when the user primarily builds local software, libraries, backend systems, CLI tools, or desktop apps.

Enable:

- bash/file editing/build/test/git
- task tracking
- plan mode
- code review workflows
- provider profile management
- runtime-native verification
- repo-aware memory

Install/recommend:

- filesystem
- git
- terminal tooling
- docs/web fetch
- language-specific MCPs if relevant

### App/mobile development

Use when the user builds iOS/Android/Flutter/React Native/mobile backends.

Enable:

- all PC dev features
- emulator/simulator support hooks
- mobile packaging/test workflows
- API/mock/device integration packs
- artifact inspection helpers

Install/recommend:

- Android/iOS toolchain adapters
- API testing tools
- screenshot/artifact tooling
- device-log workflows

### Text creation / writing studio

Use when the user wants structured writing, publishing, editing, long-form drafting, or multi-document synthesis.

Enable:

- document authoring
- research
- outline workflows
- revision loops
- style guide memory
- citation/reference helpers

Reduce or disable by default:

- invasive shell permissions
- build/test-heavy coding workflows
- repo-specific developer MCPs

### Service tools / operations

Use when the user is building operational assistants, internal tooling, workflow automation, dashboards, and support tooling.

Enable:

- service/runbook authoring
- API integration workflows
- environment inspection
- incident analysis
- monitoring + logs packs
- controlled automation

Install/recommend:

- HTTP/API tools
- database tools
- cloud/infra MCPs
- observability integrations

---

## 7. A concrete adaptation path for CCJK's current codebase

Below is the practical mapping from the current repo to the proposed design.

## 7.1 `src/commands/init.ts`

This is the most important upgrade point.

Today it already selects runtime/code tool, API config, MCP services, workflows, and installation choices.

It should be extended into a **three-stage setup pipeline**:

### Stage 1 — choose runtime contract

Current concept:

- choose code tool

Upgrade to:

- choose runtime target
- choose compatibility mode
- choose runtime integration depth

For myclaude / Clavue, this should expose:

- runtime identity preserved
- provider-profile mode enabled
- task/plan/memory features use runtime-native behavior when available
- fallback behavior defined when route policy blocks native tools

### Stage 2 — choose operating archetype

New prompt:

- PC Software Development
- App/Mobile Development
- Text Creation Studio
- Service & Operations Tooling
- Research / Analysis Workspace
- Custom / Advanced

This is the real product fork point.

### Stage 3 — compose capability packs

After archetype selection, ask:

- enable memory?
- enable multi-agent?
- enable browser automation?
- enable remote control?
- enable research helpers?
- enable writing/review pack?
- enable service ops pack?

This makes CCJK a product composer, not just a setup wizard.

---

## 7.2 `src/config-manager.ts`

This should become the source of truth for **composed operating state**, not just merged config state.

Add a richer managed config shape:

- runtime target
- runtime integration contract
- archetype id
- capability set
- workflow pack ids
- permission policy
- provider profile strategy
- verification policy
- UI language/output style

Recommended new sub-objects:

- `runtimeProfile`
- `archetypeProfile`
- `capabilityProfile`
- `policyProfile`
- `workspaceOverlay`

The manager should also validate cross-field consistency.

Examples:

- `text-studio` should not default to `Bash(*)`
- `service-ops` should require stronger secrets validation
- `myclaude + native workflow mode` should only be enabled when route/tool compatibility is known good

---

## 7.3 `src/commands/zero-config.ts`

This file should be renamed in concept from:

- permission preset installer

To:

- policy and capability preset composer

Keep the current permission-cleaning behavior, but broaden the output.

Instead of only applying shell permissions, a preset should apply:

- permission rules
- recommended env vars
- suggested MCP pack
- suggested workflow pack
- memory mode
- output mode
- runtime integration options

So the preset engine becomes:

```text
preset = safety level + archetype + runtime target + optional packs
```

Example:

```bash
ccjk profile apply --runtime myclaude --archetype pc-dev --safety dev
ccjk profile apply --runtime myclaude --archetype text-studio --safety safe
ccjk profile apply --runtime myclaude --archetype service-ops --safety max
```

---

## 7.4 `src/commands/providers.ts`

This command should evolve from "list/check providers" to **runtime-route management**.

For myclaude / Clavue alignment, provider handling should understand:

- current active provider profile
- profile purpose by model slot
- route quality/reliability
- which features are safe on current route
- whether native workflow tools should be fully enabled, degraded, or hidden

Recommended additions:

- `ccjk providers profile list`
- `ccjk providers profile current`
- `ccjk providers profile validate`
- `ccjk providers route check`
- `ccjk providers route explain`
- `ccjk providers route repair`

This is especially important because for myclaude / Clavue, route capability affects whether planning/task/team workflows should be treated as truly available.

---

## 7.5 `src/utils/code-type-resolver` and runtime detection

Today CCJK supports multiple code tools. Keep that.

But add a richer runtime descriptor, for example:

```ts
interface RuntimeDescriptor {
  id: 'claude-code' | 'myclaude' | 'codex' | 'cursor-adapter'
  family: 'claude-compatible' | 'openai-compatible' | 'editor-hosted'
  supportsNativeTasks: boolean
  supportsNativePlans: boolean
  supportsNativeMemory: boolean
  supportsProviderProfiles: boolean
  supportsRouteAwareDegradation: boolean
  supportsSkillLayer: boolean
}
```

This lets CCJK adapt correctly per runtime instead of assuming all coding tools are shaped the same.

---

## 8. How CCJK should support different end-product categories

This is the most important strategic part.

The user does not want only a coding helper. They want a base that can be adapted into multiple products.

That means CCJK should define **archetype contracts**.

## 8.1 PC software development tool

### Primary goal

Help users build, debug, refactor, test, and ship software.

### Default behavior

- concise execution-oriented output
- strong verification requirements
- task tracking on multi-step work
- provider/profile visibility
- repo-memory enabled
- code review and test workflows on by default

### Required packs

- coding pack
- verification pack
- repo memory pack
- provider profile pack
- git/build/test pack

### Nice-to-have packs

- browser pack for docs/admin work
- research pack
- release pack

---

## 8.2 App/mobile development tool

### Primary goal

Support local app work plus simulator/device/backend coordination.

### Default behavior

- same as PC dev
- artifact-aware workflows
- screenshot/log handling
- API and device coordination
- environment matrix awareness

### Required packs

- mobile build pack
- device/emulator pack
- backend coordination pack
- artifact review pack

### Extra requirement

CCJK should support a `delivery target` concept:

- iOS
- Android
- React Native
- Flutter
- Electron
- desktop hybrid

This gives correct default MCP/tool suggestions.

---

## 8.3 Text creation tool

### Primary goal

Create, edit, restructure, and polish documents, books, scripts, marketing copy, and knowledge assets.

### Default behavior

- outline-first workflows
- drafting/revision loops
- style guide memory
- low shell permission footprint
- document workspace indexing
- reference-aware synthesis

### Required packs

- writing pack
- research pack
- outline pack
- editorial review pack
- source/reference pack

### Special requirement

Separate writing-mode config from coding-mode config.

Do not overload developer defaults into writing users.

---

## 8.4 Service / operational tool

### Primary goal

Support operations teams, support engineers, system operators, workflow designers, and internal tool builders.

### Default behavior

- environment awareness
- policy-sensitive automation
- secrets protection
- API/db/log oriented workflows
- incident/runbook support
- stronger confirmation for destructive actions

### Required packs

- service ops pack
- environment inspection pack
- API/database pack
- incident analysis pack
- operational policy pack

### Special requirement

This archetype should have stricter defaults than dev mode.

---

## 8.5 Research / analysis tool

### Primary goal

Search, synthesize, compare, and explain.

### Default behavior

- high emphasis on documentation/research tools
- lower emphasis on file mutation
- reference integrity and source quality
- optional browser/data extraction

### Required packs

- research pack
- source evaluation pack
- synthesis pack
- note memory pack

---

## 9. Recommended new command surface for CCJK

CCJK's command surface is already broad. The next step is to make it more product-compositional.

## Recommended new commands

### `ccjk profile`

Purpose: compose and inspect full adaptation profiles.

Examples:

```bash
ccjk profile list
ccjk profile current
ccjk profile apply --runtime myclaude --archetype pc-dev --safety dev
ccjk profile explain
ccjk profile export
```

### `ccjk archetype`

Purpose: switch the operating domain.

Examples:

```bash
ccjk archetype list
ccjk archetype use pc-dev
ccjk archetype use app-dev
ccjk archetype use text-studio
ccjk archetype use service-ops
```

### `ccjk capability`

Purpose: toggle packs.

Examples:

```bash
ccjk capability list
ccjk capability enable research
ccjk capability enable browser-automation
ccjk capability disable multi-agent
```

### `ccjk runtime`

Purpose: manage runtime-aware compatibility.

Examples:

```bash
ccjk runtime detect
ccjk runtime inspect
ccjk runtime validate
ccjk runtime explain myclaude
```

### `ccjk provider route`

Purpose: expose route-health and feature readiness.

Examples:

```bash
ccjk provider route check
ccjk provider route explain
ccjk provider route repair
```

---

## 10. What “fit myclaude / Clavue better” means in practice

This should be translated into specific behavior changes.

## 10.1 Preserve runtime-native concepts

CCJK should explicitly support these concepts when the target is myclaude / Clavue:

- provider profiles
- slot-based model routing
- plan/task/memory native workflows
- route-aware tool availability
- execution-first posture
- verification as a completion requirement
- concise operator-facing output

## 10.2 Do not flatten everything into generic environment variables

CCJK currently has env-heavy and preset-heavy behavior in places.

For myclaude / Clavue, prefer structured config over loose env injection.

Use env vars only for:

- credentials when necessary
- launcher/runtime handoff
- compatibility shims

Use structured config for:

- profile selection
- routing slots
- archetype selection
- capability packs
- policies
- UI/output settings

## 10.3 Respect runtime-owned safety policy

If myclaude / Clavue has stronger rules around destructive actions, plan mode, worktree behavior, or route-aware fallbacks, CCJK should not hide or override them.

It should expose and explain them.

---

## 11. Implementation roadmap for the CCJK team

## Phase 1 — Product grammar upgrade

Goal: define the new configuration language.

Deliverables:

- add runtime descriptor model
- add archetype model
- add capability-pack model
- add policy profile model
- update config manager schemas
- add migration path from current presets

Target areas:

- `src/config-manager.ts`
- `src/types/*`
- `src/config/*`

## Phase 2 — Init/onboarding redesign

Goal: make setup output a composed profile, not just a set of installed options.

Deliverables:

- new runtime selection step
- new archetype selection step
- capability pack selection
- generated final profile summary
- explicit myclaude / Clavue compatibility messaging

Target areas:

- `src/commands/init.ts`
- `src/commands/menu/*`
- onboarding docs

## Phase 3 — Preset system evolution

Goal: evolve zero-config into profile composition.

Deliverables:

- archetype-aware presets
- safety level composition
- richer config output
- migration of `zc` into `profile apply`

Target areas:

- `src/commands/zero-config.ts`
- permission cleaner/utilities
- docs for presets

## Phase 4 — Provider/runtime adaptation

Goal: make runtime and route readiness explicit.

Deliverables:

- runtime descriptor registry
- route check / explain / repair commands
- profile-slot awareness
- native-workflow readiness logic

Target areas:

- `src/commands/providers.ts`
- provider utils/config
- runtime detection utils

## Phase 5 — Domain-pack shipping

Goal: make CCJK usable as multiple products built on the same base.

Initial packs:

- `pc-dev`
- `app-dev`
- `text-studio`
- `service-ops`
- `research`

Deliverables:

- pack manifests
- install/enable logic
- docs and examples
- quick-start templates

---

## 12. Suggested config migration strategy

CCJK should not break existing users.

## Migration rules

### Existing `zc --preset dev`

Map to:

- `archetype=pc-dev`
- `safety=dev`
- `runtime=current detected`

### Existing `zc --preset safe`

Map to:

- `safety=safe`
- archetype inferred from existing usage or ask once on next run

### Existing init flow without archetype

On upgrade:

- detect previous runtime/tool
- detect repo type / command usage
- suggest an archetype
- ask user to confirm once

---

## 13. Success criteria

The upgrade is successful when CCJK can do all of the following cleanly.

## Product criteria

- A user can say: “set me up for app development on myclaude”
- A user can say: “turn this into a writing workstation”
- A user can switch archetypes without reinstalling the world
- The runtime identity remains myclaude / Clavue, not CCJK
- Different end products are achieved mostly by configuration composition

## Technical criteria

- config schema cleanly separates runtime / archetype / capabilities / policies
- route capability affects workflow exposure correctly
- permission presets are no longer the only abstraction
- onboarding produces a structured profile summary
- docs explain the model clearly enough for operators and contributors

## Operational criteria

- team admins can distribute archetype profiles
- profiles can be exported/imported
- profiles can be versioned and audited
- migration from old CCJK setups is low-friction

---

## 14. Immediate implementation recommendations

If the CCJK team wants the shortest path with the biggest impact, do these first:

1. **Add `archetype` to config**
   - This is the missing product switch.

2. **Upgrade `init` to ask for archetype**
   - This changes the whole system from installer to product composer.

3. **Refactor `zero-config` into profile composition**
   - Keep the old command as compatibility alias if needed.

4. **Add a runtime descriptor for myclaude / Clavue**
   - Not just as another code tool label.

5. **Make provider handling route-aware**
   - This is critical for advanced workflow reliability.

6. **Ship first-class packs for `pc-dev`, `app-dev`, `text-studio`, `service-ops`**
   - These four already cover most real demand.

---

## 15. Final recommendation

CCJK should stop positioning itself only as a convenience layer for Claude Code/Codex setup.

Its stronger future position is:

> CCJK is the adaptation platform that turns myclaude / Clavue into domain-specific AI workstations.

That makes CCJK much more durable.

Because then the product is not limited to:

- coding setup
- MCP installation
- permission presets

It becomes the system that can shape one strong execution runtime into many practical tools:

- software engineering cockpit
- mobile app studio
- writing studio
- service operations console
- research workspace
- future vertical copilots

That is the upgrade path that best matches both CCJK's current strengths and myclaude / Clavue's execution-first runtime model.

---

## 16. Concrete file targets in the CCJK repo

Start here first:

- `src/commands/init.ts`
- `src/config-manager.ts`
- `src/commands/zero-config.ts`
- `src/commands/providers.ts`
- `src/utils/code-type-resolver/*`
- `src/config/*`
- `docs/zero-config-permissions.md`
- onboarding/menu docs

---

## 17. Suggested next internal deliverables for the CCJK team

1. RFC: runtime/archetype/capability schema
2. Config migration plan from current presets
3. New onboarding flow spec
4. Runtime descriptor spec for myclaude / Clavue
5. Archetype pack manifests for the first four verticals
6. Provider route readiness model
7. End-user docs for profile composition

---

If needed, this document can be followed by a second artifact:

- a **file-by-file engineering implementation spec** for the CCJK repo
- or a **config schema draft** with exact TypeScript interfaces and migration examples
