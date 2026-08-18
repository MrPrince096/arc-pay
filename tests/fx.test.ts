import { describe, it, expect } from "vitest";
import { parseFxResponse } from "../src/core/fx.js";

// Fixture shaped exactly like Frankfurter's documented /latest response.
const RAW = { amount: 1, base: "USD", date: "2026-08-18", rates: { INR: 87.5, EUR: 0.92 } };

describe("parseFxResponse", () => {
  it("extracts the rates map", () => {
    expect(parseFxResponse(RAW)).toEqual({ INR: 87.5, EUR: 0.92 });
  });

  it("throws on an empty/malformed response", () => {
    expect(() => parseFxResponse({ rates: {} })).toThrow();
    expect(() => parseFxResponse({})).toThrow();
    expect(() => parseFxResponse(undefined)).toThrow();
  });
});
