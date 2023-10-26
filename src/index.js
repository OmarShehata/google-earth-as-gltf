import { Viewer } from './Viewer.js'
import {load} from '@loaders.gl/core';
import {Tileset3D} from '@loaders.gl/tiles';
import {Tiles3DLoader} from '@loaders.gl/3d-tiles';
import {WebMercatorViewport} from '@deck.gl/core';
import * as dat from 'dat.gui';


const viewer = new Viewer()

const gui = new dat.GUI();
const params = {
  'Google API Key': '',
  'Fetch Google Earth 3D Tiles': () => {
    console.log("Hello")
  },
  'Download': () => {
    viewer.generateCombineGltf()
  }
}
gui.add(params, 'Google API Key')
gui.add(params, 'Fetch Google Earth 3D Tiles')
gui.add(params, 'Download')

async function run() {
  const TARGET_SCREEN_SPACE_ERROR = 8
  const GOOGLE_API_KEY = 'AIzaSyCoNisM6I1vb1I9eINi6ncucc8cFwCzzv0'
  const tilesetUrl = 'https://tile.googleapis.com/v1/3dtiles/root.json?key=' + GOOGLE_API_KEY;
  const viewport = new WebMercatorViewport({ 
    width: 600,
    height: 400,
    latitude: 40.7067584, 
    longitude: -74.0115413, 
    zoom: 16 
  });

  const tileset = await load3DTileset(tilesetUrl, viewport, TARGET_SCREEN_SPACE_ERROR)
  window.tileset = tileset
  const sessionKey = getSessionKey(tileset)
  const tiles = tileset.tiles

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]
    const errorDiff = TARGET_SCREEN_SPACE_ERROR - tile.header.geometricError
    if (errorDiff >= -1) {
      const url = `${tile.contentUrl}?key=${GOOGLE_API_KEY}&session=${sessionKey}`
      viewer.loadGLTF(url)
    }
  }
}
run()

// for (let i = 0; i <= 10; i++) {
//   const url = `/${i}.glb`
//   viewer.loadGLTF(url)
// }

async function load3DTileset(tilesetUrl, viewport, screenSpaceError) {
  const tilesetJson = await load(tilesetUrl, Tiles3DLoader, {'3d-tiles': { loadGLTF: false }} );
  const tileset3d = new Tileset3D(tilesetJson, {
    throttleRequests: false,
    maximumScreenSpaceError: screenSpaceError
  })

  while (!tileset3d.isLoaded()) {
    await tileset3d.selectTiles(viewport)
  }

  return tileset3d
}

function getSessionKey(tileset) {
  return new URL(`http://website.com?${tileset.queryParams}`).searchParams.get("session")
}
