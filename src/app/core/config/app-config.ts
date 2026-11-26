import { AppConfig } from './app-config.model';
import packageJson from '../../../../package.json';

/**
 * Saca la versión de zxing-wasm directamente de package.json (dependencies o
 * devDependencies), sin importar si viene fijada ("3.1.3") o con rango
 * ("^3.1.3", "~3.1.3"). Así nunca hay que tocar esto a mano: si actualizas
 * el paquete, la URL del CDN se actualiza sola.
 */

type DepMap = Record<string, string>;

const pkg = packageJson as {
  dependencies?: DepMap;
  devDependencies?: DepMap;
};

function obtenerVersionZxingWasm(): string {
  const raw =
    pkg.dependencies?.['zxing-wasm'] ??
    pkg.devDependencies?.['zxing-wasm'] ??
    '';

  return raw.replace(/^[^\d]*/, '') || '3.1.3';
}

const ZXING_WASM_VERSION = obtenerVersionZxingWasm();

export const APP_CONFIG: AppConfig = {
  // ========================================
  // LOCAL
  // ========================================
  apiUrl: 'http://localhost:8000/api/',
  apiBase: 'http://localhost:8000',
  apiLanUrl: 'http://192.168.100.86:8000/api/', // ← IP real de LAN
  tcpPort: '9100',
  empresa: '03',
  reverb: {
    key: 'skihewaszkyxb28di1za',
    host: 'localhost',
    port: 8080,
    scheme: 'http',
  },

  //OTROS
  appName: 'VIGIX',
  environment: 'dev',
  featureFlagX: true,
  
  // ========================================
  // LECTOR QR (zxing-wasm, solo rama iOS/Safari)
  // ========================================
  zxingWasmBaseUrl: `https://cdn.jsdelivr.net/npm/zxing-wasm@${ZXING_WASM_VERSION}/dist/reader/`,
};
