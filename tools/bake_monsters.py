"""Bake Inverse Haunt's Horrifying-mode monsters into sprite sheets.

Each monster is sculpted as a signed-distance field (smoothly blended limbs,
wrinkled skin, carved eye sockets and mouths), ray-marched with real lighting
(ambient occlusion, wet specular highlights, rim light), and rendered from
8 view angles x N animation frames, Doom-style.  Also renders close-up
jumpscare portraits.

    python3 tools/bake_monsters.py          # writes assets/monsters/*.png + meta.js
"""
import json, math, os, sys
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'monsters')
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- math
def v(*a): return np.array(a, dtype=np.float64)
def nrm(a): return a / (np.linalg.norm(a) + 1e-12)

def rot(p, o, yaw=0.0, roll=0.0, pitch=0.0):
    """rotate point p about o: pitch (x axis), roll (y axis = facing), yaw (z axis)"""
    x, y, z = p - o
    c, s = math.cos(pitch), math.sin(pitch); y, z = y * c - z * s, y * s + z * c
    c, s = math.cos(roll), math.sin(roll);   x, z = x * c - z * s, x * s + z * c
    c, s = math.cos(yaw), math.sin(yaw);     x, y = x * c - y * s, x * s + y * c
    return v(x, y, z) + o

def ik(a, c, l1, l2, pole):
    ac = c - a; d = min(np.linalg.norm(ac), l1 + l2 - 1e-4); dr = nrm(ac)
    x = (l1 * l1 - l2 * l2 + d * d) / (2 * d); h = math.sqrt(max(0.0, l1 * l1 - x * x))
    up = nrm(pole - dr * np.dot(pole, dr))
    return a + dr * x + up * h

# ---------------------------------------------------------------- noise
def hash3(i):
    return np.modf(np.sin(i[..., 0] * 127.1 + i[..., 1] * 311.7 + i[..., 2] * 74.7) * 43758.5453)[0] % 1.0

def vnoise(p):
    i = np.floor(p); f = p - i; u = f * f * (3 - 2 * f)
    n = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[:, 0] if dx else 1 - u[:, 0]) * (u[:, 1] if dy else 1 - u[:, 1]) * (u[:, 2] if dz else 1 - u[:, 2])
                n = n + w * hash3(i + np.array([dx, dy, dz]))
    return n

def fbm(p, oct=2):
    s, a, f = 0.0, 0.5, 1.0
    for _ in range(oct):
        s = s + a * vnoise(p * f); f *= 2.03; a *= 0.5
    return s

# ---------------------------------------------------------------- SDF groups
class Group:
    """a set of tapered capsules + ellipsoids, blended with smooth-min of radius k"""
    def __init__(self, k):
        self.k = k; self.caps = []; self.ell = []
    def cap(self, a, b, r0, r1=None):
        self.caps.append((np.asarray(a, float), np.asarray(b, float), r0, r0 if r1 is None else r1))
    def ball(self, c, r): self.cap(c, c, r)
    def ellipsoid(self, c, r, R=None):
        self.ell.append((np.asarray(c, float), np.asarray(r, float), R))
    def arrays(self):
        pts = []
        for a, b, r0, r1 in self.caps: pts += [a - max(r0, r1), b - max(r0, r1), a + max(r0, r1), b + max(r0, r1)]
        for c, r, R in self.ell: m = r.max(); pts += [c - m, c + m]
        if pts: P = np.array(pts); self.lo, self.hi = P.min(0) - 0.02, P.max(0) + 0.02
        if self.caps:
            A = np.array([c[0] for c in self.caps]); B = np.array([c[1] for c in self.caps])
            R0 = np.array([c[2] for c in self.caps]); R1 = np.array([c[3] for c in self.caps])
            self._A, self._BA, self._R0, self._dR = A, B - A, R0, R1 - R0
            self._BB = np.maximum((self._BA ** 2).sum(1), 1e-12)
        return self

    def dist(self, P):
        if not hasattr(self, 'lo'): return np.full(len(P), 1e9)
        q = np.maximum(self.lo - P, 0) + np.maximum(P - self.hi, 0); box = np.linalg.norm(q, axis=1)
        far = box > 0.03
        if far.all(): return box
        out = box.copy(); near = ~far
        out[near] = self._dist(P[near])
        return out

    def _dist(self, P):
        ds = []
        if self.caps:
            pa = P[:, None, :] - self._A[None]
            h = np.clip((pa * self._BA[None]).sum(2) / self._BB[None], 0, 1)
            d = np.linalg.norm(pa - self._BA[None] * h[..., None], axis=2) - (self._R0[None] + self._dR[None] * h)
            ds.append(d)
        for c, r, R in self.ell:
            q = P - c
            if R is not None: q = q @ R
            k0 = np.linalg.norm(q / r, axis=1); k1 = np.linalg.norm(q / (r * r), axis=1)
            ds.append((k0 * (k0 - 1) / np.maximum(k1, 1e-9))[:, None])
        if not ds: return np.full(len(P), 1e9)
        D = np.concatenate(ds, axis=1)
        if D.shape[1] == 1: return D[:, 0]
        # blend only the 3 nearest parts: a smooth join without puffing the whole body up
        kk = min(2, D.shape[1] - 1)
        P3 = np.sort(np.partition(D, kk, axis=1)[:, :kk + 1], axis=1)
        d = smin(P3[:, 0], P3[:, 1], self.k)
        if P3.shape[1] > 2: d = smin(d, P3[:, 2], self.k)
        return d

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)
def smax(a, b, k): return -smin(-a, -b, k)

# ---------------------------------------------------------------- the models
SKIN, HAIR, VOIDC, TOOTH, EYE, FLESH, GLOW = 0, 1, 2, 3, 4, 5, 6

class Model:
    def __init__(self, groups, carve, displace, flesh=False):
        self.g = groups; self.carve = carve; self.displace = displace; self.flesh = flesh
        for gg in list(groups.values()) + [carve]: gg.arrays()
    def sdf(self, P, detail=True):
        body = self.g['body'].dist(P)
        if detail and self.displace: body = body + self.displace * (fbm(P * 38.0) - 0.5)
        if self.g['fine'].caps or self.g['fine'].ell: body = smin(body, self.g['fine'].dist(P), 0.006)
        cv = self.carve.dist(P) if (self.carve.caps or self.carve.ell) else np.full(len(P), 1e9)
        skin = smax(body, -cv, 0.008)
        d = skin
        hair = self.g['hair'].dist(P) if self.g['hair'].caps else np.full(len(P), 1e9)
        teeth = self.g['teeth'].dist(P) if self.g['teeth'].caps else np.full(len(P), 1e9)
        eye = self.g['eye'].dist(P) if self.g['eye'].caps else np.full(len(P), 1e9)
        glow = self.g['glow'].dist(P) if self.g['glow'].caps else np.full(len(P), 1e9)
        d = np.minimum(np.minimum(np.minimum(d, hair), np.minimum(teeth, eye)), glow)
        return d, (skin, hair, teeth, eye, cv, glow)

def new_groups():
    return {'body': Group(0.03), 'fine': Group(0.004), 'hair': Group(0.004), 'teeth': Group(0.002), 'eye': Group(0.001), 'glow': Group(0.001)}

def crawler(phase=0.0, rest=0.0, roll=0.0, jaw=0.25, rear=0.0, t=0.0):
    G = new_groups(); C = Group(0.006)
    body, fine = G['body'], G['fine']
    pelvis = v(0, -0.40, 0.10 + rear * 0.02)
    chest = v(0, 0.02 - 0.03 * math.sin(phase), 0.15 + rear * 0.28)
    # spine: arched, every vertebra showing
    prev = None
    for i in range(9):
        u = i / 8; p = pelvis + (chest - pelvis) * u; p[2] += math.sin(u * math.pi) * 0.06
        if prev is not None: body.cap(prev, p, 0.07 - u * 0.004, 0.07 - (u + 0.12) * 0.004)
        fine.ball(p + v(0, 0, 0.062), 0.016)
        prev = p
    # ribcage, narrow and caved in; ribs as ridges
    body.ellipsoid(chest + v(0, -0.06, -0.01), v(0.09, 0.13, 0.07))
    for i in range(6):
        y = chest[1] - 0.17 + i * 0.03
        for sx in (-1, 1):
            a = v(sx * 0.02, y, chest[2] + 0.055); b = v(sx * 0.088, y + 0.01, chest[2] - 0.0); c = v(sx * 0.07, y + 0.03, chest[2] - 0.06)
            fine.cap(a, b, 0.008, 0.007); fine.cap(b, c, 0.007, 0.006)
    for sx in (-1, 1):  # shoulder blades
        body.ellipsoid(chest + v(sx * 0.065, -0.05, 0.05), v(0.045, 0.06, 0.018))
    # legs folded up over the back like a scorpion's tail
    for sx in (-1, 1):
        tw = 0.025 * math.sin(phase * 2 + sx)
        hip = pelvis + v(sx * 0.07, 0, 0); knee = pelvis + v(sx * 0.16, -0.28, 0.24 + tw)
        ank = pelvis + v(sx * 0.1, -0.04, 0.44 + tw * 2)
        body.cap(hip, knee, 0.045, 0.03); body.cap(knee, ank, 0.03, 0.018)
        fine.ball(knee, 0.03)
        for k in range(5):
            fine.cap(ank, ank + v(sx * (k - 2) * 0.012, 0.03 + 0.004 * k, 0.05), 0.008, 0.005)
    # arms: elbows thrust high like a spider, long fingers clawing the floor
    for sx in (-1, 1):
        sh = chest + v(sx * 0.1, 0.02, 0.02)
        p = phase + (math.pi if sx > 0 else 0.0); lift = max(0.0, math.sin(p)) * (1 - rest)
        hand = v(sx * (0.31 + 0.03 * math.cos(p)), 0.36 + 0.22 * math.cos(p) * (1 - rest) + rear * 0.12, 0.02 + lift * 0.13 + rear * 0.16)
        elb = ik(sh, hand, 0.30, 0.32, v(sx * 0.7, -0.2, 1.0))
        body.cap(sh, elb, 0.033, 0.024); body.cap(elb, hand, 0.024, 0.016)
        fine.ball(elb, 0.026)
        body.ellipsoid(hand + v(0, 0.02, 0.0), v(0.03, 0.035, 0.011))
        for k in range(5):
            fx = sx * (k - 2) * 0.017
            f0 = hand + v(fx * 0.6, 0.035, 0); f1 = f0 + v(fx * 0.7, 0.045 + (2 - abs(k - 2)) * 0.006, 0.012 - lift * 0.01); f2 = f1 + v(fx * 0.4, 0.03, -0.03)
            fine.cap(f0, f1, 0.0065, 0.0055); fine.cap(f1, f2, 0.0055, 0.0025)
    # neck: too long, tendons standing out
    head = v(0.0, 0.31 + rear * 0.12, 0.31 + rear * 0.34)
    nb = chest + v(0, 0.07, 0.03)
    prev = nb
    for i in range(1, 7):
        u = i / 6; p = nb + (head - nb) * u; p[2] += math.sin(u * math.pi) * 0.035
        body.cap(prev, p, 0.03, 0.028); prev = p
    for sx in (-1, 1): fine.cap(nb + v(sx * 0.02, 0.0, 0.0), head + v(sx * 0.02, -0.03, -0.05), 0.007, 0.006)
    # ---- the head (built facing +y, then rotated)
    H = new_groups(); HC = Group(0.006)
    H['body'].ellipsoid(head + v(0, -0.01, 0.025), v(0.054, 0.07, 0.082))              # long skull
    H['body'].cap(head + v(0, 0.03, -0.03), head + v(0, 0.05 + jaw * 0.012, -0.085 - jaw * 0.08), 0.03, 0.02)  # long dislocated jaw
    for sx in (-1, 1):
        H['body'].ball(head + v(sx * 0.042, 0.045, 0.0), 0.017)                            # cheekbones
        HC.ellipsoid(head + v(sx * 0.025, 0.066, 0.014), v(0.0135, 0.02, 0.03))            # long sockets that droop down the face
        H['glow'].ball(head + v(sx * 0.025, 0.054, 0.02), 0.0021)                          # a faint pinprick deep inside
        H['body'].cap(head + v(sx * 0.012, 0.062, 0.046), head + v(sx * 0.05, 0.05, 0.04), 0.012, 0.009)  # heavy brow
        HC.cap(head + v(sx * 0.048, 0.035, -0.02), head + v(sx * 0.044, 0.03, -0.065), 0.011, 0.006)  # hollow cheeks
        HC.ball(head + v(sx * 0.008, 0.074, -0.012), 0.0065)                               # nose holes, no nose
    mouthTop, mouthBot = head + v(0, 0.07, -0.036), head + v(0, 0.076 + jaw * 0.012, -0.07 - jaw * 0.085)
    HC.cap(mouthTop, mouthBot, 0.011, 0.016 + jaw * 0.009)                                 # a scream: widest at the bottom
    for k, x in enumerate((-0.011, -0.006, -0.002, 0.003, 0.0075, 0.012)):
        L = 0.012 + 0.006 * ((k * 7) % 3)
        H['teeth'].cap(mouthTop + v(x, 0.006, 0.006), mouthTop + v(x * 1.05, 0.008, 0.006 - L), 0.0022, 0.0006)
    for k, x in enumerate((-0.014, -0.008, 0.0, 0.006, 0.013)):
        L = 0.01 + 0.006 * ((k * 5) % 3)
        H['teeth'].cap(mouthBot + v(x, 0.004, -0.012), mouthBot + v(x * 1.05, 0.006, -0.012 + L), 0.0022, 0.0006)
    # hair: many thin wet strands from the sides and back, parted so the face shows, dragging on the floor
    rng = np.random.RandomState(7)
    for k in range(80):
        a = math.pi * 0.62 + (k / 79.0) * math.pi * 1.76
        top = head + v(math.cos(a) * 0.052, math.sin(a) * 0.055 - 0.012, 0.08 + 0.01 * math.sin(a))
        sw = 0.01 * math.sin(t * 2 + k)
        p1 = top + v(math.cos(a) * 0.03 + rng.uniform(-0.01, 0.01), rng.uniform(-0.015, 0.015), -0.1)
        p2 = p1 + v(math.cos(a) * 0.02 + sw + rng.uniform(-0.015, 0.015), rng.uniform(-0.02, 0.025), -0.1)
        p3 = v(p2[0] + rng.uniform(-0.02, 0.02) + sw, p2[1] + rng.uniform(0.0, 0.05), max(0.006, p2[2] - 0.14))
        H['hair'].cap(top, p1, 0.0055, 0.005); H['hair'].cap(p1, p2, 0.005, 0.0042); H['hair'].cap(p2, p3, 0.0042, 0.003)
    for sx in (-1, 1):
        for k in range(3):
            top = head + v(sx * (0.052 + k * 0.006), 0.035, 0.08)
            mid = top + v(sx * 0.006, 0.028, -0.12)
            H['hair'].cap(top, mid, 0.0045, 0.004); H['hair'].cap(mid, mid + v(sx * 0.012, 0.02, -0.15), 0.004, 0.0025)
    pitch = 0.35 - rear * 0.2
    def rotg(src, dst):
        for a, b, r0, r1 in src.caps: dst.cap(rot(a, head, 0, roll, pitch), rot(b, head, 0, roll, pitch), r0, r1)
        for c, r, R in src.ell:
            Rm = rot_matrix(roll, pitch)
            dst.ellipsoid(rot(c, head, 0, roll, pitch), r, Rm if R is None else Rm @ R)
    for key in ('body', 'hair', 'teeth', 'eye', 'glow'): rotg(H[key], G[key])
    rotg(HC, C)
    return Model(G, C, displace=0.006), head

def rot_matrix(roll, pitch):
    """matrix that maps world offsets into the rotated head's local frame (for ellipsoids)"""
    cp, sp, cr, sr = math.cos(pitch), math.sin(pitch), math.cos(roll), math.sin(roll)
    Px = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    Ry = np.array([[cr, 0, -sr], [0, 1, 0], [sr, 0, cr]])
    M = Ry @ Px            # local -> world (pitch then roll)
    return M               # q @ M  == M^T q  -> world -> local

def mass(f=0.0, reach=0.6, scream=0.6):
    G = new_groups(); C = Group(0.006); body, fine = G['body'], G['fine']
    G['body'].k = 0.035
    rng = np.random.RandomState(3)
    heave = lambda i: 1 + 0.08 * math.sin(f * 2 * math.pi + i * 1.7)
    # a heap of fused torsos: ribcages and shoulders pressed together
    for i in range(14):
        x = rng.uniform(-0.3, 0.3); y = rng.uniform(-0.2, 0.05); z = 0.1 + rng.uniform(0, 0.42) * (1 - abs(x) * 1.3)
        ang = rng.uniform(0, math.pi)
        body.ellipsoid(v(x, y, max(z, 0.08)), v(0.09, 0.07, 0.12) * heave(i), yaw_roll_matrix(ang, rng.uniform(-0.8, 0.8)))
        if i % 2 == 0:
            for k in range(4):
                c = v(x, y + 0.06, max(z, 0.08) - 0.06 + k * 0.03)
                fine.cap(c + v(-0.06, 0, 0), c + v(0.06, 0, 0.01), 0.007, 0.007)
    for i in range(10):  # shoulders and hips poking out
        x = rng.uniform(-0.32, 0.32); z = 0.08 + rng.uniform(0, 0.5) * (1 - abs(x))
        body.ball(v(x, rng.uniform(-0.15, 0.08), z), rng.uniform(0.05, 0.08) * heave(i + 20))
    # heads pushed out of the surface, faces toward the front, mouths stretched in screams
    heads = [(-0.15, 0.17, 0.48, 0.095, 0.3, 0.15), (0.17, 0.16, 0.42, 0.09, -1.25, -0.2), (0.0, 0.22, 0.24, 0.11, 0.08, 0.0),
             (-0.27, 0.1, 0.2, 0.075, 0.85, 0.45), (0.28, 0.1, 0.2, 0.072, -0.55, -0.5), (0.03, 0.06, 0.68, 0.075, 2.8, 0.05)]
    for i, (x, y, z, r, roll, yaw) in enumerate(heads):
        c = v(x, y + 0.04 + (reach * 0.14 if i == 2 else 0.0), z)
        jaw = 0.35 + 0.65 * (0.5 + 0.5 * math.sin(f * 2 * math.pi + i * 1.9)) * scream
        H = new_groups(); HC = Group(0.005)
        H['body'].ellipsoid(c + v(0, -0.01, 0.012), v(r * 0.78, r * 0.9, r * 1.08))
        H['body'].cap(c + v(0, r * 0.35, -r * 0.55), c + v(0, r * 0.55, -r * (1.15 + jaw * 0.9)), r * 0.42, r * 0.3)
        for sx in (-1, 1):
            HC.ellipsoid(c + v(sx * r * 0.34, r * 0.82, r * 0.05), v(r * 0.17, r * 0.26, r * 0.44))
            HC.cap(c + v(sx * r * 0.62, r * 0.5, -r * 0.35), c + v(sx * r * 0.58, r * 0.45, -r * 0.8), r * 0.14, r * 0.07)
            if i % 2 == 0: H['glow'].ball(c + v(sx * r * 0.34, r * 0.66, r * 0.1), r * 0.028)
        HC.cap(c + v(0, r * 0.84, -r * 0.42), c + v(0, r * 0.86, -r * (0.95 + jaw * 0.85)), r * 0.13, r * 0.26)
        body.cap(c - v(0, 0.12 + (reach * 0.14 if i == 2 else 0.0), 0.04), c - v(0, 0.02, 0.03), 0.032, 0.03)  # neck back into the heap
        for key in ('body', 'eye', 'glow'):
            for a2, b2, r0, r1 in H[key].caps: G[key].cap(rot(a2, c, yaw, roll), rot(b2, c, yaw, roll), r0, r1)
            for cc, rr, R in H[key].ell: G[key].ellipsoid(rot(cc, c, yaw, roll), rr, yaw_roll_matrix(yaw, roll))
        for a2, b2, r0, r1 in HC.caps: C.cap(rot(a2, c, yaw, roll), rot(b2, c, yaw, roll), r0, r1)
        for cc, rr, R in HC.ell: C.ellipsoid(rot(cc, c, yaw, roll), rr, yaw_roll_matrix(yaw, roll))
    # arms clawing out of it, reaching for you
    arms = [(-0.3, 0.0, 0.38), (0.3, 0.0, 0.4), (-0.22, 0.1, 0.12), (0.24, 0.1, 0.1), (-0.08, 0.12, 0.6), (0.14, 0.11, 0.62), (0.02, 0.16, 0.1), (-0.33, -0.1, 0.2)]
    for i, (x, y, z) in enumerate(arms):
        base = v(x, y, z); out = nrm(v(x * 1.5, 0.55 + reach, (z - 0.35) * 0.7))
        wave = math.sin(f * 2 * math.pi + i * 1.3); L = 0.24 + reach * 0.14
        hand = base + out * L * 1.8 + v(wave * 0.05, 0, math.cos(f * 2 * math.pi + i) * 0.04)
        elb = ik(base, hand, L, L, v(1 if x > 0 else -1, -0.3, 0.8))
        G['fine'].cap(base, elb, 0.028, 0.022); G['fine'].cap(elb, hand, 0.021, 0.014); G['fine'].ball(elb, 0.021)
        G['fine'].ellipsoid(hand, v(0.022, 0.026, 0.01), yaw_roll_matrix(math.atan2(out[0], out[1]), 0))
        grab = 0.5 + 0.5 * math.sin(f * 2 * math.pi * 1.5 + i * 2)
        for k in range(5):
            sp = (k - 2) * 0.32; fd = nrm(out + v(math.sin(sp) * 0.7, 0, math.cos(sp) * 0.3 - 0.2))
            f1 = hand + fd * (0.04 + grab * 0.015); f2 = f1 + nrm(fd + v(0, -grab, -0.4)) * 0.035
            G['fine'].cap(hand, f1, 0.006, 0.005); G['fine'].cap(f1, f2, 0.005, 0.002)
    return Model(G, C, displace=0.008, flesh=True), v(0.0, 0.24, 0.28)

def yaw_roll_matrix(yaw, roll):
    cr, sr, cy, sy = math.cos(roll), math.sin(roll), math.cos(yaw), math.sin(yaw)
    Ry = np.array([[cr, 0, -sr], [0, 1, 0], [sr, 0, cr]]); Rz = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]])
    return Rz @ Ry

# ---------------------------------------------------------------- renderer
def render(model, W, H, cam_o, cam_dir, right, up, ortho=None, fov=None, flesh=False):
    """returns RGBA uint8 (H, W, 4). alpha 250 marks emissive pixels."""
    ys, xs = np.mgrid[0:H, 0:W]
    sx = (xs + 0.5) / W - 0.5; sy = 0.5 - (ys + 0.5) / H
    if ortho:
        ow, oh = ortho
        O = cam_o[None] + right[None] * (sx.reshape(-1, 1) * ow) + up[None] * (sy.reshape(-1, 1) * oh)
        D = np.repeat(cam_dir[None], W * H, 0)
    else:
        th = math.tan(fov / 2)
        D = cam_dir[None] + right[None] * (sx.reshape(-1, 1) * 2 * th * W / H) + up[None] * (sy.reshape(-1, 1) * 2 * th)
        D = D / np.linalg.norm(D, axis=1, keepdims=True); O = np.repeat(cam_o[None], W * H, 0)
    N = W * H; t = np.zeros(N); hit = np.zeros(N, bool); alive = np.arange(N)
    for step in range(110):
        if len(alive) == 0: break
        P = O[alive] + D[alive] * t[alive, None]
        d, _ = model.sdf(P)
        t[alive] += d * 0.85
        done = d < 0.0016
        hit[alive[done]] = True
        far = t[alive] > 4.0
        alive = alive[~done & ~far]
    img = np.zeros((N, 4))
    idx = np.nonzero(hit)[0]
    if len(idx):
        P = O[idx] + D[idx] * t[idx, None]
        d0, (skin, hair, teeth, eye, cv, glow) = model.sdf(P)
        e = 0.0012; n = np.zeros_like(P)
        for k in range(3):
            o = np.zeros(3); o[k] = e
            n[:, k] = model.sdf(P + o)[0] - model.sdf(P - o)[0]
        n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
        V = -D[idx]
        Ld = nrm(-cam_dir + up * 0.35 + right * 0.15)
        dif = np.clip((n @ Ld + 0.25) / 1.25, 0, 1)
        ao = np.ones(len(idx))
        for i in range(1, 6):
            h = 0.012 * i
            ao -= (h - model.sdf(P + n * h, detail=False)[0]) * (1.6 / (2 ** i)) * 4.0
        ao = np.clip(ao, 0.15, 1)
        Hh = (Ld[None] + V); Hh /= np.linalg.norm(Hh, axis=1, keepdims=True)
        spec = np.clip((n * Hh).sum(1), 0, 1) ** (60 if flesh else 48) * (0.32 if flesh else 0.24)
        rim = (1 - np.clip((n * V).sum(1), 0, 1)) ** 3 * 0.35
        # materials
        mat = np.full(len(idx), SKIN)
        allm = np.stack([skin, hair, teeth, eye, glow], 1); am = allm.argmin(1)
        mat[am == 1] = HAIR; mat[am == 2] = TOOTH; mat[am == 3] = EYE; mat[am == 4] = GLOW
        inside = (mat == SKIN) & (cv < 0.005)
        mat[inside] = VOIDC
        nz = fbm(P * 14.0, 2); veins = np.abs(fbm(P * 22.0 + 3.1, 2) - 0.5) < 0.018
        if flesh:
            mott = fbm(P * 6.0 + 2.2, 2)
            base = np.stack([0.42 + 0.1 * nz, 0.38 + 0.08 * nz, 0.36 + 0.07 * nz], 1) * (0.7 + 0.5 * mott)[:, None]
        else:
            mott = fbm(P * 5.0 + 7.7, 2)
            base = np.stack([0.50 + 0.14 * nz, 0.50 + 0.12 * nz, 0.47 + 0.1 * nz], 1) * (0.75 + 0.45 * mott)[:, None]
            bruise = np.clip((fbm(P * 3.0 + 1.3, 2) - 0.55) * 4, 0, 1)
            base = base * (1 - 0.35 * bruise)[:, None] + np.outer(0.35 * bruise, [0.16, 0.12, 0.17])
        col = base * (0.10 + 0.9 * dif * ao)[:, None] + (spec * ao)[:, None] + rim[:, None] * base
        hm = mat == HAIR
        col[hm] = (np.array([0.03, 0.025, 0.025]) * (0.4 + dif[hm] * ao[hm]))[:, None].squeeze() if False else np.outer(0.4 + dif[hm] * ao[hm], [0.035, 0.03, 0.03]) + (spec[hm] * 0.9)[:, None]
        tm = mat == TOOTH
        col[tm] = np.outer(0.15 + 0.85 * dif[tm] * ao[tm], [0.82, 0.76, 0.6]) + (spec[tm] * 0.5)[:, None]
        vm = mat == VOIDC
        col[vm] = np.outer(0.06 + 0.1 * ao[vm], [0.35, 0.12, 0.12])
        col = np.clip(col, 0, 1) ** (1 / 1.25)
        img[idx, :3] = col * 255; img[idx, 3] = 255
        em = mat == EYE    # glossy black eyeballs with a wet highlight
        col[em] = np.outer(0.02 + 0.03 * dif[em], [1, 0.9, 0.9]) + (np.clip((n[em] * Hh[em]).sum(1), 0, 1) ** 90 * 1.4)[:, None]
        col = np.clip(col, 0, 1)
        img[idx, :3] = col * 255
        gm = mat == GLOW
        img[idx[gm], :3] = [235, 60, 52]; img[idx[gm], 3] = 250
    return img.reshape(H, W, 4)

def downsample(img):
    """2x box filter; keep emissive flag when any sample is emissive"""
    H, W = img.shape[0] // 2, img.shape[1] // 2
    b = img[:H * 2, :W * 2].reshape(H, 2, W, 2, 4)
    a = b[..., 3]; cov = (a > 0).sum((1, 3))
    rgb = (b[..., :3] * (a[..., None] > 0)).sum((1, 3)) / np.maximum(cov, 1)[..., None]
    emk = (a == 250); em = emk.any((1, 3))
    emc = (b[..., :3] * emk[..., None]).sum((1, 3)) / np.maximum(emk.sum((1, 3)), 1)[..., None]
    out = np.zeros((H, W, 4)); out[..., :3] = rgb
    out[..., 3] = np.where(cov >= 2, 255, 0); out[em, 3] = 250; out[em, :3] = emc[em]
    return out

# ---------------------------------------------------------------- sheets
PITCH = math.radians(11)

def view_basis(phi):
    """viewer sits at angle phi from the monster's forward (+y), a little above"""
    vd = -v(math.sin(phi) * math.cos(PITCH), math.cos(phi) * math.cos(PITCH), math.sin(PITCH))
    right = nrm(np.cross(vd, v(0, 0, 1)))
    up = np.cross(right, vd)
    return vd, right, up

def _cell(job):
    ai, fi, model, cw, ch, worldW, worldH, below = job
    vd, right, up = view_basis(ai * math.pi / 4)
    # frame center so the floor point under the monster lands `below` units above the bottom edge
    center = v(0, 0, (worldH / 2 - below) / up[2])
    img = render(model, cw * 2, ch * 2, center - vd * 3.0, vd, right, up, ortho=(worldW, worldH), flesh=model.flesh)
    return ai, fi, downsample(img)

def bake_sheet(name, poses, cw, ch, worldW, worldH, below):
    """rows = 8 view angles, cols = frames. `below` = world units of frame below the floor line."""
    sheet = np.zeros((8 * ch, len(poses) * cw, 4))
    jobs = [(ai, fi) for ai in range(8) for fi in range(len(poses))]
    import multiprocessing as mp
    with mp.Pool(max(1, os.cpu_count() or 1)) as pool:
        for ai, fi, tile in pool.imap_unordered(_cell, [(ai, fi, poses[fi], cw, ch, worldW, worldH, below) for ai, fi in jobs]):
            sheet[ai * ch:(ai + 1) * ch, fi * cw:(fi + 1) * cw] = tile
            sys.stdout.write('.'); sys.stdout.flush()
    Image.fromarray(sheet.astype(np.uint8), 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    print(' ' + name)
    return {'cw': cw, 'ch': ch, 'frames': len(poses), 'angles': 8, 'worldW': worldW, 'worldH': worldH, 'lift': -below}

def bake_scare(name, models_heads, W=240, H=150, dist=0.42):
    out = np.zeros((H, W * len(models_heads), 4))
    for i, (model, head) in enumerate(models_heads):
        vd = nrm(v(0, -1, 0.05)); right = nrm(np.cross(vd, v(0, 0, 1))); up = np.cross(right, vd)
        img = render(model, W * 2, H * 2, head + v(0, 0.06, -0.035) - vd * dist, vd, right, up, fov=math.radians(62), flesh=model.flesh)
        out[:, i * W:(i + 1) * W] = downsample(img)
        sys.stdout.write('.'); sys.stdout.flush()
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(os.path.join(OUT, name + '_scare.png'), optimize=True)
    print(' ' + name + '_scare')
    return {'w': W, 'h': H, 'frames': len(models_heads)}

if __name__ == '__main__':
    meta = {}
    only = sys.argv[1:] or ['crawler', 'mass']
    if 'crawler' in only:
        poses = [crawler(phase=i / 6 * 2 * math.pi, t=i * 0.3)[0] for i in range(6)]
        poses += [crawler(phase=0.3, rest=1, roll=1.35, jaw=1.0, t=2)[0], crawler(phase=3.4, rest=1, roll=-1.5, jaw=1.0, t=3)[0]]
        meta['crawler'] = bake_sheet('crawler', poses, 128, 80, 1.15, 0.72, 0.16)
        meta['crawler']['scare'] = bake_scare('crawler', [crawler(phase=0.2, rest=1, roll=r, jaw=j, rear=1.0) for r, j in ((0.0, 0.6), (0.25, 0.85), (-0.2, 1.0))], dist=0.2)
    if 'mass' in only:
        poses = [mass(f=i / 6, reach=0.6)[0] for i in range(6)]
        meta['mass'] = bake_sheet('mass', poses, 128, 128, 1.2, 1.2, 0.12)
        meta['mass']['scare'] = bake_scare('mass', [mass(f=f, reach=1, scream=1) for f in (0.0, 0.33, 0.66)], dist=0.32)
    mp = os.path.join(OUT, 'meta.json')
    old = json.load(open(mp)) if os.path.exists(mp) else {}
    old.update(meta); json.dump(old, open(mp, 'w'), indent=1)
    with open(os.path.join(OUT, 'meta.js'), 'w') as f:
        f.write('window.BAKED_MONSTERS = ' + json.dumps(old) + ';\n')
    print('done')
