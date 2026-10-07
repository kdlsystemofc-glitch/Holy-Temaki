# Regras do projeto
- Os arquivos em /design são REFERÊNCIA VISUAL. NUNCA usar como <img>,
  background-image, ou qualquer parte do site.
- Todo texto é HTML real. Nenhum texto dentro de imagem.
- Toda imagem vem de /site/assets (fotos reais do cliente ou plates de /design/plates).
- Cores, fontes, espaçamentos: só via variáveis CSS definidas em DESIGN.md.
- Mobile-first, unidades fluidas (clamp), sem largura fixa em px para containers.
- Proibido: fonte Inter/Roboto/Arial, gradiente roxo genérico, cards idênticos
  em grid de 3, sombras padrão. Se o design mostra outra coisa, seguir o design.
- Ao terminar cada seção: screenshot em 1440, 1024, 768 e 390px, comparar com
  a referência, listar diferenças e corrigir (máx. 3 iterações).
- Ao fim de cada etapa: commit e push, com o mesmo método, sem persistir token.
