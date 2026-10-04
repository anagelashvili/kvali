"use client";

// 3D body map for the request form: a mannequin built from simple shapes, drawn
// in bone with ink outlines. Drag to turn it, tap to place the tattoo; the spot
// is named from the wearer's point of view and the piece is projected onto the
// skin as a dashed outline. three.js loads only when this component mounts.
import { useEffect, useRef, useState } from "react";
import type * as T from "three";

export type Shape = "square" | "tall" | "wide";
export type BodyPoint = { x: number; y: number; z: number; nx: number; ny: number; nz: number };
export type Placement = { zone: string; part: string; view: "front" | "back"; point: BodyPoint };

/** Width and height in cm for a piece whose longest side is `cm`. */
export function pieceSize(cm: number, shape: Shape) {
  if (shape === "tall") return { w: cm / 3, h: cm };
  if (shape === "wide") return { w: cm, h: cm * 0.45 };
  return { w: cm * 0.8, h: cm };
}

/** Spots for the keyboard / no-WebGL fallback. */
export const FALLBACK_ZONES = [
  "Upper spine", "Spine", "Lower spine", "Right shoulder blade", "Left shoulder blade", "Back of neck",
  "Chest", "Sternum", "Stomach", "Right ribs", "Left ribs", "Right collarbone", "Left collarbone",
  "Right shoulder", "Left shoulder", "Right upper arm", "Left upper arm", "Right forearm", "Left forearm",
  "Right hand", "Left hand", "Right thigh", "Left thigh", "Back of right thigh", "Back of left thigh",
  "Right calf", "Left calf", "Right shin", "Left shin", "Right ankle", "Left ankle", "Behind the right ear",
  "Behind the left ear",
];

/** Names a spot on the figure. `p`/`n` are in model space; the figure faces +z, so the wearer's right is -x. */
function zoneAt(part: string, p: T.Vector3, n: T.Vector3) {
  const side = p.x < 0 ? "Right" : "Left";
  const s = side.toLowerCase();
  const back = n.z < 0;
  const cx = Math.abs(p.x);
  switch (part) {
    case "head":
      return cx > 0.06 && Math.abs(n.x) > 0.5 ? `Behind the ${s} ear` : back ? "Back of head" : "Head";
    case "neck":
      return back ? "Back of neck" : "Throat";
    case "torso":
      if (cx > 0.12 && Math.abs(n.x) > 0.75) return `${side} ribs`;
      if (back) {
        if (cx < 0.045) return p.y > 1.3 ? "Upper spine" : p.y > 1.08 ? "Spine" : "Lower spine";
        return p.y > 1.24 ? `${side} shoulder blade` : p.y > 1.06 ? `${side} side of back` : "Lower back";
      }
      if (p.y > 1.37) return `${side} collarbone`;
      if (p.y > 1.2) return cx < 0.04 ? "Sternum" : `${side} chest`;
      if (p.y > 1.06) return cx > 0.11 ? `${side} ribs` : "Stomach";
      return cx > 0.1 ? `${side} hip` : "Lower stomach";
    case "shoulder":
      return `${side} shoulder`;
    case "upperArm":
      return back ? `Back of ${s} upper arm` : `${side} upper arm`;
    case "forearm":
      return `${side} forearm`;
    case "hand":
      return `${side} hand`;
    case "thigh":
      return back ? `Back of ${s} thigh` : `${side} thigh`;
    case "calf":
      return p.y < 0.16 ? `${side} ankle` : back ? `${side} calf` : `${side} shin`;
    default:
      return `${side} foot`;
  }
}

type Api = {
  setPiece(placement: Placement | null, w: number, h: number): void;
  setView(view: "front" | "back"): void;
  setFocus(on: boolean): void;
};

export function Body3D({
  placement,
  sizeCm,
  shape,
  disabled,
  onPlace,
}: {
  placement: Placement | null;
  sizeCm: number;
  shape: Shape;
  disabled?: boolean;
  onPlace(p: Placement): void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onPlaceRef = useRef(onPlace);
  const disabledRef = useRef(disabled);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"front" | "back">("front");
  const [focus, setFocus] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onPlaceRef.current = onPlace;
    disabledRef.current = disabled;
  });

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { DecalGeometry } = await import("three/addons/geometries/DecalGeometry.js");
      if (disposed || !host.current) return;

      let renderer: T.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setFailed(true);
        return;
      }
      const el = host.current;
      renderer.setPixelRatio(Math.min(2, devicePixelRatio));
      el.appendChild(renderer.domElement);
      renderer.domElement.style.touchAction = "none";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      const key = new THREE.DirectionalLight(0xffffff, 1.8);
      key.position.set(-1.5, 2.5, 3);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 0.6);
      rim.position.set(2, 1, -3);
      scene.add(rim);

      // three-step toon shading + inverted-hull ink outline
      const ramp = new THREE.DataTexture(new Uint8Array([150, 205, 255]), 3, 1, THREE.RedFormat);
      ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
      ramp.needsUpdate = true;
      const fill = new THREE.MeshToonMaterial({ color: 0xf1ece0, gradientMap: ramp });
      const ink = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { t: { value: 0.0045 } },
        vertexShader: "uniform float t; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * t, 1.0); }",
        fragmentShader: "void main(){ gl_FragColor = vec4(0.055, 0.055, 0.055, 1.0); }",
      });

      const body = new THREE.Group();
      scene.add(body);
      const meshes: T.Mesh[] = [];
      const part = (name: string, g: T.BufferGeometry, x: number, y: number, z = 0, rz = 0, sc?: [number, number, number], rx = 0) => {
        const m = new THREE.Mesh(g, fill);
        m.name = name;
        m.position.set(x, y, z);
        m.rotation.set(rx, 0, rz);
        if (sc) m.scale.set(...sc);
        m.add(new THREE.Mesh(g, ink));
        body.add(m);
        meshes.push(m);
      };

      // torso: a lathe profile (radius, height) flattened front-to-back
      const profile = [
        [0, 0.9], [0.125, 0.9], [0.148, 0.95], [0.153, 1.0], [0.144, 1.06], [0.128, 1.13], [0.132, 1.2],
        [0.15, 1.28], [0.162, 1.35], [0.16, 1.4], [0.125, 1.445], [0.06, 1.468], [0, 1.472],
      ].map(([r, y]) => new THREE.Vector2(r, y));
      part("torso", new THREE.LatheGeometry(profile, 56), 0, 0, 0, 0, [1, 1, 0.62]);
      part("neck", new THREE.CylinderGeometry(0.048, 0.056, 0.13, 28), 0, 1.5);
      part("head", new THREE.SphereGeometry(0.1, 36, 26), 0, 1.635, 0.005, 0, [0.92, 1.15, 1]);
      for (const sgn of [-1, 1]) {
        part("shoulder", new THREE.SphereGeometry(0.056, 28, 20), sgn * 0.168, 1.38);
        part("upperArm", new THREE.CapsuleGeometry(0.047, 0.22, 8, 20), sgn * 0.215, 1.225, 0, sgn * 0.12);
        part("forearm", new THREE.CapsuleGeometry(0.039, 0.22, 8, 20), sgn * 0.245, 0.975, 0, sgn * 0.05);
        part("hand", new THREE.SphereGeometry(0.045, 24, 18), sgn * 0.255, 0.8, 0, 0, [0.8, 1.4, 0.5]);
        part("thigh", new THREE.CapsuleGeometry(0.078, 0.34, 8, 24), sgn * 0.095, 0.7, 0, sgn * -0.03);
        part("calf", new THREE.CapsuleGeometry(0.058, 0.34, 8, 24), sgn * 0.092, 0.3);
        part("foot", new THREE.CapsuleGeometry(0.04, 0.14, 6, 16), sgn * 0.092, 0.045, 0.05, 0, undefined, Math.PI / 2);
      }

      // the placed piece: a dashed outline with corner marks, projected onto the skin
      let decal: T.Mesh | null = null;
      const decalMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
      function pieceTexture(aspect: number) {
        const c = document.createElement("canvas");
        c.width = 256;
        c.height = Math.round(256 * aspect);
        const g = c.getContext("2d")!;
        g.fillStyle = "rgba(14,14,14,.14)";
        g.fillRect(0, 0, c.width, c.height);
        g.strokeStyle = "#0e0e0e";
        g.lineWidth = 7;
        g.setLineDash([22, 14]);
        g.strokeRect(6, 6, c.width - 12, c.height - 12);
        g.setLineDash([]);
        g.lineWidth = 12;
        const k = 40;
        for (const [x, y, dx, dy] of [[6, 6, 1, 1], [c.width - 6, 6, -1, 1], [6, c.height - 6, 1, -1], [c.width - 6, c.height - 6, -1, -1]]) {
          g.beginPath();
          g.moveTo(x, y + dy * k);
          g.lineTo(x, y);
          g.lineTo(x + dx * k, y);
          g.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }

      let yaw = 0;
      let targetYaw = 0;
      let camY = 0.92;
      let camD = 3.7;
      let target = { y: 0.92, d: 3.7 };
      let dirty = true;
      let lastPiece: { placement: Placement | null; w: number; h: number } = { placement: null, w: 0, h: 0 };

      function setPiece(placement: Placement | null, wCm: number, hCm: number) {
        lastPiece = { placement, w: wCm, h: hCm };
        if (decal) {
          body.remove(decal);
          decal.geometry.dispose();
          decal = null;
        }
        if (!placement) return void (dirty = true);
        const mesh = meshes.find((m) => m.name === placement.part && Math.sign(m.position.x || 1) === Math.sign(placement.point.x || 1)) ?? meshes.find((m) => m.name === placement.part);
        if (!mesh) return;
        body.updateMatrixWorld(true);
        const p = body.localToWorld(new THREE.Vector3(placement.point.x, placement.point.y, placement.point.z));
        const n = new THREE.Vector3(placement.point.nx, placement.point.ny, placement.point.nz).applyQuaternion(body.quaternion).normalize();
        const aim = new THREE.Object3D();
        aim.position.copy(p);
        aim.lookAt(p.clone().add(n));
        const depth = placement.part === "torso" || placement.part === "head" ? 0.09 : 0.045;
        const g = new DecalGeometry(mesh, p, aim.rotation, new THREE.Vector3(wCm / 100, hCm / 100, depth));
        g.applyMatrix4(body.matrixWorld.clone().invert());
        (decalMat.map as T.Texture | null)?.dispose();
        decalMat.map = pieceTexture(hCm / wCm);
        decalMat.needsUpdate = true;
        decal = new THREE.Mesh(g, decalMat);
        decal.renderOrder = 2;
        body.add(decal);
        dirty = true;
      }

      // pointer: drag turns the figure, a tap places the piece
      const ray = new THREE.Raycaster();
      let down: { x: number; y: number; yaw: number; moved: boolean } | null = null;
      const canvas = renderer.domElement;
      const onDown = (e: PointerEvent) => {
        canvas.setPointerCapture(e.pointerId);
        down = { x: e.clientX, y: e.clientY, yaw, moved: false };
      };
      const onMove = (e: PointerEvent) => {
        if (!down) return;
        const dx = e.clientX - down.x;
        if (Math.abs(dx) > 5 || Math.abs(e.clientY - down.y) > 5) down.moved = true;
        if (down.moved) {
          yaw = targetYaw = down.yaw + dx * 0.012;
          dirty = true;
        }
      };
      const onUp = (e: PointerEvent) => {
        const d = down;
        down = null;
        if (!d) return;
        if (d.moved) {
          setView(Math.cos(yaw) < 0 ? "back" : "front");
          return;
        }
        if (disabledRef.current) return;
        const r = canvas.getBoundingClientRect();
        ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
        const hit = ray.intersectObjects(meshes, false)[0];
        if (!hit || !hit.face) return;
        const mesh = hit.object as T.Mesh;
        const wn = hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize();
        const p = body.worldToLocal(hit.point.clone());
        const n = wn.applyQuaternion(body.quaternion.clone().invert());
        onPlaceRef.current({
          zone: zoneAt(mesh.name, p, n),
          part: mesh.name,
          view: n.z < 0 ? "back" : "front",
          point: { x: +p.x.toFixed(4), y: +p.y.toFixed(4), z: +p.z.toFixed(4), nx: +n.x.toFixed(3), ny: +n.y.toFixed(3), nz: +n.z.toFixed(3) },
        });
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", () => (down = null));

      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h, false);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        dirty = true;
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const ease = 0.14;
        if (Math.abs(targetYaw - yaw) > 0.001) {
          yaw += (targetYaw - yaw) * ease;
          dirty = true;
        }
        if (Math.abs(target.y - camY) > 0.0005 || Math.abs(target.d - camD) > 0.0005) {
          camY += (target.y - camY) * ease;
          camD += (target.d - camD) * ease;
          dirty = true;
        }
        if (!dirty) return;
        dirty = false;
        body.rotation.y = yaw;
        camera.position.set(0, camY + 0.05, camD);
        camera.lookAt(0, camY, 0);
        renderer.render(scene, camera);
      };
      loop();
      setLoaded(true);

      api.current = {
        setPiece,
        setView(v) {
          // turn the short way round to face front (0) or back (π)
          const want = v === "back" ? Math.PI : 0;
          const turns = Math.round((yaw - want) / (Math.PI * 2));
          targetYaw = want + turns * Math.PI * 2;
        },
        setFocus(on) {
          const y = lastPiece.placement?.point.y ?? 0.92;
          target = on ? { y: Math.min(1.55, Math.max(0.35, y)), d: 1.55 } : { y: 0.92, d: 3.7 };
        },
      };
      if (lastPiece.placement) setPiece(lastPiece.placement, lastPiece.w, lastPiece.h);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.dispose();
        canvas.remove();
        meshes.forEach((m) => m.geometry.dispose());
      };
    })().catch(() => setFailed(true));

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  // keep the projected piece in sync with the form
  useEffect(() => {
    const { w, h } = pieceSize(sizeCm, shape);
    api.current?.setPiece(placement, w, h);
  }, [placement, sizeCm, shape, loaded]);

  useEffect(() => api.current?.setView(view), [view, loaded]);
  useEffect(() => api.current?.setFocus(focus && !!placement), [focus, placement, loaded]);

  if (failed) return null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={host} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
      <div style={{ position: "absolute", left: 0, bottom: 0, display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
        {(["front", "back"] as const).map((v) => (
          <button key={v} type="button" data-body-btn aria-pressed={view === v} onClick={() => setView(v)}>
            {v === "front" ? "Front" : "Back"}
          </button>
        ))}
        <button type="button" data-body-btn aria-pressed={focus} disabled={!placement} onClick={() => setFocus((f) => !f)}>
          {focus ? "Full body" : "Zoom in"}
        </button>
      </div>
    </div>
  );
}

/** True if WebGL can run here; the form shows a plain list of spots otherwise. */
export function useWebGL() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const c = document.createElement("canvas");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability check
    setOk(!!(c.getContext("webgl2") || c.getContext("webgl")));
  }, []);
  return ok;
}
