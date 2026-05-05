#!/bin/bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}  ████████╗██████╗ ██╗ ██████╗ ██████╗ ${NC}"
echo -e "${BOLD}${CYAN}     ██╔══╝██╔══██╗██║██╔════╝ ██╔══██╗${NC}"
echo -e "${BOLD}${CYAN}     ██║   ██████╔╝██║██║  ███╗██████╔╝${NC}"
echo -e "${BOLD}${CYAN}     ██║   ██╔══██╗██║██║   ██║██╔══██╗${NC}"
echo -e "${BOLD}${CYAN}     ██║   ██║  ██║██║╚██████╔╝██║  ██║${NC}"
echo -e "${BOLD}${CYAN}     ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═╝${NC}"
echo ""
echo -e "  ${BOLD}Assistant IA personnel — Installation${NC}"
echo ""

# ── Vérifications ─────────────────────────────────────────────────────────────

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker non trouvé.${NC}"
  echo "  → Installe Docker : https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version &> /dev/null 2>&1; then
  echo -e "${RED}✗ Docker Compose v2 non trouvé.${NC}"
  echo "  → Mets à jour Docker Desktop ou installe le plugin compose."
  exit 1
fi

echo -e "${GREEN}✓ Docker détecté${NC}"

# ── Téléchargement ────────────────────────────────────────────────────────────

INSTALL_DIR="$HOME/trigr"
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}⚠ Dossier $INSTALL_DIR déjà existant — mise à jour...${NC}"
  cd "$INSTALL_DIR"
  git pull --quiet 2>/dev/null || true
else
  echo -e "\n${BOLD}Téléchargement de Trigr...${NC}"
  git clone --quiet https://github.com/victorseiler/trigr "$INSTALL_DIR" 2>/dev/null || {
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    # Fallback : copier les fichiers nécessaires depuis le répertoire courant si git non dispo
    cp -r "$(dirname "$0")"/* . 2>/dev/null || true
  }
  cd "$INSTALL_DIR"
fi

# ── Configuration ─────────────────────────────────────────────────────────────

if [ ! -f ".env" ]; then
  echo ""
  echo -e "${BOLD}Configuration (appuie sur Entrée pour passer une étape)${NC}"
  echo ""

  cp .env.example .env

  read -p "  Clerk Publishable Key (pk_live_...) : " CLERK_PUB
  read -p "  Clerk Secret Key (sk_live_...)       : " CLERK_SEC
  read -p "  Groq API Key (gsk_...)               : " GROQ_KEY
  read -p "  Whapi Token                          : " WHAPI_TOK
  read -p "  Mot de passe admin n8n [changeme]    : " N8N_PWD
  N8N_PWD=${N8N_PWD:-changeme}

  # Écrit les valeurs dans .env
  sed -i "s|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PUB}|" .env
  sed -i "s|CLERK_SECRET_KEY=.*|CLERK_SECRET_KEY=${CLERK_SEC}|" .env
  sed -i "s|GROQ_API_KEY=.*|GROQ_API_KEY=${GROQ_KEY}|" .env
  sed -i "s|WHAPI_TOKEN=.*|WHAPI_TOKEN=${WHAPI_TOK}|" .env
  sed -i "s|N8N_PASSWORD=.*|N8N_PASSWORD=${N8N_PWD}|" .env

  echo ""
  echo -e "${GREEN}✓ .env configuré${NC}"
else
  echo -e "${GREEN}✓ .env existant conservé${NC}"
fi

# ── Lancement ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Démarrage de Trigr...${NC}"
docker compose pull --quiet
docker compose up -d --build

echo ""
echo -e "${GREEN}${BOLD}✓ Trigr est en ligne !${NC}"
echo ""
echo -e "  ${BOLD}Assistant IA :${NC}  http://localhost:3000"
echo -e "  ${BOLD}n8n workflows :${NC} http://localhost:5678"
echo ""
echo -e "  Pour arrêter  : ${CYAN}docker compose down${NC}"
echo -e "  Pour les logs : ${CYAN}docker compose logs -f trigr${NC}"
echo ""
