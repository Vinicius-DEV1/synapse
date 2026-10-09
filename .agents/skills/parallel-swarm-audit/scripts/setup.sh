#!/usr/bin/env bash
# ==============================================================================
# Parallel Swarm Audit — Worktree Setup Script
# Supports 3-Agent or 4-Agent (Dual-Account 2x2) Swarm Modes
# Creates isolated git worktrees with symlinked node_modules for instant 0-cost execution.
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
BASE_BRANCH="${1:-master}"
MODE="${2:-quad}" # '3' or 'quad' (default: quad / 4 agents)
WORKTREE_BASE="${REPO_ROOT}/.worktrees"

echo "[swarm-setup] Initializing parallel audit worktrees (Mode: ${MODE}) from '${BASE_BRANCH}'..."

# 1. Ensure .worktrees is ignored by Git
if ! grep -qs "^\.worktrees" "${REPO_ROOT}/.gitignore"; then
  echo -e "\n# Parallel Swarm Audit Worktrees\n.worktrees/" >> "${REPO_ROOT}/.gitignore"
  echo "[swarm-setup] Added .worktrees/ to .gitignore"
fi

mkdir -p "${WORKTREE_BASE}"

# 2. Define Swarm Agents based on Mode
declare -A AGENTS
if [ "${MODE}" = "3" ]; then
  AGENTS=(
    ["agent-1-core"]="audit/agent-1-core"
    ["agent-2-editor"]="audit/agent-2-editor"
    ["agent-3-app"]="audit/agent-3-app"
  )
else
  # Quad Mode (4 Agents across 2 AI Pro Accounts)
  AGENTS=(
    ["agent-1-core"]="audit/agent-1-core"
    ["agent-2-editor"]="audit/agent-2-editor"
    ["agent-3-media-study"]="audit/agent-3-media-study"
    ["agent-4-app-collab"]="audit/agent-4-app-collab"
  )
fi

# 3. Create Branches and Worktrees
for AGENT in "${!AGENTS[@]}"; do
  BRANCH="${AGENTS[$AGENT]}"
  TARGET_DIR="${WORKTREE_BASE}/${AGENT}"

  echo "[swarm-setup] Setting up ${AGENT} on branch ${BRANCH}..."

  # Create branch if it doesn't exist
  if ! git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
    git branch "${BRANCH}" "${BASE_BRANCH}"
  fi

  # Add worktree if not already mounted
  if [ ! -d "${TARGET_DIR}" ]; then
    git worktree add "${TARGET_DIR}" "${BRANCH}"
  else
    echo "[swarm-setup] Worktree ${TARGET_DIR} already exists. Skipping."
  fi

  # Symlink node_modules to avoid duplicating hundreds of MBs and npm install wait
  if [ -d "${REPO_ROOT}/node_modules" ] && [ ! -e "${TARGET_DIR}/node_modules" ]; then
    ln -s "${REPO_ROOT}/node_modules" "${TARGET_DIR}/node_modules"
    echo "[swarm-setup] Symlinked node_modules for ${AGENT}."
  fi

  # Symlink .env if present
  if [ -f "${REPO_ROOT}/.env" ] && [ ! -e "${TARGET_DIR}/.env" ]; then
    ln -s "${REPO_ROOT}/.env" "${TARGET_DIR}/.env"
    echo "[swarm-setup] Symlinked .env for ${AGENT}."
  fi
done

echo ""
echo "=============================================================================="
echo "✔ Swarm Setup Complete (${MODE} mode)! Worktrees ready at: ${WORKTREE_BASE}"
for AGENT in "${!AGENTS[@]}"; do
  echo "  - ${AGENT}: ${WORKTREE_BASE}/${AGENT} (${AGENTS[$AGENT]})"
done
echo "=============================================================================="
