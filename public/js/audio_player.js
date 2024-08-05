function playMusic(id,card_obj){
    var src1=card_obj.getAttribute('data-src');
    var audio=document.getElementById("player");
    audio.src=src1;
    console.log(src1);
    // alert(src1);
    audio.addEventListener('loadedmetadata', () => {
        console.log(audio.duration);
        document.querySelector('.total-duration').innerHTML = formatTime(audio.duration);
        document.querySelector('.current-duration').innerHTML = '0:00';
    }, { once: true });
    audio.play();
    image_tag=document.getElementById('play').querySelector("img");
    image_tag.src="resources/images/Icons/controls/pause.png";
    
    audio.onerror = function() {
    console.error('Error loading audio source');
};
}
function formatTime(seconds) {
var minutes = Math.floor(seconds / 60);
var secs = Math.floor(seconds % 60);
var string=`${minutes}:${secs>10?'':0}${secs}`;
return string;
}
function pause_play(button){
    image_tag=document.getElementById('play').querySelector("img"); 
    var audio=document.getElementById("player");
    if(image_tag.src.includes('play.png'))
    {
        audio.play();
        image_tag.src="resources/images/Icons/controls/pause.png"
    }
    else{
        audio.pause();
        image_tag.src="resources/images/Icons/controls/play.png"
    }

}
function go_back_10s(button){
    var audio=document.getElementById("player");
    audio.currentTime=audio.currentTime-10;
}
function go_to_10s(button){
    var audio=document.getElementById("player");
    audio.currentTime=audio.currentTime+10;
}
var audio=document.getElementById("player");
audio.addEventListener('timeupdate', () => {
    progress=document.getElementById("slide");
    audio=document.getElementById('player');
    const value = (audio.currentTime / audio.duration) * 100;
    progress.value = value;
    });
document.getElementById('slide').addEventListener('input',()=>{
    var value = progress.value;
    audio=document.getElementById('player');
    audio.currentTime=(value/100)*(audio.duration);
});
var audio=document.getElementById("player");
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('audio-src', audio.src);
    sessionStorage.setItem('audio-time', audio.currentTime);
});