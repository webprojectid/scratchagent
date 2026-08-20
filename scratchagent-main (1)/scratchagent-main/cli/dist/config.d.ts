interface Config {
    token: string;
    baseUrl: string;
    planId?: string;
}
export declare function loadConfig(): Config | null;
export declare function saveConfig(config: Config): void;
export declare function getToken(): string | null;
export declare function getBaseUrl(): string;
export {};
