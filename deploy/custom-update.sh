#!/usr/bin/env bash
# Update a self-hosted Sub2API fork from a Git branch, build a local Docker image,
# and restart the Docker Compose deployment.

set -euo pipefail

SUB2API_REPO_URL="${SUB2API_REPO_URL:-https://github.com/bls-dan/sub2api.git}"
SUB2API_BRANCH="${SUB2API_BRANCH:-custom/image-studio}"
SUB2API_SOURCE_DIR="${SUB2API_SOURCE_DIR:-/opt/sub2api-source}"
SUB2API_IMAGE="${SUB2API_IMAGE:-sub2api-custom:custom-image-studio}"
SUB2API_GITHUB_REPO="${SUB2API_GITHUB_REPO:-bls-dan/sub2api}"
UPDATE_GITHUB_REPO="${UPDATE_GITHUB_REPO:-${SUB2API_GITHUB_REPO}}"
SUB2API_COMPOSE_FILE="${SUB2API_COMPOSE_FILE:-docker-compose.local.yml}"

log() {
    printf '[sub2api-update] %s\n' "$*"
}

die() {
    printf '[sub2api-update] ERROR: %s\n' "$*" >&2
    exit 1
}

need_cmd() {
    command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        docker compose "$@"
    elif command -v docker-compose >/dev/null 2>&1; then
        docker-compose "$@"
    else
        die "missing Docker Compose. Install docker compose v2 or docker-compose."
    fi
}

upsert_env() {
    local file="$1"
    local key="$2"
    local value="$3"

    touch "$file"
    if grep -qE "^${key}=" "$file"; then
        if sed --version >/dev/null 2>&1; then
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        else
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
        fi
    else
        printf '\n%s=%s\n' "$key" "$value" >> "$file"
    fi
}

need_cmd git
need_cmd docker

if [ ! -d "$SUB2API_SOURCE_DIR/.git" ]; then
    log "cloning ${SUB2API_REPO_URL} (${SUB2API_BRANCH}) to ${SUB2API_SOURCE_DIR}"
    git clone --branch "$SUB2API_BRANCH" "$SUB2API_REPO_URL" "$SUB2API_SOURCE_DIR"
else
    log "updating source tree in ${SUB2API_SOURCE_DIR}"
    git -C "$SUB2API_SOURCE_DIR" fetch origin "$SUB2API_BRANCH"
    git -C "$SUB2API_SOURCE_DIR" checkout "$SUB2API_BRANCH"
    git -C "$SUB2API_SOURCE_DIR" pull --ff-only origin "$SUB2API_BRANCH"
fi

COMPOSE_DIR="${SUB2API_COMPOSE_DIR:-${SUB2API_SOURCE_DIR}/deploy}"
COMPOSE_PATH="${COMPOSE_DIR}/${SUB2API_COMPOSE_FILE}"
ENV_FILE="${COMPOSE_DIR}/.env"

[ -f "$COMPOSE_PATH" ] || die "compose file not found: ${COMPOSE_PATH}"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f "${COMPOSE_DIR}/.env.example" ]; then
        log "creating ${ENV_FILE} from .env.example; review secrets before production use"
        cp "${COMPOSE_DIR}/.env.example" "$ENV_FILE"
    else
        log "creating empty ${ENV_FILE}"
        touch "$ENV_FILE"
    fi
fi

upsert_env "$ENV_FILE" "SUB2API_IMAGE" "$SUB2API_IMAGE"
upsert_env "$ENV_FILE" "UPDATE_GITHUB_REPO" "$UPDATE_GITHUB_REPO"

log "building image ${SUB2API_IMAGE}"
SUB2API_IMAGE="$SUB2API_IMAGE" "${SUB2API_SOURCE_DIR}/deploy/build_image.sh"

log "recreating services with ${COMPOSE_PATH}"
compose_cmd --env-file "$ENV_FILE" -f "$COMPOSE_PATH" up -d

log "done. Current commit:"
git -C "$SUB2API_SOURCE_DIR" --no-pager log --oneline -1
