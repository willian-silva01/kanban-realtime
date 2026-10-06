#!/usr/bin/env bash
# Padroniza labels, milestones e releases do repositório no GitHub.
# Idempotente: pode ser executado várias vezes. Requer `gh auth login`.
#
#   bash scripts/github/setup-project.sh            # labels + milestones
#   bash scripts/github/setup-project.sh --releases # também publica releases das tags
set -euo pipefail

REPO="willian-silva01/kanban-realtime"

label_exists() { gh label list -R "$REPO" --limit 200 --json name -q '.[].name' | grep -Fxq "$1"; }

# Garante que NEW exista com cor/descrição. Se OLD existir, migra as issues
# de OLD para NEW e remove OLD (o GitHub não tem "merge" de labels).
ensure_label() {
  local new="$1" color="$2" desc="$3" old="${4:-}"
  if [[ -n "$old" ]] && label_exists "$old"; then
    if label_exists "$new"; then
      for n in $(gh issue list -R "$REPO" --label "$old" --state all --limit 500 --json number -q '.[].number'); do
        gh issue edit "$n" -R "$REPO" --add-label "$new" --remove-label "$old" >/dev/null
        echo "  #$n: $old → $new"
      done
      gh label delete "$old" -R "$REPO" --yes
      echo "label removida: $old"
    else
      gh label edit "$old" -R "$REPO" --name "$new"
      echo "label renomeada: $old → $new"
    fi
  fi
  if label_exists "$new"; then
    gh label edit "$new" -R "$REPO" --color "$color" --description "$desc" >/dev/null
  else
    gh label create "$new" -R "$REPO" --color "$color" --description "$desc"
  fi
}

echo "== Labels"
ensure_label "P0" "b60205" "Bloqueante — entra antes de tudo"     "P0 - Critico"
ensure_label "P1" "d93f0b" "Importante — próximo ciclo"            "P1 - Importante"
ensure_label "P2" "fbca04" "Desejável"                             "P2 - Desejavel"

ensure_label "tipo: bug"      "d73a4a" "Algo não funciona como deveria" "bug"
ensure_label "tipo: feature"  "a2eeef" "Nova funcionalidade ou melhoria" "enhancement"
ensure_label "tipo: docs"     "0075ca" "Documentação"                    "documentation"
ensure_label "tipo: refactor" "c5def5" "Mudança interna sem alterar comportamento"
ensure_label "tipo: infra"    "5319e7" "CI/CD, Docker, deploy, ambiente"
ensure_label "tipo: testes"   "0e8a16" "Testes automatizados"

ensure_label "epico: estabilizacao" "006b75" "Correções e robustez"
ensure_label "epico: sync"          "006b75" "Sincronização WebSocket"           "epico:sync"
ensure_label "epico: ux"            "006b75" "Experiência e interface"           "epico:ux"
ensure_label "epico: colaboracao"   "006b75" "Funcionalidades colaborativas"     "epico:colaboracao"
ensure_label "epico: infra"         "006b75" "Infraestrutura"
ensure_label "epico: mvp"           "006b75" "Escopo do MVP"

echo "== Milestones"
ensure_milestone() {
  local title="$1" desc="$2"
  if ! gh api "repos/$REPO/milestones?state=all&per_page=100" -q '.[].title' | grep -Fxq "$title"; then
    gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" >/dev/null
    echo "milestone criada: $title"
  fi
}
M12="v1.2.0 — Estabilização"
M13="v1.3.0 — Header e navegação"
M14="v1.4.0 — Produtividade nos cards"
ensure_milestone "$M12" "Corrige o que está quebrado antes de novas funcionalidades. Ver ROADMAP.md."
ensure_milestone "$M13" "Issues que alteram o header da board page, entregues juntas. Ver ROADMAP.md."
ensure_milestone "$M14" "Melhorias de produtividade nos cards. Ver ROADMAP.md."

echo "== Backlog → milestones"
for n in 33 38;             do gh issue edit "$n" -R "$REPO" --milestone "$M12" >/dev/null; done
for n in 34 35 36 37 40;    do gh issue edit "$n" -R "$REPO" --milestone "$M13" >/dev/null; done
gh issue edit 39 -R "$REPO" --milestone "$M14" >/dev/null
gh issue edit 38 -R "$REPO" --add-label "epico: estabilizacao" >/dev/null
echo "issues #33–#40 associadas"

if [[ "${1:-}" == "--releases" ]]; then
  echo "== Releases"
  notes() { awk -v h="## [$1]" 'index($0, h) == 1 {f=1; next} f && index($0, "## [") == 1 {exit} f' CHANGELOG.md; }
  for v in 0.1.0 1.0.0 1.1.0; do
    if gh release view "v$v" -R "$REPO" >/dev/null 2>&1; then continue; fi
    gh release create "v$v" -R "$REPO" --verify-tag --title "v$v" --notes "$(notes "$v")"
  done
fi

echo "Concluído."
