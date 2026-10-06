"""Create an original bright arcade backing track and timed vine-swing stings."""
import math
import random
import struct
import sys
import wave

RATE = 44100
DURATION = 30.0
N = int(RATE * DURATION)
left = [0.0] * N
right = [0.0] * N
rng = random.Random(47)

def add(t, dur, freq, amp, shape="sine", end=None, pan=0.0):
    start = max(0, int(t * RATE))
    stop = min(N, int((t + dur) * RATE))
    if stop <= start:
        return
    count = stop - start
    end = end or freq
    lvol = math.sqrt((1.0 - pan) * .5)
    rvol = math.sqrt((1.0 + pan) * .5)
    for i in range(count):
        u = i / RATE
        phase = 2 * math.pi * (freq * u + (end - freq) * u * u / (2 * dur))
        if shape == "square":
            sample = 1.0 if math.sin(phase) >= 0 else -1.0
        elif shape == "tri":
            sample = 2 / math.pi * math.asin(math.sin(phase))
        else:
            sample = math.sin(phase)
        attack = min(1.0, u / .008)
        envelope = attack * math.exp(-u / max(.035, dur * .45))
        value = sample * amp * envelope
        j = start + i
        left[j] += value * lvol
        right[j] += value * rvol

beat = 60 / 140
scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 880.0, 783.99,
         659.25, 783.99, 880.0, 1174.66, 1046.5, 880.0, 783.99, 659.25]
for step in range(int(DURATION / (beat / 2))):
    t = step * beat / 2
    add(t, .22, scale[step % len(scale)], .075, "tri", pan=(-.2 if step % 2 else .2))
    if step % 4 == 0:
        chord = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63],
                 [196.0, 246.94, 293.66], [220.0, 261.63, 329.63]][(step // 4) % 4]
        for f in chord:
            add(t, .62, f, .032, "sine", pan=.08)
    if step % 2 == 0:
        add(t, .16, 92, .11, "sine", 42)
    elif step % 4 == 3:
        add(t, .11, 180, .055, "tri", 105)
    # crisp, quiet shaker on the eighth notes
    start = int(t * RATE)
    for i in range(min(int(.032 * RATE), N - start)):
        v = (rng.random() * 2 - 1) * .018 * math.exp(-i / (RATE * .009))
        left[start + i] += v * .7
        right[start + i] += v * .9

# Short original synthesized whooshes and sparkling catch flourishes.
for t in [1.0, 2.9, 4.4, 8.6, 10.4, 12.5, 14.8, 17.0, 18.9, 21.0, 23.0, 25.0]:
    add(t, .30, 250, .075, "sine", 1000, pan=.15)
for t in [1.5, 4.8, 9.9, 13.8, 17.7, 21.7, 24.4]:
    for i, f in enumerate([880, 1174.66, 1567.98]):
        add(t + .055 * i, .26, f, .065 - .01 * i, "sine", f * 1.18, pan=(i - 1) * .35)
add(6.25, .74, 680, .095, "tri", 90, pan=-.25)
for i, f in enumerate([523.25, 659.25, 783.99, 1046.5, 1318.51]):
    add(26.8 + .13 * i, .8 - .1 * i, f, .09, "sine", pan=(i % 2) * .18)

peak = max(max(abs(x) for x in left), max(abs(x) for x in right)) or 1
gain = min(.78 / peak, 1.0)
with wave.open(sys.argv[1], "wb") as out:
    out.setnchannels(2)
    out.setsampwidth(2)
    out.setframerate(RATE)
    block = bytearray()
    for l, r in zip(left, right):
        block.extend(struct.pack("<hh", int(max(-1, min(1, l * gain)) * 32767),
                                 int(max(-1, min(1, r * gain)) * 32767)))
    out.writeframes(block)
