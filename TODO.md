# Todos

tossing ideas

- [ ] option: choose image data type (png, jpeg)
- [ ] option: auto removal after saving
- [ ] add default thumbnail
      <div class="ytp-cued-thumbnail-overlay-image" style="background-image: url(&quot;https://i1.ytimg.com/vi/cSwLlWnmfZ8/hqdefault.jpg&quot;);"></div>
- [ ] '.ytp-ce-video' and '.ytp-ce-channel' show up in the end of the video even if toggled 'hide', add DOM observer.
- [ ] no indication item was saved when hovering it (gray out save button?)
- [ ] clicking on an image time jumps to frame position <a id="..." class="..." href="/watch?v=muNHOdngnpI&amp;t=2178s">text or elements</a>
- [ ] strip is too high at 115px
- [ ] collapsible strip, to save screen space
- [ ] imageContainer and imageHolder naming problem - unclear, what is what.
- [ ] Now: take frame canvas, convert to base64 and then convert it to blob, when there is a need to copy. Redundant bit?
- [ ] on mouseenter: display [copy, save, remove]
      use delay overlay.style.transition = 'opacity 1s .25s';
- [ ] overlay for errors and successes in one of:
      #player-theater-container || #player-container || #ytd-player || #container || #movie_player
      "Cannot access frame, possibly video's still loading",
      "Image cannot be copied",
      "Image copied"
- [ ] Use temporary A element with image data for a click. Currently saveImageEventHandler hogs memory by dublicating.
- [ ] Add strip control panel (save all, remove saved, remove all, remove strip, hide ui) to the left side.
- [ ] Show only tip for strip control panel, on hover show controls. Shows strip controls on mouseenter.
- [ ] Find stable strip container (#player-container), watch for changes to move if #player-container changes location
- [ ] add at least tenth parts of seconds (triming long number at the end)
- [ ] clicking on image itself, opens large modal preview popup
  - [ ] zoom to actual size (mouse panning)
  - [ ] cropping and copying cropped part
  - [ ] painting to ephasize or encircle POI https://stackoverflow.com/a/67492355
    - [ ] red/blue/black thin/med/thick markers
    - [ ] yellow marker
