import { supabase } from "./supabase";

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
