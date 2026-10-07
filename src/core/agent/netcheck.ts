/** What a network check found out about the way to the provider. */
export interface NetDiagnosis {
  /** Machine code, for the technical details (for example UNABLE_TO_VERIFY_LEAF_SIGNATURE or HTTP 401). */
  code: string;
  /** The address answered. Whatever went wrong then is not the network. */
  reachable: boolean;
  /** Plain German explanation with what to try. */
  text: string;
}

const CERT = /^(UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_GET_ISSUER_CERT_LOCALLY|CERT_HAS_EXPIRED|CERT_UNTRUSTED|ERR_TLS_CERT_ALTNAME_INVALID|CERT_.+)$/;
const NAME = /^(ENOTFOUND|EAI_AGAIN|EAI_FAIL)$/;
const REFUSED = /^(ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET|EPIPE)$/;

/** Reads the error code out of a failed fetch (it sits in `cause`, one or two levels down). */
export function codeOf(err: unknown): string {
  let e: any = err;
  for (let i = 0; i < 4 && e; i++, e = e.cause) if (typeof e.code === "string") return e.code;
  return err instanceof Error && err.name === "TimeoutError" ? "TIMEOUT" : "UNKNOWN";
}

export function explain(code: string): string {
  if (CERT.test(code)) {
    return "Dein Netz prüft verschlüsselte Verbindungen mit einem eigenen Zertifikat (üblich in Schulnetzen), dem Pult nicht traut. Starte Pult mit „npm start“, dann nutzt es die Zertifikate deines Computers. Hilft das nicht, frag die IT der Schule nach dem Zertifikat.";
  }
  if (NAME.test(code)) return "Der Name des Anbieters lässt sich nicht auflösen. Entweder fehlt das Internet oder das Netz sperrt diese Seite.";
  if (REFUSED.test(code) || code === "TIMEOUT") return "Die Verbindung zum Anbieter wird abgelehnt oder bricht ab. Im Schulnetz ist das oft eine Sperre oder ein Zwang zu einem Proxy. Frag die IT, ob die Adresse des Anbieters freigegeben ist.";
  return "Ich komme nicht bis zum Anbieter durch. Bitte prüfe die Internetverbindung.";
}

/** Knocks on the provider's address to find out why a request failed. Does not send the key or any content. */
export async function diagnoseNetwork(url: string, fetchFn: typeof fetch = fetch): Promise<NetDiagnosis> {
  try {
    const res = await fetchFn(new URL(url).origin, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return { code: `HTTP ${res.status}`, reachable: true, text: "Die Adresse des Anbieters ist erreichbar. Das Problem liegt nicht im Netz." };
  } catch (err) {
    const code = codeOf(err);
    return { code, reachable: false, text: explain(code) };
  }
}
