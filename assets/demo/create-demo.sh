#!/bin/bash

# CCJK Demo Creation Script
# Creates professional demo recordings using asciinema and converts to GIF
# Usage: ./create-demo.sh [scenario] [output-name]

set -euo pipefail

# Configuration
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIOS_DIR="${DEMO_DIR}/scenarios"
OUTPUT_DIR="${DEMO_DIR}/output"
TEMP_DIR="${DEMO_DIR}/temp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji for better UX
CAMERA="🎬"
ROCKET="🚀"
SPARKLES="✨"
CHECK="✅"
CROSS="❌"
GEAR="⚙️"

# Default values
SCENARIO="${1:-quick-install}"
OUTPUT_NAME="${2:-ccjk-demo-${SCENARIO}}"
DURATION="${3:-60}"

# Helper functions
log_info() {
    echo -e "${BLUE}${CAMERA} $1${NC}"
}

log_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

log_step() {
    echo -e "${PURPLE}${GEAR} $1${NC}"
}

# Check dependencies
check_dependencies() {
    log_step "Checking dependencies..."

    local missing_deps=()

    # Check for asciinema
    if ! command -v asciinema &> /dev/null; then
        missing_deps+=("asciinema")
    fi

    # Check for agg (asciinema gif generator)
    if ! command -v agg &> /dev/null; then
        log_warning "agg not found. Will provide installation instructions."
    fi

    # Check for ffmpeg (alternative gif creation)
    if ! command -v ffmpeg &> /dev/null; then
        log_warning "ffmpeg not found. Will use agg for GIF conversion."
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        echo
        echo "Install missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                "asciinema")
                    echo "  • asciinema: pip install asciinema"
                    echo "    or: brew install asciinema"
                    echo "    or: apt-get install asciinema"
                    ;;
            esac
        done
        exit 1
    fi

    log_success "All required dependencies found"
}

# Setup directories
setup_directories() {
    log_step "Setting up directories..."
    mkdir -p "${OUTPUT_DIR}" "${TEMP_DIR}"
    log_success "Directories ready"
}

# List available scenarios
list_scenarios() {
    log_info "Available demo scenarios:"
    echo
    if [ -d "${SCENARIOS_DIR}" ]; then
        for scenario in "${SCENARIOS_DIR}"/*.sh; do
            if [ -f "$scenario" ]; then
                local name=$(basename "$scenario" .sh)
                local desc=$(grep "^# Description:" "$scenario" | cut -d: -f2- | xargs)
                echo -e "  ${CYAN}${name}${NC}: ${desc:-No description}"
            fi
        done
    else
        log_warning "No scenarios directory found at ${SCENARIOS_DIR}"
    fi
    echo
}

# Validate scenario
validate_scenario() {
    local scenario_file="${SCENARIOS_DIR}/scenario-${SCENARIO}.sh"

    if [ ! -f "$scenario_file" ]; then
        log_error "Scenario '${SCENARIO}' not found at ${scenario_file}"
        echo
        list_scenarios
        exit 1
    fi

    if [ ! -x "$scenario_file" ]; then
        log_step "Making scenario executable..."
        chmod +x "$scenario_file"
    fi

    log_success "Scenario '${SCENARIO}' validated"
}

# Record demo
record_demo() {
    local cast_file="${TEMP_DIR}/${OUTPUT_NAME}.cast"
    local scenario_file="${SCENARIOS_DIR}/scenario-${SCENARIO}.sh"

    log_info "Starting demo recording..."
    echo -e "${YELLOW}Recording will start in 3 seconds...${NC}"
    sleep 1
    echo "3..."
    sleep 1
    echo "2..."
    sleep 1
    echo "1..."
    sleep 1

    log_step "Recording scenario: ${SCENARIO}"
    echo -e "${CYAN}Press Ctrl+D when finished${NC}"
    echo

    # Record with asciinema
    asciinema rec \
        --title "CCJK v3.8 Demo - ${SCENARIO}" \
        --command "${scenario_file}" \
        --overwrite \
        "${cast_file}"

    if [ $? -eq 0 ]; then
        log_success "Recording completed: ${cast_file}"
        return 0
    else
        log_error "Recording failed"
        return 1
    fi
}

# Convert to GIF
convert_to_gif() {
    local cast_file="${TEMP_DIR}/${OUTPUT_NAME}.cast"
    local gif_file="${OUTPUT_DIR}/${OUTPUT_NAME}.gif"

    log_step "Converting to GIF..."

    # Try agg first (better quality)
    if command -v agg &> /dev/null; then
        log_info "Using agg for GIF conversion..."
        agg \
            --font-size 14 \
            --line-height 1.2 \
            --cols 120 \
            --rows 30 \
            --theme monokai \
            --speed 1.5 \
            "${cast_file}" \
            "${gif_file}"

        if [ $? -eq 0 ]; then
            log_success "GIF created with agg: ${gif_file}"
            return 0
        else
            log_warning "agg conversion failed, trying alternative..."
        fi
    fi

    # Fallback to asciicast2gif or manual instructions
    log_warning "agg not available. Install with:"
    echo "  cargo install --git https://github.com/asciinema/agg"
    echo
    echo "Or use online converter:"
    echo "  1. Upload ${cast_file} to https://asciinema.org"
    echo "  2. Use the web interface to download as GIF"

    return 1
}

# Create thumbnail
create_thumbnail() {
    local gif_file="${OUTPUT_DIR}/${OUTPUT_NAME}.gif"
    local thumb_file="${OUTPUT_DIR}/${OUTPUT_NAME}-thumb.gif"

    if [ -f "$gif_file" ] && command -v ffmpeg &> /dev/null; then
        log_step "Creating thumbnail..."
        ffmpeg -i "$gif_file" -vf "scale=400:-1" "$thumb_file" -y &> /dev/null

        if [ $? -eq 0 ]; then
            log_success "Thumbnail created: ${thumb_file}"
        else
            log_warning "Thumbnail creation failed"
        fi
    fi
}

# Generate markdown embed
generate_markdown() {
    local gif_file="${OUTPUT_DIR}/${OUTPUT_NAME}.gif"
    local md_file="${OUTPUT_DIR}/${OUTPUT_NAME}.md"

    log_step "Generating markdown embed..."

    cat > "$md_file" << EOF
# CCJK Demo: ${SCENARIO}

![CCJK Demo](./$(basename "$gif_file"))

## Demo Details

- **Scenario**: ${SCENARIO}
- **Duration**: ~${DURATION}s
- **Created**: $(date '+%Y-%m-%d %H:%M:%S')
- **Version**: CCJK v3.8

## Usage in Documentation

\`\`\`markdown
![CCJK ${SCENARIO} Demo](./assets/demo/output/$(basename "$gif_file"))
\`\`\`

## HTML Embed

\`\`\`html
<img src="./assets/demo/output/$(basename "$gif_file")" alt="CCJK ${SCENARIO} Demo" width="800">
\`\`\`

EOF

    log_success "Markdown embed created: ${md_file}"
}

# Cleanup
cleanup() {
    log_step "Cleaning up temporary files..."
    rm -rf "${TEMP_DIR}"
    log_success "Cleanup completed"
}

# Main execution
main() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    CCJK Demo Creator v3.8                   ║"
    echo "║              Professional Demo Recording Tool                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo

    # Handle help flag
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        echo "Usage: $0 [scenario] [output-name] [duration]"
        echo
        echo "Arguments:"
        echo "  scenario     Demo scenario to record (default: quick-install)"
        echo "  output-name  Output file name (default: ccjk-demo-[scenario])"
        echo "  duration     Recording duration hint in seconds (default: 60)"
        echo
        echo "Examples:"
        echo "  $0 quick-install"
        echo "  $0 skill-hotload my-demo 45"
        echo "  $0 tool-switch ccjk-switching-demo 30"
        echo
        list_scenarios
        exit 0
    fi

    # Handle list flag
    if [[ "${1:-}" == "--list" ]] || [[ "${1:-}" == "-l" ]]; then
        list_scenarios
        exit 0
    fi

    log_info "Creating demo for scenario: ${SCENARIO}"
    log_info "Output name: ${OUTPUT_NAME}"
    log_info "Expected duration: ${DURATION}s"
    echo

    # Execute steps
    check_dependencies
    setup_directories
    validate_scenario

    if record_demo; then
        convert_to_gif
        create_thumbnail
        generate_markdown

        echo
        log_success "Demo creation completed!"
        echo -e "${GREEN}${SPARKLES} Files created:${NC}"
        echo "  • Recording: ${TEMP_DIR}/${OUTPUT_NAME}.cast"
        if [ -f "${OUTPUT_DIR}/${OUTPUT_NAME}.gif" ]; then
            echo "  • GIF: ${OUTPUT_DIR}/${OUTPUT_NAME}.gif"
        fi
        if [ -f "${OUTPUT_DIR}/${OUTPUT_NAME}-thumb.gif" ]; then
            echo "  • Thumbnail: ${OUTPUT_DIR}/${OUTPUT_NAME}-thumb.gif"
        fi
        echo "  • Markdown: ${OUTPUT_DIR}/${OUTPUT_NAME}.md"
        echo
        echo -e "${CYAN}${ROCKET} Ready for social media and documentation!${NC}"
    else
        log_error "Demo creation failed"
        exit 1
    fi

    cleanup
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"