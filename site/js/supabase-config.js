// Barba Negra Barbershop — credenciais públicas do projeto Supabase.
// A anon key é segura pra ficar aqui (pública por design); quem protege
// os dados são as políticas de RLS em supabase/schema.sql, não o sigilo
// dessa chave. Veja supabase/SETUP.md pra gerar essas duas linhas.

const SUPABASE_URL = "https://hhzsqgrfxsugqzyqnmso.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoenNxZ3JmeHN1Z3F6eXFubXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDE1NzgsImV4cCI6MjA5ODY3NzU3OH0.T9lf-nIZsyJe3wOU5VHySr39wDUZUOMkjmmiyvrMFTQ";

window.sbClient =
  typeof supabase !== "undefined" && /^https?:\/\//.test(SUPABASE_URL)
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
