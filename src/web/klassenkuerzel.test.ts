import { describe, expect, it } from "vitest";
import { deuteKlassenname } from "./klassenkuerzel.ts";

describe("deuteKlassenname", () => {
  it("reads HHUC as Höhere Handelsschule, Unterstufe, Klasse C", () => {
    expect(deuteKlassenname("HHUC")).toEqual({ schulform: "Berufskolleg", stufe: "Höhere Handelsschule Unterstufe Klasse C" });
  });
  it("ignores case and spaces", () => {
    expect(deuteKlassenname(" hhoa ")?.stufe).toBe("Höhere Handelsschule Oberstufe Klasse A");
  });
  it("reads other Bildungsgänge and number classes", () => {
    expect(deuteKlassenname("HBFSM2")?.stufe).toBe("Höhere Berufsfachschule Mittelstufe Klasse 2");
    expect(deuteKlassenname("FOS11")?.stufe).toBe("Fachoberschule Klasse 11");
  });
  it("makes no guess for ordinary class names", () => {
    expect(deuteKlassenname("11a")).toBeUndefined();
    expect(deuteKlassenname("HH")).toBeUndefined();
    expect(deuteKlassenname("HHUCX")).toBeUndefined();
    expect(deuteKlassenname("Mathe")).toBeUndefined();
  });
});
