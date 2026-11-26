
import { Injectable } from '@angular/core';

export interface DeviceInfo {
    uuid: string;
    name: string;
    brand: string;
    model: string;
    device_type: 'desktop' | 'mobile' | 'tablet';
    operating_system: string;
    os_version: string;
    browser: string;
    browser_version: string;
    app_version: string;
    platform: string;
    metadata: {
        user_agent: string;
        language: string;
        screen: string;
    };
}

@Injectable({ providedIn: 'root' })
export class DeviceInfoService {

    async getDeviceInfo(): Promise<DeviceInfo> {
        const ua = navigator.userAgent;
        const uaData = (navigator as any).userAgentData;

        // UUID persistente por navegador.
        const storageKey = 'vigix_device_uuid';

        let uuid = localStorage.getItem(storageKey);

        if (!uuid) {
            uuid = crypto.randomUUID();
            localStorage.setItem(storageKey, uuid);
        }

        // Sistema operativo.
        let operatingSystem = 'Unknown';
        let osVersion = 'Unknown';

        if (/Windows NT 10/.test(ua)) {
            operatingSystem = 'Windows';
            osVersion = '10/11';
        } else if (/Windows NT 6.3/.test(ua)) {
            operatingSystem = 'Windows';
            osVersion = '8.1';
        } else if (/Android/.test(ua)) {
            operatingSystem = 'Android';
        } else if (/iPhone|iPad|iPod/.test(ua)) {
            operatingSystem = 'iOS';
        } else if (/Mac OS X/.test(ua)) {
            operatingSystem = 'macOS';
        } else if (/Linux/.test(ua)) {
            operatingSystem = 'Linux';
        }

        // Navegador.
        let browser = 'Unknown';
        let browserVersion = 'Unknown';

        const browserPatterns = [
            { name: 'Edge', regex: /Edg\/([\d.]+)/ },
            { name: 'Opera', regex: /OPR\/([\d.]+)/ },
            { name: 'Chrome', regex: /Chrome\/([\d.]+)/ },
            { name: 'Firefox', regex: /Firefox\/([\d.]+)/ },
            { name: 'Safari', regex: /Version\/([\d.]+).*Safari/ },
        ];

        for (const item of browserPatterns) {
            const match = ua.match(item.regex);

            if (match) {
                browser = item.name;
                browserVersion = match[1];
                break;
            }
        }

        // Tipo de dispositivo.
        const isTablet =
            /iPad|Tablet/i.test(ua) ||
            (uaData?.mobile === false && /Android/i.test(ua));

        const isMobile =
            uaData?.mobile === true ||
            /Android|iPhone|iPod|Mobile/i.test(ua);

        const deviceType = isTablet
            ? 'tablet'
            : isMobile
                ? 'mobile'
                : 'desktop';

        // Marca y modelo.
        let brand = 'Generic';
        let model = deviceType === 'desktop' ? 'Desktop' : 'Unknown';

        if (uaData) {
            try {
                const highEntropy = await uaData.getHighEntropyValues([
                    'model',
                    'platformVersion',
                    'fullVersionList',
                ]);

                model = highEntropy.model || model;
                osVersion = highEntropy.platformVersion || osVersion;

                const brands = highEntropy.fullVersionList ?? uaData.brands;

                if (brands?.length) {
                    brand = brands[0].brand;
                }
            } catch {
                // Se utilizan los datos disponibles del navegador.
            }
        }

        if (/Samsung/i.test(ua)) brand = 'Samsung';
        if (/iPhone|iPad|Macintosh/i.test(ua)) brand = 'Apple';

        const deviceName = `${operatingSystem} ${deviceType}`;

        return {
            uuid,
            name: deviceName,
            brand,
            model,
            device_type: deviceType,
            operating_system: operatingSystem,
            os_version: osVersion,
            browser,
            browser_version: browserVersion,
            app_version: '1.0.0',
            platform: 'web',

            metadata: {
                user_agent: ua,
                language: navigator.language,
                screen: `${screen.width}x${screen.height}`,
            },
        };
    }
}
