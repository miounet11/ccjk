# CCJK Demo Guide

**Version**: 3.8
**Last Updated**: January 21, 2026

This guide provides comprehensive instructions for creating professional demo recordings of CCJK using asciinema and converting them to high-quality GIFs for documentation and social media.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Demo Creation Workflow](#demo-creation-workflow)
- [Demo Scenarios](#demo-scenarios)
- [Advanced Configuration](#advanced-configuration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Quick Start

```bash
# Navigate to demo directory
cd assets/demo

# Create a quick install demo
./create-demo.sh quick-install

# Create a custom demo
./create-demo.sh skill-hotload my-custom-demo 45
```

## Prerequisites

### Required Tools

1. **asciinema** - Terminal session recorder
   ```bash
   # macOS
   brew install asciinema

   # Ubuntu/Debian
   apt-get install asciinema

   # Python (universal)
   pip install asciinema
   ```

2. **agg** - High-quality GIF generator for asciinema
   ```bash
   # Install via Cargo (recommended)
   cargo install --git https://github.com/asciinema/agg

   # Or download binary from releases
   # https://github.com/asciinema/agg/releases
   ```

### Optional Tools

3. **ffmpeg** - Video processing (for thumbnails)
   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   apt-get install ffmpeg
   ```

### System Requirements

- **Terminal**: 120x30 minimum (recommended: 120x35)
- **Font**: Monospace font with good Unicode support
- **Colors**: 256-color terminal support
- **Shell**: bash, zsh, or fish

## Demo Creation Workflow

### 1. Preparation Phase

```bash
# Check available scenarios
./create-demo.sh --list

# Verify dependencies
./create-demo.sh --help
```

### 2. Recording Phase

```bash
# Basic recording
./create-demo.sh [scenario-name]

# Advanced recording with custom settings
./create-demo.sh [scenario] [output-name] [duration]
```

### 3. Post-Processing

The script automatically:
- Converts `.cast` to `.gif` using agg
- Creates thumbnail version
- Generates markdown embed code
- Cleans up temporary files

### 4. Output Files

```
assets/demo/output/
├── ccjk-demo-quick-install.gif      # Main GIF
├── ccjk-demo-quick-install-thumb.gif # Thumbnail
└── ccjk-demo-quick-install.md       # Embed code
```

## Demo Scenarios

### Available Scenarios

| Scenario | Duration | Description | Use Case |
|----------|----------|-------------|----------|
| `quick-install` | ~30s | One-command CCJK installation | README hero section |
| `skill-hotload` | ~45s | Hot-reloading skills demonstration | Feature showcase |
| `tool-switch` | ~35s | Switching between Claude Code/Codex | Multi-tool support |

### Scenario Structure

Each scenario follows this pattern:

```bash
#!/bin/bash
# Description: Brief description of what this demo shows
# Duration: Expected recording time
# Use Case: Where this demo should be used

# Demo script content here
```

### Creating Custom Scenarios

1. Create new scenario file:
   ```bash
   cp scenarios/scenario-quick-install.sh scenarios/scenario-my-demo.sh
   ```

2. Edit the scenario:
   ```bash
   # Add your demo commands
   # Include realistic typing delays
   # Add explanatory comments
   ```

3. Test the scenario:
   ```bash
   ./scenarios/scenario-my-demo.sh
   ```

4. Record the demo:
   ```bash
   ./create-demo.sh my-demo
   ```

## Advanced Configuration

### Terminal Appearance

For consistent, professional-looking demos:

```bash
# Set terminal size
export COLUMNS=120
export LINES=30

# Use consistent prompt
export PS1="$ "

# Clear screen before recording
clear
```

### asciinema Configuration

Create `~/.config/asciinema/config` for consistent settings:

```ini
[record]
command = /bin/bash
env = SHELL,TERM,USER
idle_time_limit = 2.0
yes = true

[play]
speed = 1.0
idle_time_limit = 2.0
```

### agg Configuration

Customize GIF output quality:

```bash
# High quality (larger file)
agg --font-size 16 --line-height 1.4 --speed 1.0 input.cast output.gif

# Optimized for web (smaller file)
agg --font-size 14 --line-height 1.2 --speed 1.5 input.cast output.gif

# Social media optimized
agg --font-size 12 --cols 100 --rows 25 --speed 2.0 input.cast output.gif
```

## Troubleshooting

### Common Issues

#### 1. Recording Quality Issues

**Problem**: Blurry or pixelated GIF output

**Solution**:
```bash
# Increase font size and adjust dimensions
agg --font-size 16 --cols 100 --rows 25 input.cast output.gif
```

#### 2. File Size Too Large

**Problem**: GIF files over 10MB

**Solutions**:
```bash
# Reduce dimensions
agg --cols 80 --rows 20 input.cast output.gif

# Increase speed
agg --speed 2.0 input.cast output.gif

# Reduce color palette
agg --theme github-light input.cast output.gif
```

#### 3. Missing Dependencies

**Problem**: `agg: command not found`

**Solution**:
```bash
# Install via cargo
cargo install --git https://github.com/asciinema/agg

# Or use alternative online converter
# Upload .cast file to asciinema.org
```

#### 4. Terminal Size Issues

**Problem**: Content cut off in recording

**Solution**:
```bash
# Set terminal size before recording
resize -s 30 120

# Or use environment variables
export COLUMNS=120 LINES=30
```

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Add debug flag to script
DEBUG=1 ./create-demo.sh quick-install
```

## Best Practices

### Recording Guidelines

1. **Preparation**
   - Clear terminal history: `history -c`
   - Set consistent prompt: `PS1="$ "`
   - Use clean working directory
   - Close unnecessary applications

2. **During Recording**
   - Type at realistic speed (not too fast)
   - Add natural pauses between commands
   - Include brief explanations in comments
   - Show command output clearly

3. **Content Guidelines**
   - Keep demos under 60 seconds
   - Focus on one key feature per demo
   - Show real-world usage scenarios
   - Include error handling when relevant

### GIF Optimization

1. **File Size**
   - Target under 5MB for web use
   - Under 2MB for social media
   - Use appropriate dimensions (max 800px width)

2. **Quality**
   - Use readable font sizes (14px minimum)
   - Ensure good contrast
   - Test on different backgrounds

3. **Performance**
   - Optimize playback speed (1.5x-2x)
   - Remove unnecessary idle time
   - Use efficient color themes

### Documentation Integration

1. **README Usage**
   ```markdown
   ![CCJK Quick Install](./assets/demo/output/ccjk-demo-quick-install.gif)
   ```

2. **Social Media**
   - Use thumbnail versions for previews
   - Include descriptive alt text
   - Add captions for accessibility

3. **Documentation Sites**
   ```html
   <img src="./demo.gif" alt="CCJK Demo" width="800" loading="lazy">
   ```

## Output Specifications

### GIF Specifications

| Use Case | Dimensions | File Size | Speed | Duration |
|----------|------------|-----------|-------|----------|
| README Hero | 800x400 | < 5MB | 1.5x | 30-45s |
| Feature Demo | 600x300 | < 3MB | 2.0x | 20-30s |
| Social Media | 400x200 | < 2MB | 2.5x | 15-20s |
| Thumbnail | 200x100 | < 500KB | 3.0x | 10-15s |

### Quality Settings

```bash
# README Hero
agg --font-size 16 --cols 120 --rows 30 --speed 1.5 --theme monokai

# Feature Demo
agg --font-size 14 --cols 100 --rows 25 --speed 2.0 --theme github-dark

# Social Media
agg --font-size 12 --cols 80 --rows 20 --speed 2.5 --theme dracula

# Thumbnail
agg --font-size 10 --cols 60 --rows 15 --speed 3.0 --theme solarized-light
```

## Automation

### Batch Processing

Create multiple demos at once:

```bash
#!/bin/bash
scenarios=("quick-install" "skill-hotload" "tool-switch")

for scenario in "${scenarios[@]}"; do
    echo "Creating demo for: $scenario"
    ./create-demo.sh "$scenario"
done
```

### CI/CD Integration

```yaml
# .github/workflows/demos.yml
name: Update Demos
on:
  release:
    types: [published]

jobs:
  create-demos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: |
          pip install asciinema
          cargo install --git https://github.com/asciinema/agg
      - name: Create demos
        run: |
          cd assets/demo
          ./create-demo.sh quick-install
          ./create-demo.sh skill-hotload
      - name: Commit demos
        run: |
          git add assets/demo/output/
          git commit -m "Update demos for release"
          git push
```

## Contributing

### Adding New Scenarios

1. Create scenario script in `scenarios/`
2. Follow naming convention: `scenario-[name].sh`
3. Include proper headers and documentation
4. Test thoroughly before submitting
5. Update this guide with scenario details

### Improving Quality

1. Test on different terminals and OS
2. Optimize for various screen sizes
3. Ensure accessibility compliance
4. Validate file sizes and performance

---

**Need Help?**

- Check existing scenarios for examples
- Test with `./create-demo.sh --help`
- Review troubleshooting section
- Open issue for bugs or feature requests