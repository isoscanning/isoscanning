import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import withPWAInit from '@ducanh2912/next-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async redirects() {
    return [
      // Tela antiga de disponibilidade: ficou órfã (nada linkava para ela) e
      // usava o modelo de dados anterior, enviando `type: "unavailable"` — valor
      // que o CreateAvailabilityDto rejeita, então todo salvamento dava 400.
      // A gestão de agenda vive em /dashboard/agenda.
      //
      // Fica aqui, e não como `redirect()` na própria rota, porque
      // app/dashboard/layout.tsx é "use client": dentro desse boundary o
      // redirect() é serializado no payload RSC e só acontece depois da
      // hidratação (responde 200 e pisca a tela). Em `redirects()` o Next
      // resolve antes de qualquer render, devolvendo 308 com Location.
      {
        source: '/dashboard/agenda/disponibilidade',
        destination: '/dashboard/agenda',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': resolve(__dirname, '.'),
    };
    return config;
  },
}

export default withPWA(nextConfig)
