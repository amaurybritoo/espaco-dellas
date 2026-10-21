-- Espaço Dellas · campos usados pelo painel avançado do catálogo
-- Execute no SQL Editor do Supabase uma única vez (ou com segurança várias vezes).

alter table public.link_page_products
  add column if not exists original_price numeric(10,2),
  add column if not exists promo_type text,
  add column if not exists promo_qty integer,
  add column if not exists promo_price numeric(10,2),
  add column if not exists sizes text not null default '',
  add column if not exists colors text not null default '',
  add column if not exists featured boolean not null default false,
  add column if not exists carousel_enabled boolean not null default true,
  add column if not exists set_mode text not null default 'complete',
  add column if not exists top_name text,
  add column if not exists top_price numeric(10,2),
  add column if not exists bottom_name text,
  add column if not exists bottom_price numeric(10,2);

-- Mantém a opção antiga do carrossel sincronizada com a nova configuração do painel.
update public.link_page_products
set carousel_enabled = show_in_carousel
where carousel_enabled is distinct from show_in_carousel;
