import { useState, useEffect, useCallback } from "react";

const KEYS = {
  enabled: "arkme-demo.aiEnabled",
  apiKey: "arkme-demo.aiApiKey",
  baseUrl: "arkme-demo.aiBaseUrl",
  model: "arkme-demo.aiModel",
} as const;

export type AiSettings = {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

function load(): AiSettings {
  if (typeof window === "undefined") {
    return { enabled: false, apiKey: "", baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL };
  }
  return {
    enabled: window.localStorage.getItem(KEYS.enabled) === "true",
    apiKey: window.localStorage.getItem(KEYS.apiKey) || "",
    baseUrl: window.localStorage.getItem(KEYS.baseUrl) || DEFAULT_BASE_URL,
    model: window.localStorage.getItem(KEYS.model) || DEFAULT_MODEL,
  };
}

function saveEnabled(v: boolean) { window.localStorage?.setItem(KEYS.enabled, String(v)); }
function saveApiKey(v: string) { window.localStorage?.setItem(KEYS.apiKey, v); }
function saveBaseUrl(v: string) { window.localStorage?.setItem(KEYS.baseUrl, v); }
function saveModel(v: string) { window.localStorage?.setItem(KEYS.model, v); }

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(load);

  useEffect(() => { setSettings(load()); }, []);

  const setEnabled = useCallback((v: boolean) => {
    saveEnabled(v);
    setSettings((prev) => ({ ...prev, enabled: v }));
  }, []);

  const setApiKey = useCallback((v: string) => {
    saveApiKey(v);
    setSettings((prev) => ({ ...prev, apiKey: v }));
  }, []);

  const setBaseUrl = useCallback((v: string) => {
    saveBaseUrl(v);
    setSettings((prev) => ({ ...prev, baseUrl: v }));
  }, []);

  const setModel = useCallback((v: string) => {
    saveModel(v);
    setSettings((prev) => ({ ...prev, model: v }));
  }, []);

  return { ...settings, setEnabled, setApiKey, setBaseUrl, setModel };
}
