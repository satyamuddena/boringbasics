import assert from "node:assert/strict";
import test from "node:test";
import { deviceLabel, isMobileUserAgent } from "../src/lib/deviceLabel";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  ipadSafari:
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/604.1",
  firefox:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
};

test("the trainer's phone is recognisable", () => {
  assert.equal(deviceLabel(UA.iphoneSafari), "iPhone · Safari");
  assert.equal(deviceLabel(UA.androidChrome), "Android · Chrome");
});

test("an iPad is not reported as a Mac", () => {
  // iPadOS sends "like Mac OS X", so order of matching matters here.
  assert.equal(deviceLabel(UA.ipadSafari), "iPad · Safari");
});

test("Chrome and Edge are told apart despite both claiming Safari", () => {
  assert.equal(deviceLabel(UA.windowsChrome), "Windows · Chrome");
  assert.equal(deviceLabel(UA.windowsEdge), "Windows · Edge");
});

test("desktops are labelled too", () => {
  assert.equal(deviceLabel(UA.macSafari), "Mac · Safari");
  assert.equal(deviceLabel(UA.firefox), "Windows · Firefox");
});

test("a missing user agent does not render an empty row", () => {
  assert.equal(deviceLabel(null), "Unknown device");
  assert.equal(deviceLabel(undefined), "Unknown device");
  assert.equal(deviceLabel(""), "Unknown device");
  assert.equal(deviceLabel("   "), "Unknown device");
});

test("an unrecognised agent still says something", () => {
  assert.equal(deviceLabel("curl/8.4.0"), "Unknown device");
  assert.equal(deviceLabel("SomeBot (Linux)"), "Linux");
});

test("iPhone and Android phones count as mobile", () => {
  assert.equal(isMobileUserAgent(UA.iphoneSafari), true);
  assert.equal(isMobileUserAgent(UA.androidChrome), true);
});

test("iPad and desktops do not count as mobile", () => {
  // iPadOS's UA has no "Mobile" token unless Safari is in "Request Mobile
  // Website" mode — the default desktop-class UA is what this checks.
  assert.equal(isMobileUserAgent(UA.ipadSafari), false);
  assert.equal(isMobileUserAgent(UA.macSafari), false);
  assert.equal(isMobileUserAgent(UA.windowsChrome), false);
  assert.equal(isMobileUserAgent(UA.windowsEdge), false);
  assert.equal(isMobileUserAgent(UA.firefox), false);
});

test("a missing user agent is not mobile", () => {
  assert.equal(isMobileUserAgent(null), false);
  assert.equal(isMobileUserAgent(undefined), false);
  assert.equal(isMobileUserAgent(""), false);
});
