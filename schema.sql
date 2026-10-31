create table leads(id uuid primary key default gen_random_uuid(),name text,email text,company text,profile text,score int,signals jsonb,explanation text,stage text default 'new',step int default 0,last_contact timestamptz,created_at timestamptz default now());
create table drafts(id uuid primary key default gen_random_uuid(),lead_id uuid references leads on delete cascade,kind text,subject text,body text,why text,status text default 'pending',sent_at timestamptz,created_at timestamptz default now());
create table messages(id uuid primary key default gen_random_uuid(),lead_id uuid references leads on delete cascade,direction text,body text,at timestamptz default now());
create table calls(id uuid primary key default gen_random_uuid(),lead_id uuid references leads on delete set null,score int,result jsonb,created_at timestamptz default now());
create table payments(id uuid primary key default gen_random_uuid(),amount numeric,currency text,email text,created_at timestamptz default now());
create table settings(key text primary key,value text);
alter table leads enable row level security;alter table drafts enable row level security;alter table messages enable row level security;alter table calls enable row level security;alter table payments enable row level security;alter table settings enable row level security;
