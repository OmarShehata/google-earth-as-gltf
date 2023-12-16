import { Viewer } from './Viewer.js'
import { UI } from './UI.js'

import {load} from '@loaders.gl/core';
import {Tileset3D} from '@loaders.gl/tiles';
import {Tiles3DLoader} from '@loaders.gl/3d-tiles';
import {WebMercatorViewport} from '@deck.gl/core';

// The viewer (1) sets up a ThreeJS scene,
// (2) takes a set of glTF's and renders them normalized around (0,0,0) and oriented correctly
// (3) can export this combined glTF
const viewer = new Viewer()
const ui = new UI()
ui.onFetch = async () => {
  ui.clearLog()
  ui.log("Fetching...")
  ui.fetchTilesBtn.disabled = true

  try {
    await fetch3DTiles()
  } catch (e) {
    console.error(e)
    ui.log(`Failed to fetch 3D Tiles! Error: ${e}`)
  }
  
  ui.fetchTilesBtn.disabled = false
}
ui.onDownload = () => {
  viewer.generateCombineGltf()
}
ui.onTileSliderChange = (value) => {
  for (let i = 0; i < viewer.gltfArray.length; i++) {
    const gltf = viewer.gltfArray[i]
    gltf.scene.visible = i <= value 
  }
}

// Here is where we actually get the 3D Tiles from the Google API
// We use loadersgl to traverse the tileset until we get to the 
// lat,lng,zoom we want, at the given screen space error
// we end up with a list of glTF url's. Viewer is what finally
// fetches them
async function fetch3DTiles() {
   ui.setDebugSliderVisibility(false)

  const { lat, lng, zoom } = ui.getLatLngZoom()
  const GOOGLE_API_KEY = ui.getGoogleAPIKey()
  const tilesetUrl = 'https://tile.googleapis.com/v1/3dtiles/root.json?key=' + GOOGLE_API_KEY;

  const targetScreenSpaceError = ui.getScreenSpaceError()

  ui.log(`Fetching tiles at (${lat} ${lng}, ${zoom}, sse: ${targetScreenSpaceError})`)
  const viewport = new WebMercatorViewport({ 
    width: 230,
    height: 175, // dimensions from the little map preview
    latitude: lat,
    longitude: lng,
    zoom: zoom 
  });

  const tileset = await load3DTileset(tilesetUrl, viewport, targetScreenSpaceError)
  const sessionKey = getSessionKey(tileset)
  let tiles = tileset.tiles
  // sort tiles to have the most accurate tiles first
  tiles = tiles.sort((tileA, tileB) => {
    return tileA.header.geometricError - tileB.header.geometricError
  })

  const glbUrls = []
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]
    const errorDiff = Math.abs(targetScreenSpaceError - tile.header.geometricError)
    if (errorDiff <= targetScreenSpaceError) {
      console.log(tile.header.geometricError)
      const url = `${tile.contentUrl}?key=${GOOGLE_API_KEY}&session=${sessionKey}`
      glbUrls.push(url)
    }

    if (glbUrls.length > 100) {
      ui.log("==== Exceeded maximum glTFs! Capping at 100 =====")
      break
    }
  }

  if (glbUrls.length == 0) {
    let firstSSEFound = null
    for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i]
        if (firstSSEFound == null) firstSSEFound = Math.round(tile.header.geometricError)
        const errorDiff = Math.abs(targetScreenSpaceError - tile.header.geometricError)
        if (errorDiff <= firstSSEFound * 2) {

          const url = `${tile.contentUrl}?key=${GOOGLE_API_KEY}&session=${sessionKey}`
          glbUrls.push(url)
        }

        if (glbUrls.length > 100) {
          ui.log("==== Exceeded maximum glTFs! Capping at 100 =====")
          break
        }
    }
    ui.log(`==== No tiles found for screen space error ${targetScreenSpaceError}. Getting tiles that are within 2x of ${firstSSEFound} ===`)
  }

  viewer.loadGLTFTiles(glbUrls, ui.log)
  ui.setDebugSliderVisibility(true)
  ui.updateDebugSliderRange(glbUrls.length)
}

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
