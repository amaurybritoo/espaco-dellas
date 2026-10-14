# Espaço Dellas — Página de links

Projeto separado baseado na estrutura anterior de página de links, com identidade visual própria: blush, marfim, champagne/rosé gold e textura suave de papel/tecido. Inclui página pública e painel administrativo. O catálogo de produtos não faz parte desta etapa.

## Funcionalidades
- Página pública mobile-first, com links gerenciáveis, compartilhamento, localização e mapa.
- Painel em `/admin` com autenticação, edição das informações, logo/fundo e gerenciamento de botões.
- Persistência no Supabase (Auth, REST API, Storage e tabelas do projeto).
- Estilo responsivo para celular e desktop.

## Dados padrão
- Instagram: https://www.instagram.com/espacodellasam/
- WhatsApp: https://wa.me/5592993258071
- Endereço: Avenida Tancredo Neves, 6, Parque 10 de Novembro, Manaus-AM, CEP 69054-040.
- Horários informados: segunda a sábado, 9h30–18h; feriados, 9h30–14h; domingo fechado.

## Configuração necessária antes de publicar
1. No **SQL Editor** do Supabase usado pelo site, execute `supabase/link_page.sql` para criar as tabelas, permissões e bucket `link-assets`.
2. Se esse Supabase já foi usado pela Demasi, execute em seguida `supabase/repair_espaco_dellas.sql`. Ele troca o perfil principal pelos dados do Espaço Dellas e remove apenas os cards antigos dessa página.
3. Em **Authentication > Users**, crie ou confirme o usuário que usará `/admin`. O usuário precisa pertencer ao mesmo projeto Supabase apontado pelo código.
4. Use somente URL e chave pública/publishable no frontend; nunca use a chave `service_role`.
5. Publique como projeto Vercel separado e teste `/` e `/admin` em celular e desktop.

## Importante
O painel não cria usuários do Supabase: o acesso é definido em Authentication. Logo e fundo enviados pelo painel são guardados no bucket `link-assets`. Não há catálogo desenvolvido nesta etapa.


## Nota importante de autenticação (v14)
A URL do projeto foi atualizada para `https://awlecfmaivubbxlfvysz.supabase.co` em `js/app.js` e `js/admin.js`. Confirme que a chave pública configurada nos dois arquivos pertence a esse mesmo projeto; se não pertencer, substitua-a pela chave publicável correta em **Supabase Dashboard → Settings → API Keys**. URL e chave precisam ser do mesmo projeto. Não use `service_role` nem uma chave secreta no frontend. A autenticação ainda precisa ser testada com a chave correspondente.


### Configuração Supabase (v16)

A URL do projeto foi atualizada para `https://awlecfmaivubbxlfvysz.supabase.co` em `js/app.js` e `js/admin.js`. A chave pública atualmente presente no código (`sb_publishable_...`) foi mantida porque não recebemos a chave pública do projeto de destino; confirme em **Supabase Dashboard → Settings → API Keys** que ela pertence ao projeto `awlecfmaivubbxlfvysz`. Se não pertencer, substitua `SUPABASE_KEY` nos dois arquivos pela chave publicável desse projeto. URL e chave precisam ser do mesmo projeto; não use `service_role` nem uma chave secreta no frontend.
