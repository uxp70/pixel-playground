/* One engine registration per catalogue entry.

   The ten files in assets/js/kits are mode libraries: each registers a family
   engine that holds its eleven games as modes. This layer splits every family
   into eleven one-mode engines whose ids match the catalogue, then removes the
   shared family registration, so no two of the 110 kit entries share an
   engine id. Loaded after the mode libraries and before the runner boots. */
(function () {
  "use strict";

  var engines = window.PP_KITS;
  var kit = window.PP_KIT;
  var games = window.PP_GAMES || [];
  if (!engines || !kit || !kit.register || !kit.engineId) return;

  var catalogue = {};
  games.forEach(function (game) {
    if (game && typeof game.kit === "string" && game.kit.indexOf("kit-") === 0) {
      catalogue[game.kit] = game;
    }
  });

  Object.keys(engines).forEach(function (family) {
    var def = engines[family];
    if (!def || !Array.isArray(def.modes) || def.modes.length < 2) return;
    def.modes.forEach(function (mode, index) {
      var id = kit.engineId(mode.name);
      if (!catalogue[id]) return;
      kit.register(id, {
        modes: [mode],
        make: function (api) {
          api.mode = mode;
          api.level = index + 1;
          return def.make(api);
        },
      });
    });
    delete engines[family];
  });
})();
