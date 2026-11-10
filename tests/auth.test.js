"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const app = path.join(__dirname, "../app");
const auth = fs.readFileSync(path.join(app, "auth.js"), "utf8");
for (const page of ["index.html", "operations.html", "settings.html"]) {
  const html = fs.readFileSync(path.join(app, page), "utf8");
  assert.match(html, /<script src="\.\/auth\.js"><\/script>/, `${page} must load shared auth UI`);
}
assert.match(auth, /OAuthInfo/);
assert.match(auth, /IdentityManager/);
assert.match(auth, /new Portal/);
assert.match(auth, /checkSignInStatus/);
assert.match(auth, /destroyCredentials/);
assert.match(auth, /sarSessionUser/);
assert.match(auth, /fullName/);
assert.match(auth, /sar\.oauth\.appId/);
assert.doesNotMatch(auth, /token\s*[:=]\s*["'][A-Za-z0-9_-]{20,}/, "auth source must not contain a token literal");
console.log("ok  shared ArcGIS sign-in shows authenticated user and supports sign-out");
