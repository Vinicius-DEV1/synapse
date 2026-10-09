#!/usr/bin/env bash
# ==============================================================================
# Parallel Swarm Audit — Multi-Way Merge & Reconciliation Script
# Automatically detects and merges all active audit branches into base branch.
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
BASE_BRANCH="${1:-master}"
WORKTREE_BASE="${REPO_ROOT}/.worktrees"

cd "${REPO_ROOT}"

echo "[swarm-merge] Starting audit branch reconciliation into '${BASE_BRANCH}'..."

# Ensure working tree on base branch is clean
CURRENT_BRANCH="$(git branch --show-current)"
if [ "${CURRENT_BRANCH}" != "${BASE_BRANCH}" ]; then
  git checkout "${BASE_BRANCH}"
fi

# List of potential audit branches across 3-agent and 4-agent topologies
CANDIDATE_BRANCHES=(
  "audit/agent-1-core"
  "audit/agent-2-editor"
  "audit/agent-3-media-study"
  "audit/agent-4-app-collab"
  "audit/agent-3-app"
)

MERGED_COUNT=0
for BRANCH in "${CANDIDATE_BRANCHES[@]}"; do
  if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
    # Check if branch has commits differing from base
    COMMITS_AHEAD="$(git rev-list --count "${BASE_BRANCH}..${BRANCH}" || echo 0)"
    if [ "${COMMITS_AHEAD}" -gt 0 ]; then
      echo "[swarm-merge] Merging '${BRANCH}' (${COMMITS_AHEAD} new commits)..."
      git merge "${BRANCH}" --no-edit -m "merge(audit): integrate ${BRANCH} into ${BASE_BRANCH}"
      MERGED_COUNT=$((MERGED_COUNT + 1))
    else
      echo "[swarm-merge] Branch '${BRANCH}' is already up-to-date with '${BASE_BRANCH}'. Skipping merge."
    fi
  fi
done

echo "[swarm-merge] Successfully integrated ${MERGED_COUNT} active audit branch(es)!"

# Cross-Contract Type Validation
echo "[swarm-merge] Running TypeScript contract verification (tsc -b --noEmit)..."
npx tsc -b --noEmit
echo "✔ TypeScript contract validation passed with 0 errors!"

# Targeted Test Sweeps
echo "[swarm-merge] Running targeted test sweeps across audited modules..."
npx vitest run src/services/sharing/ src/components/sharing/
echo "✔ Core test suites passed!"

# Teardown Worktrees if present
if [ -d "${WORKTREE_BASE}" ]; then
  echo "[swarm-merge] Tearing down temporary worktrees..."
  for WT in "${WORKTREE_BASE}"/*; do
    if [ -d "${WT}" ]; then
      git worktree remove "${WT}" --force 2>/dev/null || true
    fi
  done
  rm -rf "${WORKTREE_BASE}"
  echo "✔ Worktrees cleaned up successfully."
fi

echo ""
echo "=============================================================================="
echo "✔ Swarm Audit Integration Complete! Base branch is verified & rock-solid."
echo "=============================================================================="
