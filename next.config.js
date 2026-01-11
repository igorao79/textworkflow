/** @type {import('next').NextConfig} */
const nextConfig = {
  // Используем webpack вместо Turbopack для совместимости
  experimental: {
    webpackBuildWorker: false,
  },
  // Настраиваем webpack для правильной обработки модулей
  webpack: (config, { isServer }) => {
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

module.exports = nextConfig;
