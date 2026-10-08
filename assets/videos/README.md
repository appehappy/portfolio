# Illustration videos

`illustration-idle.mp4` is the hand-drawn look-around that plays while the
illustration is hovered; `illustration-idle-reverse.mp4` is the same frames
reversed, so `scripts/main.js` can step back to a rest pose without a
backwards seek. Forward time `t` and reverse time `D - t` must show the same
frame.

Both are encoded from the same frames, at the animation's native 24 fps
(121 frames, 5.042s), with a keyframe every 12 frames so seeks land within
half a second of decoding. Earlier exports were conformed to 25 fps, which
duplicated one frame a second (frames 1, 26, 51, 76 and 101 of those files);
the encode below drops them.

```bash
SEL="select='not(eq(n\,1)+eq(n\,26)+eq(n\,51)+eq(n\,76)+eq(n\,101))'"
ENC="-r 24 -c:v libx264 -preset veryslow -tune animation -crf 22 -g 12 -keyint_min 12 -sc_threshold 0 -bf 2 -pix_fmt yuv420p -movflags +faststart -an"
ffmpeg -i source-25fps.mp4 -vf "$SEL,setpts=N/(24*TB)" $ENC illustration-idle.mp4
ffmpeg -i source-25fps.mp4 -vf "$SEL,reverse,setpts=N/(24*TB)" $ENC illustration-idle-reverse.mp4
```

From a 24 fps master, drop the `select` filter (and `setpts`).

If the animation changes, re-measure the rest poses (`REST_CUES`) and the
glance hold (`GLANCE_HOLD`) in `initIllustrationHover`: they are the times
where his head matches the first frame, and the held look toward the text.
