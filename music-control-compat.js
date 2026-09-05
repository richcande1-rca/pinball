// Keep Space usable as the plunger even if the music button has focus.
const musicMuteControl = document.getElementById('music-mute');
if (musicMuteControl) {
  musicMuteControl.addEventListener('click', () => musicMuteControl.blur());

  window.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.target !== musicMuteControl) return;
    event.preventDefault();
    if (!event.repeat) beginPlungerCharge();
  }, true);

  window.addEventListener('keyup', event => {
    if (event.code !== 'Space' || event.target !== musicMuteControl) return;
    event.preventDefault();
    finishPlungerCharge(true);
  }, true);
}
