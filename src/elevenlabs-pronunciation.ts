import { createHash } from "crypto";
import { CompileError } from "./errors.js";
import { stableStringify } from "./util.js";

export type PronunciationRule = {
  stringToReplace: string;
  type: "phoneme" | "alias";
  phoneme?: string | null;
  alphabet?: string | null;
  alias?: string | null;
};

function ruleToApi(rule: PronunciationRule): Record<string, unknown> {
  if (rule.type === "phoneme") {
    if (!rule.phoneme || !rule.alphabet) {
      throw new CompileError("Phoneme rule requires phoneme and alphabet");
    }
    return {
      string_to_replace: rule.stringToReplace,
      type: "phoneme",
      phoneme: rule.phoneme,
      alphabet: rule.alphabet,
    };
  }
  if (rule.type === "alias") {
    if (!rule.alias) {
      throw new CompileError("Alias rule requires alias");
    }
    return {
      string_to_replace: rule.stringToReplace,
      type: "alias",
      alias: rule.alias,
    };
  }
  throw new CompileError(`Unknown pronunciation rule type: ${rule.type}`);
}

export function rulesHash(rules: PronunciationRule[]): string {
  const payload = rules.map(ruleToApi);
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function headers(apiKey: string): Record<string, string> {
  return { "xi-api-key": apiKey, accept: "application/json" };
}

async function post(baseUrl: string, apiKey: string, path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { ...headers(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new CompileError(`ElevenLabs pronunciation API failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const obj = await res.json();
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new CompileError("Unexpected ElevenLabs response");
  }
  return obj as Record<string, unknown>;
}

async function get(baseUrl: string, apiKey: string, path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: headers(apiKey),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new CompileError(`ElevenLabs pronunciation API failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const obj = await res.json();
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new CompileError("Unexpected ElevenLabs response");
  }
  return obj as Record<string, unknown>;
}

export async function findDictionaryByName(baseUrl: string, apiKey: string, name: string): Promise<{ id: string; versionId: string } | null> {
  const data = await get(baseUrl, apiKey, "/v1/pronunciation-dictionaries");
  const items = data.pronunciation_dictionaries;
  if (!Array.isArray(items)) {
    return null;
  }
  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const obj = item as Record<string, unknown>;
    if (obj.name === name && typeof obj.id === "string" && typeof obj.latest_version_id === "string") {
      return { id: obj.id as string, versionId: obj.latest_version_id as string };
    }
  }
  return null;
}

export async function ensureDictionaryFromRules(opts: {
  baseUrl: string;
  apiKey: string;
  name: string;
  rules: PronunciationRule[];
  manifest: Record<string, unknown>;
  workspaceAccess?: string | null;
  description?: string | null;
}): Promise<{ id: string; versionId: string }> {
  const { baseUrl, apiKey, name, rules, manifest, workspaceAccess, description } = opts;
  if (!rules.length) {
    throw new CompileError("No pronunciation rules provided");
  }

  const wantHash = rulesHash(rules);
  const state = (manifest.elevenlabs_pronunciation ??= {});
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new CompileError("Invalid manifest pronunciation section");
  }
  const st = state as Record<string, unknown>;

  let cachedName = typeof st.name === "string" ? st.name : null;
  let cachedId = typeof st.dictionary_id === "string" ? st.dictionary_id : null;
  let cachedVersion = typeof st.version_id === "string" ? st.version_id : null;
  const cachedHash = typeof st.rules_hash === "string" ? st.rules_hash : null;
  const cachedGraphemes = Array.isArray(st.graphemes) && st.graphemes.every((g) => typeof g === "string")
    ? (st.graphemes as string[])
    : null;

  if (!cachedId || cachedName !== name) {
    const found = await findDictionaryByName(baseUrl, apiKey, name);
    if (found) {
      cachedId = found.id;
      cachedVersion = found.versionId;
      cachedName = name;
    }
  }

  if (!cachedId) {
    const payload: Record<string, unknown> = {
      name,
      rules: rules.map(ruleToApi),
    };
    if (description != null) {
      payload.description = description;
    }
    if (workspaceAccess != null) {
      payload.workspace_access = workspaceAccess;
    }
    const resp = await post(baseUrl, apiKey, "/v1/pronunciation-dictionaries/add-from-rules", payload);
    const did = resp.id;
    const vid = resp.version_id;
    if (typeof did !== "string" || typeof vid !== "string") {
      throw new CompileError("Unexpected ElevenLabs create pronunciation dictionary response");
    }
    st.name = name;
    st.dictionary_id = did;
    st.version_id = vid;
    st.rules_hash = wantHash;
    st.graphemes = Array.from(new Set(rules.map((r) => r.stringToReplace))).sort();
    return { id: did, versionId: vid };
  }

  if (cachedHash === wantHash && cachedVersion) {
    return { id: cachedId, versionId: cachedVersion };
  }

  if (!cachedGraphemes) {
    const payload = { name, rules: rules.map(ruleToApi) };
    const resp = await post(baseUrl, apiKey, "/v1/pronunciation-dictionaries/add-from-rules", payload);
    const did = resp.id;
    const vid = resp.version_id;
    if (typeof did !== "string" || typeof vid !== "string") {
      throw new CompileError("Unexpected ElevenLabs create pronunciation dictionary response");
    }
    st.name = name;
    st.dictionary_id = did;
    st.version_id = vid;
    st.rules_hash = wantHash;
    st.graphemes = Array.from(new Set(rules.map((r) => r.stringToReplace))).sort();
    return { id: did, versionId: vid };
  }

  await post(baseUrl, apiKey, `/v1/pronunciation-dictionaries/${cachedId}/remove-rules`, {
    rule_strings: cachedGraphemes,
  });
  const addResp = await post(baseUrl, apiKey, `/v1/pronunciation-dictionaries/${cachedId}/add-rules`, {
    rules: rules.map(ruleToApi),
  });
  const vid = addResp.version_id;
  if (typeof vid !== "string") {
    throw new CompileError("Unexpected ElevenLabs add-rules response");
  }
  st.name = name;
  st.dictionary_id = cachedId;
  st.version_id = vid;
  st.rules_hash = wantHash;
  st.graphemes = Array.from(new Set(rules.map((r) => r.stringToReplace))).sort();
  return { id: cachedId, versionId: vid };
}
