const {app, ipcMain, dialog, BrowserWindow, webContents} = require('electron');
const remote = require('@electron/remote/main');
remote.initialize();
const path = require('path');
const fs = require('fs');


app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-web-security');
global.appdatapath = app.getPath('appData') + '/Audiofy2';
if(!fs.existsSync(global.appdatapath + '/config.json')) fs.writeFileSync(global.appdatapath + '/config.json', JSON.stringify({"dir":""}), {encoding: 'utf-8'});


let loading;

let main;
app.on('ready', ()=>{
    loading = new BrowserWindow({width: 375, height: 500, frame: false, webPreferences: {nodeIntegration:true, enableRemoteModule: true, contextIsolation: false}});
    loading.loadFile('./src/loading/index.html');

    main = new BrowserWindow({
        width: 1280,
        height: 720,
        frame: false,
        webPreferences: {
            //preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            enableRemoteModule: true,
            webSecurity: false,
            contextIsolation: false
        },
        show: false,
    });
    remote.enable(main.webContents);
    remote.enable(loading.webContents);
    main.loadFile('./src/app/index.html')
    main.webContents.once('dom-ready', () => {
        setTimeout(()=>{
            main.show();
            loading.hide();
        }, 1000);
    });
  
});
ipcMain.on('songSize', (e, n)=>{
    loading.webContents.send('songSize', n);
});
ipcMain.on('songAdded', (e, n)=>{
    loading.webContents.send('songAdded', 1);
});
ipcMain.on('close-app', (e)=>{
    app.quit();
});

// ipcMain.on('refreshMain', (e)=>{
//   app.relaunch();
//   app.exit(0);
// });
ipcMain.on('openDir', async (e)=>{
    var path = 
        await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
    settings.webContents.send('dialogFinished', path);
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})