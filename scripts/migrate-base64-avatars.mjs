// Migra avatares gravados em base64 (profiles.avatar_url = "data:image/...")
// para o bucket público `avatars` do Supabase Storage.
//
//   node scripts/migrate-base64-avatars.mjs           # dry-run: só lista e mede
//   node scripts/migrate-base64-avatars.mjs --apply   # faz backup, sobe e atualiza o banco
//
// Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.
// Usa o `sharp` que já vem com o Next (redimensiona para 512 px, webp) — o
// bucket tem limite de 2 MB e os originais chegam a 3 MB.
//
// Backup: os originais decodificados vão para
//   <workspace>/backups/avatars-base64-<data>/<profile_id>.<ext> + manifest.json
// (fora dos repositórios). O avatar antigo NÃO é apagado de lugar nenhum além
// da coluna; para reverter, basta gravar de volta o data URL do manifest.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");

function loadEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}

const env = { ...loadEnv(join(__dirname, "..", ".env.local")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = "avatars";
const SIZE = 512;

const { data: profiles, error } = await supabase
  .from("profiles")
  .select("id, display_name, avatar_url")
  .like("avatar_url", "data:%");
if (error) throw error;

console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"} — ${profiles.length} perfil(is) com avatar base64\n`);
if (profiles.length === 0) process.exit(0);

const stamp = new Date().toISOString().slice(0, 10);
const backupDir = resolve(__dirname, "..", "..", "backups", `avatars-base64-${stamp}`);
const manifest = [];

for (const p of profiles) {
  const m = p.avatar_url.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is);
  if (!m) {
    console.log(`- ${p.display_name} (${p.id}): data URL não reconhecido, pulando`);
    continue;
  }
  const mime = m[1].toLowerCase();
  const original = Buffer.from(m[2], "base64");
  const ext = mime.split("/")[1].replace("jpeg", "jpg");

  const webp = await sharp(original).rotate().resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  console.log(
    `- ${p.display_name} (${p.id}): ${mime} ${(original.length / 1024).toFixed(0)} KB -> webp ${SIZE}px ${(webp.length / 1024).toFixed(0)} KB`,
  );

  if (!APPLY) continue;

  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, `${p.id}.${ext}`), original);
  manifest.push({ id: p.id, display_name: p.display_name, mime, bytes: original.length, data_url: p.avatar_url });
  writeFileSync(join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const path = `${p.id}/${Date.now()}.webp`;
  const up = await supabase.storage.from(BUCKET).upload(path, webp, { contentType: "image/webp", upsert: false });
  if (up.error) {
    console.error(`  ERRO no upload: ${up.error.message}`);
    continue;
  }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const upd = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", p.id);
  if (upd.error) {
    console.error(`  ERRO ao atualizar profiles: ${upd.error.message}`);
    continue;
  }
  console.log(`  OK -> ${publicUrl}`);
}

if (APPLY) console.log(`\nBackup dos originais em: ${backupDir}`);
else console.log("\nNada foi alterado. Rode com --apply para migrar.");
