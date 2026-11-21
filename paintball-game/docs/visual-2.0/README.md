# SPLAT ARENA — VISUAL 2.0

Pacote de especificação e referências para Claude Code. **Não contém modelos 3D finais, rigs ou texturas PBR exportadas.**

## Como usar
1. Descompacte este pacote na raiz do repositório `splat-arena` (ou copie seus arquivos para a raiz).
2. Abra o repositório no Claude Code.
3. Execute `/splat-visual-upgrade` se a skill for reconhecida, ou peça: `Leia .claude/skills/splat-visual-upgrade/SKILL.md e execute o plano de implementação por etapas.`
4. Disponibilize ao Claude acesso aos arquivos do jogo e aos assets 3D necessários.
5. Revise o protótipo antes de autorizar a substituição de todos os cenários.

## Arquivos
- `VISUAL_SPEC.md`: especificação completa
- `ACCEPTANCE.md`: checklist de aceite
- `ASSET_MANIFEST.json`: lista de entregáveis 3D a produzir/adquirir
- `refs/`: imagens de direção de arte
- `.claude/skills/splat-visual-upgrade/SKILL.md`: skill de projeto para Claude Code

Não altere a lógica do jogo sem necessidade. O URL público é https://witterveloso.github.io/splat-arena/web/; a estrutura de código e os mapas reais devem ser confirmados no repositório.
