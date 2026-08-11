const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

app.commandLine.appendSwitch("no-sandbox");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "dist-electron/main/preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  const logs = [];
  win.webContents.on("console-message", (e) => logs.push(e));
  win.webContents.on("render-process-gone", (_e, details) => logs.push({ crash: details }));

  await win.loadFile(path.join(__dirname, "dist/index.html"));
  await new Promise((r) => setTimeout(r, 1000));

  let img = await win.webContents.capturePage();
  fs.writeFileSync("/tmp/redesign_1_initial.png", img.toPNG());

  // Click Speed
  await win.webContents.executeJavaScript(`
    (function() {
      const cards = Array.from(document.querySelectorAll('.op-card'));
      const c = cards.find(c => c.textContent.includes('Speed'));
      if (c) c.click();
      return !!c;
    })()
  `);
  await new Promise((r) => setTimeout(r, 400));
  img = await win.webContents.capturePage();
  fs.writeFileSync("/tmp/redesign_2_speed.png", img.toPNG());

  // Click Mute
  await win.webContents.executeJavaScript(`
    (function() {
      const cards = Array.from(document.querySelectorAll('.op-card'));
      const c = cards.find(c => c.textContent.includes('Mute'));
      if (c) c.click();
      return !!c;
    })()
  `);
  await new Promise((r) => setTimeout(r, 400));
  img = await win.webContents.capturePage();
  fs.writeFileSync("/tmp/redesign_3_mute.png", img.toPNG());

  fs.writeFileSync("/tmp/redesign_console.json", JSON.stringify(logs, null, 2));
  app.quit();
});
