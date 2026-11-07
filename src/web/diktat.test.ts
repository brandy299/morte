import { describe, expect, it } from "vitest";
import { STILL_UNTER, audioAnfrage, eingaenge, fuegeDiktatEin, gewaehltesMikrofon, istGeraeusch, merkeMikrofon, mikrofonFehler, spitze } from "./diktat.ts";

describe("dictation", () => {
  it("appends dictated text to what is already typed with one space", () => {
    expect(fuegeDiktatEin("", " Erstelle ein Arbeitsblatt. ")).toBe("Erstelle ein Arbeitsblatt.");
    expect(fuegeDiktatEin("Für die 11a:", "ein Quiz")).toBe("Für die 11a: ein Quiz");
    expect(fuegeDiktatEin("Für die 11a: ", "ein Quiz")).toBe("Für die 11a: ein Quiz");
    expect(fuegeDiktatEin("Zeile\n", "zwei")).toBe("Zeile\nzwei");
  });

  it("keeps the message as it was when nothing was recognised", () => {
    expect(fuegeDiktatEin("Hallo", "   ")).toBe("Hallo");
  });

  it("treats Whisper's silence markers as no speech", () => {
    for (const s of ["", "  ", "[Musik]", "(Stille)", "*Applaus*", "♪", "Untertitel der Amara.org-Community"]) expect(istGeraeusch(s), s).toBe(true);
    expect(istGeraeusch("Erstelle eine Klausur zur Bewerbung.")).toBe(false);
  });

  it("explains microphone problems in plain language", () => {
    expect(mikrofonFehler(new DOMException("x", "NotAllowedError"))).toMatch(/erlaube/i);
    expect(mikrofonFehler(new DOMException("x", "NotFoundError"))).toMatch(/kein Mikrofon/);
    expect(mikrofonFehler(new Error("?"))).toMatch(/Mikrofon geht gerade nicht/);
  });

  it("tells a Windows app user where the system blocks the microphone, and a browser user where to allow it", () => {
    const blocked = new DOMException("x", "NotAllowedError");
    expect(mikrofonFehler(blocked, { app: true, windows: true })).toMatch(/Windows lässt Pult nicht ans Mikrofon/);
    expect(mikrofonFehler(blocked, { app: false, windows: true })).toMatch(/Adresszeile/);
    expect(mikrofonFehler(new DOMException("x", "NotReadableError"))).toMatch(/anderen Programm/);
    expect(mikrofonFehler(new DOMException("x", "NotFoundError"))).toMatch(/Einstellungen/);
  });

  it("asks for the chosen microphone exactly, and for the system's when none is chosen", () => {
    expect(audioAnfrage("abc")).toMatchObject({ deviceId: { exact: "abc" } });
    expect(audioAnfrage("")).not.toHaveProperty("deviceId");
  });

  it("offers the real microphones plus the system's choice, without the duplicate 'communications' entry", () => {
    const geraete = [
      { kind: "audioinput", deviceId: "default", label: "Default - Headset (USB)" },
      { kind: "audioinput", deviceId: "communications", label: "Communications - Headset (USB)" },
      { kind: "audioinput", deviceId: "a1", label: "Headset (USB)" },
      { kind: "audioinput", deviceId: "b2", label: "" },
      { kind: "videoinput", deviceId: "cam", label: "Kamera" },
      { kind: "audiooutput", deviceId: "lt", label: "Lautsprecher" },
    ];
    expect(eingaenge(geraete)).toEqual([
      { id: "", label: "Das Mikrofon, das der Computer vorgibt" },
      { id: "a1", label: "Headset (USB)" },
      { id: "b2", label: "Mikrofon 3" },
    ]);
  });

  it("recognises a recording with no sound at all", () => {
    expect(spitze(new Float32Array([0, 0.002, -0.004, 0.001]))).toBeLessThan(STILL_UNTER);
    expect(spitze(new Float32Array([0, 0.2, -0.4, 0.1]))).toBeCloseTo(0.4);
    expect(spitze(new Float32Array())).toBe(0);
  });

  it("does not break when the browser denies storage", () => {
    expect(gewaehltesMikrofon()).toBe("");
    expect(() => merkeMikrofon("abc")).not.toThrow();
  });
});
