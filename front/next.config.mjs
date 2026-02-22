/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Necesario para Tauri
  trailingSlash: true, // Mejora la navegación en archivos locales
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Tauri no soporta optimización de imágenes en servidor
  },
}

export default nextConfig
