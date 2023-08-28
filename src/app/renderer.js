const { ipcRenderer } = require('electron');
const remote = require('@electron/remote');
const fs = require('fs');

const mm = require('music-metadata');
const win = remote.getCurrentWindow(); 

global.appdatapath = remote.app.getPath('appData') + '/audiofy2';
let config = JSON.parse(fs.readFileSync(global.appdatapath + '/config.json', {encoding: 'utf-8'}));
let songs = [];

if(config.dir) { songs = fs.readdirSync(config.dir); ipcRenderer.send('songSize', songs.length);}

global.config = config;

global.audio;


// Window Controls (top bar thingy)

document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();
    }
};
window.onbeforeunload = (event) => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
}
function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        win.minimize();
    });

    document.getElementById('max-button').addEventListener("click", event => {
        win.maximize();
    });

    document.getElementById('restore-button').addEventListener("click", event => {
        win.unmaximize();
    });

    document.getElementById('close-button').addEventListener("click", event => {
       ipcRenderer.send('close-app');
    });

    // Toggle maximise/restore buttons when maximisation/unmaximisation occurs
    toggleMaxRestoreButtons();
    win.on('maximize', toggleMaxRestoreButtons);
    win.on('unmaximize', toggleMaxRestoreButtons);

    function toggleMaxRestoreButtons() {
        if (win.isMaximized()) {
            document.body.classList.add('maximized');
        } else {
            document.body.classList.remove('maximized');
        }
    }
}


// Keeps dictionary of song objects (metadata + path)

const Song = require('../classes/song.js');
let songDict = {};


// Handle song list

document.addEventListener("DOMContentLoaded", async function() {
    setInterval(updateProgressValue, 1000);
    
    let songDiv = document.getElementById('songs');

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        ipcRenderer.send("songAdded", 1);
        let metaData = await mm.parseFile(config.dir + '/' + song);
        let image;
        if(metaData.common.picture) {
            let picture = metaData.common.picture[0];
            image = 'data:' + picture.format + ';base64,' + picture.data.toString('base64');
        } else {
            image = 'img/unknown.png';
        }

        songDict[i] = new Song(i, metaData, config.dir + '/' + song, image);

        let songElement = document.createElement('div');
        songElement.setAttribute('id', i);
        songElement.classList.add('item');
        songElement.innerHTML = 
        `<img src="${image}" />
        <div class="play">
          <span class="fa fa-play"></span>
        </div>
        <h4>${metaData.common.title}</h4>
        <p>${metaData.common.artist}</p>
        `;
        songDiv.appendChild(songElement);

        songElement.addEventListener('click', event => {
            global.audio?.pause();
            global.audio = null;
            playSong(i);
        });
    }
});

let pauseplaybtn = document.getElementById('pauseplaybtn');
let seekerimg = document.getElementById('seekerimg');
let seekerartist = document.getElementById('seekerartist');
let seekertitle = document.getElementById('seekertitle');
let seekerprogress = document.getElementById('seekerprogress');
let seekerprogresstotal = document.getElementById('seekerprogresstotal');

let progressBar = document.getElementById('progress');

function convertElapsedTime(n) {
    let seconds = Math.floor(n%60);
    if(seconds < 10) seconds = "0"+seconds;
    let minutes = Math.floor(n/60);
    return `${minutes}:${seconds}`;
}

function playSong(id) {
    let song = songDict[id];

    global.audio = new Audio(song.path);

    seekerimg.src = song.image;
    seekertitle.innerHTML = song.metadata.common.title;
    seekerartist.innerHTML = song.metadata.common.artist;
    seekerprogress.innerHTML = '0:00';
    seekerprogresstotal.innerHTML = convertElapsedTime(song.metadata.format.duration);

    global.audio.onpause = function() {
        pauseplaybtn.src = 'img/play.svg';
    }
    global.audio.onplay = function() {
        pauseplaybtn.src = 'img/pause.svg';
    }
    
    global.audio.play();

    global.audio.onended = function() {
        stopSong();
    }
}

function stopSong() {
    seekerimg.src = 'img/unknown.svg';
    seekertitle.innerHTML = 'Unknown Song';
    seekerartist.innerHTML = 'Unknown Artist';
    seekerprogress.innerHTML = '0:00';
    seekerprogresstotal.innerHTML = '0:00';
    pauseplaybtn.src = 'img/play.svg';
    global.audio = null;
}

let isChangingTime = false;
function updateProgressValue() {
    if(global.audio == null || !global.audio) return progressBar.value = 0;
    let time = global.audio.currentTime;
    let dur = global.audio.duration;
    
    if(!isChangingTime) {
        progressBar.value = time;
        progressBar.max = dur;
        seekerprogress.innerHTML = convertElapsedTime(time + 1);
        seekerprogresstotal.innerHTML = convertElapsedTime(dur);
    }
}


progressBar.addEventListener('change', function(e){
    if(global.audio !== null) global.audio.currentTime = progressBar.value;
    seekerprogress.innerHTML = convertElapsedTime(progressBar.value);
});
progressBar.addEventListener('input', function(e){
    isChangingTime = true;
});
progressBar.addEventListener('mouseup', function(e){
    isChangingTime = false;
});

pauseplaybtn.addEventListener('click', function(e) {
    pauseplay();
})
document.body.onkeydown = function(e){
    if(e.key == 'space' || e.keyCode == 32) {e.preventDefault(); return pauseplay();}
}
function pauseplay(){
    if(global.audio.paused) { global.audio.play(); pauseplaybtn.src = 'img/pause.svg';}
    else { global.audio.pause(); pauseplaybtn.src = 'img/play.svg'; }
}