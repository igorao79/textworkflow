import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Настраиваем webpack для правильной обработки модулей
  webpack: (config, { isServer: _isServer }) => {
    // Исключаем проблемные модули из бандла
    config.externals = config.externals || [];
    config.externals.push({
      'pg': 'commonjs pg',
      'bull': 'commonjs bull',
      'worker_threads': 'commonjs worker_threads',
    });

    // Игнорируем worker_threads для всех сред
    config.resolve.fallback = {
      ...config.resolve.fallback,
      worker_threads: false,
    };

    return config;
  },
};

export default nextConfig;
