#!/usr/bin/env bash
# Padroniza labels (tipo, prioridade, épico, Story Points), milestones, issues da Sprint 8 e releases do repositório no GitHub.
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
ensure_label "epico: governanca"    "006b75" "Gestão do projeto: Scrum, roadmap, processo"

# Story Points (escala 1–5): 1 = simples e conhecido, 5 = complexo ou incerto
for sp in 1 2 3 4 5; do
  ensure_label "SP: $sp" "bfd4f2" "Story Points: $sp"
done

echo "== Milestones"
milestone_number() { gh api "repos/$REPO/milestones?state=all&per_page=100" -q ".[] | select(.title == \"$1\") | .number"; }
ensure_milestone() {
  local title="$1" desc="$2" state="${3:-open}"
  local num
  num=$(milestone_number "$title")
  if [[ -z "$num" ]]; then
    gh api "repos/$REPO/milestones" -f title="$title" -f description="$desc" >/dev/null
    echo "milestone criada: $title"
    num=$(milestone_number "$title")
  fi
  if [[ "$state" == "closed" ]]; then
    gh api -X PATCH "repos/$REPO/milestones/$num" -f state=closed >/dev/null
  fi
}
M01="v0.1.0 — Fundação do MVP"
M10="v1.0.0 — Primeira versão completa"
M11="v1.1.0 — Colunas pela UI e sync consistente"
M12="v1.2.0 — Estabilização"
M13="v1.3.0 — Header e navegação"
M14="v1.4.0 — Produtividade nos cards"
ensure_milestone "$M01" "Sprint 1. Boards, colunas, cartões, presença e cursores em tempo real." closed
ensure_milestone "$M10" "Sprints 2 a 4. PRD v1." closed
ensure_milestone "$M11" "Sprint 5. PRD v2." closed
ensure_milestone "$M12" "Sprint 6. Corrige o que está quebrado antes de novas funcionalidades. Ver ROADMAP.md."
ensure_milestone "$M13" "Sprint 7. Issues que alteram o header da board page, entregues juntas. Ver ROADMAP.md."
ensure_milestone "$M14" "Sprint 8. Produtividade nos cards e dívida técnica. Ver ROADMAP.md."

echo "== Backlog → milestones"
# Edita uma issue sem interromper o script se ela não existir.
edit_issue() { local n="$1"; shift; gh issue edit "$n" -R "$REPO" "$@" >/dev/null 2>&1 || echo "  #$n não encontrada, ignorada"; }
edit_issue 1 --milestone "$M01"
for n in $(seq 2 23);       do edit_issue "$n" --milestone "$M10"; done
for n in $(seq 24 32);      do edit_issue "$n" --milestone "$M11"; done
for n in 33 38;             do edit_issue "$n" --milestone "$M12"; done
for n in 34 35 36 37 40;    do edit_issue "$n" --milestone "$M13"; done
echo "issues #1–#40 associadas"

echo "== Sprint 8: divisão da #39 e dívida técnica"
# Cria a issue se não existir uma com o mesmo título; imprime o número.
ensure_issue() {
  local title="$1" labels="$2" body="$3" num
  num=$(gh issue list -R "$REPO" --state all --limit 500 --json number,title \
        -q ".[] | select(.title == \"$title\") | .number")
  if [[ -z "$num" ]]; then
    num=$(gh issue create -R "$REPO" --title "$title" --label "$labels" --milestone "$M14" --body "$body" | grep -o '[0-9]*$')
    echo "  issue criada: #$num $title"
  else
    echo "  já existe: #$num $title"
  fi
}
ensure_issue "Contador de cards por coluna" "tipo: feature,P2,epico: ux,SP: 1" \
  "Parte da #39. Exibir o total de cards no cabeçalho de cada coluna."
ensure_issue "Duplicar card" "tipo: feature,P2,epico: ux,SP: 2" \
  "Parte da #39. Cópia com labels, checklist e descrição, na mesma coluna."
ensure_issue "Quick-add de cards" "tipo: feature,P2,epico: ux,SP: 2" \
  "Parte da #39. Criar vários cards em sequência usando só Enter."
ensure_issue "Limite WIP por coluna" "tipo: feature,P2,epico: ux,SP: 3" \
  "Parte da #39. Coluna acima do limite fica destacada para todos os membros; limite sincronizado via WebSocket."
ensure_issue "Capa do card" "tipo: feature,P2,epico: ux,SP: 2" \
  "Parte da #39. Cor ou imagem de capa exibida no card."
ensure_issue "Cobertura do backend de volta a 70%" "tipo: testes,P1,epico: infra,SP: 3" \
  "Testes dos services de checklist, workspace, notification, assignee e email; subir o threshold do Jest para 70%."
ensure_issue "Adotar migrations versionadas do Prisma" "tipo: infra,P1,epico: infra,SP: 2" \
  "Remover server/prisma/migrations/ do .gitignore e deixar de usar prisma db push antes do primeiro deploy real."
ensure_issue "Configurar o board Scrum do projeto no Kanban Realtime" "tipo: docs,P1,epico: governanca,SP: 1" \
  "Criar o workspace Gestão do Projeto com um board do template Scrum e migrar o backlog para cards com labels de Story Points, épico e prioridade. Ver CONTRIBUTING.md."

if gh issue view 39 -R "$REPO" --json state -q .state 2>/dev/null | grep -q OPEN; then
  gh issue close 39 -R "$REPO" --reason "not planned" \
    --comment "Dividida no refinamento em issues menores: contador, duplicar, quick-add, WIP limit e capa do card (milestone $M14)." >/dev/null
  echo "  #39 fechada (dividida)"
fi

echo "== Story Points e épicos"
# número:SP:épico — estimativas do planejamento das Sprints (as issues da Sprint 8 já nascem com as labels)
for entry in \
  1:3:mvp \
  2:3:sync 3:3:infra 4:5:infra 8:2:ux 9:3:ux 16:3:infra \
  5:2:colaboracao 6:2:colaboracao 7:2:colaboracao 10:2:colaboracao 11:3:colaboracao 12:3:colaboracao 13:2:colaboracao 18:1:colaboracao \
  14:3:colaboracao 15:3:colaboracao 17:3:ux 19:2:ux 20:2:ux 21:1:ux 22:1:ux 23:2:ux \
  24:2:sync 25:1:sync 26:2:sync 27:3:sync 28:3:sync 29:2:sync 30:2:sync 31:2:sync 32:1:estabilizacao \
  33:3:estabilizacao 38:1:estabilizacao \
  35:1:ux 40:2:colaboracao 37:3:ux 34:2:ux 36:2:colaboracao; do
  IFS=: read -r n sp ep <<< "$entry"
  edit_issue "$n" --add-label "SP: $sp,epico: $ep"
done
echo "labels aplicadas"

if [[ "${1:-}" == "--releases" ]]; then
  echo "== Releases"
  notes() { awk -v h="## [$1]" 'index($0, h) == 1 {f=1; next} f && index($0, "## [") == 1 {exit} f' CHANGELOG.md; }
  for v in 0.1.0 1.0.0 1.1.0; do
    if gh release view "v$v" -R "$REPO" >/dev/null 2>&1; then continue; fi
    gh release create "v$v" -R "$REPO" --verify-tag --title "v$v" --notes "$(notes "$v")"
  done
fi

echo "Concluído."
