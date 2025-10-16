rules_version = '2';
service firebase.storage {
match /b/{bucket}/o {

    // ===== EQUIPMENT IMAGES =====
    // Imagens de equipamentos - públicas para visualização, privadas para upload
    match /equipment-images/{userId}/{fileName} {
      // Qualquer pessoa pode visualizar imagens de equipamentos
      allow read: if true;

      // Apenas o dono pode fazer upload
      allow create: if request.auth != null &&
                       request.auth.uid == userId &&
                       request.resource.size <= 1 * 1024 * 1024 && // Máximo 1MB
                       request.resource.contentType in [
                         'image/jpeg',
                         'image/jpg',
                         'image/png',
                         'image/webp'
                       ] &&
                       // Validar nome do arquivo (formato esperado)
                       fileName.matches('^' + request.auth.uid + '_[0-9]+_.+$');

      // Apenas o dono pode sobrescrever ou deletar
      allow update: if request.auth != null &&
                       request.auth.uid == userId;

      allow delete: if request.auth != null &&
                       request.auth.uid == userId;
    }

    // ===== USER PROFILE IMAGES (se necessário no futuro) =====
    match /profile-images/{userId}/{fileName} {
      // Qualquer pessoa pode ver fotos de perfil
      allow read: if true;

      // Apenas o dono pode fazer upload
      allow create: if request.auth != null &&
                       request.auth.uid == userId &&
                       request.resource.size <= 2 * 1024 * 1024 && // Máximo 2MB
                       request.resource.contentType in [
                         'image/jpeg',
                         'image/jpg',
                         'image/png',
                         'image/webp'
                       ];

      // Apenas o dono pode atualizar ou deletar
      allow update, delete: if request.auth != null &&
                                   request.auth.uid == userId;
    }

    // ===== PORTFOLIO IMAGES (se necessário no futuro) =====
    match /portfolio-images/{userId}/{fileName} {
      // Qualquer pessoa pode ver portfólio
      allow read: if true;

      // Apenas o dono pode fazer upload
      allow create: if request.auth != null &&
                       request.auth.uid == userId &&
                       request.resource.size <= 5 * 1024 * 1024 && // Máximo 5MB
                       request.resource.contentType in [
                         'image/jpeg',
                         'image/jpg',
                         'image/png',
                         'image/webp',
                         'video/mp4',
                         'video/quicktime'
                       ];

      // Apenas o dono pode atualizar ou deletar
      allow update, delete: if request.auth != null &&
                                   request.auth.uid == userId;
    }

    // ===== BLOQUEAR ACESSO A OUTROS DIRETÓRIOS =====
    match /{allPaths=**} {
      allow read, write: if false;
    }

}
}
