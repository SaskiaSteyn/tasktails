#!/usr/bin/env bash
#
# Creates the module and type labels that sync-issues.sh applies.
# gh issue create FAILS on a label that does not exist, so run this first.
# Safe to re-run — existing labels are left alone.

set -euo pipefail

REPO="SaskiaSteyn/tasktails"

label() {
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" 2>/dev/null \
    && echo "created: $1" \
    || echo "exists:  $1"
}

# Modules — one per value in the Module column of Features.csv
label "module: Infrastructure & Database" "2E2A26" "Schema, layout shell, deployment"
label "module: Authentication"            "E27A54" "Register, login, session, OAuth"
label "module: TODO App"                  "5FA97E" "Tasks, subtasks, economy, onboarding"
label "module: Store"                     "E5A93C" "Catalogue, cart, checkout, history"
label "module: Store — False Urgency"     "DB4C3F" "Group B stimuli only"
label "module: Petting Zoo"               "8478C4" "Sanctuary, pets, customize"
label "module: Admin Dashboard"           "5C5470" "Researcher telemetry views"
label "module: Profile & Settings"        "B67F1E" "Profile, stats, achievements, settings"
label "module: Shared UI & States"        "8A8178" "Nav, modals, empty/error/locked states"
label "module: Marketing & Public Site"   "3F8C63" "Marketing site and landing screen"

# Types
label "type: Frontend"       "FBEAE3" "UI work"
label "type: Backend"        "E7F0E9" "API routes and services"
label "type: Database"       "EEE9F5" "Prisma schema and seeds"
label "type: Infrastructure" "EFE7DA" "Docker, env, deployment"

# Priority — only applied where a ticket is explicitly deprioritised
label "priority: low" "D8CEC0" "Nice to have; not on the critical path for the study"
