import { supabase } from "./supabase";
import imageCompression from "browser-image-compression";

/** Garante que o client do Storage usa a sessão do usuário (tokens ficam no localStorage). */
async function syncSession() {
    const token = localStorage.getItem("auth_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (token) {
        await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken || "",
        });
    }
}

/**
 * Foto de perfil: comprime no navegador (≤ 512 px, webp) e sobe para o bucket
 * público `avatars` em <userId>/<timestamp>.webp (policies da SQL 61 exigem a
 * pasta do próprio usuário). Devolve a URL pública para gravar em
 * profiles.avatar_url.
 *
 * Antes o perfil gravava a imagem em base64 (1–4 MB) direto no banco — isso
 * derrubava o SSR da comunidade e inflava toda resposta da API com perfil.
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
    let toUpload: Blob = file;
    try {
        toUpload = await imageCompression(file, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 512,
            useWebWorker: true,
            initialQuality: 0.85,
            fileType: "image/webp",
        });
    } catch (err) {
        console.warn("[supabase-storage] compressão do avatar falhou, enviando original", err);
    }

    await syncSession();

    const path = `${userId}/${Date.now()}.webp`;
    const { error } = await supabase.storage
        .from("avatars")
        .upload(path, toUpload, { contentType: toUpload.type || "image/webp", upsert: false });

    if (error) {
        console.error("[supabase-storage] Error uploading avatar:", error);
        throw new Error("Erro ao enviar a foto de perfil");
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    return publicUrl;
}

export async function uploadFile(
    file: File,
    bucket: string
): Promise<string> {
    try {
        // Ensure Supabase client has the session from localStorage
        const token = localStorage.getItem("auth_token");
        const refreshToken = localStorage.getItem("refresh_token");

        if (token) {
            await supabase.auth.setSession({
                access_token: token,
                refresh_token: refreshToken || "",
            });
        }

        const fileExt = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '');
        // Generate a unique file name
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}_${safeName}.${fileExt}`;

        const { error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error(`[supabase-storage] Error uploading to bucket ${bucket}:`, error);
        throw new Error("Erro ao fazer upload do arquivo");
    }
}
