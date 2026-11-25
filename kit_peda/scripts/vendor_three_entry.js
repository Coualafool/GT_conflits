// Entrée de bundle S-A : three@0.187.0 ébranché (tree-shaking) vers l'IIFE classique
// window.THREE, pour un chargement file:// sans ESM (les imports ESM sont CORS-morts en file://).
// Les imports NOMMÉS (et non `import * as`) permettent à esbuild d'ébrancher.
import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Object3D,
  Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, MeshLambertMaterial,
  CanvasTexture, SRGBColorSpace,
  AmbientLight, HemisphereLight, SpotLight, PointLight,
  Fog, Color, Vector3, Vector2, Raycaster, MathUtils,
  DoubleSide, FrontSide, BackSide, AdditiveBlending,
  ACESFilmicToneMapping, PCFSoftShadowMap,
  BufferGeometry, Float32BufferAttribute, LineBasicMaterial, Line,
  REVISION,
} from "three";
// Chargeur GLB pour les props de vitrines (props-musee.data.js → base64 → ArrayBuffer → GLTFLoader).
// « three/addons » = export map de three@0.187 (→ examples/jsm) — résolvable par esbuild.
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

globalThis.THREE = {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Object3D,
  Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry, TorusGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, MeshLambertMaterial,
  CanvasTexture, SRGBColorSpace,
  AmbientLight, HemisphereLight, SpotLight, PointLight,
  Fog, Color, Vector3, Vector2, Raycaster, MathUtils,
  DoubleSide, FrontSide, BackSide, AdditiveBlending,
  ACESFilmicToneMapping, PCFSoftShadowMap,
  BufferGeometry, Float32BufferAttribute, LineBasicMaterial, Line,
  REVISION,
  GLTFLoader,
};
