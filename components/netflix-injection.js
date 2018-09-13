/* global netflix */

let netflix_player = false;

{
  const videoPlayer = netflix.
                    appContext.
                    state.
                    playerApp.
                    getAPI().
                    videoPlayer;

  const playerSessionId = videoPlayer.getAllPlayerSessionIds()[0];
  netflix_player = videoPlayer.getVideoPlayerBySessionId(playerSessionId);
}

setInterval(() => {
  const currentTime = netflix_player.getCurrentTime();
  const playing = ! netflix_player.getPaused();
  const duration = netflix_player.getDuration();
  console.log('netflix', JSON.stringify({currentTime, playing, duration}));
}, 500);

window.addEventListener('message', evt => {
  const {currentTime, playing} = evt.data;
  if (currentTime !== undefined) {
    netflix_player.seek(currentTime);
  }
  if (playing !== undefined) {
    if (playing) {
      netflix_player.play();
    } else {
      netflix_player.pause();
    }
  }
});
