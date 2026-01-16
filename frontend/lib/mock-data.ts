export const MOCK_AVATARS = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop", // Woman portrait
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop", // Man portrait
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=200&auto=format&fit=crop", // Woman portrait
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop", // Man portrait
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop", // Woman portrait
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop", // Man portrait
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop", // Woman portrait
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200&auto=format&fit=crop", // Man portrait
];

export const MOCK_PORTFOLIO = [
    "https://images.unsplash.com/photo-1554048612-387768052bf7?q=80&w=800&auto=format&fit=crop", // Studio
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop", // Camera
    "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=800&auto=format&fit=crop", // Photography
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop", // Data/Screen
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=800&auto=format&fit=crop", // Landscape
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop", // Nature
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800&auto=format&fit=crop", // Meeting
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop", // Team
    "https://images.unsplash.com/photo-1537511446984-935f663eb1f4?q=80&w=800&auto=format&fit=crop", // Work
];

/**
 * Returns a deterministic mock avatar URL based on the ID string.
 * This ensures the same ID always gets the same image.
 */
export function getMockAvatar(id: string): string {
    if (!id) return MOCK_AVATARS[0];
    const index = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return MOCK_AVATARS[index % MOCK_AVATARS.length];
}

/**
 * Returns a deterministic mock portfolio image URL based on the ID string.
 */
export function getMockPortfolioImage(id: string): string {
    if (!id) return MOCK_PORTFOLIO[0];
    const index = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return MOCK_PORTFOLIO[index % MOCK_PORTFOLIO.length];
}

/**
 * Generates a list of mock portfolio items.
 */
export function generateMockPortfolioItems(count: number = 6) {
    return Array.from({ length: count }).map((_, i) => ({
        id: `mock-portfolio-${i}`,
        title: `Projeto ${i + 1}`,
        description: "Exemplo de trabalho realizado com excelência e criatividade.",
        imageUrls: [MOCK_PORTFOLIO[i % MOCK_PORTFOLIO.length]],
        category: i % 2 === 0 ? "Fotografia" : "Vídeo",
    }));
}
